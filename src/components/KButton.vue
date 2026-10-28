<template>
  <button type="button" :class="classes" :disabled="disabled || loading" :aria-pressed="pressed" :title="title ? title : label" @click="onClick">
    <slot>
      <span class="btn-content">
        <i v-if="loading && !iconRight" class="icon fa-fw btn-spinner" :class="textClasses">
          <k-spinner size="sm" :variant="spinnerVariant" show-instantly />
        </i>
        <k-icon v-else-if="!!icon && !iconRight" :icon fixed-width :class="textClasses" />
        <span v-if="label" class="text-start flex-grow-1" :class="textClasses">{{ label }}</span>
        <i v-if="loading && iconRight" class="icon fa-fw btn-spinner" :class="textClasses">
          <k-spinner size="sm" :variant="spinnerVariant" show-instantly />
        </i>
        <k-icon v-else-if="!!icon && iconRight" :icon fixed-width :class="textClasses" />
      </span>
    </slot>
  </button>
</template>

<script setup lang="ts">
import KIcon from "./KIcon.vue";
import KSpinner from "./KSpinner.vue";

import { computed } from "vue";

type Variant = "primary" | "secondary" | "success" | "danger" | "warning" | "info" | "transparent" | "transparent-primary" | "dashed" | "outline-secondary" | "link";
type Size = "2xs" | "xs" | "sm" | "md" | "lg";

const props = withDefaults(
  defineProps<{
    /** Displayed label for button */
    label?: string;
    /** Variant colour of button */
    variant?: Variant;
    /** Size of the button */
    size?: Size;
    /** Whether button can be clicked */
    disabled?: boolean;
    /** Whether the button should be shown as pressed */
    pressed?: boolean;
    /** Show a loading spinner in place of the icon */
    loading?: boolean;
    /** Icon to display in the button */
    icon?: string;
    /** Whether the icon should sit to the right of the text */
    iconRight?: boolean;
    /** Tooltip (defaults to label) */
    title?: string;
  }>(),
  {
    label: undefined,
    variant: "secondary",
    size: "sm",
    icon: undefined,
    title: undefined
  }
);

const emit = defineEmits<{
  (event: "click", evt: MouseEvent): void;
}>();

const classes = computed(() => {
  const is2xs = props.size === "2xs";
  const isXs = props.size === "xs";
  const hasLeadingContent = props.loading ? !props.iconRight : !!props.icon && !props.iconRight;
  const hasTrailingContent = props.loading ? props.iconRight : !!props.icon && props.iconRight;
  const padStart = is2xs ? !props.icon : hasLeadingContent;
  const padEnd = is2xs ? !!props.label : isXs || hasTrailingContent;

  return {
    btn: true,
    [`btn-${props.size}`]: true,
    [`btn-${props.variant}`]: true,
    active: props.pressed,
    disabled: props.disabled || props.loading,
    "px-1 py-1": is2xs || isXs,
    "ps-2": padStart,
    "pe-2": padEnd
  };
});

const spinnerVariant = computed<"dark" | "light">(() =>
  props.variant === "transparent" || props.variant === "dashed" || props.variant === "secondary" || props.variant === "outline-secondary" ? "dark" : "light"
);

const textClasses = computed(() => {
  if (props.size === "2xs") return "btn-text-2xs";
  if (props.size === "xs") return "btn-text-xs";
  return "btn-text";
});

const gapBySize: Record<Size, string> = {
  "2xs": "0.125rem",
  xs: "0.25rem",
  sm: "0.5rem",
  md: "0.75rem",
  lg: "1rem"
};

const gap = computed(() => gapBySize[props.size]);

const onClick = (evt: MouseEvent) => {
  if (!props.disabled) emit("click", evt);
  else evt.preventDefault();
};
</script>

<style scoped>
.btn-content {
  display: flex;
  align-items: center;
  position: relative;
  gap: v-bind(gap);
  pointer-events: none;
}

.btn-spinner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-content :deep(.btn-spinner > .spinner > svg) {
  height: 1.25em;
  width: 1.25em;
}
</style>
