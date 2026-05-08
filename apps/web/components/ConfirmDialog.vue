<script setup lang="ts">
defineProps<{
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmTone?: "primary" | "error";
  loading?: boolean;
}>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div
        v-if="open"
        class="dialog-scrim"
        role="presentation"
        @click.self="emit('cancel')"
      >
        <div
          class="dialog-surface"
          role="dialog"
          aria-modal="true"
          :aria-busy="loading ? 'true' : 'false'"
        >
          <div class="space-y-2">
            <h2 class="text-lg leading-7 font-medium text-on-surface">{{ title }}</h2>
            <p class="text-sm leading-6 text-on-surface-variant">{{ message }}</p>
          </div>

          <div class="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              class="secondary-pill"
              :disabled="loading"
              @click="emit('cancel')"
            >
              {{ cancelLabel || "取消" }}
            </button>
            <button
              type="button"
              :class="confirmTone === 'error' ? 'danger-pill' : 'primary-pill'"
              :disabled="loading"
              @click="emit('confirm')"
            >
              {{ confirmLabel || "确认" }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
