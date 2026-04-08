<script setup lang="ts">
import { useWallet } from '~/composables/useWallet';

const route = useRoute();
const router = useRouter();
const tokenId = computed(() => Number(route.params.tokenId));

const { address } = useWallet();
const {
  verifyByTokenId,
  credentialMeta,
  credentialIssuers,
  getActorRoles,
  attest,
  revoke
} = useCredentialContract();

const busy = ref(false);
const errorMsg = ref("");
const successMsg = ref("");
const reason = ref("机构复核后吊销");

const detail = ref<{
  exists: boolean;
  revoked: boolean;
  expired: boolean;
  holder: string;
  manifestCid: string;
  fileCount: number;
  issueStatus: number;
  issuerCount: number;
  credentialId: string;
  issuers: string[];
} | null>(null);

const manifest = ref<{ attachments?: Array<{ name: string; mimeType: string; size: number; cid: string; sha256: string }> } | null>(null);
const roles = ref({ isGov: false, isIssuer: false });

const canGovernAction = computed(() => roles.value.isGov || roles.value.isIssuer);

const statusText = computed(() => {
  if (!detail.value) return "未知";
  if (detail.value.revoked) return "已吊销";
  return detail.value.issueStatus === 0 ? "自签名" : "已验证";
});

const statusIcon = computed(() => {
  if (!detail.value) return "help";
  if (detail.value.revoked) return "cancel";
  return detail.value.issueStatus === 0 ? "shield_person" : "verified_user";
});

const statusColor = computed(() => {
  if (!detail.value) return "text-slate-500 bg-slate-100 dark:text-slate-400 dark:bg-slate-800";
  if (detail.value.revoked) return "text-rose-700 bg-rose-100 dark:text-rose-300 dark:bg-rose-900/40";
  return detail.value.issueStatus === 0 ? "text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/40" : "text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/40";
});

async function loadDetail() {
  busy.value = true;
  errorMsg.value = "";
  successMsg.value = "";
  
  try {
    const [verify, meta, issuers] = await Promise.all([
      verifyByTokenId(tokenId.value),
      credentialMeta(tokenId.value),
      credentialIssuers(tokenId.value)
    ]);

    detail.value = {
      exists: Boolean(verify.exists),
      revoked: Boolean(verify.revoked),
      expired: Boolean(verify.expired),
      holder: String(verify.holder),
      manifestCid: String(verify.manifestCid),
      fileCount: Number(verify.fileCount),
      issueStatus: Number(verify.issueStatus),
      issuerCount: Number(verify.issuerCount),
      credentialId: String(meta.credentialId),
      issuers: (issuers as string[]).map((i) => String(i))
    };

    manifest.value = await $fetch(`/api/ipfs/object/${detail.value.manifestCid}`);
  } catch (error: any) {
    errorMsg.value = error.message || "加载失败";
  } finally {
    busy.value = false;
  }
}

async function attestNow() {
  busy.value = true;
  errorMsg.value = "";
  successMsg.value = "";
  try {
    await attest(tokenId.value);
    await loadDetail();
    successMsg.value = "验证成功，已加入签发者列表";
  } catch (error: any) {
    errorMsg.value = error.message || "验证失败";
  } finally {
    busy.value = false;
  }
}

async function revokeNow() {
  busy.value = true;
  errorMsg.value = "";
  successMsg.value = "";
  try {
    await revoke(tokenId.value, reason.value);
    await loadDetail();
    successMsg.value = "凭证已吊销";
  } catch (error: any) {
    errorMsg.value = error.message || "吊销失败";
  } finally {
    busy.value = false;
  }
}

onMounted(async () => {
  if (address.value) {
    roles.value = await getActorRoles(address.value);
  }
  await loadDetail();
});

watch(address, async (newAddr) => {
  if (newAddr) {
    roles.value = await getActorRoles(newAddr);
  }
});
</script>

<template>
  <section class="animate-in mx-4 fade-in slide-in-from-right-4 duration-500 space-y-4">
    <!-- 顶部导航和状态 -->
    <div class="border-b border-slate-200 dark:border-slate-800 pb-6">
      <div class="mb-5 flex border-b border-slate-100 pb-4 dark:border-slate-800 items-center justify-between">
        <button
          class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          @click="router.back()"
        >
          <span class="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
          NFT #{{ tokenId }}
        </h2>
        <div class="w-10"></div> <!-- 占位保持居中 -->
      </div>

      <div v-if="!detail && busy" class="flex flex-col items-center py-10">
        <span class="material-symbols-outlined animate-spin text-3xl text-blue-400">sync</span>
        <p class="mt-2 text-sm text-slate-500">获取链上数据...</p>
      </div>

      <div v-else-if="detail" class="flex flex-col items-center pb-2">
        <div class="mb-4 flex flex-col items-center justify-center text-center">
          <div class="mb-3 flex h-20 w-20 items-center justify-center rounded-full text-4xl shadow-inner ring-4 ring-white dark:ring-slate-900" :class="statusColor">
            <span class="material-symbols-outlined shrink-0 align-middle">{{ statusIcon }}</span>
          </div>
          <span class="rounded-full px-4 py-1 text-sm font-semibold tracking-wide" :class="statusColor">
            {{ statusText }}
          </span>
        </div>

        <p class="text-center font-mono text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-700 select-all">
          {{ detail.credentialId }}
        </p>
      </div>
    </div>

    <!-- 反馈 / 错误 -->
    <div v-if="errorMsg" class="flex items-center gap-2 rounded-2xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
      <span class="material-symbols-outlined">error</span>
      {{ errorMsg }}
    </div>
    <div v-if="successMsg" class="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
      <span class="material-symbols-outlined">check_circle</span>
      {{ successMsg }}
    </div>

    <!-- 凭证详情信息 -->
    <div v-if="detail" class="border-b border-slate-200 dark:border-slate-800 pb-6 space-y-5">
      
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
          <span class="material-symbols-outlined text-slate-400 text-lg">account_circle</span>
          持有人
        </div>
        <AddressCopy :address="detail.holder" />
      </div>

      <div class="flex items-start justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
        <div class="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
          <span class="material-symbols-outlined text-slate-400 text-lg">verified</span>
          签发者 ({{ detail.issuerCount }})
        </div>
        <div class="flex flex-col items-end gap-2">
          <AddressCopy v-for="issuer in detail.issuers" :key="issuer" :address="issuer" />
        </div>
      </div>
    </div>

    <!-- 附件数据 -->
    <div v-if="manifest?.attachments?.length" class="border-b border-slate-200 dark:border-slate-800 pb-6">
      <div class="font-medium text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
        <span class="material-symbols-outlined text-blue-500">folder_data</span>
        附件区
      </div>
      <div class="grid gap-3">
        <div v-for="file in manifest.attachments" :key="file.cid" class="flex items-center justify-between rounded-[1.25rem] border border-slate-100 bg-slate-50 p-3 pl-4 dark:border-slate-800 dark:bg-slate-800/40">
          <div class="overflow-hidden">
            <p class="truncate text-sm font-medium text-slate-900 dark:text-slate-200">{{ file.name }}</p>
            <p class="mt-0.5 text-xs text-slate-500">{{ (file.size / 1024).toFixed(1) }} KB</p>
          </div>
          <a
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm transition hover:bg-blue-50 dark:bg-slate-700 dark:text-blue-400 dark:hover:bg-slate-600"
            :href="`/api/ipfs/download/${file.cid}`"
            title="下载"
          >
            <span class="material-symbols-outlined text-[1.2rem]">download</span>
          </a>
        </div>
      </div>
    </div>

    <!-- 机构/治理操作 -->
    <div v-if="canGovernAction" class="border-b border-slate-200 dark:border-slate-800 pb-6">
      <div class="font-medium text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
        <span class="material-symbols-outlined text-orange-500">gavel</span>
        治理操作
      </div>
      
      <div class="space-y-3">
        <button
          class="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 py-3.5 text-sm font-medium text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-400"
          :disabled="busy || !detail || detail.revoked"
          @click="attestNow"
        >
          <span class="material-symbols-outlined">add_task</span>
          验证并背书该凭证
        </button>

        <div class="flex items-center gap-2">
          <input
            v-model="reason"
            class="flex-1 rounded-full border-none bg-slate-100 py-3.5 pl-4 pr-4 text-sm outline-none transition focus:ring-2 focus:ring-rose-500 dark:bg-slate-800 dark:text-slate-100"
            placeholder="吊销原因..."
          />
          <button
            class="flex shrink-0 items-center justify-center gap-2 rounded-full bg-rose-100 px-5 py-3.5 text-sm font-medium text-rose-700 transition hover:bg-rose-200 disabled:opacity-50 dark:bg-rose-900/50 dark:text-rose-300 dark:hover:bg-rose-900/70"
            :disabled="busy || !detail || detail.revoked"
            @click="revokeNow"
          >
            <span class="material-symbols-outlined">block</span>
            吊销
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
