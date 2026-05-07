import type { Config } from "tailwindcss";

export default {
    content: [
        "./components/**/*.{vue,ts}",
        "./pages/**/*.vue",
        "./layouts/**/*.vue",
        "./app.vue",
    ],
    darkMode: "class",
    theme: {
        extend: {
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"],
            },
            colors: {
                // ─── M3 Primary ─────────────────────────────────
                primary: "rgb(var(--md-sys-color-primary) / <alpha-value>)",
                "on-primary": "rgb(var(--md-sys-color-on-primary) / <alpha-value>)",
                "primary-container": "rgb(var(--md-sys-color-primary-container) / <alpha-value>)",
                "on-primary-container": "rgb(var(--md-sys-color-on-primary-container) / <alpha-value>)",
                // ─── M3 Secondary ───────────────────────────────
                secondary: "rgb(var(--md-sys-color-secondary) / <alpha-value>)",
                "on-secondary": "rgb(var(--md-sys-color-on-secondary) / <alpha-value>)",
                "secondary-container": "rgb(var(--md-sys-color-secondary-container) / <alpha-value>)",
                "on-secondary-container": "rgb(var(--md-sys-color-on-secondary-container) / <alpha-value>)",
                // ─── M3 Tertiary ────────────────────────────────
                tertiary: "rgb(var(--md-sys-color-tertiary) / <alpha-value>)",
                "on-tertiary": "rgb(var(--md-sys-color-on-tertiary) / <alpha-value>)",
                "tertiary-container": "rgb(var(--md-sys-color-tertiary-container) / <alpha-value>)",
                "on-tertiary-container": "rgb(var(--md-sys-color-on-tertiary-container) / <alpha-value>)",
                // ─── M3 Error ───────────────────────────────────
                error: "rgb(var(--md-sys-color-error) / <alpha-value>)",
                "on-error": "rgb(var(--md-sys-color-on-error) / <alpha-value>)",
                "error-container": "rgb(var(--md-sys-color-error-container) / <alpha-value>)",
                "on-error-container": "rgb(var(--md-sys-color-on-error-container) / <alpha-value>)",
                // ─── M3 Surface ─────────────────────────────────
                surface: "rgb(var(--md-sys-color-surface) / <alpha-value>)",
                "on-surface": "rgb(var(--md-sys-color-on-surface) / <alpha-value>)",
                "surface-dim": "rgb(var(--md-sys-color-surface-dim) / <alpha-value>)",
                "surface-bright": "rgb(var(--md-sys-color-surface-bright) / <alpha-value>)",
                "surface-container-lowest": "rgb(var(--md-sys-color-surface-container-lowest) / <alpha-value>)",
                "surface-container-low": "rgb(var(--md-sys-color-surface-container-low) / <alpha-value>)",
                "surface-container": "rgb(var(--md-sys-color-surface-container) / <alpha-value>)",
                "surface-container-high": "rgb(var(--md-sys-color-surface-container-high) / <alpha-value>)",
                "surface-container-highest": "rgb(var(--md-sys-color-surface-container-highest) / <alpha-value>)",
                "surface-variant": "rgb(var(--md-sys-color-surface-variant) / <alpha-value>)",
                "on-surface-variant": "rgb(var(--md-sys-color-on-surface-variant) / <alpha-value>)",
                // ─── M3 Outline ─────────────────────────────────
                outline: "rgb(var(--md-sys-color-outline) / <alpha-value>)",
                "outline-variant": "rgb(var(--md-sys-color-outline-variant) / <alpha-value>)",
            },
            borderRadius: {
                "md3-xs": "4px",
                "md3-sm": "8px",
                "md3-md": "12px",
                "md3-lg": "16px",
                "md3-xl": "28px",
                "md3-full": "9999px",
            },
            fontSize: {
                "md3-display": ["57px", { lineHeight: "64px", fontWeight: "400" }],
                "md3-headline-lg": ["36px", { lineHeight: "44px", fontWeight: "700" }],
                "md3-headline": ["28px", { lineHeight: "36px", fontWeight: "700" }],
                "md3-title-lg": ["22px", { lineHeight: "28px", fontWeight: "500" }],
                "md3-title": ["16px", { lineHeight: "24px", fontWeight: "500" }],
                "md3-body-lg": ["16px", { lineHeight: "24px", fontWeight: "400" }],
                "md3-body": ["14px", { lineHeight: "20px", fontWeight: "400" }],
                "md3-label-lg": ["14px", { lineHeight: "20px", fontWeight: "500" }],
                "md3-label": ["12px", { lineHeight: "16px", fontWeight: "500" }],
            },
        },
    },
    plugins: [],
} satisfies Config;
