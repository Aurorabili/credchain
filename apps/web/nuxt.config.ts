const isDev = process.env.NODE_ENV !== "production";
const defaultIpfsApiBase = isDev ? "/api/ipfs" : "http://127.0.0.1:5001/api/v0";
const defaultIpfsGatewayBase = isDev ? "/ipfs" : "http://127.0.0.1:8080/ipfs";

export default defineNuxtConfig({
    ssr: false,
    experimental: {
        viteEnvironmentApi: true,
    },
    runtimeConfig: {
        public: {
            indexerBaseUrl: process.env.NUXT_PUBLIC_INDEXER_BASE_URL || "/api/indexer",
            ipfsApiBase: process.env.NUXT_PUBLIC_IPFS_API_BASE || defaultIpfsApiBase,
            ipfsGatewayBase: process.env.NUXT_PUBLIC_IPFS_GATEWAY_BASE || defaultIpfsGatewayBase,
        },
    },
    routeRules: isDev
        ? {
            "/api/indexer": { proxy: "http://127.0.0.1:4100/api/indexer" },
            "/api/indexer/**": { proxy: "http://127.0.0.1:4100/api/indexer/**" },
        }
        : undefined,
    nitro: {
        devProxy: isDev
            ? {
                "/api/ipfs": {
                    target: "http://127.0.0.1:5001/api/v0",
                    changeOrigin: true,
                },
                "/ipfs": {
                    target: "http://127.0.0.1:8080/ipfs",
                    changeOrigin: true,
                },
            }
            : undefined,
    },
    vite: {
        optimizeDeps: {
            include: [
                'viem',
                'viem/chains',
            ]
        }
    },
    compatibilityDate: "2026-05-07",
    devtools: { enabled: true },
    modules: ["@nuxtjs/tailwindcss", "@nuxtjs/color-mode", "@vite-pwa/nuxt"],
    css: ["~/assets/css/main.css"],
    colorMode: {
        preference: "system",
        fallback: "light",
        classSuffix: "",
    },
    tailwindcss: { configPath: "./tailwind.config.ts" },
    pwa: {
        registerType: "autoUpdate",
        manifest: {
            name: "CredChain",
            short_name: "CredChain",
            description: "Decentralized Credential Platform",
            theme_color: "#3856b5",
            background_color: "#fffaf7",
            display: "standalone",
            icons: [],
        },
    },
    app: {
        head: {
            title: "CredChain",
            meta: [
                { name: "viewport", content: "width=device-width,initial-scale=1" },
                { name: "theme-color", content: "#3856b5" },
            ],
            link: [
                { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" },
            ],
        },
    },
});
