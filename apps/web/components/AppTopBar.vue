<script setup lang="ts">
defineProps<{
  address?: string;
  theme: string;
}>();

defineEmits<{
  toggleTheme: [];
}>();
</script>

<template>
  <header class="glass-surface sticky top-0 z-30 border-b border-outline-variant/70">
    <div class="mx-auto flex w-full max-w-xl items-center gap-3 px-4 py-4">
      <div class="flex h-12 w-12 items-center justify-center rounded-md3-md bg-primary-container text-on-primary-container shadow-md3-1">
        <span class="material-symbols-outlined icon-filled text-[24px]">verified</span>
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold text-on-surface">CredChain</p>
        <p class="truncate text-xs text-on-surface-variant">
          {{ address ? "链上凭证已连接" : "去中心化凭证发放与验证平台" }}
        </p>
      </div>
      <AddressCopy v-if="address" :address="address" compact />
      <IconButton
        :icon="theme === 'dark' ? 'light_mode' : 'dark_mode'"
        :label="theme === 'dark' ? '切换亮色主题' : '切换暗色主题'"
        tone="tonal"
        @click="$emit('toggleTheme')"
      />
    </div>
  </header>
</template>
