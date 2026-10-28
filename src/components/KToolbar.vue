<template>
  <div class="toolbar d-flex px-2">
    <div class="toolbar-start">
      <slot name="start"></slot>
      <div class="toolbar-label ps-2">
        <div class="toolbar-title">{{ title }}</div>
        <div v-if="subtitle" class="toolbar-subtitle">{{ subtitle }}</div>
      </div>
    </div>
    <div class="toolbar-end d-flex align-items-center gap-1">
      <slot name="end"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  /** Title for toolbar */
  title: string;
  /** Subtitle for toolbar */
  subtitle?: string;
}>();
</script>

<style scoped lang="scss">
.toolbar {
  height: var(--k-toolbar-height);
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  left: 0;
  background: var(--k-background-translucent-10);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  z-index: 9000;
  user-select: none;
  flex-shrink: 0;
  border-bottom: 1px solid var(--k-hairline);

  & :deep(.btn) {
    font-size: 0.9rem;
    box-sizing: border-box;
  }
}

.toolbar-start {
  display: flex;
  align-items: center;
  flex-shrink: 1;
  overflow: hidden;
  min-width: 200px;
}

.toolbar-label {
  cursor: default;
  position: relative;
  min-width: 50px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.toolbar-title {
  font-size: 15px;
  color: var(--k-color);
  line-height: 20px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toolbar-subtitle {
  font-size: 11px;
  color: var(--k-color-secondary);
  line-height: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toolbar-end {
  white-space: nowrap;
  flex-shrink: 0;
}
</style>
