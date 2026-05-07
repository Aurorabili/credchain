import type { Config } from "tailwindcss";

export default {
    darkMode: "class",
    content: [
        "./components/**/*.{vue,js,ts}",
        "./layouts/**/*.vue",
        "./pages/**/*.vue",
        "./app.vue"
    ],
    theme: {
        extend: {
            colors: {
                primary: "rgb(var(--md-sys-color-primary) / <alpha-value>)",
                "on-primary": "rgb(var(--md-sys-color-on-primary) / <alpha-value>)",
                "primary-container": "rgb(var(--md-sys-color-primary-container) / <alpha-value>)",
                "on-primary-container": "rgb(var(--md-sys-color-on-primary-container) / <alpha-value>)",
                secondary: "rgb(var(--md-sys-color-secondary) / <alpha-value>)",
                "on-secondary": "rgb(var(--md-sys-color-on-secondary) / <alpha-value>)",
                "secondary-container": "rgb(var(--md-sys-color-secondary-container) / <alpha-value>)",
                "on-secondary-container": "rgb(var(--md-sys-color-on-secondary-container) / <alpha-value>)",
                tertiary: "rgb(var(--md-sys-color-tertiary) / <alpha-value>)",
                "on-tertiary": "rgb(var(--md-sys-color-on-tertiary) / <alpha-value>)",
                "tertiary-container": "rgb(var(--md-sys-color-tertiary-container) / <alpha-value>)",
                "on-tertiary-container": "rgb(var(--md-sys-color-on-tertiary-container) / <alpha-value>)",
                surface: "rgb(var(--md-sys-color-surface) / <alpha-value>)",
                "surface-dim": "rgb(var(--md-sys-color-surface-dim) / <alpha-value>)",
                "surface-bright": "rgb(var(--md-sys-color-surface-bright) / <alpha-value>)",
                "surface-container-lowest": "rgb(var(--md-sys-color-surface-container-lowest) / <alpha-value>)",
                "surface-container-low": "rgb(var(--md-sys-color-surface-container-low) / <alpha-value>)",
                "surface-container": "rgb(var(--md-sys-color-surface-container) / <alpha-value>)",
                "surface-container-high": "rgb(var(--md-sys-color-surface-container-high) / <alpha-value>)",
                "surface-container-highest": "rgb(var(--md-sys-color-surface-container-highest) / <alpha-value>)",
                "on-surface": "rgb(var(--md-sys-color-on-surface) / <alpha-value>)",
                "on-surface-variant": "rgb(var(--md-sys-color-on-surface-variant) / <alpha-value>)",
                outline: "rgb(var(--md-sys-color-outline) / <alpha-value>)",
                "outline-variant": "rgb(var(--md-sys-color-outline-variant) / <alpha-value>)",
                error: "rgb(var(--md-sys-color-error) / <alpha-value>)",
                "on-error": "rgb(var(--md-sys-color-on-error) / <alpha-value>)",
                "error-container": "rgb(var(--md-sys-color-error-container) / <alpha-value>)",
                "on-error-container": "rgb(var(--md-sys-color-on-error-container) / <alpha-value>)",
                success: "rgb(var(--md-sys-color-success) / <alpha-value>)",
                "on-success": "rgb(var(--md-sys-color-on-success) / <alpha-value>)",
                "success-container": "rgb(var(--md-sys-color-success-container) / <alpha-value>)",
                "on-success-container": "rgb(var(--md-sys-color-on-success-container) / <alpha-value>)",
                warning: "rgb(var(--md-sys-color-warning) / <alpha-value>)",
                "on-warning": "rgb(var(--md-sys-color-on-warning) / <alpha-value>)",
                "warning-container": "rgb(var(--md-sys-color-warning-container) / <alpha-value>)",
                "on-warning-container": "rgb(var(--md-sys-color-on-warning-container) / <alpha-value>)"
            },
            borderRadius: {
                "md3-xs": "12px",
                "md3-sm": "16px",
                "md3-md": "20px",
                "md3-lg": "28px",
                "md3-xl": "36px",
                "md3-full": "999px"
            },
            boxShadow: {
                "md3-1": "var(--md-sys-elevation-1)",
                "md3-2": "var(--md-sys-elevation-2)",
                "md3-3": "var(--md-sys-elevation-3)"
            },
            spacing: {
                4.5: "1.125rem",
                5.5: "1.375rem"
            },
            fontFamily: {
                sans: ["Plus Jakarta Sans", "Noto Sans SC", "sans-serif"]
            }
        }
    }
} satisfies Config;
