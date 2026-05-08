<script setup lang="ts">
defineProps<{ title: string; subtitle?: string; backTo?: string }>();
</script>

<template>
  <div class="flex items-start justify-between gap-4 mb-2">
    <div class="flex min-w-0 items-start gap-3">
      <NuxtLink
        v-if="backTo"
        :to="backTo"
        class="icon-button mt-0.5"
        aria-label="返回"
      >
        <span class="material-symbols-outlined" aria-hidden="true">arrow_back</span>
      </NuxtLink>
      <div class="min-w-0">
        <h1 class="page-title truncate">{{ title }}</h1>
        <p v-if="subtitle" class="page-subtitle truncate">{{ subtitle }}</p>
      </div>
    </div>
    <div v-if="$slots.actions" class="flex items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
