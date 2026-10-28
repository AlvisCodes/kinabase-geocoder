<template>
  <i class="icon" :class="{ 'fa-fw': fixedWidth }" aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <template v-for="(d, i) in paths" :key="i">
        <path :d="d" />
      </template>
    </svg>
  </i>
</template>

<script setup lang="ts">
import { computed } from "vue";

/** A small inline icon set in place of the icon font, drawn in the same 1em box */
const ICONS: Record<string, string[]> = {
  upload: ["M12 16V4", "m6 10 6-6 6 6", "M4 20h16"],
  download: ["M12 4v12", "m6 10 6 6 6-6", "M4 20h16"],
  "file-csv": ["M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z", "M14 3v6h6", "M8 13h8", "M8 17h5"],
  "map-pin": ["M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z", "M12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"],
  check: ["m5 12 5 5L20 7"],
  close: ["M18 6 6 18", "m6 6 12 12"],
  warning: ["M12 3 2 20h20z", "M12 10v4", "M12 17.5h.01"],
  play: ["m7 4 12 8-12 8z"],
  stop: ["M6 6h12v12H6z"],
  redo: ["M21 12a9 9 0 1 1-3-6.7", "M21 4v5h-5"],
  cog: [
    "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
    "M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"
  ],
  sun: ["M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z", "M12 2v2", "M12 20v2", "m4.9 4.9 1.4 1.4", "m17.7 17.7 1.4 1.4", "M2 12h2", "M20 12h2", "m6.3 17.7-1.4 1.4", "m19.1 4.9-1.4 1.4"],
  moon: ["M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"],
  "chevron-down": ["m6 9 6 6 6-6"],
  "chevron-right": ["m9 6 6 6-6 6"],
  globe: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M2 12h20", "M12 2a15 15 0 0 1 0 20", "M12 2a15 15 0 0 0 0 20"],
  table: ["M4 5h16v14H4z", "M4 10h16", "M4 15h16", "M10 5v14"],
  skip: ["M5 5v14", "m8 12 11-7v14z"],
  info: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M12 16v-4", "M12 8h.01"],
  key: ["m21 2-2 2", "M15.5 7.5 19 4", "M15.5 7.5a5 5 0 1 1-7-.3 5 5 0 0 1 7 .3z", "m14 9 7-7"],
  minus: ["M5 12h14"]
};

const props = defineProps<{
  /** Icon name from the inline set */
  icon: string;
  /** Reserve a fixed-width box, as fa-fw does */
  fixedWidth?: boolean;
}>();

const paths = computed(() => ICONS[props.icon] ?? ICONS.info);
</script>

<style scoped>
.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25em;
  height: 1em;
  line-height: 1;
  vertical-align: -0.125em;
}

.icon > svg {
  width: 1.05em;
  height: 1.05em;
}
</style>
