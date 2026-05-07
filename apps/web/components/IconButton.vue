<script setup lang="ts">
const props = withDefaults(defineProps<{
  icon: string;
  label?: string;
  tone?: "standard" | "filled" | "tonal" | "outlined";
  disabled?: boolean;
  fill?: boolean;
  type?: "button" | "submit" | "reset";
}>(), {
  label: "",
  tone: "standard",
  disabled: false,
  fill: false,
  type: "button"
});

const toneClass = computed(() => {
  switch (props.tone) {
    case "filled":
      return "bg-primary text-on-primary shadow-md3-1 hover:bg-primary/90";
    case "tonal":
      return "bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80";
    case "outlined":
      return "border border-outline-variant bg-surface-container-low text-on-surface-variant hover:bg-surface-container";
    default:
      return "bg-transparent text-on-surface-variant hover:bg-surface-container";
  }
});
</script>

<template>
  <button
    :type="type"
    :aria-label="label || icon"
    :disabled="disabled"
    class="inline-flex h-12 w-12 items-center justify-center rounded-full transition duration-150 disabled:cursor-not-allowed disabled:opacity-50"
    :class="toneClass"
  >
    <span class="material-symbols-outlined text-2xl" :class="{ 'icon-filled': fill }">{{ icon }}</span>
  </button>
</template>
