<script setup lang="ts">
const props = defineProps<{
  status: "self" | "trusted" | "revoked" | "expired" | "neutral";
  label: string;
}>();

const config = computed(() => {
  switch (props.status) {
    case "trusted":
      return {
        tone: "bg-success-container text-on-success-container",
        icon: "verified"
      };
    case "revoked":
      return {
        tone: "bg-error-container text-on-error-container",
        icon: "block"
      };
    case "expired":
      return {
        tone: "bg-warning-container text-on-warning-container",
        icon: "schedule"
      };
    case "self":
      return {
        tone: "bg-secondary-container text-on-secondary-container",
        icon: "shield_person"
      };
    default:
      return {
        tone: "bg-surface-container-high text-on-surface-variant",
        icon: "info"
      };
  }
});
</script>

<template>
  <span class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold" :class="config.tone">
    <span class="material-symbols-outlined text-[16px]">{{ config.icon }}</span>
    <span>{{ label }}</span>
  </span>
</template>
