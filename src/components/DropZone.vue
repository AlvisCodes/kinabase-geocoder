<template>
  <div
    class="drop-zone"
    :class="{ 'is-over': isOver, 'is-busy': busy }"
    role="button"
    tabindex="0"
    aria-label="Choose a CSV file"
    @click="open"
    @keydown.enter.prevent="open"
    @keydown.space.prevent="open"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent="onDragOver"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop">
    <input ref="input" type="file" accept=".csv,text/csv" class="d-none" @change="onPick" />
    <div class="drop-zone-art" aria-hidden="true">
      <div class="drop-zone-sheet">
        <span v-for="n in 4" :key="n" class="drop-zone-line" :style="{ width: `${[72, 56, 64, 40][n - 1]}%` }" />
      </div>
      <div class="drop-zone-pin">
        <k-icon icon="map-pin" />
      </div>
    </div>
    <div class="drop-zone-title">{{ isOver ? "Drop to load" : "Drop a Kinabase address export here" }}</div>
    <div class="drop-zone-hint">or <span class="link">browse for a CSV</span></div>
    <k-spinner v-if="busy" class="mt-2" show-instantly />
  </div>
</template>

<script setup lang="ts">
import KIcon from "./KIcon.vue";
import KSpinner from "./KSpinner.vue";

import { ref } from "vue";

defineProps<{
  /** Whether a file is currently being read */
  busy?: boolean;
}>();

const emit = defineEmits<{
  (event: "file", file: File): void;
}>();

const input = ref<HTMLInputElement>();
const isOver = ref(false);
// Nested elements fire enter/leave pairs; counting keeps the highlight steady across them
let depth = 0;

const open = () => input.value?.click();

const onPick = (evt: Event) => {
  const target = evt.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) emit("file", file);
  target.value = "";
};

const onDragEnter = () => {
  depth++;
  isOver.value = true;
};
const onDragOver = (evt: DragEvent) => {
  if (evt.dataTransfer) evt.dataTransfer.dropEffect = "copy";
};
const onDragLeave = () => {
  depth = Math.max(0, depth - 1);
  if (depth === 0) isOver.value = false;
};
const onDrop = (evt: DragEvent) => {
  depth = 0;
  isOver.value = false;
  const file = evt.dataTransfer?.files?.[0];
  if (file) emit("file", file);
};
</script>

<style scoped lang="scss">
.drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2.75rem 1.5rem;
  border: 1.5px dashed var(--k-border);
  border-radius: var(--k-card-radius);
  background: var(--k-background-widget);
  color: var(--k-color-secondary);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease,
    transform 0.15s var(--k-layout-ease);
  outline-offset: 4px;

  &:hover {
    border-color: var(--k-color-l-10-primary);
    background: var(--k-background-widget-hover);
  }

  &.is-over {
    border-color: var(--k-color-primary);
    border-style: solid;
    background: var(--k-color-t-10-primary);
    transform: scale(1.005);
  }

  &.is-busy {
    pointer-events: none;
  }
}

.drop-zone-art {
  position: relative;
  width: 84px;
  height: 84px;
  margin-bottom: 1.25rem;
}

.drop-zone-sheet {
  position: absolute;
  inset: 4px 10px 0 6px;
  border-radius: 6px;
  background: var(--k-card-background);
  border: 1px solid var(--k-border);
  box-shadow: var(--k-card-shadow);
  padding: 10px 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: transform 0.2s var(--k-layout-ease);
}

.drop-zone-line {
  display: block;
  height: 4px;
  border-radius: 2px;
  background: var(--k-border);
}

.drop-zone-pin {
  position: absolute;
  right: -6px;
  bottom: -2px;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 1rem;
  background: var(--k-color-primary) linear-gradient(180deg, var(--k-color-l-05-primary), var(--k-color-d-05-primary));
  box-shadow: 0 2px 6px rgba(16, 24, 40, 0.25);
  transition: transform 0.2s var(--k-layout-ease);
}

.drop-zone:hover .drop-zone-sheet,
.drop-zone.is-over .drop-zone-sheet {
  transform: translateY(-2px) rotate(-3deg);
}

.drop-zone:hover .drop-zone-pin,
.drop-zone.is-over .drop-zone-pin {
  transform: translateY(-3px) scale(1.08);
}

.drop-zone-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--k-color);
}

.drop-zone-hint {
  margin-top: 0.3rem;
  font-size: 0.9rem;
}

.link {
  color: var(--k-color-link);
  text-decoration: underline;
  text-underline-offset: 3px;
}
</style>
