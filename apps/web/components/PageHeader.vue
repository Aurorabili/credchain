<script setup lang="ts">
defineProps<{ title: string; backTo?: string }>();
</script>

<template>
  <div class="flex items-center gap-3 mb-4">
    <NuxtLink v-if="backTo" :to="backTo" class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition" aria-label="Back">
      <span class="material-symbols-outlined" aria-hidden="true">arrow_back</span>
    </NuxtLink>
    <h1 class="text-headline-sm font-semibold">{{ title }}</h1>
  </div>
</template>
