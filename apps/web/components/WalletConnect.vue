<script setup lang="ts">
const chain = useChain();
const { getDisplayName } = useAddressBook();

const connected = computed(() => chain.connectedRef.value);
const displayAddress = computed(() => {
  const a = chain.accountRef.value;
  if (!a) return "";
  return getDisplayName(a);
});

async function toggle() {
  if (connected.value) {
    chain.disconnect();
  } else {
    try {
      await chain.connect();
    } catch (e: any) {
      alert(e.message ?? "连接钱包失败");
    }
  }
}
</script>

<template>
  <button
    class="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition"
    :class="connected ? 'bg-primary-container text-on-primary-container' : 'bg-primary text-on-primary'"
    @click="toggle"
  >
    <span class="material-symbols-outlined text-lg" aria-hidden="true">
      {{ connected ? "account_balance_wallet" : "wallet" }}
    </span>
    <span class="hidden sm:inline">{{ connected ? displayAddress : "连接钱包" }}</span>
  </button>
</template>
