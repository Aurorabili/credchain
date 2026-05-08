<script setup lang="ts">
import type { CredentialBusinessField, CredentialEvidenceReference, CredentialMetadataDocument } from "~/utils/credentialMetadata";
import { inferEvidenceKind } from "~/utils/credentialMetadata";
import { putFile, putMetadata } from "~/utils/mockIpfs";

definePageMeta({ layout: "default" });

const chain = useChain();
const router = useRouter();

const title = ref("");
const businessType = ref("");
const description = ref("");
const issuerName = ref("");
const businessFields = ref<CredentialBusinessField[]>([
  { name: "", value: "", type: "text" },
]);
const evidenceFiles = ref<File[]>([]);
const done = ref(false);
const submitting = ref(false);
const errorMessage = ref("");

function addBusinessField() {
  businessFields.value.push({ name: "", value: "", type: "text" });
}

function removeBusinessField(index: number) {
  businessFields.value.splice(index, 1);
  if (businessFields.value.length === 0) addBusinessField();
}

function onEvidenceChanged(event: Event) {
  const input = event.target as HTMLInputElement;
  evidenceFiles.value = Array.from(input.files ?? []);
}

async function uploadEvidence(): Promise<CredentialEvidenceReference[]> {
  const uploaded: CredentialEvidenceReference[] = [];

  for (const file of evidenceFiles.value) {
    const reference = await putFile(file);
    uploaded.push({
      ...reference,
      kind: inferEvidenceKind(reference.mimeType),
    });
  }

  return uploaded;
}

async function submit() {
  errorMessage.value = "";
  const resolvedType = businessType.value.trim();
  const filteredFields = businessFields.value
    .map((field) => ({ ...field, name: field.name.trim(), value: field.value.trim() }))
    .filter((field) => field.name && field.value);

  if (!title.value.trim() || !description.value.trim() || !issuerName.value.trim() || !resolvedType) {
    errorMessage.value = "请先补全标题、签发方、业务类型和描述。";
    return;
  }

  const confirmed = window.confirm("确认铸造这张证书？提交到链上后将不能直接修改。");
  if (!confirmed) return;

  submitting.value = true;
  try {
    const account = chain.getAccount();
    if (!account) throw new Error("Wallet not connected");

    const evidence = await uploadEvidence();
    const metadata: CredentialMetadataDocument = {
      version: "1.0",
      displayType: "certificate",
      businessType: resolvedType,
      title: title.value.trim(),
      description: description.value.trim(),
      issuer: {
        name: issuerName.value.trim(),
        address: account,
      },
      recipient: {
        wallet: account,
      },
      issuedAt: new Date().toISOString(),
      fields: filteredFields,
      evidence,
    };

    const metadataCID = await putMetadata(metadata);
    await chain.mint(resolvedType, metadataCID);
    done.value = true;
    setTimeout(() => router.push("/credentials"), 1500);
  } catch (error: any) {
    errorMessage.value = error?.message ?? "铸造失败";
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="space-y-8 pb-20">
    <PageHeader
      title="铸造证书"
      subtitle="登记凭证信息并为其铸造一枚代币。"
    />

    <form v-if="!done" class="space-y-8" @submit.prevent="submit">
      <SectionBlock title="基本信息" subtitle="基本信息会存储在链上并公开。不要填写个人隐私信息。">
        <div class="form-panel">
          <label class="form-field block">
            <p class="form-label">证书标题</p>
            <input
              v-model="title"
              class="form-control"
              placeholder="例如：社区志愿服务证书"
              required
            />
          </label>

          <label class="form-field block">
            <p class="form-label">签发方</p>
            <input
              v-model="issuerName"
              class="form-control"
              placeholder="例如：XX 社区服务中心"
              required
            />
            <p class="form-note">填写签发机构、学校、组织或项目名称，方便查看者快速判断来源。</p>
          </label>

          <label class="form-field block">
            <p class="form-label">业务类型</p>
            <input
              v-model="businessType"
              class="form-control"
              placeholder="例如：志愿服务、科研项目、竞赛成果"
              required
            />
            <p class="form-note">业务类型用于分类和检索，建议使用简短、清晰、稳定的名称。</p>
          </label>

          <label class="form-field block">
            <p class="form-label">描述</p>
            <textarea
              v-model="description"
              rows="4"
              class="form-control form-textarea"
              placeholder="描述这张证书的背景、用途或适用场景…"
              required
            />
            <p class="form-note">业务字段会被存储在分布式文件系统中。</p>
          </label>
        </div>
      </SectionBlock>

      <SectionBlock title="业务字段" subtitle="这些信息会随证书一起保存，适合写服务时长、编号、项目名称等自定义内容。">
        <div class="space-y-3">
          <div
            v-for="(field, index) in businessFields"
            :key="index"
            class="form-panel"
          >
            <div class="form-field block">
              <div class="flex items-center justify-between gap-3">
                <p class="form-label">字段 {{ index + 1 }}</p>
                <button
                  type="button"
                  class="icon-button tonal-button"
                  aria-label="删除字段"
                  @click="removeBusinessField(index)"
                >
                  <span class="material-symbols-outlined" aria-hidden="true">delete</span>
                </button>
              </div>

              <div class="form-inline-grid mt-3">
                <div>
                  <p class="form-label">字段名</p>
                  <input
                    v-model="field.name"
                    class="form-control"
                    placeholder="例如：服务时长"
                  />
                </div>
                <div>
                  <p class="form-label">字段值</p>
                  <input
                    v-model="field.value"
                    class="form-control"
                    placeholder="例如：48小时"
                  />
                </div>
                <div class="sm:self-end">
                  <button
                    type="button"
                    class="secondary-pill w-full justify-center sm:w-auto"
                    @click="addBusinessField"
                    v-if="index === businessFields.length - 1"
                  >
                    <span class="material-symbols-outlined text-lg" aria-hidden="true">add</span>
                    添加字段
                  </button>
                </div>
              </div>

              <p class="form-note">字段名和值都会出现在详情页里，适合写用户希望公开展示的业务信息。</p>
            </div>
          </div>
        </div>
      </SectionBlock>

      <SectionBlock title="佐证材料" subtitle="可以上传图片或文件，作为这张证书的补充说明。">
        <div class="form-panel">
          <label class="form-field block">
            <p class="form-label">上传附件</p>
            <input
              type="file"
              multiple
              class="form-control"
              @change="onEvidenceChanged"
            />
          </label>
        </div>

        <div v-if="evidenceFiles.length" class="flat-list">
          <div
            v-for="file in evidenceFiles"
            :key="`${file.name}-${file.size}`"
            class="flat-list-row justify-between"
          >
            <div class="min-w-0">
              <p class="body-strong break-all">{{ file.name }}</p>
              <p class="helper-text">{{ file.type || "未知类型" }}</p>
            </div>
            <p class="helper-text whitespace-nowrap">{{ Math.max(1, Math.round(file.size / 1024)) }} KB</p>
          </div>
        </div>
      </SectionBlock>

      <div v-if="errorMessage" class="rounded-2xl bg-error-container px-4 py-3 text-sm text-on-error-container">
        {{ errorMessage }}
      </div>

      <div class="flat-surface-strong flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="body-strong">准备写入这张证书</p>
          <p class="helper-text mt-1">提交后会先整理材料，再把元数据写入链上，之后不能直接修改。</p>
        </div>
        <button
          type="submit"
          :disabled="submitting"
          class="primary-pill justify-center disabled:opacity-60"
        >
          <span class="material-symbols-outlined text-lg" aria-hidden="true">add_circle</span>
          {{ submitting ? "正在上传并铸造…" : "铸造证书" }}
        </button>
      </div>
    </form>

    <div v-else class="flat-surface-strong text-center py-12 space-y-3">
      <span class="material-symbols-outlined text-6xl text-primary" aria-hidden="true">check_circle</span>
      <p class="text-lg font-medium">证书已铸造！</p>
      <p class="text-sm text-on-surface-variant">正在跳转到凭证列表…</p>
    </div>
  </div>
</template>
