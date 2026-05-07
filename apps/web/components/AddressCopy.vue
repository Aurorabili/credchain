<script setup lang="ts">
const props = defineProps<{
  address: string;
  className?: string;
  compact?: boolean;
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
    class="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-low px-3 py-2 text-sm font-medium text-on-surface transition duration-150 hover:bg-surface-container"
    :class="[props.compact ? 'px-2.5 py-2 text-xs' : '', className]"
    @click="copyAddress"
  >
    <span class="max-w-[9rem] truncate">{{ shortAddress }}</span>
    <span
      class="material-symbols-outlined text-[18px]"
      :class="copied ? 'text-success' : 'text-on-surface-variant'"
    >
      {{ copied ? 'check' : 'content_copy' }}
    </span>
  </button>
</template>
