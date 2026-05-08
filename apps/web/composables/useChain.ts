import {
    connectWallet, getWalletClient, getReputation, getWeight,
    isKYCVerified, vote as chainVote,
    mintCredential as chainMint, waitForTx,
    totalSupply, getTokenIds, getCredentialSummaries, getCredentialDetail,
} from "./useViem";
import { PARAMS } from "~/config/chain";

export interface ChainCredentialAttribute {
    label: string;
    value: string;
}

export interface ChainCredential {
    tokenId: number;
    owner: `0x${string}`;
    credentialType: string;
    metadataHash: string;
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
    name: string;
    description: string;
    image: string;
    issuedAt: string;
    attributes: ChainCredentialAttribute[];
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
let _credentialCache: { data: ChainCredential[]; ts: number } | null = null;
const CACHE_TTL = 30_000; // 30 seconds

interface CredentialMetadataPayload {
    name?: unknown;
    description?: unknown;
    image?: unknown;
    issuedAt?: unknown;
    attributes?: Array<{ trait_type?: unknown; value?: unknown }>;
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

function credentialTypeLabel(type: string): string {
    const labels: Record<string, string> = {
        degree: "学位",
        certificate: "证书",
        badge: "徽章",
        license: "执照",
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
    credentialType: string;
    metadataHash: string;
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
        credentialType: data.credentialType,
        metadataHash: data.metadataHash,
        tokenUri: data.tokenUri ?? "",
        metadataUrl: toGatewayUrl(data.tokenUri || data.metadataHash),
        score: data.score,
        rawVoteSum: data.rawVoteSum,
        weightSum: data.weightSum,
        voteCount: data.voteCount,
        ownerReputation: data.ownerReputation ?? 0,
        isRevoked: data.isRevoked,
        isLocked: data.isLocked ?? true,
        hasCurrentUserVoted: data.hasCurrentUserVoted ?? false,
        ...displayMetrics,
        name: `${credentialTypeLabel(data.credentialType)} #${data.tokenId}`,
        description: `持有人 ${shortAddress(data.owner)} 的链上凭证`,
        image: "",
        issuedAt: "",
        attributes: [
            { label: "凭证类型", value: credentialTypeLabel(data.credentialType) },
            { label: "元数据 CID", value: data.metadataHash },
            { label: "参与投票人数", value: String(data.voteCount) },
        ],
    };
}

async function fetchCredentialMetadata(tokenUri: string, fallbackHash: string): Promise<CredentialMetadataPayload | null> {
    const metadataUrl = toGatewayUrl(tokenUri || fallbackHash);
    if (!metadataUrl) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    try {
        const response = await fetch(metadataUrl, { signal: controller.signal });
        if (!response.ok) return null;
        return await response.json() as CredentialMetadataPayload;
    } catch {
        return null;
    } finally {
        clearTimeout(timeout);
    }
}

async function enrichCredentialWithMetadata(base: ChainCredential): Promise<ChainCredential> {
    const payload = await fetchCredentialMetadata(base.tokenUri, base.metadataHash);
    if (!payload) return base;

    const name = normalizeMetadataValue(payload.name) || base.name;
    const description = normalizeMetadataValue(payload.description) || base.description;
    const imageRaw = normalizeMetadataValue(payload.image);
    const issuedAt = normalizeMetadataValue(payload.issuedAt);
    const attributes = Array.isArray(payload.attributes)
        ? payload.attributes
            .map((attribute) => ({
                label: normalizeMetadataValue(attribute?.trait_type),
                value: normalizeMetadataValue(attribute?.value),
            }))
            .filter((attribute) => attribute.label && attribute.value)
        : base.attributes;

    return {
        ...base,
        name,
        description,
        image: imageRaw ? toGatewayUrl(imageRaw) : base.image,
        issuedAt,
        attributes,
    };
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
        const [rep, wt, kyc, sup] = await Promise.all([
            getReputation(addr), getWeight(addr), isKYCVerified(addr),
            totalSupply(),
        ]);
        return {
            reputation: Number(rep), credentialCount: Number(sup),
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
            credentialType: detail.credentialType,
            metadataHash: detail.metadataHash,
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
        if (_credentialCache && Date.now() - _credentialCache.ts < CACHE_TTL) {
            return _credentialCache.data;
        }
        const sup = await totalSupply();
        const tokenIds = await getTokenIds(sup);
        const list = (await getCredentialSummaries(tokenIds)).map((credential) =>
            buildFallbackCredential({
                tokenId: Number(credential.tokenId),
                owner: credential.owner,
                credentialType: credential.credentialType,
                metadataHash: credential.metadataHash,
                score: Number(credential.score),
                rawVoteSum: Number(credential.rawVoteSum),
                weightSum: Number(credential.weightSum),
                voteCount: Number(credential.voteCount),
                isRevoked: credential.isRevoked,
            })
        );
        list.sort((left, right) => right.displayScore - left.displayScore);
        _credentialCache = { data: list, ts: Date.now() };
        return list;
    }

    async function vote(tokenId: number, direction: 1 | -1): Promise<void> {
        const hash = await chainVote(BigInt(tokenId), direction);
        await waitForTx(hash);
        _credentialCache = null;
    }

    async function mint(credentialType: string, metadataHash: string): Promise<void> {
        const addr = _account.value;
        if (!addr) throw new Error("Wallet not connected");
        const hash = await chainMint(addr, credentialType, metadataHash);
        await waitForTx(hash);
        _credentialCache = null;
    }

    return {
        connect, disconnect, isConnected, getAccount, init,
        connectedRef, accountRef,
        getStats, getCredential, getCredentials, vote, mint,
    };
}
