<script setup lang="ts">
import { useWallet } from "~/composables/useWallet";

const { theme, applySystemPreference, toggleTheme } = useTheme();
const route = useRoute();
const router = useRouter();
const { address, checkConnection } = useWallet();

const tabs = [
  { to: "/mint", label: "铸造", icon: "add_card" },
  { to: "/browse", label: "浏览", icon: "travel_explore" }
];

onMounted(async () => {
  applySystemPreference();
  await checkConnection();
  if (!address.value && route.path !== "/login") {
    router.replace("/login");
  } else if (address.value && route.path === "/login") {
    router.replace("/mint");
  }
});

watch(address, (newVal) => {
  if (!newVal && route.path !== "/login") {
    router.replace("/login");
  } else if (newVal && route.path === "/login") {
    router.replace("/mint");
  }
});
</script>

<template>
  <div
    class="app-gradient-shell min-h-screen bg-surface text-on-surface transition-colors"
    :data-theme="theme"
  >
    <AppTopBar :address="address || undefined" :theme="theme" @toggle-theme="toggleTheme" />

    <main class="relative z-10 mx-auto w-full max-w-xl">
      <NuxtPage />
    </main>

    <BottomNav
      v-if="address && route.path !== '/login'"
      :tabs="tabs"
      :current-path="route.path"
    />
  </div>
</template>
