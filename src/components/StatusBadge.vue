<template>
  <span class="status" :class="`status-${status}`" :title="title">
    <k-icon :icon="meta.icon" />
    <span>{{ meta.label }}</span>
  </span>
</template>

<script setup lang="ts">
import KIcon from "./KIcon.vue";

import { computed } from "vue";

import { STATUS_LABELS } from "@/lib/statusLabels";

import type { RowStatus } from "@/lib/geocoder";

const props = defineProps<{
  /** The row's outcome */
  status: RowStatus;
  /** Tooltip explaining the outcome */
  title?: string;
}>();

const META: Record<RowStatus, { label: string; icon: string }> = {
  pending: { label: STATUS_LABELS.pending, icon: "minus" },
  skipped: { label: STATUS_LABELS.skipped, icon: "skip" },
  placed: { label: STATUS_LABELS.placed, icon: "check" },
  approx: { label: STATUS_LABELS.approx, icon: "map-pin" },
  check: { label: STATUS_LABELS.check, icon: "warning" },
  none: { label: STATUS_LABELS.none, icon: "close" },
  error: { label: STATUS_LABELS.error, icon: "warning" }
};

const meta = computed(() => META[props.status]);
</script>

<style scoped>
.status {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.1rem 0.5rem 0.1rem 0.35rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
  background: var(--k-color-t-10-secondary);
  color: var(--k-color-secondary);
}

.status-placed {
  background: var(--k-color-t-10-success);
  color: var(--k-color-d-10-success);
}

.status-approx {
  background: var(--k-color-t-10-info);
  color: var(--k-color-d-10-info);
}

.status-check {
  background: var(--k-color-t-25-warning);
  color: var(--k-color-d-15-warning);
}

.status-none,
.status-error {
  background: var(--k-color-t-10-danger);
  color: var(--k-color-d-10-danger);
}

.status-pending {
  color: var(--k-color-faint);
}

:root.dark .status-placed,
:root.dark .status-approx,
:root.dark .status-check,
:root.dark .status-none,
:root.dark .status-error {
  filter: brightness(1.35);
}

@media (prefers-color-scheme: dark) {
  :root:not(.light) .status-placed,
  :root:not(.light) .status-approx,
  :root:not(.light) .status-check,
  :root:not(.light) .status-none,
  :root:not(.light) .status-error {
    filter: brightness(1.35);
  }
}
</style>
