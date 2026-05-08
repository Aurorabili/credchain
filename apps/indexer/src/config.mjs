import { join } from "node:path";

function readInt(name, fallback) {
    const value = process.env[name];
    if (!value) return fallback;
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
}

function readString(name, fallback) {
    return process.env[name] || fallback;
}

export const config = {
    host: readString("INDEXER_HOST", "127.0.0.1"),
    port: readInt("INDEXER_PORT", 4100),
    rpcUrl: readString("CREDCHAIN_RPC_URL", "http://127.0.0.1:8545"),
    chainId: readInt("CREDCHAIN_CHAIN_ID", 1337),
    multicallAddress: readString(
        "CREDCHAIN_MULTICALL_ADDRESS",
        "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707"
    ),
    credentialSbtAddress: readString(
        "CREDCHAIN_CREDENTIAL_SBT_ADDRESS",
        "0x5FbDB2315678afecb367f032d93F642f64180aa3"
    ),
    reputationCoreAddress: readString(
        "CREDCHAIN_REPUTATION_CORE_ADDRESS",
        "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
    ),
    dbPath: process.env.CREDCHAIN_INDEXER_DB || join(process.cwd(), ".data", "credchain-indexer.sqlite"),
    syncChunkSize: BigInt(readInt("CREDCHAIN_INDEXER_SYNC_CHUNK_SIZE", 2000)),
    syncIntervalMs: readInt("CREDCHAIN_INDEXER_SYNC_INTERVAL_MS", 2000),
};
