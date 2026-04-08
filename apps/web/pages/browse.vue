<script setup lang="ts">
import { useWallet } from '~/composables/useWallet';

const router = useRouter();
const { address } = useWallet();
const { tokensOfOwner, credentialMeta, verifyByTokenId, tokenIdOfCredential } = useCredentialContract();

const busy = ref(false);
const search = ref("");
const items = ref<Array<{ tokenId: number; credentialId: string; fileCount: number; issueStatus: number; revoked: boolean }>>([]);
const errorMsg = ref("");

async function loadOwned() {
  if (!address.value) return;

  busy.value = true;
  errorMsg.value = "";
  try {
    const tokenIds = (await tokensOfOwner(address.value)) as bigint[];
    const mapped = await Promise.all(
      tokenIds.map(async (id) => {
        const tokenId = Number(id);
        const meta = await credentialMeta(tokenId);
        return {
          tokenId,
          credentialId: String(meta.credentialId),
          fileCount: Number(meta.fileCount),
          issueStatus: Number(meta.issueStatus),
          revoked: Boolean((await verifyByTokenId(tokenId)).revoked)
        };
      })
    );
    items.value = mapped.sort((a, b) => b.tokenId - a.tokenId);
  } catch (error: any) {
    errorMsg.value = error.message || "加载失败";
  } finally {
    busy.value = false;
  }
}

async function searchGo() {
  if (!search.value.trim()) return;

  const query = search.value.trim();
  if (/^\d+$/.test(query)) {
    await router.push(`/nft/${query}`);
    return;
  }

  try {
    const tokenId = await tokenIdOfCredential(query);
    if (Number(tokenId) > 0) {
      await router.push(`/nft/${Number(tokenId)}`);
      return;
    }
  } catch {
    // no-op
  }
  errorMsg.value = "未找到相关的 tokenId 或 凭证ID";
}

onMounted(() => {
  if (address.value) {
    loadOwned();
  }
});

watch(address, (newAddr) => {
  if (newAddr) loadOwned();
});

function statusLabel(item: { revoked: boolean; issueStatus: number }) {
  if (item.revoked) return "已吊销";
  return item.issueStatus === 0 ? "自签名" : "已验证";
}

function statusIcon(item: { revoked: boolean; issueStatus: number }) {
  if (item.revoked) return "cancel";
  return item.issueStatus === 0 ? "shield_person" : "verified_user";
}

function statusColor(item: { revoked: boolean; issueStatus: number }) {
  if (item.revoked) return "text-rose-700 bg-rose-100 dark:text-rose-300 dark:bg-rose-900/40";
  return item.issueStatus === 0 ? "text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/40" : "text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/40";
}
</script>

<template>
  <section class="animate-in fade-in slide-in-from-bottom-4 duration-500 mx-4">
    <header class="mb-6 flex flex-col items-center pt-4">
      <div class="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100/50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
        <span class="material-symbols-outlined text-3xl">travel_explore</span>
      </div>
      <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100">
        浏览凭证
      </h1>
      <p class="mt-1 text-sm text-slate-500">
        查看和管理区块链凭证
      </p>
    </header>

    <div class="mb-4 flex items-center justify-between px-2">
      <span class="text-sm font-medium text-slate-700 dark:text-slate-300">所有者当前钱包</span>
      <AddressCopy v-if="address" :address="address" />
    </div>

    <!-- 搜索功能 -->
    <div class="mb-6 flex gap-2">
      <div class="relative flex-1">
        <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
        <input
          v-model="search"
          @keydown.enter="searchGo"
          class="w-full rounded-full border-none bg-white py-3.5 pl-12 pr-4 text-sm shadow-sm ring-1 ring-slate-200 outline-none transition focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-800"
          placeholder="输入 Token ID 或 Credential ID 查看..."
        />
      </div>
      <button
        class="flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full bg-indigo-600 text-white shadow-md transition hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-indigo-500 dark:hover:bg-indigo-400"
        @click="searchGo"
      >
        <span class="material-symbols-outlined">arrow_forward</span>
      </button>
    </div>

    <!-- 反馈 / 错误 -->
    <div v-if="errorMsg" class="mb-6 flex items-center gap-2 rounded-2xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
      <span class="material-symbols-outlined">error</span>
      {{ errorMsg }}
    </div>

    <!-- 凭证列表 -->
    <div class="space-y-3">
      <div v-if="busy && !items.length" class="flex flex-col items-center py-10 transition-opacity">
        <span class="material-symbols-outlined animate-spin text-3xl text-indigo-400">sync</span>
        <p class="mt-2 text-sm text-slate-500">加载中...</p>
      </div>

      <div v-else-if="!items.length" class="flex flex-col items-center p-10 text-center text-slate-500">
        <span class="material-symbols-outlined mb-2 text-[3rem] text-slate-300 dark:text-slate-600">inbox</span>
        <p class="text-slate-500">暂无持有任何凭证</p>
      </div>

      <button
        v-for="item in items"
        :key="item.tokenId"
        class="group flex w-full flex-col gap-3 border-b border-slate-200 dark:border-slate-800 py-4 text-left transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50"
        @click="router.push(`/nft/${item.tokenId}`)"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <span class="material-symbols-outlined text-[1.2rem]">workspace_premium</span>
            </div>
            <div>
              <p class="font-semibold text-slate-900 dark:text-slate-100">NFT #{{ item.tokenId }}</p>
              <p class="max-w-[12rem] truncate text-xs text-slate-500">{{ item.credentialId }}</p>
            </div>
          </div>
          
          <div class="flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition" :class="statusColor(item)">
            <span class="material-symbols-outlined text-[1rem]">{{ statusIcon(item) }}</span>
            <span class="text-[0.7rem] leading-none">{{ statusLabel(item) }}</span>
          </div>
        </div>

        <div class="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
          <p class="flex items-center gap-1 text-xs text-slate-500">
            <span class="material-symbols-outlined text-[1rem]">attachment</span>
            包含 {{ item.fileCount }} 个文件附件
          </p>
          <span class="material-symbols-outlined text-slate-300 transition group-hover:translate-x-1 group-hover:text-indigo-400 dark:text-slate-600">arrow_forward</span>
        </div>
      </button>
    </div>

    <!-- 悬浮刷新按钮 -->
    <button
      v-if="!busy"
      class="fixed bottom-[6.5rem] right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 shadow-sm transition hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-300"
      @click="loadOwned"
      title="刷新列表"
    >
      <span class="material-symbols-outlined">refresh</span>
    </button>
  </section>
</template>
