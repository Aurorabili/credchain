<script setup lang="ts">
import type { ChainCredential } from "~/composables/useChain";

defineProps<{ credential: ChainCredential }>();
</script>

<template>
  <NuxtLink
    :to="`/credentials/${credential.tokenId}`"
    class="flex items-center gap-4 px-4 py-3 hover:bg-surface-container-high transition-colors"
  >
    <span class="material-symbols-outlined text-3xl text-primary" aria-hidden="true">
      {{ credential.credentialType === "degree" ? "school" : credential.credentialType === "certificate" ? "verified" : "military_tech" }}
    </span>
    <div class="flex-1 min-w-0">
      <p class="text-sm font-medium truncate">{{ credential.name }}</p>
      <p class="text-xs text-on-surface-variant truncate">{{ credential.credentialType }} · Score: {{ credential.score }}</p>
    </div>
    <span class="material-symbols-outlined text-on-surface-variant" aria-hidden="true">chevron_right</span>
  </NuxtLink>
</template>
