<template>
  <div class="progress" role="progressbar" :aria-valuenow="percent" aria-valuemin="0" aria-valuemax="100">
    <div v-show="percent > 0" class="progress-bar" :class="classes" :style="`width: ${percent}%`">
      <slot>
        <b v-if="!hideLabel && percent > 4">{{ percent }}%</b>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  /** The current progress percentage */
  percent: number;
  /** The colour variant of the progress bar */
  variant?: "primary" | "success" | "warning" | "danger" | "info";
  /** Whether the stripes should move */
  animated?: boolean;
  /** Hide the percentage label */
  hideLabel?: boolean;
}>();

const classes = computed(() => {
  const res: Record<string, boolean | undefined> = {
    "progress-bar-animated": props.animated,
    "progress-bar-striped": props.percent < 100
  };
  if (props.variant) res[`bg-${props.variant}`] = true;
  return res;
});
</script>

<style scoped>
.progress {
  height: 1.5rem;
  font-size: 0.8rem;
  background-color: var(--k-input-background);
  box-shadow: inset 1px 1px 4px rgba(0, 0, 0, 0.1);
}

.progress-bar {
  position: relative;
  border-radius: 2px;
  box-shadow: 1px 1px 4px rgba(0, 0, 0, 0.1);
  text-shadow: 1px 1px 4px rgba(0, 0, 0, 0.4);
  transition: all 0.6s ease;
}

.progress-bar::after {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  background: linear-gradient(-180deg, rgba(255, 255, 255, 0.2) 0%, transparent 100%);
}
</style>
