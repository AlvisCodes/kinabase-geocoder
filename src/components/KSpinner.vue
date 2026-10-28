<template>
  <span v-show="showSpinner" role="status" :class="classes">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid">
      <circle cx="50" cy="50" fill="none" stroke-width="10" r="35" stroke-dasharray="165 56">
        <animateTransform attributeName="transform" attributeType="XML" type="rotate" from="0 50 50" to="360 50 50" dur="0.75s" repeatCount="indefinite" />
      </circle>
    </svg>
    <span class="visually-hidden">{{ label }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

const props = withDefaults(
  defineProps<{
    /** Hidden label text (for screen readers) */
    label?: string;
    /** Colour of spinner: light is white, dark takes the surrounding text colour */
    variant?: "light" | "dark";
    /** Size of spinner */
    size?: "xs" | "sm" | "md" | "lg";
    /** Show immediately instead of after a short delay */
    showInstantly?: boolean;
  }>(),
  {
    label: "Loading...",
    variant: undefined,
    size: "sm",
    showInstantly: false
  }
);

// eslint-disable-next-line vue/no-setup-props-reactivity-loss
const showSpinner = ref(props.showInstantly);
// Show after 200ms so quick operations never flash a spinner
setTimeout(() => (showSpinner.value = true), 200);

const classes = computed(() => ({
  spinner: true,
  "spinner-light": props.variant === "light",
  "spinner-dark": props.variant === "dark",
  [`spinner-${props.size}`]: true
}));
</script>

<style scoped lang="scss">
.spinner {
  display: inline-flex;
  > svg {
    height: 1.75rem;
    width: 1.75rem;
    animation: spinnerFadeIn 1.5s;
    > circle {
      stroke: var(--k-color-secondary);
    }
  }
}

.spinner.spinner-light > svg > circle {
  stroke: #fff;
}

.spinner.spinner-dark > svg > circle {
  stroke: currentColor;
}

.spinner-xs > svg {
  height: 1rem;
  width: 1rem;
}

.spinner-sm > svg {
  height: 1.25rem;
  width: 1.25rem;
}

.spinner-lg > svg {
  height: 2.5rem;
  width: 2.5rem;
}

@keyframes spinnerFadeIn {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}
</style>
