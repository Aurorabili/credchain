const CACHE_VERSION = "v1";

export function useCache<T>(key: string, ttlMs: number = 5 * 60 * 1000) {
    const fullKey = computed(() => `credchain:${CACHE_VERSION}:${key}`);

    function get(): T | null {
        try {
            const raw = localStorage.getItem(fullKey.value);
            if (!raw) return null;
            const { data, ts } = JSON.parse(raw);
            if (Date.now() - ts > ttlMs) {
                localStorage.removeItem(fullKey.value);
                return null;
            }
            return data as T;
        } catch {
            return null;
        }
    }

    function set(data: T): void {
        try {
            localStorage.setItem(
                fullKey.value,
                JSON.stringify({ data, ts: Date.now() })
            );
        } catch {
            // Storage full or unavailable — silently ignore
        }
    }

    function clear(): void {
        localStorage.removeItem(fullKey.value);
    }

    return { get, set, clear };
}
