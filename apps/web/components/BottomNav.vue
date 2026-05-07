<script setup lang="ts">
defineProps<{
  tabs: Array<{ to: string; label: string; icon: string }>;
  currentPath: string;
}>();
</script>

<template>
  <nav class="fixed bottom-4 left-1/2 z-30 w-[min(92vw,28rem)] -translate-x-1/2">
    <div class="glass-surface rounded-[2rem] border border-outline-variant/70 p-2 shadow-md3-2">
      <div class="grid grid-cols-2 gap-2">
        <NuxtLink
          v-for="tab in tabs"
          :key="tab.to"
          :to="tab.to"
          class="flex min-h-[68px] flex-col items-center justify-center gap-1 rounded-[1.5rem] px-3 py-2 text-xs font-semibold transition duration-150"
          :class="currentPath.startsWith(tab.to)
            ? 'bg-primary-container text-on-primary-container'
            : 'text-on-surface-variant hover:bg-surface-container-high'"
        >
          <span class="material-symbols-outlined text-[24px]" :class="{ 'icon-filled': currentPath.startsWith(tab.to) }">{{ tab.icon }}</span>
          <span>{{ tab.label }}</span>
        </NuxtLink>
      </div>
    </div>
  </nav>
</template>
