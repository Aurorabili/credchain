import { createWalletClient, createPublicClient, custom, http, type WalletClient, type PublicClient, type Chain } from "viem";
import { hardhat } from "viem/chains";
import { NETWORK, CONTRACTS } from "~/config/chain";
import CredentialSBTABI from "~/abis/CredentialSBT.json";
import ReputationCoreABI from "~/abis/ReputationCore.json";

const chain: Chain = {
    ...hardhat,
    id: NETWORK.chainId,
    rpcUrls: { default: { http: [NETWORK.rpcUrl] }, public: { http: [NETWORK.rpcUrl] } },
    ...(NETWORK.multicallAddress
        ? {
            contracts: {
                multicall3: {
                    address: NETWORK.multicallAddress as `0x${string}`,
                    blockCreated: 0,
                },
            },
        }
        : {}),
};

const credentialSbtAddress = CONTRACTS.credentialSBT.address as `0x${string}`;
const reputationCoreAddress = CONTRACTS.reputationCore.address as `0x${string}`;
const credentialSbtAbi = CredentialSBTABI.abi;
const reputationCoreAbi = ReputationCoreABI.abi;

const WRITE_GAS_LIMITS = {
    vote: 300_000n,
    mintCredential: 600_000n,
    revokeCredential: 300_000n,
} as const;

export interface CredentialDetailSnapshot {
    tokenId: bigint;
    owner: `0x${string}`;
    businessType: string;
    metadataCID: string;
    score: bigint;
    rawVoteSum: bigint;
    weightSum: bigint;
    voteCount: bigint;
    isRevoked: boolean;
    tokenUri: string;
    isLocked: boolean;
    ownerReputation: bigint;
    hasCurrentUserVoted: boolean;
}

async function strictMulticall(contracts: Parameters<PublicClient["multicall"]>[0]["contracts"]) {
    return publicClient.multicall({
        allowFailure: false,
        contracts,
    }) as Promise<unknown[]>;
}

let walletClient: WalletClient | null = null;
let publicClient: PublicClient;

if (typeof window !== "undefined") {
    publicClient = createPublicClient({ chain, transport: http(NETWORK.rpcUrl) });
} else {
    // @ts-ignore dummy for SSR
    publicClient = createPublicClient({ chain, transport: http(NETWORK.rpcUrl) });
}

export async function connectWallet(): Promise<{ account: `0x${string}`; wallet: WalletClient }> {
    if (!window.ethereum) throw new Error("Please install MetaMask");

    walletClient = createWalletClient({ chain, transport: custom(window.ethereum!) });
    const [address] = await walletClient.requestAddresses();
    return { account: address, wallet: walletClient };
}

export function getWalletClient(): WalletClient | null {
    return walletClient;
}

export function getPublicClient(): PublicClient {
    return publicClient;
}

// ─── Read helpers ────────────────────────────────────────────────

export async function getScore(tokenId: bigint): Promise<bigint> {
    return publicClient.readContract({
        address: reputationCoreAddress,
        abi: reputationCoreAbi,
        functionName: "getScore",
        args: [tokenId],
    }) as Promise<bigint>;
}

export async function getReputation(account: `0x${string}`): Promise<bigint> {
    return publicClient.readContract({
        address: reputationCoreAddress,
        abi: reputationCoreAbi,
        functionName: "getReputation",
        args: [account],
    }) as Promise<bigint>;
}

export async function getRawVoteSum(tokenId: bigint): Promise<bigint> {
    return publicClient.readContract({
        address: reputationCoreAddress,
        abi: reputationCoreAbi,
        functionName: "getRawVoteSum",
        args: [tokenId],
    }) as Promise<bigint>;
}

export async function getWeightSum(tokenId: bigint): Promise<bigint> {
    return publicClient.readContract({
        address: reputationCoreAddress,
        abi: reputationCoreAbi,
        functionName: "getWeightSum",
        args: [tokenId],
    }) as Promise<bigint>;
}

export async function getVoteCount(tokenId: bigint): Promise<bigint> {
    return publicClient.readContract({
        address: reputationCoreAddress,
        abi: reputationCoreAbi,
        functionName: "getVoteCount",
        args: [tokenId],
    }) as Promise<bigint>;
}

export async function hasVoted(tokenId: bigint, account: `0x${string}`): Promise<boolean> {
    return publicClient.readContract({
        address: reputationCoreAddress,
        abi: reputationCoreAbi,
        functionName: "hasVoted",
        args: [tokenId, account],
    }) as Promise<boolean>;
}

export async function getWeight(account: `0x${string}`): Promise<bigint> {
    return publicClient.readContract({
        address: reputationCoreAddress,
        abi: reputationCoreAbi,
        functionName: "getWeight",
        args: [account],
    }) as Promise<bigint>;
}

export async function isKYCVerified(account: `0x${string}`): Promise<boolean> {
    return publicClient.readContract({
        address: reputationCoreAddress,
        abi: reputationCoreAbi,
        functionName: "isKYCVerified",
        args: [account],
    }) as Promise<boolean>;
}

export async function getTokenURI(tokenId: bigint): Promise<string> {
    return publicClient.readContract({
        address: credentialSbtAddress,
        abi: credentialSbtAbi,
        functionName: "tokenURI",
        args: [tokenId],
    }) as Promise<string>;
}

export async function getCredentialDetail(
    tokenId: bigint,
    viewer?: `0x${string}` | null
): Promise<CredentialDetailSnapshot> {
    const contracts: Parameters<PublicClient["multicall"]>[0]["contracts"] = [
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
            functionName: "tokenURI",
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
        {
            address: credentialSbtAddress,
            abi: credentialSbtAbi,
            functionName: "isRevoked",
            args: [tokenId],
        },
        {
            address: credentialSbtAddress,
            abi: credentialSbtAbi,
            functionName: "locked",
            args: [tokenId],
        },
    ];

    if (viewer) {
        contracts.push({
            address: reputationCoreAddress,
            abi: reputationCoreAbi,
            functionName: "hasVoted",
            args: [tokenId, viewer],
        });
    }

    const results = await strictMulticall(contracts);

    const owner = results[0] as `0x${string}`;
    const ownerReputation = await getReputation(owner);

    return {
        tokenId,
        owner,
        businessType: results[1] as string,
        metadataCID: results[2] as string,
        tokenUri: results[3] as string,
        score: results[4] as bigint,
        rawVoteSum: results[5] as bigint,
        weightSum: results[6] as bigint,
        voteCount: results[7] as bigint,
        isRevoked: results[8] as boolean,
        isLocked: results[9] as boolean,
        ownerReputation,
        hasCurrentUserVoted: viewer ? (results[10] as boolean) : false,
    };
}

// ─── Write helpers ───────────────────────────────────────────────

export async function vote(tokenId: bigint, direction: 1 | -1): Promise<`0x${string}`> {
    if (!walletClient) throw new Error("Wallet not connected");
    const [address] = await walletClient.requestAddresses();
    const hash = await walletClient.writeContract({
        account: address,
        address: reputationCoreAddress,
        abi: reputationCoreAbi,
        functionName: "vote",
        args: [tokenId, direction],
        gas: WRITE_GAS_LIMITS.vote,
    });
    return hash;
}

export async function mintCredential(
    to: `0x${string}`,
    businessType: string,
    metadataCID: string
): Promise<`0x${string}`> {
    if (!walletClient) throw new Error("Wallet not connected");
    const [address] = await walletClient.requestAddresses();
    const hash = await walletClient.writeContract({
        account: address,
        address: credentialSbtAddress,
        abi: credentialSbtAbi,
        functionName: "mintCredential",
        args: [to, businessType, metadataCID],
        gas: WRITE_GAS_LIMITS.mintCredential,
    });
    return hash;
}

export async function revokeCredential(tokenId: bigint): Promise<`0x${string}`> {
    if (!walletClient) throw new Error("Wallet not connected");
    const [address] = await walletClient.requestAddresses();
    const hash = await walletClient.writeContract({
        account: address,
        address: credentialSbtAddress,
        abi: credentialSbtAbi,
        functionName: "revokeCredential",
        args: [tokenId],
        gas: WRITE_GAS_LIMITS.revokeCredential,
    });
    return hash;
}

export async function waitForTx(hash: `0x${string}`) {
    return publicClient.waitForTransactionReceipt({ hash });
}
