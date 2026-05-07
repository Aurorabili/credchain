<script setup lang="ts">
defineProps<{
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: string;
}>();
</script>

<template>
  <div class="flex items-start gap-3">
    <div v-if="icon" class="flex h-12 w-12 shrink-0 items-center justify-center rounded-md3-md bg-primary-container text-on-primary-container">
      <span class="material-symbols-outlined icon-filled text-[24px]">{{ icon }}</span>
    </div>
    <div class="min-w-0">
      <p v-if="eyebrow" class="text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">{{ eyebrow }}</p>
      <h1 class="mt-1 text-[1.55rem] font-bold tracking-[-0.02em] text-on-surface">{{ title }}</h1>
      <p v-if="description" class="mt-1 text-sm leading-6 text-on-surface-variant">{{ description }}</p>
    </div>
  </div>
</template>
