interface ImportMetaEnv {
    readonly NUXT_PUBLIC_CHAIN_ID?: string;
    readonly NUXT_PUBLIC_CREDENTIAL_CONTRACT_ADDRESS?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
