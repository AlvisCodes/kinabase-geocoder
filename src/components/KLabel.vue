<template>
  <label v-if="id" :for="id" class="label">{{ label }}</label>
  <div v-else class="label">{{ label }}</div>
</template>

<script setup lang="ts">
defineProps<{
  /** ID of element to link to */
  id?: string;
  /** Label text */
  label: string;
}>();
</script>

<style scoped>
.label {
  font-size: 0.75em;
  text-transform: uppercase;
  color: var(--k-label-color);
  font-weight: 600;
  display: block;
  margin-bottom: 0.5rem;
  line-height: 1;
  user-select: none;
}
</style>
