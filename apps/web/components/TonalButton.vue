<script setup lang="ts">
const props = withDefaults(defineProps<{
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
  block?: boolean;
  type?: "button" | "submit" | "reset";
}>(), {
  icon: "",
  loading: false,
  disabled: false,
  block: true,
  type: "button"
});
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-secondary-container px-6 py-3 text-sm font-semibold tracking-[0.01em] text-on-secondary-container transition duration-150 hover:bg-secondary-container/80 disabled:cursor-not-allowed disabled:bg-on-surface/10 disabled:text-on-surface/40"
    :class="block ? 'w-full' : ''"
  >
    <span v-if="loading" class="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
    <span v-else-if="icon" class="material-symbols-outlined text-[20px]">{{ icon }}</span>
    <slot />
  </button>
</template>
