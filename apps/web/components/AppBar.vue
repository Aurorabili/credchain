<script setup lang="ts">
defineProps<{
  title?: string;
  subtitle?: string;
  backTo?: string;
  actions?: boolean;
}>();
</script>

<template>
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-3 min-w-0">
      <NuxtLink
        v-if="backTo"
        :to="backTo"
        class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition flex-shrink-0"
        aria-label="返回"
      >
        <span class="material-symbols-outlined" aria-hidden="true">arrow_back</span>
      </NuxtLink>
      <div class="min-w-0">
        <h1 v-if="title" class="text-headline-sm font-semibold truncate">{{ title }}</h1>
        <p v-if="subtitle" class="text-sm text-on-surface-variant truncate">{{ subtitle }}</p>
      </div>
    </div>
    <div v-if="$slots.actions" class="flex items-center gap-2 flex-shrink-0 ml-4">
      <slot name="actions" />
    </div>
  </div>
</template>
