<script setup lang="ts">
import type { IndexedCredentialSigner } from "@credchain/shared";
import { useWallet } from "~/composables/useWallet";

const route = useRoute();
const router = useRouter();
const tokenId = computed(() => Number(route.params.tokenId));

const { address } = useWallet();
const {
  verifyByTokenId,
  credentialMeta,
  getActorRoles,
  attest,
  revoke,
  hasSigned,
  getCredentialSignerViews
} = useCredentialContract();
const {
  statusKey,
  statusLabel,
  statusHeadline,
  statusDescription,
  credentialTypeKey,
  credentialTypeLabel,
  signerRoleLabel
} = useCredentialUi();

const busy = ref(false);
const errorMsg = ref("");
const successMsg = ref("");
const reason = ref("机构复核后吊销");

const detail = ref<{
  exists: boolean;
  revoked: boolean;
  expired: boolean;
  trusted: boolean;
  holder: string;
  manifestCid: string;
  manifestHash: string;
  fileCount: number;
  credentialType: number;
  trustStatus: number;
  signerCount: number;
  governanceSignerCount: number;
  institutionSignerCount: number;
  credentialId: string;
} | null>(null);

const manifest = ref<Record<string, any> | null>(null);
const signerViews = ref<IndexedCredentialSigner[]>([]);
const roles = ref({ isGov: false, hasInstitutionAuth: false, institutionAuthTokenIds: [] as number[] });
const alreadySigned = ref(false);

const canTrustedAction = computed(() => roles.value.isGov || roles.value.hasInstitutionAuth);
const currentSignerView = computed(() => signerViews.value.find((item) => item.signer.toLowerCase() === (address.value || "").toLowerCase()));
const selectedInstitutionAuthTokenId = computed(() => roles.value.isGov ? 0 : roles.value.institutionAuthTokenIds[0] || 0);
const selectedSignerRole = computed(() => roles.value.isGov ? 2 : 1);
const canAttest = computed(() => {
  if (!detail.value) return false;
  if (credentialTypeKey(detail.value) !== "standard") return false;
  if (detail.value.revoked || detail.value.expired) return false;
  if (!canTrustedAction.value) return false;
  if (!address.value || address.value.toLowerCase() === detail.value.holder.toLowerCase()) return false;
  return !alreadySigned.value;
});

async function loadDetail() {
  busy.value = true;
  errorMsg.value = "";
  successMsg.value = "";

  try {
    const [verify, meta, signed] = await Promise.all([
      verifyByTokenId(tokenId.value),
      credentialMeta(tokenId.value),
      address.value ? hasSigned(tokenId.value, address.value) : Promise.resolve(false)
    ]);

    detail.value = {
      exists: Boolean(verify.exists),
      revoked: Boolean(verify.revoked),
      expired: Boolean(verify.expired),
      trusted: Boolean(verify.trusted),
      holder: String(verify.holder),
      manifestCid: String(verify.manifestCid),
      manifestHash: String(meta.manifestHash),
      fileCount: Number(verify.fileCount),
      credentialType: Number(verify.credentialType),
      trustStatus: Number(verify.trustStatus),
      signerCount: Number(verify.signerCount),
      governanceSignerCount: Number(verify.governanceSignerCount),
      institutionSignerCount: Number(verify.institutionSignerCount),
      credentialId: String(meta.credentialId)
    };
    alreadySigned.value = Boolean(signed);

    manifest.value = await $fetch(`/api/ipfs/object/${detail.value.manifestCid}`);

    try {
      signerViews.value = await getCredentialSignerViews(tokenId.value);
    } catch (error) {
      console.error("Failed to load credential signer logs", error);
      signerViews.value = [];
    }
  } catch (error: any) {
    errorMsg.value = error.message || "加载失败";
    detail.value = null;
    manifest.value = null;
    signerViews.value = [];
  } finally {
    busy.value = false;
  }
}

async function attestNow() {
  if (!detail.value) return;

  busy.value = true;
  errorMsg.value = "";
  successMsg.value = "";
  try {
    await attest(tokenId.value, {
      credentialId: detail.value.credentialId,
      manifestHash: detail.value.manifestHash,
      signerRole: selectedSignerRole.value,
      institutionAuthTokenId: selectedInstitutionAuthTokenId.value,
      deadline: Math.floor(Date.now() / 1000) + 30 * 60
    });
    await loadDetail();
    successMsg.value = "受信任签署已完成。";
  } catch (error: any) {
    errorMsg.value = error.message || "签署失败";
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
    successMsg.value = "凭证已吊销。";
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
  } else {
    roles.value = { isGov: false, hasInstitutionAuth: false, institutionAuthTokenIds: [] };
    alreadySigned.value = false;
  }
  await loadDetail();
});
</script>

<template>
  <section class="md3-section-shell">
    <div class="flex items-center justify-between">
      <IconButton icon="arrow_back" label="返回上一页" tone="outlined" @click="router.back()" />
      <p class="text-sm font-semibold text-on-surface-variant">Token #{{ tokenId }}</p>
      <IconButton icon="refresh" label="刷新详情" tone="outlined" :disabled="busy" @click="loadDetail" />
    </div>

    <FeedbackBanner v-if="errorMsg" tone="error" :message="errorMsg" />
    <FeedbackBanner v-if="successMsg" tone="success" :message="successMsg" />

    <SurfaceCard v-if="detail" tone="raised">
      <div class="space-y-5">
        <div class="flex items-start justify-between gap-4">
          <div class="space-y-3">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">Credential Detail</p>
            <h1 class="text-[1.7rem] font-bold leading-tight tracking-[-0.03em] text-on-surface">
              {{ statusHeadline(detail) }}
            </h1>
            <p class="text-sm leading-6 text-on-surface-variant">{{ statusDescription(detail) }}</p>
          </div>
          <div class="flex h-16 w-16 shrink-0 items-center justify-center rounded-[28px] bg-primary-container text-on-primary-container">
            <span class="material-symbols-outlined icon-filled text-[32px]">
              {{ statusKey(detail) === 'trusted' ? 'verified' : statusKey(detail) === 'revoked' ? 'block' : statusKey(detail) === 'expired' ? 'schedule' : 'shield_person' }}
            </span>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <StatusChip :status="statusKey(detail)" :label="statusLabel(detail)" />
          <span class="rounded-full bg-surface-container-high px-3 py-1.5 text-xs font-semibold text-on-surface-variant">
            {{ credentialTypeLabel(detail) }}
          </span>
          <span class="rounded-full bg-surface-container-high px-3 py-1.5 text-xs font-semibold text-on-surface-variant">
            {{ detail.signerCount }} 位签署人
          </span>
        </div>

        <div class="rounded-md3-md bg-surface-container-low px-4 py-4">
          <p class="text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">Credential ID</p>
          <p class="mt-2 break-all font-mono text-sm text-on-surface">{{ detail.credentialId }}</p>
        </div>
      </div>
    </SurfaceCard>

    <SurfaceCard v-if="detail">
      <div class="space-y-4">
        <div>
          <p class="text-sm font-semibold text-on-surface">基础信息</p>
          <p class="mt-1 text-sm text-on-surface-variant">展示持有人、manifest 与凭证类型信息。</p>
        </div>

        <div class="space-y-3">
          <div class="rounded-md3-md bg-surface-container-low px-4 py-4">
            <p class="text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">Holder</p>
            <div class="mt-3">
              <AddressCopy :address="detail.holder" />
            </div>
          </div>

          <div class="rounded-md3-md bg-surface-container-low px-4 py-4">
            <p class="text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">Manifest CID</p>
            <p class="mt-2 break-all font-mono text-sm text-on-surface">{{ detail.manifestCid }}</p>
          </div>

          <div v-if="credentialTypeKey(detail) === 'institution-auth' && manifest" class="rounded-md3-md bg-surface-container-low px-4 py-4">
            <p class="text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">机构信息</p>
            <p class="mt-2 text-sm font-semibold text-on-surface">{{ manifest.institutionName || "未命名机构" }}</p>
            <p class="mt-1 text-sm text-on-surface-variant">机构代码：{{ manifest.institutionCode || "未填写" }}</p>
            <p class="mt-1 text-sm text-on-surface-variant">授权钱包：{{ manifest.authorizedWallet || detail.holder }}</p>
          </div>
        </div>
      </div>
    </SurfaceCard>

    <SurfaceCard v-if="detail">
      <div class="space-y-4">
        <div>
          <p class="text-sm font-semibold text-on-surface">签署记录</p>
          <p class="mt-1 text-sm text-on-surface-variant">签署明细由前端直接读取链上事件恢复，链上主状态只保存当前信任状态与聚合计数。</p>
        </div>

        <div v-if="signerViews.length" class="space-y-3">
          <div
            v-for="signer in signerViews"
            :key="`${signer.signer}-${signer.signerRole}-${signer.attestationDigest || signer.institutionAuthTokenId || 0}`"
            class="rounded-md3-md bg-surface-container-low px-4 py-4"
          >
            <div class="flex flex-wrap items-center gap-2">
              <StatusChip :status="signer.signerRole === 'governance' ? 'trusted' : 'neutral'" :label="signerRoleLabel(signer.signerRole === 'governance' ? 2 : signer.signerRole === 'institution' ? 1 : 0)" />
              <span v-if="signer.institutionName" class="rounded-full bg-surface-container-high px-3 py-1 text-xs font-semibold text-on-surface-variant">
                {{ signer.institutionName }}
              </span>
              <span v-if="signer.institutionCode" class="rounded-full bg-surface-container-high px-3 py-1 text-xs font-semibold text-on-surface-variant">
                {{ signer.institutionCode }}
              </span>
            </div>
            <div class="mt-3">
              <AddressCopy :address="signer.signer" />
            </div>
            <p v-if="signer.institutionAuthTokenId" class="mt-2 text-xs text-on-surface-variant">
              机构鉴权 SBT #{{ signer.institutionAuthTokenId }}
            </p>
            <p class="mt-2 text-xs text-on-surface-variant">
              签署时间：{{ new Date(signer.signedAt * 1000).toLocaleString() }}
            </p>
          </div>
        </div>

        <EmptyState
          v-else
          icon="history_toggle_off"
          title="暂未读取到签署明细"
          description="当前 token 的信任状态仍然由链上直接返回；若刚完成签署，请刷新页面重新读取链上事件。"
        />
      </div>
    </SurfaceCard>

    <SurfaceCard v-if="detail && manifest?.attachments?.length" tone="soft">
      <div class="space-y-4">
        <div>
          <p class="text-sm font-semibold text-on-surface">附件区</p>
          <p class="mt-1 text-sm text-on-surface-variant">附件内容从 mock IPFS 存储下载，链上只保存 manifest 摘要信息。</p>
        </div>

        <div class="space-y-3">
          <div
            v-for="file in manifest.attachments"
            :key="file.cid"
            class="rounded-md3-md bg-surface-container-lowest p-4 shadow-md3-1"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-on-surface">{{ file.name }}</p>
                <p class="mt-1 text-xs text-on-surface-variant">{{ file.mimeType }}</p>
                <p class="mt-1 text-xs text-on-surface-variant">{{ (file.size / 1024).toFixed(1) }} KB</p>
              </div>
              <a
                class="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-container text-on-primary-container"
                :href="`/api/ipfs/download/${file.cid}`"
                title="下载附件"
              >
                <span class="material-symbols-outlined text-[22px]">download</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </SurfaceCard>

    <SurfaceCard v-if="!detail && busy">
      <div class="rounded-md3-lg bg-surface-container-low px-6 py-10 text-center">
        <span class="material-symbols-outlined animate-spin text-[32px] text-primary">progress_activity</span>
        <p class="mt-3 text-sm text-on-surface-variant">正在拉取链上详情与索引数据...</p>
      </div>
    </SurfaceCard>

    <EmptyState
      v-else-if="!detail && !busy"
      icon="search_off"
      title="暂时无法显示该凭证"
      description="请确认 Token ID 是否存在，或稍后再次从链上刷新。"
    />

    <SurfaceCard v-if="detail && canTrustedAction">
      <div class="space-y-4">
        <div>
          <p class="text-sm font-semibold text-on-surface">受信任操作</p>
          <p class="mt-1 text-sm text-on-surface-variant">治理账户或持有机构鉴权 SBT 的钱包可对普通凭证追加受信任签署。</p>
        </div>

        <div class="rounded-md3-md bg-secondary-container px-4 py-4 text-on-secondary-container">
          <p class="text-sm font-semibold">
            {{ roles.isGov ? "当前角色：治理账户" : roles.hasInstitutionAuth ? `当前角色：机构身份（#${selectedInstitutionAuthTokenId || 0}）` : "当前角色：普通钱包" }}
          </p>
          <p class="mt-1 text-sm opacity-80">
            {{
              alreadySigned
                ? "当前地址已经在链上登记过签署状态，前端已禁用重复背书。"
                : credentialTypeKey(detail) === "institution-auth"
                  ? "机构鉴权 SBT 本身不需要再追加受信任签署。"
                  : "本次操作会先在本地钱包中生成 EIP-712 签名，再把签名提交到链上验证并发出索引事件。"
            }}
          </p>
        </div>

        <PrimaryButton icon="verified" :loading="busy" :disabled="!canAttest" @click="attestNow">
          {{ canAttest ? "追加受信任签署" : "当前不可签署" }}
        </PrimaryButton>

        <div class="space-y-3 rounded-md3-md bg-surface-container-low px-4 py-4">
          <label class="text-sm font-semibold text-on-surface">吊销原因</label>
          <input v-model="reason" class="md3-text-field" placeholder="输入吊销原因" />
          <TonalButton icon="block" :loading="busy" :disabled="!detail || detail.revoked" @click="revokeNow">
            吊销凭证
          </TonalButton>
        </div>
      </div>
    </SurfaceCard>
  </section>
</template>
