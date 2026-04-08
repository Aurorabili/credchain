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
        extend: {}
    }
} satisfies Config;
