import type { CredentialMetadata } from "./types.js";

/**
 * Mock IPFS adapter — stores metadata in-memory and returns fake CIDs.
 * Replace with real IPFS client (e.g. helia, pinata) later.
 */

const store = new Map<string, CredentialMetadata>();

let _cidCounter = 0;

function _fakeCid(): string {
    _cidCounter += 1;
    const hex = _cidCounter.toString(16).padStart(8, "0");
    return `bafybeig${hex}`;
}

export async function put(data: CredentialMetadata): Promise<string> {
    const cid = _fakeCid();
    store.set(cid, structuredClone(data));
    return cid;
}

export async function get(cid: string): Promise<CredentialMetadata | null> {
    const data = store.get(cid);
    return data ? structuredClone(data) : null;
}

export async function remove(cid: string): Promise<boolean> {
    return store.delete(cid);
}

export function clear(): void {
    store.clear();
    _cidCounter = 0;
}
