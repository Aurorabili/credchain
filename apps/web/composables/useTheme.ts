type ThemeMode = "light" | "dark";

const STORAGE_KEY = "credchain-theme";

export function useTheme() {
    const theme = useState<ThemeMode>("theme", () => "light");

    const setTheme = (mode: ThemeMode) => {
        theme.value = mode;
        if (process.client) {
            document.documentElement.dataset.theme = mode;
            document.documentElement.classList.toggle("dark", mode === "dark");
            localStorage.setItem(STORAGE_KEY, mode);
        }
    };

    const applySystemPreference = () => {
        if (!process.client) {
            return;
        }

        const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
        if (saved === "light" || saved === "dark") {
            setTheme(saved);
            return;
        }

        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setTheme(prefersDark ? "dark" : "light");
    };

    const toggleTheme = () => {
        setTheme(theme.value === "dark" ? "light" : "dark");
    };

    return {
        theme,
        setTheme,
        applySystemPreference,
        toggleTheme
    };
}
