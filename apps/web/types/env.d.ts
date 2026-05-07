interface ImportMetaEnv {
    readonly NUXT_PUBLIC_CHAIN_ID?: string;
    readonly NUXT_PUBLIC_CREDENTIAL_CONTRACT_ADDRESS?: string;
    readonly NUXT_PUBLIC_RPC_URL?: string;
    readonly NUXT_PUBLIC_IPFS_GATEWAY_BASE?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
