<script setup lang="ts">
const props = defineProps<{
  tone: "error" | "success" | "info";
  message: string;
}>();

const config = computed(() => {
  switch (props.tone) {
    case "error":
      return {
        wrap: "bg-error-container text-on-error-container",
        icon: "error"
      };
    case "success":
      return {
        wrap: "bg-success-container text-on-success-container",
        icon: "check_circle"
      };
    default:
      return {
        wrap: "bg-secondary-container text-on-secondary-container",
        icon: "info"
      };
  }
});
</script>

<template>
  <div class="flex items-start gap-3 rounded-md3-md px-4 py-3 text-sm leading-6" :class="config.wrap">
    <span class="material-symbols-outlined mt-0.5 text-[20px]">{{ config.icon }}</span>
    <p>{{ message }}</p>
  </div>
</template>
