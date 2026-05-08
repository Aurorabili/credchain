<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const chain = useChain();

// Guard: redirect to /welcome if wallet is not connected
// Use a short delay to let _restoreFromStorage() complete
onMounted(async () => {
  await nextTick();
  if (route.path !== "/welcome" && !chain.isConnected()) {
    router.push("/welcome");
  }
});

const navItems = [
  { to: "/", icon: "dashboard", label: "仪表盘" },
  { to: "/credentials", icon: "verified", label: "证书" },
  { to: "/mint", icon: "add_circle", label: "铸造" },
];
</script>

<template>
  <div class="min-h-screen bg-surface text-on-surface font-sans transition-colors pb-20 md:pb-0">

    <!-- Desktop top bar (hidden on welcome page) -->
    <template v-if="route.path !== '/welcome'">
    <header class="hidden md:flex border-b border-outline-variant px-4 lg:px-6 h-16 items-center justify-between sticky top-0 bg-surface z-30">
      <NuxtLink to="/" class="text-xl font-bold tracking-tight text-primary inline-flex items-center gap-2">
        CredChain
      </NuxtLink>
      <nav class="flex items-center gap-1">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-1.5 px-4 py-2 rounded-md3-full text-sm font-medium transition-colors"
          :class="route.path === item.to ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:bg-surface-container-high'"
        >
          <span class="material-symbols-outlined text-lg" aria-hidden="true">{{ item.icon }}</span>
          {{ item.label }}
        </NuxtLink>
        <div class="w-px h-6 bg-outline-variant mx-2" />
        <ThemeToggle />
        <WalletConnect />
      </nav>
    </header>
    </template>

    <!-- Mobile header (hidden on welcome page) -->
    <template v-if="route.path !== '/welcome'">
    <header class="md:hidden border-b border-outline-variant px-4 h-14 flex items-center justify-between sticky top-0 bg-surface z-30">
      <NuxtLink to="/" class="text-lg font-bold tracking-tight text-primary inline-flex items-center gap-1.5">
        CredChain
      </NuxtLink>
      <div class="flex items-center gap-2">
        <ThemeToggle />
        <WalletConnect />
      </div>
    </header>
    </template>

    <main class="p-4 max-w-5xl mx-auto">
      <slot />
    </main>

    <!-- Mobile bottom nav (hidden on welcome) -->
    <BottomNav v-if="route.path !== '/welcome'" />
  </div>
</template>
