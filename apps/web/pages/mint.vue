<script setup lang="ts">
import type { CredentialBusinessField, CredentialEvidenceReference, CredentialMetadataDocument } from "~/utils/credentialMetadata";
import { inferEvidenceKind } from "~/utils/credentialMetadata";
import { putFile, putMetadata } from "~/utils/mockIpfs";

definePageMeta({ layout: "default" });

const chain = useChain();
const router = useRouter();

const title = ref("");
const businessType = ref("volunteer");
const customBusinessType = ref("");
const description = ref("");
const issuerName = ref("");
const businessFields = ref<CredentialBusinessField[]>([
  { name: "", value: "", type: "text" },
]);
const evidenceFiles = ref<File[]>([]);
const done = ref(false);
const submitting = ref(false);
const errorMessage = ref("");

const businessTypeOptions = [
  { value: "volunteer", label: "志愿服务" },
  { value: "graduation", label: "毕业成就" },
  { value: "internship", label: "实习经历" },
  { value: "honor", label: "荣誉奖项" },
  { value: "training", label: "培训证明" },
  { value: "custom", label: "自定义" },
];

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

function resolvedBusinessType() {
  if (businessType.value !== "custom") return businessType.value;
  return customBusinessType.value.trim();
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
  const resolvedType = resolvedBusinessType();
  const filteredFields = businessFields.value
    .map((field) => ({ ...field, name: field.name.trim(), value: field.value.trim() }))
    .filter((field) => field.name && field.value);

  if (!title.value.trim() || !description.value.trim() || !issuerName.value.trim() || !resolvedType) {
    errorMessage.value = "请先补全标题、签发方、业务类型和描述。";
    return;
  }

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
  <div class="space-y-6 pb-20">
    <PageHeader title="铸造证书" />

    <form v-if="!done" class="space-y-6" @submit.prevent="submit">
      <section class="rounded-[24px] border border-outline-variant bg-surface p-4 space-y-4">
        <div>
          <p class="text-sm font-semibold">固定展示类型</p>
          <p class="mt-1 text-sm text-on-surface-variant">所有凭证统一作为“证书”展示，链上类型字段仅用于业务分类。</p>
        </div>

        <label class="block">
          <span class="text-sm font-medium text-on-surface-variant block mb-1">证书标题</span>
          <input
            v-model="title"
            class="w-full bg-transparent border border-outline rounded-md3-xs px-4 py-3 text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none transition"
            placeholder="例如：社区志愿服务证书"
            required
          />
        </label>

        <label class="block">
          <span class="text-sm font-medium text-on-surface-variant block mb-1">签发方</span>
          <input
            v-model="issuerName"
            class="w-full bg-transparent border border-outline rounded-md3-xs px-4 py-3 text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none transition"
            placeholder="例如：XX 社区服务中心"
            required
          />
        </label>

        <label class="block">
          <span class="text-sm font-medium text-on-surface-variant block mb-1">业务类型</span>
          <select
            v-model="businessType"
            class="w-full bg-transparent border border-outline rounded-md3-xs px-4 py-3 text-on-surface focus:border-primary focus:outline-none transition"
          >
            <option v-for="option in businessTypeOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>

        <label v-if="businessType === 'custom'" class="block">
          <span class="text-sm font-medium text-on-surface-variant block mb-1">自定义业务类型</span>
          <input
            v-model="customBusinessType"
            class="w-full bg-transparent border border-outline rounded-md3-xs px-4 py-3 text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none transition"
            placeholder="例如：科研项目"
            required
          />
        </label>

        <label class="block">
          <span class="text-sm font-medium text-on-surface-variant block mb-1">描述</span>
          <textarea
            v-model="description"
            rows="3"
            class="w-full bg-transparent border border-outline rounded-md3-xs px-4 py-3 text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none transition resize-none"
            placeholder="描述这张证书的用途与背景..."
            required
          />
        </label>
      </section>

      <section class="rounded-[24px] border border-outline-variant bg-surface p-4 space-y-4">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-semibold">业务字段</p>
            <p class="mt-1 text-sm text-on-surface-variant">这些字段会被打包进 metadata JSON，再以 CID 的形式写入链上。</p>
          </div>
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-full border border-outline px-3 py-2 text-sm"
            @click="addBusinessField"
          >
            <span class="material-symbols-outlined text-lg" aria-hidden="true">add</span>
            添加字段
          </button>
        </div>

        <div class="space-y-3">
          <div
            v-for="(field, index) in businessFields"
            :key="index"
            class="grid gap-3 rounded-2xl bg-surface-container p-3 sm:grid-cols-[1fr_1fr_auto]"
          >
            <input
              v-model="field.name"
              class="w-full bg-transparent border border-outline rounded-md3-xs px-4 py-3 text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none transition"
              placeholder="字段名，例如：服务时长"
            />
            <input
              v-model="field.value"
              class="w-full bg-transparent border border-outline rounded-md3-xs px-4 py-3 text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none transition"
              placeholder="字段值，例如：48小时"
            />
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-full border border-outline px-3 py-3 text-on-surface-variant hover:text-error"
              @click="removeBusinessField(index)"
            >
              <span class="material-symbols-outlined" aria-hidden="true">delete</span>
            </button>
          </div>
        </div>
      </section>

      <section class="rounded-[24px] border border-outline-variant bg-surface p-4 space-y-4">
        <div>
          <p class="text-sm font-semibold">佐证材料</p>
          <p class="mt-1 text-sm text-on-surface-variant">支持上传多张图片或多个文件。当前版本会先存入本地 mock IPFS，后续可替换为真实 IPFS 服务。</p>
        </div>

        <label class="block">
          <span class="text-sm font-medium text-on-surface-variant block mb-1">上传附件</span>
          <input
            type="file"
            multiple
            class="w-full bg-transparent border border-outline rounded-md3-xs px-4 py-3 text-sm text-on-surface"
            @change="onEvidenceChanged"
          />
        </label>

        <ul v-if="evidenceFiles.length" class="space-y-2 text-sm text-on-surface-variant">
          <li v-for="file in evidenceFiles" :key="`${file.name}-${file.size}`" class="rounded-2xl bg-surface-container px-4 py-3">
            {{ file.name }} · {{ file.type || "未知类型" }} · {{ Math.max(1, Math.round(file.size / 1024)) }} KB
          </li>
        </ul>
      </section>

      <div v-if="errorMessage" class="rounded-2xl bg-error-container px-4 py-3 text-sm text-on-error-container">
        {{ errorMessage }}
      </div>

      <button
        type="submit"
        :disabled="submitting"
        class="w-full bg-primary text-on-primary rounded-md3-full py-3 font-medium text-sm hover:opacity-90 transition disabled:opacity-60"
      >
        <span class="material-symbols-outlined align-middle mr-1" aria-hidden="true">add_circle</span>
        {{ submitting ? "正在上传并铸造…" : "铸造证书" }}
      </button>
    </form>

    <div v-else class="text-center py-12 space-y-3">
      <span class="material-symbols-outlined text-6xl text-primary" aria-hidden="true">check_circle</span>
      <p class="text-lg font-medium">证书已铸造！</p>
      <p class="text-sm text-on-surface-variant">正在跳转到凭证列表…</p>
    </div>
  </div>
</template>
