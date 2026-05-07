<script setup lang="ts">
defineProps<{
  icon: string;
  title: string;
  description: string;
}>();
</script>

<template>
  <div class="flex flex-col items-center justify-center rounded-md3-lg border border-dashed border-outline-variant bg-surface-container-low px-6 py-10 text-center">
    <div class="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant">
      <span class="material-symbols-outlined text-[32px]">{{ icon }}</span>
    </div>
    <h3 class="mt-4 text-base font-semibold text-on-surface">{{ title }}</h3>
    <p class="mt-2 max-w-[18rem] text-sm leading-6 text-on-surface-variant">{{ description }}</p>
  </div>
</template>
