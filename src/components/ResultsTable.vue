<template>
  <div class="table-view-container">
    <!-- Filter strip in the tab style of a record page -->
    <div class="tab-header-wrap">
      <ul class="tab-header" role="tablist">
        <li
          v-for="f in filters"
          :key="f.key"
          class="tab-item"
          :class="{ active: filter === f.key, disabled: f.count === 0 && f.key !== 'all' }"
          role="tab"
          :tabindex="filter === f.key ? 0 : -1"
          :aria-selected="filter === f.key"
          :title="f.meaning"
          @click="select(f.key, f.count)"
          @keydown.enter.prevent="select(f.key, f.count)">
          <a class="tab-link">{{ f.label }}<span class="count">{{ f.count }}</span></a>
        </li>
      </ul>
      <div class="table-note">{{ visible.length === filtered.length ? `${filtered.length} rows` : `First ${visible.length} of ${filtered.length} rows` }}</div>
    </div>

    <div class="table-view">
      <div class="table-header contained">
        <div class="table-column col-index">#</div>
        <div class="table-column col-query">Address in file</div>
        <div class="table-column col-status">Outcome</div>
        <div class="table-column col-found">What was found</div>
        <div class="table-column col-why">Why</div>
      </div>

      <div class="table-body">
        <div v-for="r in visible" :key="r.index" class="table-row" :class="`row-${r.status}`">
          <div class="table-row-content">
            <div class="table-cell col-index numeric text-secondary">{{ r.index + 1 }}</div>
            <div class="table-cell col-query">
              <span v-if="r.query" :title="r.query">{{ r.query }}</span>
              <span v-else class="text-faint">(empty)</span>
            </div>
            <div class="table-cell col-status"><status-badge :status="r.status" :title="STATUS_MEANING[r.status]" /></div>
            <div class="table-cell col-found">
              <span v-if="r.hit" :title="`${r.hit.label} (${r.hit.lat.toFixed(5)}, ${r.hit.lng.toFixed(5)})`">{{ r.hit.label }}</span>
              <span v-else-if="r.status === 'pending'" class="text-faint">{{ running ? "Searching…" : "" }}</span>
              <span v-else class="text-faint">Nothing</span>
            </div>
            <div class="table-cell col-why text-secondary" :title="r.reason">{{ r.reason ?? "" }}</div>
          </div>
        </div>
        <div v-if="filtered.length === 0" class="py-3 px-2 text-secondary">No rows match this filter</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import StatusBadge from "./StatusBadge.vue";

import { computed, ref } from "vue";

import { STATUS_LABELS, STATUS_MEANING } from "@/lib/statusLabels";

import type { RowResult, RowStatus } from "@/lib/geocoder";

const props = defineProps<{
  /** Every row's result */
  results: RowResult[];
  /** Whether a search is in progress */
  running?: boolean;
}>();

type FilterKey = "all" | RowStatus;

const filter = ref<FilterKey>("all");
const LIMIT = 500;

const countOf = (status: RowStatus) => props.results.filter((r) => r.status === status).length;

const filters = computed<{ key: FilterKey; label: string; count: number; meaning: string }[]>(() => {
  const all = { key: "all" as const, label: "All", count: props.results.length, meaning: "Every row in the file" };
  const statuses: RowStatus[] = ["placed", "approx", "check", "none", "error", "skipped"];
  const rest = statuses
    .map((s) => ({ key: s, label: STATUS_LABELS[s], count: countOf(s), meaning: STATUS_MEANING[s] }))
    // Only outcomes that happened get a tab, so a clean run shows two tabs rather than six
    .filter((f) => f.count > 0);
  return [all, ...rest];
});

const select = (key: FilterKey, count: number) => {
  if (count === 0 && key !== "all") return;
  filter.value = key;
};

const filtered = computed(() => {
  if (filter.value === "all") return props.results;
  const matches = props.results.filter((r) => r.status === filter.value);
  // A tab whose outcome has gone (after a retry) falls back to everything rather than an empty table
  return matches.length > 0 ? matches : props.results;
});

const visible = computed(() => filtered.value.slice(0, LIMIT));
</script>

<style scoped lang="scss">
/* The column template the header and every row share */
$columns: 44px minmax(200px, 1.1fr) 128px minmax(200px, 1.2fr) minmax(180px, 1fr);

.table-view-container {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding: 0 8px 8px;
}

/* ---- Filter strip: KTabView ---- */
.tab-header-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 6px;
  box-shadow: inset 0 -1px 0 var(--k-border);
  flex-shrink: 0;
}

.tab-header {
  list-style: none;
  margin: 0 0 0 -0.4rem;
  padding: 0 0 0 0.4rem;
  white-space: nowrap;
  overflow-x: auto;
  scrollbar-width: none;
  flex: 1 1 auto;
  min-width: 0;

  &::-webkit-scrollbar {
    display: none;
  }
}

.tab-item {
  margin: 0 1.4rem 0 0;
  display: inline-block;
  border-bottom: 2px solid transparent;
  transition: ease-in-out border 0.05s;
  outline: none;
  user-select: none;
  cursor: default;
  position: relative;

  a {
    text-decoration: none;
    color: var(--k-color-secondary);
    font-weight: 600;
    line-height: 2.5rem;
    display: block;
    transition: ease-in-out color 0.05s;
    margin: 0 -0.4rem;
    padding: 0 0.4rem;
    cursor: default;
    position: relative;
    isolation: isolate;
  }

  /* Keyboard focus is a soft pill behind the label, not a ring across the underline */
  &:focus-visible a::before {
    content: "";
    position: absolute;
    inset: 0.4rem 0;
    border-radius: 0.375rem;
    background: color-mix(in srgb, var(--k-color-link) 10%, transparent);
    z-index: -1;
  }

  &:hover,
  &:focus-visible {
    border-bottom: 2px solid var(--k-color-secondary);
    &.disabled {
      border-bottom: 2px solid transparent;
    }
  }

  &.active::after {
    content: "";
    position: absolute;
    bottom: -2px;
    left: 0;
    right: 0;
    border-bottom: 2px solid var(--k-color-link);
    z-index: 1;
  }

  &.active a {
    color: var(--k-color-link);
  }

  &.disabled a {
    color: var(--k-input-disabled-border);
  }
}

.count {
  margin-left: 0.4rem;
  padding: 0.05rem 0.4rem;
  border-radius: 999px;
  background: var(--k-color-t-10-secondary);
  color: var(--k-color-secondary);
  font-size: 0.72rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.tab-item.active .count {
  background: color-mix(in srgb, var(--k-color-link) 12%, transparent);
  color: var(--k-color-link);
}

.table-note {
  font-size: 0.75rem;
  color: var(--k-color-secondary);
  white-space: nowrap;
  flex-shrink: 0;
}

.table-view {
  min-width: 100%;
  padding: 0 0 8px;
  user-select: none;
}

/* ---- Header: KTableHeader ---- */
.table-header {
  display: grid;
  grid-template-columns: $columns;
  position: sticky;
  top: 0;
  z-index: 21;
  height: 38px;
  white-space: nowrap;
  background-color: var(--k-background-translucent);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
}

.table-header.contained::before {
  content: "";
  position: absolute;
  bottom: -3px;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(var(--k-overflow-shadow-color), transparent);
  border-top: var(--k-overflow-border);
}

.table-header > .table-column {
  font-size: 0.8rem;
  font-weight: 400;
  color: var(--k-color-secondary);
  height: 38px;
  line-height: 38px;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  padding-right: 0.5rem;
}

.table-header > div:first-of-type {
  padding-left: 0.5rem;
}

/* ---- Rows: KTableRow + KTableCell ---- */
.table-body {
  padding: 4px 0;
}

.table-row {
  position: relative;
  border-radius: 6px;
  margin-bottom: 1px;
  white-space: nowrap;

  &::after {
    content: "";
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    border-bottom: 1px dashed var(--k-border);
    z-index: 0;
  }
}

.table-row-content {
  display: grid;
  grid-template-columns: $columns;
  align-items: center;
  border-radius: 6px;
  position: relative;
  z-index: 1;

  &:hover {
    background: var(--k-navbar-item-hover-background);
  }
}

.table-cell {
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  min-height: 32px;
  line-height: 32px;
  padding: 0 8px 0 0;
  user-select: text;
}

.table-cell:first-of-type {
  padding-left: 0.5rem;
}

.table-cell:last-of-type {
  padding-right: 0.45rem;
}

.numeric {
  font-variant-numeric: tabular-nums;
  text-align: right;
  padding-right: 1rem;
}

.row-pending .table-cell {
  color: var(--k-color-secondary);
}

.text-faint {
  color: var(--k-color-faint);
}

/* ---- Narrow screens: each row becomes a two-line card ---- */
@media (max-width: 760px) {
  .tab-item {
    margin-right: 1rem;
  }

  .table-header {
    display: none;
  }

  .table-row {
    white-space: normal;
  }

  .table-row-content {
    grid-template-columns: 1fr auto;
    grid-template-areas:
      "query status"
      "found found"
      "why why";
    padding: 8px 8px 8px 10px;
    row-gap: 2px;
  }

  .table-cell {
    min-height: 0;
    line-height: 1.35;
    padding: 0;
    white-space: normal;
  }

  .table-cell:first-of-type {
    padding-left: 0;
  }

  .col-index {
    display: none;
  }

  .col-query {
    grid-area: query;
    font-weight: 600;
    padding-right: 8px;
  }

  .col-status {
    grid-area: status;
    justify-self: end;
  }

  .col-found {
    grid-area: found;
  }

  .col-why {
    grid-area: why;
    font-size: 0.78rem;
  }
}
</style>
