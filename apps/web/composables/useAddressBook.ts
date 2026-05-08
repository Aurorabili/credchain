import { isAddress, shortAddress } from "~/utils/address";

const STORAGE_KEY = "credchain:address-book";
const _names = ref<Record<string, string>>({});
let loaded = false;

function normalize(address: `0x${string}`) {
    return address.toLowerCase();
}

function loadNames() {
    if (loaded || typeof window === "undefined") return;
    loaded = true;

    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
            _names.value = parsed;
        }
    } catch {
        _names.value = {};
    }
}

function persistNames() {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_names.value));
}

export function useAddressBook() {
    loadNames();

    function getFriendlyName(address: `0x${string}`) {
        return _names.value[normalize(address)] || "";
    }

    function setFriendlyName(address: `0x${string}`, name: string) {
        const normalized = normalize(address);
        const trimmed = name.trim();

        if (!trimmed) {
            delete _names.value[normalized];
        } else {
            _names.value[normalized] = trimmed;
        }

        _names.value = { ..._names.value };
        persistNames();
    }

    function getDisplayName(address: `0x${string}`) {
        return getFriendlyName(address) || shortAddress(address);
    }

    function resolveAddress(input: string) {
        const trimmed = input.trim();
        return isAddress(trimmed) ? trimmed : null;
    }

    return {
        namesRef: _names,
        getFriendlyName,
        setFriendlyName,
        getDisplayName,
        resolveAddress,
    };
}
