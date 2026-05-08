<script setup lang="ts">
definePageMeta({ layout: "default" });

const chain = useChain();
const router = useRouter();
const connecting = ref(false);
const errorMsg = ref("");

// On mount, check if cached connection is still valid
onMounted(async () => {
  await chain.init();
  if (chain.isConnected()) {
    router.push("/");
  }
});

async function handleConnect() {
  connecting.value = true;
  errorMsg.value = "";
  try {
    await chain.connect();
    router.push("/");
  } catch (e: any) {
    errorMsg.value = e.message ?? "连接钱包失败";
  } finally {
    connecting.value = false;
  }
}
</script>

<template>
  <div class="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 space-y-8">
    <div class="flex flex-col items-center gap-4">
      <span class="material-symbols-outlined text-7xl text-primary" aria-hidden="true">verified_user</span>
      <h1 class="page-title text-center">CredChain</h1>
      <p class="page-subtitle max-w-sm">
        连接钱包后即可查看证书、管理账户名称，并参与评价。
      </p>
    </div>

    <button
      class="flex items-center gap-3 bg-primary text-on-primary rounded-md3-full px-8 py-4 text-base font-semibold hover:opacity-90 transition disabled:opacity-50"
      :disabled="connecting"
      @click="handleConnect"
    >
      <span v-if="connecting" class="inline-block w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
      <span v-else class="material-symbols-outlined text-2xl" aria-hidden="true">wallet</span>
      {{ connecting ? "连接中..." : "连接钱包" }}
    </button>

    <p v-if="errorMsg" class="text-sm text-error flex items-center gap-1">
      <span class="material-symbols-outlined text-lg" aria-hidden="true">error</span>
      {{ errorMsg }}
    </p>
  </div>
</template>
