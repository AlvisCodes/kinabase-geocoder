<template>
  <div class="settings-wrapper">
    <k-button icon="cog" variant="transparent" title="Settings" :pressed="open" @click="open = !open" />
    <transition name="pop">
      <div v-if="open" ref="panel" class="settings-panel">
        <div class="settings-heading">Settings</div>
        <div class="form-control-container">
          <k-label id="api-key" label="HERE API key" />
          <input id="api-key" v-model.trim="settings.apiKey" type="password" class="form-control form-control-sm" autocomplete="off" data-1p-ignore="true" />
          <p class="text-description mt-1">
            <template v-if="DEFAULT_HERE_API_KEY">
              A key is built in, so this can be left alone.
              <a v-if="settings.apiKey !== DEFAULT_HERE_API_KEY" href="#" @click.prevent="settings.apiKey = DEFAULT_HERE_API_KEY">Use the built-in key</a>
            </template>
            <template v-else>This copy of the tool has no key built in. Paste one here; it is remembered in this browser only.</template>
          </p>
        </div>
        <div class="form-control-container mt-3">
          <div class="form-check form-switch">
            <input id="include-title" v-model="settings.includeTitle" class="form-check-input" type="checkbox" />
            <label class="form-check-label" for="include-title">Include the title column in the search</label>
          </div>
          <p class="text-description">Helps when the title is a building or business name. Leave off when it's a person's name.</p>
        </div>
        <div class="form-control-container mt-2">
          <div class="form-check form-switch">
            <input id="overwrite" v-model="settings.overwriteExisting" class="form-check-input" type="checkbox" />
            <label class="form-check-label" for="overwrite">Re-check rows that already have coordinates</label>
          </div>
        </div>
        <div class="form-control-container mt-2">
          <div class="form-check form-switch">
            <input id="diagnostics" v-model="settings.includeDiagnostics" class="form-check-input" type="checkbox" />
            <label class="form-check-label" for="diagnostics">Add match and score columns to the download</label>
          </div>
          <p class="text-description">Handy for checking, but leave them unmapped when importing.</p>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import KButton from "./KButton.vue";
import KLabel from "./KLabel.vue";

import { onBeforeUnmount, onMounted, ref } from "vue";

import { DEFAULT_HERE_API_KEY } from "@/lib/geocode";

import type { GeocoderSettings } from "@/lib/geocoder";

defineProps<{
  /** Reactive settings object shared with the geocoder */
  settings: GeocoderSettings;
}>();

const open = ref(false);
const panel = ref<HTMLElement>();

const onDocumentClick = (evt: MouseEvent) => {
  if (!open.value) return;
  const target = evt.target as Node;
  const wrapper = panel.value?.parentElement;
  if (wrapper && !wrapper.contains(target)) open.value = false;
};

const onKey = (evt: KeyboardEvent) => {
  if (evt.key === "Escape") open.value = false;
};

onMounted(() => {
  document.addEventListener("mousedown", onDocumentClick);
  document.addEventListener("keydown", onKey);
});
onBeforeUnmount(() => {
  document.removeEventListener("mousedown", onDocumentClick);
  document.removeEventListener("keydown", onKey);
});
</script>

<style scoped lang="scss">
.settings-wrapper {
  position: relative;
}

.settings-panel {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  width: 320px;
  padding: 0.9rem 1rem 1rem;
  border-radius: 8px;
  background: var(--k-dropdown-background);
  border: 1px solid var(--k-dropdown-border-color);
  box-shadow: var(--k-dropdown-shadow);
  z-index: 10;
  text-align: left;
  user-select: text;
  transform-origin: top right;
}

.settings-heading {
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
}

.form-check-label {
  font-size: 0.85rem;
}

.pop-enter-active,
.pop-leave-active {
  transition:
    opacity 0.12s ease,
    transform 0.12s var(--k-layout-ease);
}
.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: scale(0.97) translateY(-4px);
}
</style>
