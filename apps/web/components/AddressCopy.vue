<script setup lang="ts">
const props = defineProps<{
  address: string;
  className?: string;
}>();

const copied = ref(false);

const shortAddress = computed(() => {
  const addr = props.address || "";
  if (!addr || addr.length < 10) {
    return addr || "未连接";
  }
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
});

async function copyAddress() {
  if (!props.address) {
    return;
  }

  try {
    await navigator.clipboard.writeText(props.address);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 1200);
  } catch {
    copied.value = false;
  }
}
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center gap-1 text-sm text-slate-600 underline underline-offset-4 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
    :class="className"
    @click="copyAddress"
  >
    <span>{{ shortAddress }}</span>
    <svg v-if="!copied" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
    <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  </button>
</template>
