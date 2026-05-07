<script setup lang="ts">
import type { CredentialAttachment, CredentialManifest, InstitutionAuthManifest } from "@credchain/shared";
import { useWallet } from "~/composables/useWallet";

const { address } = useWallet();
const { selfIssue, issueInstitutionAuth, tokenIdOfCredential, getActorRoles } = useCredentialContract();

const roles = ref({ isGov: false, hasInstitutionAuth: false, institutionAuthTokenIds: [] as number[] });
const credentialKind = ref<"standard" | "institution-auth">("standard");
const institutionAuthTokenId = ref(0);
const institutionName = ref("");
const institutionCode = ref("");
const authorizedWallet = ref("");
const institutionDescription = ref("");
const credentialId = ref("");
const files = ref<File[]>([]);
const busy = ref(false);
const errorMsg = ref("");
const successTokenId = ref<number | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const currentStep = ref("待开始");

const selectedFiles = computed(() =>
  files.value.map((file) => ({
    name: file.name,
    sizeText: file.size > 1024 * 1024
      ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
      : `${(file.size / 1024).toFixed(1)} KB`,
    mimeType: file.type || "application/octet-stream"
  }))
);

const canIssueInstitutionAuth = computed(() => roles.value.isGov);
const isInstitutionAuthFlow = computed(() => credentialKind.value === "institution-auth");
const standardTrustHint = computed(() => {
  if (institutionAuthTokenId.value > 0) return "当前会以机构身份签发，结果直接进入受信任状态。";
  if (roles.value.isGov) return "当前钱包具备治理身份，自签普通凭证也会直接进入受信任状态。";
  return "当前普通凭证会先以自签名状态铸造，后续可由治理或机构追加背书。";
});

function generateCredentialId() {
  const prefix = credentialKind.value === "institution-auth" ? "inst-auth" : "cred";
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  credentialId.value = `${prefix}-${yyyy}${mm}${dd}-${crypto.randomUUID().slice(0, 8)}`;
}

function onFilesChange(event: Event) {
  const input = event.target as HTMLInputElement;
  files.value = Array.from(input.files || []);
}

function resetSelection() {
  files.value = [];
  if (fileInput.value) {
    fileInput.value.value = "";
  }
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

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label}超时，请确认本地服务与钱包状态正常。`));
        }, ms);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function buildAttachments(): Promise<CredentialAttachment[]> {
  const attachments: CredentialAttachment[] = [];
  for (const [index, file] of files.value.entries()) {
    currentStep.value = `上传附件 ${index + 1}/${files.value.length}：${file.name}`;
    const data = await file.arrayBuffer();
    const upload = await withTimeout(
      $fetch<{ cid: string }>("/api/ipfs/upload", {
        method: "POST",
        body: {
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          contentBase64: await toBase64(data)
        }
      }),
      15000,
      "附件上传"
    );

    attachments.push({
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      cid: upload.cid,
      sha256: await sha256Hex(data)
    });
  }
  return attachments;
}

async function mintCredential() {
  if (!address.value || !credentialId.value || files.value.length === 0) {
    errorMsg.value = "请确保已连接钱包并选择至少 1 个附件。";
    return;
  }

  if (isInstitutionAuthFlow.value) {
    if (!roles.value.isGov) {
      errorMsg.value = "只有治理账户可以签发机构鉴权 SBT。";
      return;
    }
    if (!institutionName.value.trim() || !institutionCode.value.trim() || !authorizedWallet.value.trim()) {
      errorMsg.value = "请完整填写机构名称、机构代码和授权钱包地址。";
      return;
    }
  }

  busy.value = true;
  errorMsg.value = "";
  successTokenId.value = null;
  currentStep.value = "准备上传附件";

  try {
    const attachments = await buildAttachments();

    const manifest: CredentialManifest | InstitutionAuthManifest = isInstitutionAuthFlow.value
      ? {
        schemaVersion: "credchain-institution-auth-v1",
        credentialType: "institution-auth",
        credentialId: credentialId.value,
        institutionName: institutionName.value.trim(),
        institutionCode: institutionCode.value.trim(),
        authorizedWallet: authorizedWallet.value.trim(),
        grantedBy: address.value,
        issuedAt: Math.floor(Date.now() / 1000),
        description: institutionDescription.value.trim() || undefined,
        attachments
      }
      : {
        schemaVersion: "credchain-manifest-v1",
        credentialType: "standard",
        credentialId: credentialId.value,
        holder: address.value,
        issuerSet: [address.value],
        issuedAt: Math.floor(Date.now() / 1000),
        attachments
      };

    currentStep.value = "生成 manifest";
    const manifestResp = await withTimeout(
      $fetch<{ manifestCid: string; manifestHash: string; fileCount: number }>("/api/ipfs/manifest", {
        method: "POST",
        body: { manifest }
      }),
      15000,
      "Manifest 生成"
    );

    currentStep.value = "等待钱包确认并发送交易";
    if (isInstitutionAuthFlow.value) {
      await withTimeout(
        issueInstitutionAuth({
          authorizedWallet: authorizedWallet.value.trim(),
          credentialId: credentialId.value,
          manifestCid: manifestResp.manifestCid,
          manifestHash: manifestResp.manifestHash,
          fileCount: manifestResp.fileCount,
          expiresAt: 0
        }),
        45000,
        "机构鉴权铸造"
      );
    } else {
      await withTimeout(
        selfIssue({
          credentialId: credentialId.value,
          manifestCid: manifestResp.manifestCid,
          manifestHash: manifestResp.manifestHash,
          fileCount: manifestResp.fileCount,
          expiresAt: 0,
          institutionAuthTokenId: institutionAuthTokenId.value || 0
        }),
        45000,
        "链上铸造"
      );
    }

    currentStep.value = "读取新铸造的 Token ID";
    const tokenId = await tokenIdOfCredential(credentialId.value);
    successTokenId.value = Number(tokenId);
    resetSelection();
    institutionName.value = "";
    institutionCode.value = "";
    authorizedWallet.value = address.value || "";
    institutionDescription.value = "";
    generateCredentialId();
    currentStep.value = "铸造完成";
  } catch (err: any) {
    errorMsg.value = err.message || "铸造失败";
  } finally {
    busy.value = false;
  }
}

onMounted(async () => {
  if (address.value) {
    roles.value = await getActorRoles(address.value);
    if (roles.value.institutionAuthTokenIds.length) {
      institutionAuthTokenId.value = roles.value.institutionAuthTokenIds[0];
    }
    authorizedWallet.value = address.value;
  }
  generateCredentialId();
});

watch(credentialKind, () => {
  generateCredentialId();
});

watch(address, async (newAddress) => {
  if (!newAddress) return;
  roles.value = await getActorRoles(newAddress);
  if (roles.value.institutionAuthTokenIds.length && !institutionAuthTokenId.value) {
    institutionAuthTokenId.value = roles.value.institutionAuthTokenIds[0];
  }
  if (!isInstitutionAuthFlow.value) {
    authorizedWallet.value = newAddress;
  }
});
</script>

<template>
  <section class="md3-section-shell">
    <SectionHeader
      eyebrow="Mint Flow"
      title="铸造凭证"
      description="支持普通凭证与机构鉴权 SBT。机构鉴权凭证由治理账户发放，用来授予钱包代表机构进行可信签署。"
      icon="add_card"
    />

    <FeedbackBanner v-if="errorMsg" tone="error" :message="errorMsg" />
    <FeedbackBanner
      v-if="successTokenId !== null"
      tone="success"
      :message="`凭证 NFT #${successTokenId} 已铸造成功。`"
    />
    <FeedbackBanner v-if="busy" tone="info" :message="`当前步骤：${currentStep}`" />

    <SurfaceCard>
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-semibold text-on-surface">1. 凭证类型与签发身份</p>
            <p class="mt-1 text-sm text-on-surface-variant">治理账户可切换到机构鉴权模式，机构授权钱包可选择以机构身份签发普通凭证。</p>
          </div>
          <!--<StatusChip status="neutral" :label="isInstitutionAuthFlow ? '机构鉴权' : '普通凭证'" />-->
        </div>

        <div class="grid grid-cols-2 gap-3">
          <button
            type="button"
            class="rounded-md3-md border px-4 py-4 text-left transition duration-150"
            :class="credentialKind === 'standard' ? 'border-primary bg-primary-container/50 text-on-primary-container' : 'border-outline-variant bg-surface-container-low text-on-surface'"
            @click="credentialKind = 'standard'"
          >
            <p class="text-sm font-semibold">普通凭证</p>
            <p class="mt-1 text-xs leading-5 opacity-80">默认模式，支持自签名与治理/机构背书。</p>
          </button>
          <button
            type="button"
            class="rounded-md3-md border px-4 py-4 text-left transition duration-150 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!canIssueInstitutionAuth"
            :class="credentialKind === 'institution-auth' ? 'border-primary bg-primary-container/50 text-on-primary-container' : 'border-outline-variant bg-surface-container-low text-on-surface'"
            @click="credentialKind = 'institution-auth'"
          >
            <p class="text-sm font-semibold">机构鉴权 SBT</p>
            <p class="mt-1 text-xs leading-5 opacity-80">仅治理账户可铸造，赋予钱包机构签署能力。</p>
          </button>
        </div>

        <div v-if="!isInstitutionAuthFlow" class="space-y-3 rounded-md3-md bg-surface-container-low px-4 py-4">
          <p class="text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">签发身份</p>
          <p class="text-sm text-on-surface-variant">{{ standardTrustHint }}</p>
          <div v-if="roles.hasInstitutionAuth" class="space-y-2">
            <label class="text-sm font-semibold text-on-surface">机构身份 Token</label>
            <select v-model="institutionAuthTokenId" class="md3-text-field">
              <option :value="0">不使用机构身份</option>
              <option v-for="token in roles.institutionAuthTokenIds" :key="token" :value="token">
                机构鉴权 SBT #{{ token }}
              </option>
            </select>
          </div>
        </div>

        <div v-if="isInstitutionAuthFlow" class="space-y-3 rounded-md3-md bg-surface-container-low px-4 py-4">
          <p class="text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">机构鉴权信息</p>
          <input v-model="institutionName" class="md3-text-field" placeholder="机构名称" />
          <input v-model="institutionCode" class="md3-text-field" placeholder="机构代码 / 唯一标识" />
          <input v-model="authorizedWallet" class="md3-text-field" placeholder="授权钱包地址" />
          <textarea v-model="institutionDescription" class="md3-text-field min-h-24" placeholder="机构说明（可选）" />
        </div>

        <div class="rounded-md3-md bg-surface-container-low px-4 py-4">
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">Credential ID</p>
              <p class="mt-2 truncate font-mono text-sm text-on-surface">{{ credentialId }}</p>
            </div>
            <IconButton icon="refresh" label="重新生成凭证 ID" tone="outlined" @click="generateCredentialId" />
          </div>
        </div>
      </div>
    </SurfaceCard>

    <SurfaceCard tone="soft">
      <div class="space-y-4">
        <div>
          <p class="text-sm font-semibold text-on-surface">2. 选择附件</p>
          <p class="mt-1 text-sm text-on-surface-variant">普通凭证和机构鉴权 SBT 都会把附件上传到 mock IPFS，链上仅保存 manifest 摘要。</p>
        </div>

        <button
          type="button"
          class="flex w-full flex-col items-center justify-center gap-3 rounded-md3-lg border border-dashed border-outline bg-surface-container-low px-6 py-8 text-center transition duration-150 hover:border-primary hover:bg-primary-container/40"
          @click="fileInput?.click()"
        >
          <div class="flex h-14 w-14 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
            <span class="material-symbols-outlined text-[28px]">upload_file</span>
          </div>
          <div>
            <p class="text-sm font-semibold text-on-surface">点击选择要写入 manifest 的附件</p>
            <p class="mt-1 text-sm text-on-surface-variant">系统会为每个附件计算 SHA-256 并生成 mock IPFS CID。</p>
          </div>
        </button>
        <input ref="fileInput" type="file" multiple class="hidden" @change="onFilesChange" />

        <div v-if="selectedFiles.length" class="space-y-3">
          <div class="flex items-center justify-between">
            <p class="text-sm font-semibold text-on-surface">已选附件</p>
            <button type="button" class="text-sm font-medium text-primary" @click="resetSelection">清空</button>
          </div>
          <div class="space-y-3">
            <div
              v-for="file in selectedFiles"
              :key="`${file.name}-${file.sizeText}`"
              class="flex items-start justify-between gap-3 rounded-md3-md bg-surface-container-high px-4 py-3"
            >
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-on-surface">{{ file.name }}</p>
                <p class="mt-1 text-xs text-on-surface-variant">{{ file.mimeType }}</p>
              </div>
              <span class="rounded-full bg-surface-container-lowest px-3 py-1 text-xs font-semibold text-on-surface-variant">
                {{ file.sizeText }}
              </span>
            </div>
          </div>
        </div>
        <EmptyState
          v-else
          icon="draft"
          title="还没有选择附件"
          description="至少上传 1 个文件后，才能生成 manifest 并铸造成链上 SBT。"
        />
      </div>
    </SurfaceCard>

    <SurfaceCard tone="raised">
      <div class="space-y-4">
        <div>
          <p class="text-sm font-semibold text-on-surface">3. 提交上链</p>
          <p class="mt-1 text-sm text-on-surface-variant">
            {{
              isInstitutionAuthFlow
                ? "治理账户会把当前 manifest 铸造成机构鉴权 SBT，授权指定钱包代表机构进行可信签署。"
                : "系统会依次上传附件、生成 manifest，并按当前身份调用 selfIssueCredential 完成铸造。"
            }}
          </p>
        </div>

        <div class="rounded-md3-md bg-secondary-container px-4 py-4 text-on-secondary-container">
          <p class="text-sm font-semibold">当前提交内容</p>
          <p class="mt-1 text-sm opacity-80">
            {{
              isInstitutionAuthFlow
                ? `机构 ${institutionName || "未命名"} 将授权钱包 ${authorizedWallet || "未填写"}`
                : `Credential ID 已准备完成，附件数量 ${files.length}，当前签发身份为 ${institutionAuthTokenId ? "机构" : roles.isGov ? "治理" : "个人"}`
            }}
          </p>
          <p v-if="busy" class="mt-2 text-sm opacity-80">进度：{{ currentStep }}</p>
        </div>

        <PrimaryButton
          icon="publish"
          :loading="busy"
          :disabled="!files.length"
          @click="mintCredential"
        >
          {{ busy ? "提交中..." : isInstitutionAuthFlow ? "签发机构鉴权 SBT" : "上传并铸造" }}
        </PrimaryButton>
      </div>
    </SurfaceCard>
  </section>
</template>
