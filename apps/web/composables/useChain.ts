import {
    connectWallet, getWalletClient, getReputation, getWeight,
    isKYCVerified, vote as chainVote,
    mintCredential as chainMint, waitForTx,
    getCredentialDetail,
} from "./useViem";
import { PARAMS } from "~/config/chain";
import type {
    CredentialBusinessField,
    CredentialEvidenceAsset,
    CredentialEvidenceReference,
    CredentialMetadataDocument,
} from "~/utils/credentialMetadata";
import { getFile, getMetadata, isMockIpfsCid } from "~/utils/mockIpfs";

export interface ChainCredentialAttribute {
    label: string;
    value: string;
}

export interface ChainCredential {
    tokenId: number;
    owner: `0x${string}`;
    businessType: string;
    displayType: "certificate";
    metadataCID: string;
    tokenUri: string;
    metadataUrl: string;
    score: number;
    rawVoteSum: number;
    weightSum: number;
    voteCount: number;
    ownerReputation: number;
    isRevoked: boolean;
    isLocked: boolean;
    hasCurrentUserVoted: boolean;
    baseDisplayScore: number;
    displayScore: number;
    displayStars: number;
    displayLabel: string;
    issuerName: string;
    recipientWallet: `0x${string}`;
    name: string;
    description: string;
    image: string;
    issuedAt: string;
    attributes: ChainCredentialAttribute[];
    businessFields: CredentialBusinessField[];
    evidence: CredentialEvidenceAsset[];
}

export interface ChainStats {
    reputation: number;
    credentialCount: number;
    votingWeight: number;
    kycVerified: boolean;
}

const STORAGE_KEY = "credchain:connected";
const _connected = ref(false);
const _account = ref<`0x${string}` | null>(null);
const DISPLAY_PRIOR = 50;
const DISPLAY_SMOOTHING = 12;
const SCORE_SCALE = 20;

// ─── In-memory cache with TTL ───────────────────────────────────
let _credentialCache: { owner: `0x${string}`; data: ChainCredential[]; ts: number } | null = null;
const CACHE_TTL = 30_000; // 30 seconds

interface IndexedCredentialResponse {
    credentials: Array<{
        tokenId: number;
        owner: `0x${string}`;
        businessType: string;
        metadataCID: string;
        score: number;
        rawVoteSum: number;
        weightSum: number;
        voteCount: number;
        isRevoked: boolean;
        mintedAt: string | null;
        mintedBlock: number | null;
        updatedAt: string | null;
        updatedBlock: number | null;
    }>;
}

interface IndexedStatsResponse {
    credentialCount: number;
}

interface DisplayScoreMetrics {
    baseDisplayScore: number;
    displayScore: number;
    displayStars: number;
    displayLabel: string;
}

function toGatewayUrl(uriOrHash: string): string {
    if (!uriOrHash) return "";
    if (uriOrHash.startsWith("ipfs://")) {
        return `https://ipfs.io/ipfs/${uriOrHash.slice("ipfs://".length)}`;
    }
    if (/^https?:\/\//.test(uriOrHash)) {
        return uriOrHash;
    }
    return `https://ipfs.io/ipfs/${uriOrHash}`;
}

function businessTypeLabel(type: string): string {
    const labels: Record<string, string> = {
        graduation: "毕业成就",
        volunteer: "志愿服务",
        internship: "实习经历",
        honor: "荣誉奖项",
        training: "培训证明",
        custom: "自定义业务",
    };
    return labels[type] ?? type;
}

function shortAddress(address: `0x${string}`): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function normalizeMetadataValue(value: unknown): string {
    if (value == null) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    return JSON.stringify(value);
}

function extractCid(tokenUri: string, metadataCID: string): string {
    if (metadataCID) return metadataCID;
    if (tokenUri.startsWith("ipfs://")) return tokenUri.slice("ipfs://".length);
    return tokenUri;
}

async function resolveEvidenceAssets(evidence: CredentialEvidenceReference[]) {
    const resolved = await Promise.all(
        evidence.map(async (item) => {
            if (isMockIpfsCid(item.cid)) {
                const file = await getFile(item.cid);
                if (file) {
                    return {
                        ...item,
                        url: file.dataUrl,
                    } satisfies CredentialEvidenceAsset;
                }
            }

            return {
                ...item,
                url: toGatewayUrl(item.cid),
            } satisfies CredentialEvidenceAsset;
        })
    );

    return resolved;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 1): number {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}

function getDisplayLabel(score: number): string {
    if (score >= 85) return "信誉极好";
    if (score >= 70) return "信誉良好";
    if (score >= 55) return "信誉稳定";
    if (score >= 40) return "信誉一般";
    return "信誉待观察";
}

function computeDisplayMetrics(rawVoteSum: number, weightSum: number, voteCount: number): DisplayScoreMetrics {
    const alpha = Number(PARAMS.alpha);
    const normalizedMean = weightSum > 0 ? clamp(rawVoteSum / (alpha * weightSum), -1, 1) : 0;
    const baseDisplayScore = clamp(50 * (1 + normalizedMean), 0, 100);
    const displayScore = (DISPLAY_SMOOTHING * DISPLAY_PRIOR + voteCount * baseDisplayScore)
        / (DISPLAY_SMOOTHING + voteCount);
    const roundedDisplayScore = round(displayScore);

    return {
        baseDisplayScore: round(baseDisplayScore),
        displayScore: roundedDisplayScore,
        displayStars: round(clamp(roundedDisplayScore / SCORE_SCALE, 0, 5)),
        displayLabel: getDisplayLabel(roundedDisplayScore),
    };
}

function buildFallbackCredential(data: {
    tokenId: number;
    owner: `0x${string}`;
    businessType: string;
    metadataCID: string;
    tokenUri?: string;
    score: number;
    rawVoteSum: number;
    weightSum: number;
    voteCount: number;
    ownerReputation?: number;
    isRevoked: boolean;
    isLocked?: boolean;
    hasCurrentUserVoted?: boolean;
}): ChainCredential {
    const displayMetrics = computeDisplayMetrics(data.rawVoteSum, data.weightSum, data.voteCount);

    return {
        tokenId: data.tokenId,
        owner: data.owner,
        businessType: data.businessType,
        displayType: "certificate",
        metadataCID: data.metadataCID,
        tokenUri: data.tokenUri ?? "",
        metadataUrl: isMockIpfsCid(data.metadataCID) ? "" : toGatewayUrl(data.tokenUri || data.metadataCID),
        score: data.score,
        rawVoteSum: data.rawVoteSum,
        weightSum: data.weightSum,
        voteCount: data.voteCount,
        ownerReputation: data.ownerReputation ?? 0,
        isRevoked: data.isRevoked,
        isLocked: data.isLocked ?? true,
        hasCurrentUserVoted: data.hasCurrentUserVoted ?? false,
        ...displayMetrics,
        issuerName: "未标注签发方",
        recipientWallet: data.owner,
        name: `证书 #${data.tokenId}`,
        description: `持有人 ${shortAddress(data.owner)} 的链上凭证`,
        image: "",
        issuedAt: "",
        attributes: [
            { label: "展示类型", value: "证书" },
            { label: "业务类型", value: businessTypeLabel(data.businessType) },
            { label: "元数据 CID", value: data.metadataCID },
            { label: "参与投票人数", value: String(data.voteCount) },
        ],
        businessFields: [],
        evidence: [],
    };
}

async function fetchCredentialMetadata(tokenUri: string, metadataCID: string): Promise<CredentialMetadataDocument | null> {
    const cid = extractCid(tokenUri, metadataCID);
    if (isMockIpfsCid(cid)) {
        const document = await getMetadata(cid);
        if (document) return document;
    }

    const metadataUrl = toGatewayUrl(tokenUri || metadataCID);
    if (!metadataUrl) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    try {
        const response = await fetch(metadataUrl, { signal: controller.signal });
        if (!response.ok) return null;
        return await response.json() as CredentialMetadataDocument;
    } catch {
        return null;
    } finally {
        clearTimeout(timeout);
    }
}

async function enrichCredentialWithMetadata(base: ChainCredential): Promise<ChainCredential> {
    const payload = await fetchCredentialMetadata(base.tokenUri, base.metadataCID);
    if (!payload) return base;

    const evidence = await resolveEvidenceAssets(payload.evidence ?? []);
    const leadImage = evidence.find((item) => item.kind === "image")?.url ?? "";
    const businessFields = Array.isArray(payload.fields)
        ? payload.fields.filter((field) => field.name && field.value)
        : [];
    const attributes = [
        { label: "展示类型", value: "证书" },
        { label: "业务类型", value: businessTypeLabel(payload.businessType || base.businessType) },
        { label: "签发方", value: normalizeMetadataValue(payload.issuer?.name) || base.issuerName },
        { label: "元数据 CID", value: base.metadataCID },
        { label: "佐证材料数量", value: String(evidence.length) },
        ...businessFields.map((field) => ({
            label: field.name,
            value: field.value,
        })),
    ].filter((attribute) => attribute.label && attribute.value);

    return {
        ...base,
        businessType: payload.businessType || base.businessType,
        issuerName: normalizeMetadataValue(payload.issuer?.name) || base.issuerName,
        recipientWallet: payload.recipient?.wallet || base.recipientWallet,
        name: normalizeMetadataValue(payload.title) || base.name,
        description: normalizeMetadataValue(payload.description) || base.description,
        image: leadImage || base.image,
        issuedAt: normalizeMetadataValue(payload.issuedAt),
        attributes,
        businessFields,
        evidence,
    };
}

function getIndexerBaseUrl() {
    const runtimeConfig = useRuntimeConfig();
    return runtimeConfig.public.indexerBaseUrl.replace(/\/$/, "");
}

async function fetchIndexedCredentials(owner: `0x${string}`) {
    const response = await $fetch<IndexedCredentialResponse>(`${getIndexerBaseUrl()}/credentials`, {
        query: { owner },
    });

    return response.credentials;
}

async function fetchIndexedCredentialCount(owner: `0x${string}`) {
    const response = await $fetch<IndexedStatsResponse>(`${getIndexerBaseUrl()}/stats`, {
        query: { owner },
    });

    return response.credentialCount;
}

export function useChain() {
    async function connect(): Promise<`0x${string}`> {
        const { account: addr } = await connectWallet();
        _account.value = addr;
        _connected.value = true;
        localStorage.setItem(STORAGE_KEY, addr);
        return addr;
    }

    function disconnect() {
        _connected.value = false;
        _account.value = null;
        localStorage.removeItem(STORAGE_KEY);
    }

    function isConnected() { return _connected.value; }
    function getAccount() { return _account.value; }
    const connectedRef = _connected;
    const accountRef = _account;

    /** Verify cached connection silently & recreate walletClient if valid */
    async function init(): Promise<void> {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored || typeof window === "undefined" || !window.ethereum) return;
        try {
            const accounts: string[] = await window.ethereum.request({ method: "eth_accounts" });
            if (accounts.length > 0 && accounts[0].toLowerCase() === stored.toLowerCase()) {
                if (!getWalletClient()) await connectWallet();
                _account.value = stored as `0x${string}`;
                _connected.value = true;
            }
        } catch {
            localStorage.removeItem(STORAGE_KEY);
        }
    }

    async function getStats(): Promise<ChainStats> {
        const addr = _account.value;
        if (!addr) throw new Error("Wallet not connected");
        const [rep, wt, kyc, ownedCredentialCount] = await Promise.all([
            getReputation(addr), getWeight(addr), isKYCVerified(addr),
            fetchIndexedCredentialCount(addr),
        ]);
        return {
            reputation: Number(rep), credentialCount: ownedCredentialCount,
            votingWeight: Number(wt), kycVerified: kyc,
        };
    }

    async function getCredential(tokenId: number): Promise<ChainCredential> {
        const addr = _account.value;
        if (!addr) throw new Error("Wallet not connected");
        const detail = await getCredentialDetail(BigInt(tokenId), addr);
        const credential = buildFallbackCredential({
            tokenId,
            owner: detail.owner,
            businessType: detail.businessType,
            metadataCID: detail.metadataCID,
            tokenUri: detail.tokenUri,
            score: Number(detail.score),
            rawVoteSum: Number(detail.rawVoteSum),
            weightSum: Number(detail.weightSum),
            voteCount: Number(detail.voteCount),
            ownerReputation: Number(detail.ownerReputation),
            isRevoked: detail.isRevoked,
            isLocked: detail.isLocked,
            hasCurrentUserVoted: detail.hasCurrentUserVoted,
        });
        return enrichCredentialWithMetadata(credential);
    }

    async function getCredentials(): Promise<ChainCredential[]> {
        const addr = _account.value;
        if (!addr) throw new Error("Wallet not connected");

        if (_credentialCache && _credentialCache.owner === addr && Date.now() - _credentialCache.ts < CACHE_TTL) {
            return _credentialCache.data;
        }

        const indexedCredentials = await fetchIndexedCredentials(addr);
        const list = await Promise.all(indexedCredentials.map((credential) =>
            buildFallbackCredential({
                tokenId: credential.tokenId,
                owner: credential.owner,
                businessType: credential.businessType,
                metadataCID: credential.metadataCID,
                score: credential.score,
                rawVoteSum: credential.rawVoteSum,
                weightSum: credential.weightSum,
                voteCount: credential.voteCount,
                isRevoked: credential.isRevoked,
            })
        ).map(enrichCredentialWithMetadata));
        list.sort((left, right) => right.displayScore - left.displayScore);
        _credentialCache = { owner: addr, data: list, ts: Date.now() };
        return list;
    }

    async function vote(tokenId: number, direction: 1 | -1): Promise<void> {
        const hash = await chainVote(BigInt(tokenId), direction);
        await waitForTx(hash);
        _credentialCache = null;
    }

    async function mint(businessType: string, metadataCID: string): Promise<void> {
        const addr = _account.value;
        if (!addr) throw new Error("Wallet not connected");
        const hash = await chainMint(addr, businessType, metadataCID);
        await waitForTx(hash);
        _credentialCache = null;
    }

    return {
        connect, disconnect, isConnected, getAccount, init,
        connectedRef, accountRef,
        getStats, getCredential, getCredentials, vote, mint,
    };
}
