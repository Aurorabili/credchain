<script setup lang="ts">
const route = useRoute();

const items = [
  { to: "/", icon: "dashboard", label: "仪表盘" },
  { to: "/credentials", icon: "verified", label: "凭证" },
  { to: "/mint", icon: "add_circle", label: "铸造" },
];
</script>

<template>
  <nav
    class="fixed bottom-0 left-0 right-0 z-40 bg-surface-container border-t border-outline-variant flex justify-around items-center h-16 md:hidden"
  >
    <NuxtLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="flex flex-col items-center gap-0.5 px-2 py-1 min-w-0"
      :class="route.path === item.to ? 'text-primary' : 'text-on-surface-variant'"
    >
      <span class="material-symbols-outlined text-2xl" aria-hidden="true">{{ item.icon }}</span>
      <span class="text-xs">{{ item.label }}</span>
    </NuxtLink>
  </nav>
</template>
