<script setup lang="ts">
const props = defineProps<{ tokenId: number; disabled?: boolean }>();
const emit = defineEmits<{ voted: [direction: 1 | -1] }>();

const { vote } = useChain();
const loading = ref<"up" | "down" | null>(null);
const pendingDirection = ref<1 | -1 | null>(null);

const dialogTitle = computed(() =>
  pendingDirection.value === 1 ? "确认支持这张证书？" : "确认提交质疑？"
);

const dialogMessage = computed(() =>
  pendingDirection.value === 1
    ? "提交后不能修改，也不能再次投票。"
    : "提交后不能修改，也不能再次投票。"
);

function requestVote(dir: 1 | -1) {
  pendingDirection.value = dir;
}

function closeDialog() {
  if (loading.value) return;
  pendingDirection.value = null;
}

async function cast() {
  if (!pendingDirection.value) return;
  const dir = pendingDirection.value;
  loading.value = dir === 1 ? "up" : "down";
  try {
    await vote(props.tokenId, dir);
    emit("voted", dir);
    pendingDirection.value = null;
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
      @click="requestVote(1)"
    >
      <span class="material-symbols-outlined" aria-hidden="true">thumb_up</span>
    </button>
    <button
      class="icon-button tonal-button disabled:opacity-30"
      :class="loading === 'down' ? 'text-error' : 'text-on-surface'"
      :disabled="disabled || loading !== null"
      aria-label="质疑"
      @click="requestVote(-1)"
    >
      <span class="material-symbols-outlined" aria-hidden="true">thumb_down</span>
    </button>
  </div>

  <ConfirmDialog
    :open="pendingDirection !== null"
    :title="dialogTitle"
    :message="dialogMessage"
    confirm-label="确认提交"
    :confirm-tone="pendingDirection === -1 ? 'error' : 'primary'"
    :loading="loading !== null"
    @cancel="closeDialog"
    @confirm="cast"
  />
</template>
