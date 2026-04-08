export default defineNuxtConfig({
    compatibilityDate: "2026-04-07",
    modules: ["@nuxtjs/tailwindcss"],
    app: {
        head: {
            link: [
                {
                    rel: "stylesheet",
                    href: "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
                }
            ]
        }
    },
    css: [
        "~/assets/styles/tailwind.css",
        "~/assets/styles/tokens.css",
        "~/assets/styles/theme.css"
    ],
    runtimeConfig: {
        public: {
            chainId: Number(process.env.NUXT_PUBLIC_CHAIN_ID || 31337),
            credentialContractAddress: process.env.NUXT_PUBLIC_CREDENTIAL_CONTRACT_ADDRESS || "",
            ipfsGatewayBase: process.env.NUXT_PUBLIC_IPFS_GATEWAY_BASE || "https://ipfs.io/ipfs/"
        }
    },
    devtools: { enabled: true }
});
