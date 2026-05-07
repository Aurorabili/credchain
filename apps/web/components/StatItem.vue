<script setup lang="ts">
defineProps<{ icon: string; label: string; value: string | number; accent?: boolean }>();
</script>

<template>
  <div
    class="flex items-center gap-3 px-4 py-3 rounded-md3-lg"
    :class="accent ? 'bg-primary-container text-on-primary-container' : 'text-on-surface'"
  >
    <span class="material-symbols-outlined text-3xl" aria-hidden="true">{{ icon }}</span>
    <div class="flex flex-col min-w-0">
      <span class="text-sm text-on-surface-variant truncate">{{ label }}</span>
      <span class="text-xl font-semibold">{{ value }}</span>
    </div>
  </div>
</template>
