<template>
  <div id="content">
    <k-toolbar title="Address Geocoder" :subtitle="subtitle">
      <template #start>
        <span class="brand-mark" aria-hidden="true"><k-icon icon="map-pin" /></span>
      </template>
      <template #end>
        <k-button :icon="theme === 'dark' ? 'sun' : 'moon'" variant="transparent" :title="theme === 'dark' ? 'Light mode' : 'Dark mode'" @click="toggleTheme" />
        <settings-panel :settings="geocoder.settings" />
      </template>
    </k-toolbar>

    <div class="layout" :class="{ 'has-file': !!geocoder.file.value }">
      <!-- Left: the tinted panel of section cards, as a record's info panel -->
      <transition name="panel">
        <aside v-if="geocoder.file.value" class="info-panel">
          <div class="info-panel-inner">
            <div class="info-panel-body">
              <!-- File -->
              <section class="section-card card-file">
                <h6 class="section-title"><k-icon icon="file-csv" /><span class="text-truncate flex-grow-1">File</span></h6>
                <div class="file-summary">
                  <div class="min-w-0 flex-grow-1">
                    <div class="file-name text-truncate" :title="geocoder.file.value.fileName">{{ geocoder.file.value.fileName }}</div>
                    <div class="file-meta">{{ geocoder.file.value.rows.length.toLocaleString() }} rows · {{ geocoder.file.value.headers.length }} columns</div>
                  </div>
                  <k-button class="file-change-compact" icon="close" variant="transparent" title="Change file" :disabled="geocoder.running.value" @click="geocoder.reset()" />
                </div>
                <div class="button-group file-change-full">
                  <k-button label="Change file" icon="close" variant="transparent" :disabled="geocoder.running.value" @click="geocoder.reset()" />
                </div>
              </section>

              <!-- No way to match rows back to records: say so before anyone runs anything -->
              <section v-if="geocoder.matchColumns.value.length === 0" class="section-card card-warning">
                <h6 class="section-title"><k-icon icon="warning" /><span class="text-truncate flex-grow-1">This file can't update existing records</span></h6>
                <p class="mb-2">
                  There is no column that says which record each row belongs to, such as a name or a record ID. Kinabase would have to import the result as new
                  records, which duplicates the ones already there.
                </p>
                <p class="mb-0">
                  <strong>To fix:</strong> in the collection's settings turn on a visible record ID (or add the name field to the export), export again, and use that file
                  here instead.
                </p>
              </section>

              <!-- Search -->
              <section class="section-card card-search">
                <h6 class="section-title"><k-icon icon="globe" /><span class="text-truncate flex-grow-1">Search</span></h6>
                <!-- The field picker only appears when there is a choice to make -->
                <div v-if="geocoder.groups.value.length > 1" class="form-control-container">
                  <k-label id="field" label="Address field to fill" />
                  <select id="field" v-model="geocoder.selectedGroupName.value" class="form-select form-select-sm" :disabled="geocoder.running.value">
                    <option v-for="g in geocoder.groups.value" :key="g.name" :value="g.name">{{ g.name }}</option>
                  </select>
                </div>
                <p class="text-description mb-0">
                  Looks up each row's <strong>{{ geocoder.selectedGroup.value?.name }}</strong> using its {{ partsInUse.join(", ") }}.
                </p>
                <div class="form-control-container mt-2">
                  <k-label id="country" label="Country" />
                  <select id="country" v-model="geocoder.settings.countryCode" class="form-select form-select-sm" :disabled="geocoder.running.value">
                    <option v-for="c in COUNTRY_OPTIONS" :key="c.code" :value="c.code">{{ c.label }}</option>
                  </select>
                  <p class="text-description mt-1 mb-0">
                    {{ geocoder.settings.countryCode ? "Only results in this country count, so a street with the same name abroad can't be picked by mistake." : "Pick the country the addresses are in. Use Any country only if the list mixes countries." }}
                  </p>
                </div>
                <div v-if="!geocoder.settings.apiKey.trim()" class="alert-inline alert-warning mt-2" role="status">
                  <k-icon icon="key" />
                  <span>No HERE API key is set, so nothing can be searched yet. Open the settings cog and paste the tool's key.</span>
                </div>
                <transition name="fade">
                  <div v-if="geocoder.fatalError.value" class="alert-inline alert-danger mt-2" role="alert">
                    <k-icon icon="warning" />
                    <span>{{ geocoder.fatalError.value }}</span>
                  </div>
                </transition>
                <div v-if="geocoder.running.value || geocoder.counts.value.pending > 0 || !hasStarted" class="button-group">
                  <k-button
                    v-if="!geocoder.running.value"
                    variant="primary"
                    icon="play"
                    :label="runLabel"
                    :disabled="geocoder.counts.value.pending === 0 || !geocoder.settings.apiKey.trim()"
                    @click="geocoder.run()" />
                  <k-button v-else variant="secondary" icon="stop" label="Stop" @click="geocoder.cancel()" />
                </div>
              </section>

              <!-- Progress -->
              <transition name="rise">
                <section v-if="hasStarted" class="section-card card-results">
                  <h6 class="section-title">
                    <k-icon icon="table" /><span class="text-truncate flex-grow-1">Results</span>
                    <k-spinner v-if="geocoder.running.value" size="xs" class="flex-shrink-0 mt-n1" show-instantly />
                  </h6>
                  <k-progress-bar :percent="geocoder.progressPercent.value" :variant="progressVariant" :animated="geocoder.running.value" hide-label class="progress-slim" />
                  <div class="progress-text mt-1">{{ progressText }}</div>
                  <dl class="rounded stat-list">
                    <div v-for="s in statRows" :key="s.key" class="stat-row" :class="`stat-${s.key}`" :title="s.meaning">
                      <dt>{{ s.label }}</dt>
                      <dd>{{ s.count }}</dd>
                    </div>
                  </dl>
                  <template v-if="geocoder.done.value">
                    <div v-if="geocoder.counts.value.approx > 0" class="form-check form-switch mt-2 mb-0">
                      <input id="include-approx" v-model="geocoder.settings.includeApprox" class="form-check-input" type="checkbox" />
                      <label class="form-check-label" for="include-approx">Include approximate pins</label>
                    </div>
                    <div v-if="geocoder.counts.value.check > 0" class="form-check form-switch mt-1 mb-0">
                      <input id="include-check" v-model="geocoder.settings.includeCheck" class="form-check-input" type="checkbox" />
                      <label class="form-check-label" for="include-check">Include "Check this" pins</label>
                    </div>
                    <div class="button-group">
                      <k-button
                        v-if="geocoder.counts.value.none + geocoder.counts.value.error + geocoder.counts.value.check > 0"
                        label="Try the problem rows again"
                        icon="redo"
                        variant="transparent"
                        title="Search the not-found and doubtful rows again, for example after changing the country"
                        @click="geocoder.retryProblems()" />
                      <k-button :label="downloadLabel" icon="download" variant="primary" :disabled="geocoder.fillable.value.length === 0" @click="geocoder.download()" />
                    </div>
                  </template>
                </section>
              </transition>

              <!-- What to do with the download -->
              <transition name="rise">
                <section v-if="geocoder.downloaded.value" class="section-card card-next">
                  <h6 class="section-title"><k-icon icon="upload" /><span class="text-truncate flex-grow-1">Now put the pins into Kinabase</span></h6>
                  <ol class="steps">
                    <li>Open the collection in Kinabase, then the <strong>⋯</strong> menu, then <strong>Import (.csv)</strong>.</li>
                    <li>Choose <strong>{{ geocoder.outputFileName.value }}</strong>.</li>
                    <li v-if="geocoder.suggestedMatchColumn.value">
                      Pick <strong>Update matching records</strong> and match the CSV column <strong>{{ geocoder.suggestedMatchColumn.value }}</strong> to the
                      <strong>{{ geocoder.suggestedMatchColumn.value }}</strong> field.
                    </li>
                    <li v-else>
                      Pick <strong>Create new records</strong>. This file has no name or ID column, so it can only be imported into an empty collection without making
                      duplicates.
                    </li>
                    <li>Click <strong>Next</strong> twice. The address columns match up by themselves.</li>
                    <li>Open the collection's <strong>Map</strong>. The records are on it.</li>
                  </ol>
                </section>
              </transition>
            </div>
          </div>
        </aside>
      </transition>

      <!-- Right: the table, or the drop zone before a file is loaded -->
      <main class="main-area">
        <transition name="swap" mode="out-in">
          <div v-if="!geocoder.file.value" key="drop" class="empty-state">
            <drop-zone :busy="loading" @file="onFile" />
            <transition name="fade">
              <div v-if="geocoder.loadError.value" class="alert-inline alert-danger mt-3" role="alert">
                <k-icon icon="warning" />
                <span>{{ geocoder.loadError.value }}</span>
              </div>
            </transition>
            <p class="text-description empty-hint">
              Export the collection from Kinabase as CSV and drop it here. You get the same file back with the Latitude and Longitude columns filled in; import it and the
              records show on the map.
            </p>
          </div>
          <results-table v-else key="table" :results="geocoder.results.value" :running="geocoder.running.value" />
        </transition>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import DropZone from "./components/DropZone.vue";
import KButton from "./components/KButton.vue";
import KIcon from "./components/KIcon.vue";
import KLabel from "./components/KLabel.vue";
import KProgressBar from "./components/KProgressBar.vue";
import KSpinner from "./components/KSpinner.vue";
import KToolbar from "./components/KToolbar.vue";
import ResultsTable from "./components/ResultsTable.vue";
import SettingsPanel from "./components/SettingsPanel.vue";

import { computed, ref } from "vue";

import { QUERY_PART_ORDER } from "./lib/csv";
import { COUNTRY_OPTIONS } from "./lib/geocode";
import { useGeocoder } from "./lib/geocoder";
import { STATUS_LABELS, STATUS_MEANING } from "./lib/statusLabels";

const geocoder = useGeocoder();
const loading = ref(false);

const onFile = async (file: File) => {
  loading.value = true;
  try {
    await geocoder.load(file);
  } finally {
    loading.value = false;
  }
};

const hasStarted = computed(() => geocoder.running.value || geocoder.results.value.some((r) => r.status !== "pending" && r.status !== "skipped"));

const subtitle = computed(() => {
  const parsed = geocoder.file.value;
  if (!parsed) return "Fill in latitude and longitude for a Kinabase address export";
  const c = geocoder.counts.value;
  if (geocoder.running.value) return `Searching ${parsed.fileName}`;
  if (hasStarted.value) return `${parsed.fileName} · ${c.placed + c.approx} of ${c.total - c.skipped} placed`;
  return `${parsed.fileName} · ${c.pending} rows to search`;
});

/** Human names of the columns the search uses, without the repeated field name */
const partsInUse = computed(() => {
  const group = geocoder.selectedGroup.value;
  if (!group) return [];
  const keys = geocoder.settings.includeTitle ? ["title", ...QUERY_PART_ORDER] : QUERY_PART_ORDER;
  return keys
    .map((k) => group.columns[k as keyof typeof group.columns])
    .filter((c): c is string => !!c)
    .map((c) => c.replace(`${group.name} (`, "").replace(/\)$/, "").replace(`${group.name} » `, ""));
});

const runLabel = computed(() => {
  const n = geocoder.counts.value.pending;
  if (n === 0) return "Nothing to search";
  return hasStarted.value ? `Search ${n.toLocaleString()} remaining` : `Find pins for ${n.toLocaleString()} rows`;
});

const progressText = computed(() => {
  const c = geocoder.counts.value;
  const toDo = c.total - c.skipped;
  const doneCount = toDo - c.pending;
  if (geocoder.running.value) return `${doneCount.toLocaleString()} of ${toDo.toLocaleString()} searched`;
  if (c.pending > 0) return `Stopped at ${doneCount.toLocaleString()} of ${toDo.toLocaleString()}`;
  return `All ${toDo.toLocaleString()} searched`;
});

const progressVariant = computed(() => {
  if (!geocoder.done.value) return "primary";
  const c = geocoder.counts.value;
  if (c.none + c.error + c.check > 0) return "warning";
  return "success";
});

const statRows = computed(() => {
  const c = geocoder.counts.value;
  return [
    { key: "placed", label: STATUS_LABELS.placed, count: c.placed, meaning: STATUS_MEANING.placed },
    { key: "approx", label: STATUS_LABELS.approx, count: c.approx, meaning: STATUS_MEANING.approx },
    { key: "check", label: STATUS_LABELS.check, count: c.check, meaning: STATUS_MEANING.check },
    { key: "none", label: STATUS_LABELS.none, count: c.none + c.error, meaning: STATUS_MEANING.none },
    { key: "skipped", label: STATUS_LABELS.skipped, count: c.skipped, meaning: STATUS_MEANING.skipped }
  ];
});

const downloadLabel = computed(() => {
  const n = geocoder.fillable.value.length;
  if (n === 0) return "No pins to download";
  return `Download CSV with ${n.toLocaleString()} ${n === 1 ? "pin" : "pins"}`;
});

// Theme: follow the OS until the user picks one, as the Kinabase client does
const THEME_KEY = "geocoder:theme";
const readTheme = (): "light" | "dark" => {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    // ignore
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};
const theme = ref(readTheme());
const toggleTheme = () => {
  theme.value = theme.value === "dark" ? "light" : "dark";
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(theme.value);
  try {
    localStorage.setItem(THEME_KEY, theme.value);
  } catch {
    // ignore
  }
};
</script>

<style scoped lang="scss">
.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  color: #fff;
  font-size: 0.95rem;
  margin-left: 0.25rem;
  background: var(--k-color-primary) linear-gradient(180deg, var(--k-color-l-05-primary), var(--k-color-d-05-primary));
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.2);
}

/* Below the toolbar the view is a panel beside a table, each scrolling on its own */
.layout {
  display: flex;
  align-items: stretch;
  height: calc(100% - var(--k-toolbar-height));
  min-height: 0;
}

.main-area {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: auto;
}

/* ---- Info panel: lifted from the record page's panel ---- */
.info-panel {
  position: relative;
  width: 340px;
  flex-shrink: 0;
  padding: 12px 6px 14px 12px;
  box-sizing: border-box;
}

.info-panel-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--k-panel-background);
  border-radius: var(--k-card-radius);
  padding: 8px 0 0;
  overflow: hidden;
  box-shadow: 0 0 0 1px var(--k-card-border);
}

.info-panel-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-height: 0;
  padding: 2px 10px 10px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}

.section-card {
  border: 1px solid var(--k-hairline);
  border-radius: 8px;
  background: var(--k-card-background);
  box-shadow: 0 1px 1px rgba(16, 24, 40, 0.03);
  padding: 11px 12px 12px;
  font-size: 13px;
  line-height: 1.4;
}

.card-warning {
  border-color: var(--k-color-t-50-warning);
  background: var(--k-color-t-10-warning);
}

.card-warning .section-title > .icon {
  color: var(--k-color-d-10-warning);
}

.card-next {
  border-color: var(--k-color-t-50-success);
}

.card-next .section-title > .icon {
  color: var(--k-color-success);
}

h6.section-title {
  display: flex;
  align-items: center;
  gap: 7px;
  min-height: 18px;
  font-size: 12.2px;
  text-transform: none;
  letter-spacing: -0.005em;
  color: var(--k-color);
  font-weight: 650;
  line-height: 1.2;
  margin: 0;
  padding: 0 0 8px;
}

h6.section-title > .icon {
  color: var(--k-color-secondary);
  font-size: 12px;
}

.section-card .form-control-container + .form-control-container {
  margin-top: 10px;
}

/* A card's actions: quiet full-width rows under a hairline; a filled button keeps to the content's edges */
.button-group {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin: 10px -7px -6px;
  padding-top: 5px;
}

.button-group::before {
  content: "";
  position: absolute;
  top: 0;
  left: 7px;
  right: 7px;
  border-top: 1px solid var(--k-hairline);
}

.button-group :deep(.btn) {
  justify-content: flex-start;
  width: 100%;
  min-height: 27px;
  padding: 2px 7px;
  border-radius: 6px;
  font-size: 13px;
  text-align: left;
}

.button-group :deep(.btn-primary) {
  width: auto;
  margin: 4px 7px 5px;
  justify-content: center;
}

.button-group :deep(.btn-primary .btn-content) {
  justify-content: center;
}

.file-summary {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.file-change-compact {
  display: none;
}

.file-name {
  font-weight: 600;
}

.file-meta {
  font-size: 12px;
  color: var(--k-color-secondary);
}

.progress-slim :deep(.progress),
.progress-slim {
  height: 8px;
}

.progress-text {
  font-size: 12px;
  color: var(--k-color-secondary);
  font-variant-numeric: tabular-nums;
}

/* The card's figures: one tinted box, label left and value right */
dl.stat-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin: 10px 0 0;
  padding: 7px 9px;
  border-radius: 6px;
  background: var(--k-background-widget);
  font-size: 12.5px;
  line-height: 1.35;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.stat-row dt {
  font-weight: 400;
  color: var(--k-color-secondary);
}

.stat-row dd {
  margin: 0;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.stat-placed dd {
  color: var(--k-color-d-05-success);
}
.stat-approx dd {
  color: var(--k-color-d-05-info);
}
.stat-check dd {
  color: var(--k-color-d-10-warning);
}
.stat-none dd {
  color: var(--k-color-d-05-danger);
}

.form-check-label {
  font-size: 12.5px;
}

.steps {
  margin: 0;
  padding-left: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

/* ---- Empty state ---- */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 24px;
  max-width: 820px;
  width: 100%;
  margin: 0 auto;
}

.empty-state :deep(.drop-zone) {
  width: 100%;
  min-height: 46vh;
}

.empty-hint {
  max-width: 560px;
  text-align: center;
  margin-top: 1.25rem;
  font-size: 13px;
}

.alert-inline {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.5rem 0.7rem;
  border-radius: 6px;
  font-size: 12.5px;
}

.alert-danger {
  background: var(--k-color-t-10-danger);
  color: var(--k-color-d-10-danger);
}

.alert-warning {
  background: var(--k-color-t-25-warning);
  color: var(--k-color-d-15-warning);
}

/* ---- Motion: the shared layout curve ---- */
.panel-enter-active {
  transition:
    opacity 0.18s ease,
    transform 0.2s var(--k-layout-ease);
}
.panel-enter-from {
  opacity: 0;
  transform: translateX(-8px);
}

.rise-enter-active {
  transition:
    opacity 0.2s ease,
    transform 0.22s var(--k-layout-ease);
}
.rise-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.swap-enter-active,
.swap-leave-active {
  transition: opacity 0.14s ease;
}
.swap-enter-from,
.swap-leave-to {
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ---- Narrow screens: the panel sits above the table as a compact grid of cards ---- */
@media (max-width: 900px) {
  .layout {
    flex-direction: column;
    height: auto;
    min-height: calc(100% - var(--k-toolbar-height));
  }

  .main-area {
    overflow: visible;
    flex: 0 0 auto;
  }

  .info-panel {
    width: 100%;
    padding: 10px 10px 0;
  }

  .info-panel-inner {
    height: auto;
    overflow: visible;
  }

  .info-panel-body {
    display: grid;
    grid-template-columns: 1fr 1fr;
    overflow: visible;
    padding: 2px 8px 8px;
  }

  .card-file,
  .card-warning,
  .card-next {
    grid-column: 1 / -1;
  }

  /* The file card is one line: name, count and a close icon */
  .card-file .section-title {
    display: none;
  }

  .card-file {
    padding: 8px 10px;
  }

  .file-change-compact {
    display: inline-flex;
  }

  .file-change-full {
    display: none;
  }

  .empty-state :deep(.drop-zone) {
    min-height: 40vh;
  }
}

@media (max-width: 600px) {
  .info-panel-body {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .panel-enter-active,
  .rise-enter-active,
  .swap-enter-active,
  .swap-leave-active {
    transition: none;
  }
}
</style>
