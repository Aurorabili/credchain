import type { CredentialEvidenceReference, CredentialMetadataDocument } from "./credentialMetadata";

interface MockIpfsFileRecord extends CredentialEvidenceReference {
    dataUrl: string;
}

interface MockIpfsStoreState {
    files: Record<string, MockIpfsFileRecord>;
    metadata: Record<string, CredentialMetadataDocument>;
    counter: number;
}

const STORAGE_KEY = "credchain:mock-ipfs";

let memoryState: MockIpfsStoreState = {
    files: {},
    metadata: {},
    counter: 0,
};

function isBrowser() {
    return typeof window !== "undefined";
}

function cloneState(state: MockIpfsStoreState): MockIpfsStoreState {
    return JSON.parse(JSON.stringify(state)) as MockIpfsStoreState;
}

function loadState(): MockIpfsStoreState {
    if (!isBrowser()) return memoryState;

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return memoryState;

    try {
        const parsed = JSON.parse(raw) as Partial<MockIpfsStoreState>;
        memoryState = {
            files: parsed.files ?? {},
            metadata: parsed.metadata ?? {},
            counter: parsed.counter ?? 0,
        };
    } catch {
        memoryState = { files: {}, metadata: {}, counter: 0 };
    }

    return memoryState;
}

function saveState(state: MockIpfsStoreState) {
    memoryState = state;
    if (isBrowser()) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
}

function nextCid(state: MockIpfsStoreState) {
    state.counter += 1;
    return `bafybeig${state.counter.toString(16).padStart(8, "0")}`;
}

function readFileAsDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(reader.error ?? new Error("读取文件失败"));
        reader.readAsDataURL(file);
    });
}

export function isMockIpfsCid(value: string) {
    return /^bafybeig[0-9a-f]{8}$/i.test(value);
}

export async function putMetadata(document: CredentialMetadataDocument) {
    const state = cloneState(loadState());
    const cid = nextCid(state);
    state.metadata[cid] = structuredClone(document);
    saveState(state);
    return cid;
}

export async function getMetadata(cid: string) {
    const state = loadState();
    const document = state.metadata[cid];
    return document ? structuredClone(document) : null;
}

export async function putFile(file: File) {
    const state = cloneState(loadState());
    const cid = nextCid(state);
    const mimeType = file.type || "application/octet-stream";
    const dataUrl = await readFileAsDataUrl(file);
    const record: MockIpfsFileRecord = {
        cid,
        kind: mimeType.startsWith("image/") ? "image" : mimeType === "application/pdf" ? "document" : "file",
        name: file.name,
        mimeType,
        size: file.size,
        dataUrl,
    };

    state.files[cid] = record;
    saveState(state);
    return {
        cid,
        kind: record.kind,
        name: record.name,
        mimeType: record.mimeType,
        size: record.size,
    } satisfies CredentialEvidenceReference;
}

export async function getFile(cid: string) {
    const state = loadState();
    const record = state.files[cid];
    return record ? structuredClone(record) : null;
}

