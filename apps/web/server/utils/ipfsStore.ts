import { promises as fs } from "node:fs";
import { join } from "node:path";

const STORE_DIR = join(process.cwd(), ".mock-ipfs");

function randomId() {
    return Math.random().toString(36).slice(2, 10);
}

export async function ensureStoreDir() {
    await fs.mkdir(STORE_DIR, { recursive: true });
}

export async function putObject(prefix: string, data: unknown) {
    await ensureStoreDir();
    const cid = `${prefix}-${Date.now()}-${randomId()}`;
    const filePath = join(STORE_DIR, `${cid}.json`);
    await fs.writeFile(filePath, JSON.stringify(data), "utf8");
    return cid;
}

export async function getObject<T = unknown>(cid: string): Promise<T | null> {
    try {
        const filePath = join(STORE_DIR, `${cid}.json`);
        const content = await fs.readFile(filePath, "utf8");
        return JSON.parse(content) as T;
    } catch {
        return null;
    }
}
