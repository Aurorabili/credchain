<script setup lang="ts">
const props = defineProps<{ tokenId: number; disabled?: boolean }>();
const emit = defineEmits<{ voted: [direction: 1 | -1] }>();

const { vote } = useChain();
const loading = ref<"up" | "down" | null>(null);

async function cast(dir: 1 | -1) {
  const confirmed = window.confirm(
    dir === 1
      ? "确认提交支持？提交后不能修改，也不能再次投票。"
      : "确认提交质疑？提交后不能修改，也不能再次投票。"
  );

  if (!confirmed) return;

  loading.value = dir === 1 ? "up" : "down";
  try {
    await vote(props.tokenId, dir);
    emit("voted", dir);
  } catch (e: any) {
    alert(e?.message ?? "投票失败");
  } finally {
    loading.value = null;
  }
}
</script>

<template>
  <div class="flex items-center gap-2">
    <button
      class="icon-button tonal-button disabled:opacity-30"
      :class="loading === 'up' ? 'text-primary' : 'text-on-surface'"
      :disabled="disabled || loading !== null"
      aria-label="支持"
      @click="cast(1)"
    >
      <span class="material-symbols-outlined" aria-hidden="true">thumb_up</span>
    </button>
    <button
      class="icon-button tonal-button disabled:opacity-30"
      :class="loading === 'down' ? 'text-error' : 'text-on-surface'"
      :disabled="disabled || loading !== null"
      aria-label="质疑"
      @click="cast(-1)"
    >
      <span class="material-symbols-outlined" aria-hidden="true">thumb_down</span>
    </button>
  </div>
</template>
