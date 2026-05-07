<script setup lang="ts">
const props = defineProps<{ tokenId: number; disabled?: boolean }>();
const emit = defineEmits<{ voted: [direction: 1 | -1] }>();

const { vote } = useChain();
const loading = ref<"up" | "down" | null>(null);

async function cast(dir: 1 | -1) {
  loading.value = dir === 1 ? "up" : "down";
  try {
    await vote(props.tokenId, dir);
    emit("voted", dir);
  } catch (e: any) {
    console.error("投票失败:", e);
  } finally {
    loading.value = null;
  }
}
</script>

<template>
  <div class="flex items-center gap-2">
    <button
      class="w-12 h-12 flex items-center justify-center rounded-full hover:bg-surface-container-high transition disabled:opacity-30"
      :class="loading === 'up' ? 'text-primary' : 'text-on-surface-variant'"
      :disabled="disabled || loading !== null"
      aria-label="Upvote"
      @click="cast(1)"
    >
      <span class="material-symbols-outlined" aria-hidden="true">thumb_up</span>
    </button>
    <button
      class="w-12 h-12 flex items-center justify-center rounded-full hover:bg-surface-container-high transition disabled:opacity-30"
      :class="loading === 'down' ? 'text-error' : 'text-on-surface-variant'"
      :disabled="disabled || loading !== null"
      aria-label="Downvote"
      @click="cast(-1)"
    >
      <span class="material-symbols-outlined" aria-hidden="true">thumb_down</span>
    </button>
  </div>
</template>
