<script setup lang="ts">
import { useWallet } from '~/composables/useWallet';

const { theme, applySystemPreference, toggleTheme } = useTheme();
const route = useRoute();
const router = useRouter();
const { address, checkConnection } = useWallet();

const tabs = [
  { to: "/mint", label: "铸造", icon: "edit_document" },
  { to: "/browse", label: "浏览", icon: "grid_view" }
];

onMounted(async () => {
  applySystemPreference();
  await checkConnection();
  if (!address.value && route.path !== '/login') {
    router.replace('/login');
  } else if (address.value && route.path === '/login') {
    router.replace('/mint');
  }
});

watch(address, (newVal) => {
  if (!newVal && route.path !== '/login') {
    router.replace('/login');
  } else if (newVal && route.path === '/login') {
    router.replace('/mint');
  }
});
</script>

<template>
  <div class="min-h-screen bg-slate-50 pb-28 dark:bg-[#0f141b] text-slate-900 dark:text-slate-100 font-sans transition-colors" :data-theme="theme">
    <main class="mx-auto w-full max-w-xl">
      <NuxtPage />
    </main>

    <button
      class="fixed right-4 top-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-white/80 text-slate-700 shadow-sm backdrop-blur transition hover:bg-slate-100 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700"
      @click="toggleTheme"
    >
      <span class="material-symbols-outlined">
        {{ theme === 'dark' ? 'light_mode' : 'dark_mode' }}
      </span>
    </button>

    <nav v-if="address && route.path !== '/login'" class="fixed bottom-6 left-1/2 z-30 w-[min(92vw,440px)] -translate-x-1/2 rounded-[2rem] border border-white/20 bg-white/80 p-2 shadow-2xl backdrop-blur-2xl dark:border-slate-800/50 dark:bg-slate-900/80">
      <div class="grid grid-cols-2 gap-2">
        <NuxtLink
          v-for="tab in tabs"
          :key="tab.to"
          :to="tab.to"
          class="flex flex-col items-center justify-center gap-1 rounded-[1.5rem] py-2 text-xs font-medium transition-all"
          :class="route.path.startsWith(tab.to)
            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 shadow-sm'
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/50'"
        >
          <span class="material-symbols-outlined" :class="{ 'fill-icon': route.path.startsWith(tab.to) }">
            {{ tab.icon }}
          </span>
          <span>{{ tab.label }}</span>
        </NuxtLink>
      </div>
    </nav>
  </div>
</template>

<style>
.material-symbols-outlined {
  font-variation-settings:
  'FILL' 0,
  'wght' 400,
  'GRAD' 0,
  'opsz' 24;
}
.fill-icon {
  font-variation-settings: 'FILL' 1;
}
</style>
