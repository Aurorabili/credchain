<script setup lang="ts">
import type { ChainCredential } from "~/composables/useChain";

defineProps<{ credential: ChainCredential }>();
</script>

<template>
  <NuxtLink
    :to="`/credentials/${credential.tokenId}`"
    class="flat-list-row px-0 hover:bg-surface-container-low transition-colors"
  >
    <span class="material-symbols-outlined text-[28px] text-primary" aria-hidden="true">verified</span>
    <div class="flex-1 min-w-0">
      <p class="body-strong truncate">{{ credential.name }}</p>
      <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 helper-text">
        <span>{{ credential.displayLabel }}</span>
        <span>{{ credential.displayStars.toFixed(1) }} / 5.0</span>
        <span>{{ credential.voteCount }} 人参与</span>
      </div>
      <p class="mt-1 helper-text truncate">
        证书 · {{ credential.businessType }}
      </p>
    </div>
    <span class="material-symbols-outlined text-on-surface-variant" aria-hidden="true">chevron_right</span>
  </NuxtLink>
</template>
