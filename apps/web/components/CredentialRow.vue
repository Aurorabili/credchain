<script setup lang="ts">
import type { ChainCredential } from "~/composables/useChain";

defineProps<{ credential: ChainCredential }>();
</script>

<template>
  <NuxtLink
    :to="`/credentials/${credential.tokenId}`"
    class="flex items-center gap-4 px-4 py-4 hover:bg-surface-container-high transition-colors"
  >
    <span class="material-symbols-outlined text-3xl text-primary" aria-hidden="true">
      {{ credential.credentialType === "degree" ? "school" : credential.credentialType === "certificate" ? "verified" : "military_tech" }}
    </span>
    <div class="flex-1 min-w-0">
      <p class="text-sm font-medium truncate">{{ credential.name }}</p>
      <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-on-surface-variant">
        <span>{{ credential.displayLabel }}</span>
        <span>{{ credential.displayStars.toFixed(1) }} / 5.0</span>
        <span>{{ credential.voteCount }} 人参与</span>
      </div>
      <p class="mt-1 text-xs text-on-surface-variant truncate">
        原始链上分 {{ credential.score }} · 加权均值 {{ credential.baseDisplayScore.toFixed(1) }}
      </p>
    </div>
    <span class="material-symbols-outlined text-on-surface-variant" aria-hidden="true">chevron_right</span>
  </NuxtLink>
</template>
