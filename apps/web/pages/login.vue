<script setup lang="ts">
import { useWallet } from "~/composables/useWallet";

const { login } = useWallet();
const busy = ref(false);

async function handleLogin() {
  busy.value = true;
  await login();
  busy.value = false;
}
</script>

<template>
  <section class="md3-section-shell flex min-h-[calc(100vh-88px)] flex-col justify-center">
    <SurfaceCard tone="raised" class="overflow-hidden">
      <div class="space-y-6">
        <div class="inline-flex h-16 w-16 items-center justify-center rounded-[28px] bg-primary-container text-on-primary-container shadow-md3-1">
          <span class="material-symbols-outlined icon-filled text-[32px]">verified</span>
        </div>

        <div class="space-y-3">
          <p class="text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">Credential Wallet</p>
          <h1 class="text-[2rem] font-bold leading-tight tracking-[-0.03em] text-on-surface">
            连接钱包，开始管理你的链上凭证
          </h1>
          <p class="text-sm leading-6 text-on-surface-variant">
            CredChain 将每一份凭证映射为一个不可转让的 SBT，兼容 ERC721 与 ERC5192，适合用于存证、校验与治理背书。
          </p>
        </div>

        <div class="grid gap-3">
          <div class="rounded-md3-md bg-surface-container-low px-4 py-4">
            <p class="text-sm font-semibold text-on-surface">当前接入方式</p>
            <p class="mt-1 text-sm text-on-surface-variant">使用 MetaMask 连接本地 Hardhat 链，完成铸造、浏览与治理操作。</p>
          </div>
          <div class="rounded-md3-md bg-secondary-container px-4 py-4 text-on-secondary-container">
            <p class="text-sm font-semibold">网络提示</p>
            <p class="mt-1 text-sm leading-6 opacity-80">请确认钱包可切换到 `chainId 1337`，首次连接时浏览器会弹出授权窗口。</p>
          </div>
        </div>

        <PrimaryButton icon="account_balance_wallet" :loading="busy" @click="handleLogin">
          {{ busy ? "连接中..." : "连接钱包" }}
        </PrimaryButton>
      </div>
    </SurfaceCard>
  </section>
</template>
