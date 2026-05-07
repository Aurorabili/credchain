<script setup lang="ts">
definePageMeta({ layout: "default" });

const name = ref("");
const credentialType = ref("certificate");
const description = ref("");
const chain = useChain();
const router = useRouter();
const done = ref(false);

async function submit() {
  if (!name.value.trim() || !description.value.trim()) return;
  await chain.mint(credentialType.value, `Qm${Date.now()}`);
  done.value = true;
  setTimeout(() => router.push("/"), 1500);
}
</script>

<template>
  <div class="space-y-6 pb-20">
    <PageHeader title="铸造凭证" />
    <form v-if="!done" class="space-y-4" @submit.prevent="submit">
      <label class="block">
        <span class="text-sm font-medium text-on-surface-variant block mb-1">名称</span>
        <input
          v-model="name"
          class="w-full bg-transparent border border-outline rounded-md3-xs px-4 py-3 text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none transition"
          placeholder="例如：计算机科学学士学位"
          required
        />
      </label>
      <label class="block">
        <span class="text-sm font-medium text-on-surface-variant block mb-1">类型</span>
        <select
          v-model="credentialType"
          class="w-full bg-transparent border border-outline rounded-md3-xs px-4 py-3 text-on-surface focus:border-primary focus:outline-none transition"
        >
          <option value="degree">学位</option>
          <option value="certificate">证书</option>
          <option value="badge">徽章</option>
          <option value="license">执照</option>
        </select>
      </label>
      <label class="block">
        <span class="text-sm font-medium text-on-surface-variant block mb-1">描述</span>
        <textarea
          v-model="description"
          rows="3"
          class="w-full bg-transparent border border-outline rounded-md3-xs px-4 py-3 text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none transition resize-none"
          placeholder="描述该凭证..."
          required
        />
      </label>
      <button
        type="submit"
        class="w-full bg-primary text-on-primary rounded-md3-full py-3 font-medium text-sm hover:opacity-90 transition"
      >
        <span class="material-symbols-outlined align-middle mr-1" aria-hidden="true">add_circle</span>
        铸造 SBT
      </button>
    </form>
    <div v-else class="text-center py-12 space-y-3">
      <span class="material-symbols-outlined text-6xl text-primary" aria-hidden="true">check_circle</span>
      <p class="text-lg font-medium">凭证已铸造！</p>
      <p class="text-sm text-on-surface-variant">正在跳转…</p>
    </div>
  </div>
</template>
