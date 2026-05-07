<script setup lang="ts">
const props = withDefaults(defineProps<{
  tone?: "default" | "soft" | "raised";
  padded?: boolean;
}>(), {
  tone: "default",
  padded: true
});

const toneClass = computed(() => {
  switch (props.tone) {
    case "soft":
      return "bg-surface-container-low border-outline-variant/60";
    case "raised":
      return "bg-surface-container-lowest border-transparent shadow-md3-2";
    default:
      return "bg-surface-container border-outline-variant/70";
  }
});
</script>

<template>
  <section
    class="rounded-md3-lg border shadow-md3-1"
    :class="[toneClass, padded ? 'p-5' : 'p-0']"
  >
    <slot />
  </section>
</template>
