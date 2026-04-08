<script setup lang="ts">
import type { CredentialManifest } from "@credchain/shared";
import { useWallet } from '~/composables/useWallet';

const { address } = useWallet();
const { selfIssue, tokenIdOfCredential } = useCredentialContract();

const credentialId = ref("");
const files = ref<File[]>([]);
const busy = ref(false);
const errorMsg = ref("");
const successTokenId = ref<number | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

function generateCredentialId() {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  credentialId.value = `cred-${yyyy}${mm}${dd}-${crypto.randomUUID().slice(0, 8)}`;
}

function onFilesChange(event: Event) {
  const input = event.target as HTMLInputElement;
  files.value = Array.from(input.files || []);
}

async function toBase64(data: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(data);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function mintCredential() {
  if (!address.value || !credentialId.value || files.value.length === 0) {
    errorMsg.value = "请确保已连接钱包并选择至少1个文件";
    return;
  }

  busy.value = true;
  errorMsg.value = "";
  successTokenId.value = null;

  try {
    const attachments = [];
    for (const file of files.value) {
      const data = await file.arrayBuffer();
      const upload = await $fetch<{ cid: string }>("/api/ipfs/upload", {
        method: "POST",
        body: {
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          contentBase64: await toBase64(data)
        }
      });

      attachments.push({
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        cid: upload.cid,
        sha256: await sha256Hex(data)
      });
    }

    const manifest: CredentialManifest = {
      schemaVersion: "credchain-manifest-v1",
      credentialId: credentialId.value,
      holder: address.value,
      issuerSet: [address.value],
      issuedAt: Math.floor(Date.now() / 1000),
      attachments
    };

    const manifestResp = await $fetch<{ manifestCid: string; manifestHash: string; fileCount: number }>("/api/ipfs/manifest", {
      method: "POST",
      body: { manifest }
    });

    await selfIssue({
      credentialId: credentialId.value,
      manifestCid: manifestResp.manifestCid,
      manifestHash: manifestResp.manifestHash,
      fileCount: manifestResp.fileCount,
      expiresAt: 0
    });

    const tokenId = await tokenIdOfCredential(credentialId.value);
    successTokenId.value = Number(tokenId);
    files.value = [];
    generateCredentialId();
  } catch (err: any) {
    errorMsg.value = err.message || "铸造失败";
  } finally {
    busy.value = false;
  }
}

onMounted(() => {
  generateCredentialId();
});
</script>

<template>
  <section class="animate-in fade-in slide-in-from-bottom-4 duration-500 mx-4">
    <header class="mb-6 flex flex-col items-center pt-4">
      <div class="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100/50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
        <span class="material-symbols-outlined text-3xl">add_card</span>
      </div>
      <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100">
        铸造凭证
      </h1>
      <p class="mt-1 text-sm text-slate-500">
        将文件永久记录于区块链
      </p>
    </header>

    <div class="border-b border-slate-200 dark:border-slate-800 pb-6">
      <div class="mb-6 flex items-center justify-between rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
        <span class="text-sm font-medium text-slate-700 dark:text-slate-300">持有者</span>
        <AddressCopy v-if="address" :address="address" />
      </div>

      <div class="space-y-5">
        <!-- 自动生成的凭证ID展示 -->
        <div>
          <label class="mb-1.5 block text-xs font-medium text-slate-500">凭证 ID</label>
          <div class="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50">
            <span class="truncate text-sm font-mono text-slate-600 dark:text-slate-400">
              {{ credentialId }}
            </span>
            <button
              class="ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-600 transition hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
              @click="generateCredentialId"
              title="重新生成"
            >
              <span class="material-symbols-outlined text-[1.1rem]">refresh</span>
            </button>
          </div>
        </div>

        <!-- 附件选择（简洁样式） -->
        <div>
          <label class="mb-1.5 block text-xs font-medium text-slate-500">附件选择</label>
          <div
            class="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-10 transition-colors hover:bg-blue-50 hover:border-blue-200 dark:border-slate-800 dark:bg-slate-800/30 dark:hover:bg-slate-800"
            @click="fileInput?.click()"
          >
            <span class="material-symbols-outlined mb-2 text-4xl text-slate-400">upload_file</span>
            <p class="text-sm font-medium text-slate-700 dark:text-slate-300">
              点击选择文件
            </p>
            <p v-if="files.length" class="mt-2 text-xs text-blue-600 dark:text-blue-400">
              已选择 {{ files.length }} 个文件
            </p>
          </div>
          <input ref="fileInput" type="file" multiple class="hidden" @change="onFilesChange" />
        </div>

        <!-- 提交按钮 -->
        <button
          class="flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 py-3.5 text-sm font-medium text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-lg disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-400"
          :disabled="busy || !files.length"
          @click="mintCredential"
        >
          <template v-if="busy">
            <span class="material-symbols-outlined animate-spin text-[1.2rem]">sync</span>
            铸造中...
          </template>
          <template v-else>
            <span class="material-symbols-outlined text-[1.2rem]">publish</span>
            上传并铸造
          </template>
        </button>
      </div>
    </div>

    <!-- 状态反馈 -->
    <div v-if="errorMsg" class="mt-4 flex items-center gap-2 rounded-2xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
      <span class="material-symbols-outlined">error</span>
      {{ errorMsg }}
    </div>
    
    <div v-if="successTokenId !== null" class="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
      <span class="material-symbols-outlined">check_circle</span>
      新凭证 #{{ successTokenId }} 铸造成功！
    </div>
  </section>
</template>
