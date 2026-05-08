import { createPublicClient, http, parseAbiItem } from "viem";
import { hardhat } from "viem/chains";
import CredentialSBTArtifact from "../../../contracts/artifacts/contracts/CredentialSBT.sol/CredentialSBT.json" with { type: "json" };
import ReputationCoreArtifact from "../../../contracts/artifacts/contracts/ReputationCore.sol/ReputationCore.json" with { type: "json" };
import { config } from "./config.mjs";
import {
    clearIndexerState,
    getCredential,
    getCredentialCount,
    getLastSyncedBlock,
    getSyncValue,
    listCredentials,
    markCredentialRevoked,
    setLastSyncedBlock,
    setSyncValue,
    upsertCredentialSnapshot,
} from "./db.mjs";

const credentialSbtAbi = CredentialSBTArtifact.abi;
const reputationCoreAbi = ReputationCoreArtifact.abi;
const credentialSbtAddress = config.credentialSbtAddress;
const reputationCoreAddress = config.reputationCoreAddress;

const mintedEvent = parseAbiItem(
    "event CredentialMinted(uint256 indexed tokenId, address indexed to, string businessType, string metadataCID)"
);
const revokedEvent = parseAbiItem("event CredentialRevoked(uint256 indexed tokenId)");
const votedEvent = parseAbiItem(
    "event Voted(address indexed voter, uint256 indexed tokenId, int8 direction, int256 newScore, int256 ownerReputationDelta)"
);

const publicClient = createPublicClient({
    chain: {
        ...hardhat,
        id: config.chainId,
        rpcUrls: {
            default: { http: [config.rpcUrl] },
            public: { http: [config.rpcUrl] },
        },
        contracts: {
            multicall3: {
                address: config.multicallAddress,
                blockCreated: 0,
            },
        },
    },
    transport: http(config.rpcUrl),
});

let syncPromise = null;
let scheduler = null;

async function getBlockTimestamp(blockNumber, cache) {
    const key = blockNumber.toString();
    const cached = cache.get(key);
    if (cached) return cached;

    const block = await publicClient.getBlock({ blockNumber });
    const timestamp = new Date(Number(block.timestamp) * 1000).toISOString();
    cache.set(key, timestamp);
    return timestamp;
}

async function ensureChainFingerprint() {
    const genesisBlock = await publicClient.getBlock({ blockNumber: 0n });
    const currentGenesisHash = genesisBlock.hash;
    const storedGenesisHash = getSyncValue("chain_genesis_hash");
    const storedChainId = getSyncValue("chain_id");

    if (!storedGenesisHash || !storedChainId) {
        setSyncValue("chain_genesis_hash", currentGenesisHash);
        setSyncValue("chain_id", String(config.chainId));
        return;
    }

    if (storedGenesisHash !== currentGenesisHash || storedChainId !== String(config.chainId)) {
        clearIndexerState();
        setSyncValue("chain_genesis_hash", currentGenesisHash);
        setSyncValue("chain_id", String(config.chainId));
    }
}

async function refreshSnapshots(tokenIds, blockNumber, timestampCache) {
    if (tokenIds.length === 0) return;

    const uniqueTokenIds = [...new Set(tokenIds.map((tokenId) => tokenId.toString()))].map((value) => BigInt(value));
    const results = await publicClient.multicall({
        allowFailure: false,
        blockNumber,
        contracts: uniqueTokenIds.flatMap((tokenId) => ([
            {
                address: credentialSbtAddress,
                abi: credentialSbtAbi,
                functionName: "ownerOf",
                args: [tokenId],
            },
            {
                address: credentialSbtAddress,
                abi: credentialSbtAbi,
                functionName: "businessType",
                args: [tokenId],
            },
            {
                address: credentialSbtAddress,
                abi: credentialSbtAbi,
                functionName: "metadataCID",
                args: [tokenId],
            },
            {
                address: credentialSbtAddress,
                abi: credentialSbtAbi,
                functionName: "isRevoked",
                args: [tokenId],
            },
            {
                address: reputationCoreAddress,
                abi: reputationCoreAbi,
                functionName: "getScore",
                args: [tokenId],
            },
            {
                address: reputationCoreAddress,
                abi: reputationCoreAbi,
                functionName: "getRawVoteSum",
                args: [tokenId],
            },
            {
                address: reputationCoreAddress,
                abi: reputationCoreAbi,
                functionName: "getWeightSum",
                args: [tokenId],
            },
            {
                address: reputationCoreAddress,
                abi: reputationCoreAbi,
                functionName: "getVoteCount",
                args: [tokenId],
            },
        ])),
    });

    const updatedAt = await getBlockTimestamp(blockNumber, timestampCache);

    uniqueTokenIds.forEach((tokenId, index) => {
        const existing = getCredential(Number(tokenId));
        const offset = index * 8;
        upsertCredentialSnapshot({
            tokenId: Number(tokenId),
            owner: results[offset],
            businessType: results[offset + 1],
            metadataCID: results[offset + 2],
            isRevoked: results[offset + 3],
            score: Number(results[offset + 4]),
            rawVoteSum: Number(results[offset + 5]),
            weightSum: Number(results[offset + 6]),
            voteCount: Number(results[offset + 7]),
            mintedAt: existing?.mintedAt ?? updatedAt,
            mintedBlock: existing?.mintedBlock ?? Number(blockNumber),
            updatedAt,
            updatedBlock: Number(blockNumber),
        });
    });
}

async function syncChunk(fromBlock, toBlock, timestampCache) {
    const [mintLogs, revokeLogs, voteLogs] = await Promise.all([
        publicClient.getLogs({
            address: credentialSbtAddress,
            event: mintedEvent,
            fromBlock,
            toBlock,
        }),
        publicClient.getLogs({
            address: credentialSbtAddress,
            event: revokedEvent,
            fromBlock,
            toBlock,
        }),
        publicClient.getLogs({
            address: reputationCoreAddress,
            event: votedEvent,
            fromBlock,
            toBlock,
        }),
    ]);

    const touchedTokenIds = new Set();

    for (const log of mintLogs) {
        const tokenId = Number(log.args.tokenId);
        const mintedAt = await getBlockTimestamp(log.blockNumber, timestampCache);
        upsertCredentialSnapshot({
            tokenId,
            owner: log.args.to,
            businessType: log.args.businessType,
            metadataCID: log.args.metadataCID,
            isRevoked: false,
            score: 0,
            rawVoteSum: 0,
            weightSum: 0,
            voteCount: 0,
            mintedAt,
            mintedBlock: Number(log.blockNumber),
            updatedAt: mintedAt,
            updatedBlock: Number(log.blockNumber),
        });
        touchedTokenIds.add(BigInt(tokenId));
    }

    for (const log of revokeLogs) {
        const tokenId = Number(log.args.tokenId);
        const updatedAt = await getBlockTimestamp(log.blockNumber, timestampCache);
        markCredentialRevoked(tokenId, updatedAt, Number(log.blockNumber));
        touchedTokenIds.add(BigInt(tokenId));
    }

    for (const log of voteLogs) {
        touchedTokenIds.add(log.args.tokenId);
    }

    await refreshSnapshots([...touchedTokenIds], toBlock, timestampCache);
}

async function doSync() {
    await ensureChainFingerprint();

    const latestBlock = await publicClient.getBlockNumber();
    let lastSyncedBlock = getLastSyncedBlock();
    if (lastSyncedBlock >= latestBlock) return;

    const timestampCache = new Map();
    let fromBlock = lastSyncedBlock + 1n;

    while (fromBlock <= latestBlock) {
        const upperBound = fromBlock + config.syncChunkSize - 1n;
        const toBlock = upperBound > latestBlock ? latestBlock : upperBound;

        await syncChunk(fromBlock, toBlock, timestampCache);
        setLastSyncedBlock(toBlock);
        fromBlock = toBlock + 1n;
    }
}

export async function syncIndexer() {
    if (!syncPromise) {
        syncPromise = doSync().finally(() => {
            syncPromise = null;
        });
    }

    return syncPromise;
}

export function startIndexerScheduler() {
    if (scheduler) return scheduler;

    scheduler = setInterval(() => {
        syncIndexer().catch((error) => {
            console.error("[indexer] sync failed:", error);
        });
    }, config.syncIntervalMs);

    return scheduler;
}

export function stopIndexerScheduler() {
    if (scheduler) {
        clearInterval(scheduler);
        scheduler = null;
    }
}

export function listIndexedCredentials(owner) {
    return listCredentials(owner);
}

export function getIndexedCredential(tokenId) {
    return getCredential(tokenId);
}

export function getIndexedCredentialCount(owner) {
    return getCredentialCount(owner);
}

export function getIndexerStatus() {
    return {
        lastSyncedBlock: getLastSyncedBlock().toString(),
        chainId: config.chainId,
        dbPath: config.dbPath,
    };
}
