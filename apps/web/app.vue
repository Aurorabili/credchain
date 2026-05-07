<script setup lang="ts">
const route = useRoute();
// @nuxtjs/color-mode handles dark class on <html> automatically
</script>

<template>
  <NuxtLayout>
    <NuxtPage :key="route.fullPath" />
  </NuxtLayout>
</template>
