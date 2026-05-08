<script setup lang="ts">
const props = defineProps<{
  address: `0x${string}`;
  kycVerified?: boolean;
  compact?: boolean;
}>();

const { getFriendlyName, getDisplayName, setFriendlyName } = useAddressBook();
const editing = ref(false);
const draft = ref("");

const displayName = computed(() => getDisplayName(props.address));

function startEditing() {
  draft.value = getFriendlyName(props.address);
  editing.value = true;
}

function cancelEditing() {
  editing.value = false;
  draft.value = "";
}

function saveName() {
  setFriendlyName(props.address, draft.value);
  editing.value = false;
}
</script>

<template>
  <div class="flex min-w-0 items-center gap-2">
    <template v-if="editing">
      <input
        v-model="draft"
        class="min-w-0 flex-1 rounded-full bg-surface-container px-3 py-2 text-sm text-on-surface outline-none ring-1 ring-outline focus:ring-primary"
        placeholder="输入友好名称"
        @keyup.enter="saveName"
        @keyup.esc="cancelEditing"
      />
      <button class="icon-button tonal-button" type="button" aria-label="保存名称" @click="saveName">
        <span class="material-symbols-outlined text-[20px]" aria-hidden="true">check</span>
      </button>
      <button class="icon-button" type="button" aria-label="取消编辑" @click="cancelEditing">
        <span class="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
      </button>
    </template>

    <template v-else>
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <p :class="compact ? 'title-inline' : 'identity-title'" class="truncate">
            {{ displayName }}
          </p>
          <span
            v-if="kycVerified"
            class="inline-flex items-center gap-1 rounded-full bg-secondary-container px-2 py-1 text-[11px] font-medium text-on-secondary-container"
          >
            <span class="material-symbols-outlined icon-filled text-[14px]" aria-hidden="true">verified</span>
            KYC
          </span>
        </div>
      </div>
      <button class="icon-button" type="button" aria-label="编辑友好名称" @click="startEditing">
        <span class="material-symbols-outlined text-[20px]" aria-hidden="true">edit</span>
      </button>
    </template>
  </div>
</template>
