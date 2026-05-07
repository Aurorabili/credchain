<script setup lang="ts">
const color = useColorMode();
const isDark = computed(() => color.value === "dark");

function toggle() {
  color.preference = isDark.value ? "light" : "dark";
}
</script>

<template>
  <button
    class="w-12 h-12 flex items-center justify-center rounded-full hover:bg-surface-container-high transition"
    :aria-label="isDark ? '切换到亮色模式' : '切换到暗色模式'"
    @click="toggle"
  >
    <span class="material-symbols-outlined text-on-surface-variant" aria-hidden="true">
      {{ isDark ? "light_mode" : "dark_mode" }}
    </span>
  </button>
</template>
