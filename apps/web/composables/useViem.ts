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

export interface CredentialSummarySnapshot {
    tokenId: bigint;
    owner: `0x${string}`;
    credentialType: string;
    metadataHash: string;
    score: bigint;
    isRevoked: boolean;
}

export interface CredentialDetailSnapshot extends CredentialSummarySnapshot {
    tokenUri: string;
    isLocked: boolean;
    ownerReputation: bigint;
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
        abi: ReputationCoreABI,
        functionName: "getScore",
        args: [tokenId],
    }) as Promise<bigint>;
}

export async function getReputation(account: `0x${string}`): Promise<bigint> {
    return publicClient.readContract({
        address: reputationCoreAddress,
        abi: ReputationCoreABI,
        functionName: "getReputation",
        args: [account],
    }) as Promise<bigint>;
}

export async function totalSupply(): Promise<bigint> {
    return publicClient.readContract({
        address: credentialSbtAddress,
        abi: CredentialSBTABI,
        functionName: "totalSupply",
        args: [],
    }) as Promise<bigint>;
}

export async function tokenByIndex(index: bigint): Promise<bigint> {
    return publicClient.readContract({
        address: credentialSbtAddress,
        abi: CredentialSBTABI,
        functionName: "tokenByIndex",
        args: [index],
    }) as Promise<bigint>;
}

export async function getWeight(account: `0x${string}`): Promise<bigint> {
    return publicClient.readContract({
        address: reputationCoreAddress,
        abi: ReputationCoreABI,
        functionName: "getWeight",
        args: [account],
    }) as Promise<bigint>;
}

export async function isKYCVerified(account: `0x${string}`): Promise<boolean> {
    return publicClient.readContract({
        address: reputationCoreAddress,
        abi: ReputationCoreABI,
        functionName: "isKYCVerified",
        args: [account],
    }) as Promise<boolean>;
}

export async function getOwnerOf(tokenId: bigint): Promise<`0x${string}`> {
    return publicClient.readContract({
        address: credentialSbtAddress,
        abi: CredentialSBTABI,
        functionName: "ownerOf",
        args: [tokenId],
    }) as Promise<`0x${string}`>;
}

export async function getCredentialType(tokenId: bigint): Promise<string> {
    return publicClient.readContract({
        address: credentialSbtAddress,
        abi: CredentialSBTABI,
        functionName: "credentialType",
        args: [tokenId],
    }) as Promise<string>;
}

export async function getMetadataHash(tokenId: bigint): Promise<string> {
    return publicClient.readContract({
        address: credentialSbtAddress,
        abi: CredentialSBTABI,
        functionName: "metadataHash",
        args: [tokenId],
    }) as Promise<string>;
}

export async function getTokenURI(tokenId: bigint): Promise<string> {
    return publicClient.readContract({
        address: credentialSbtAddress,
        abi: CredentialSBTABI,
        functionName: "tokenURI",
        args: [tokenId],
    }) as Promise<string>;
}

export async function isRevoked(tokenId: bigint): Promise<boolean> {
    return publicClient.readContract({
        address: credentialSbtAddress,
        abi: CredentialSBTABI,
        functionName: "isRevoked",
        args: [tokenId],
    }) as Promise<boolean>;
}

export async function getTokenIds(total: bigint): Promise<bigint[]> {
    const count = Number(total);
    if (count === 0) return [];

    const results = await strictMulticall(
        Array.from({ length: count }, (_, index) => ({
            address: credentialSbtAddress,
            abi: CredentialSBTABI,
            functionName: "tokenByIndex" as const,
            args: [BigInt(index)],
        }))
    );

    return results as bigint[];
}

export async function getCredentialSummaries(tokenIds: bigint[]): Promise<CredentialSummarySnapshot[]> {
    if (tokenIds.length === 0) return [];

    const results = await strictMulticall(
        tokenIds.flatMap((tokenId) => ([
            {
                address: credentialSbtAddress,
                abi: CredentialSBTABI,
                functionName: "ownerOf" as const,
                args: [tokenId],
            },
            {
                address: credentialSbtAddress,
                abi: CredentialSBTABI,
                functionName: "credentialType" as const,
                args: [tokenId],
            },
            {
                address: credentialSbtAddress,
                abi: CredentialSBTABI,
                functionName: "metadataHash" as const,
                args: [tokenId],
            },
            {
                address: reputationCoreAddress,
                abi: ReputationCoreABI,
                functionName: "getScore" as const,
                args: [tokenId],
            },
            {
                address: credentialSbtAddress,
                abi: CredentialSBTABI,
                functionName: "isRevoked" as const,
                args: [tokenId],
            },
        ]))
    );

    return tokenIds.map((tokenId, index) => {
        const offset = index * 5;
        return {
            tokenId,
            owner: results[offset] as `0x${string}`,
            credentialType: results[offset + 1] as string,
            metadataHash: results[offset + 2] as string,
            score: results[offset + 3] as bigint,
            isRevoked: results[offset + 4] as boolean,
        };
    });
}

export async function getCredentialDetail(tokenId: bigint): Promise<CredentialDetailSnapshot> {
    const results = await strictMulticall([
        {
            address: credentialSbtAddress,
            abi: CredentialSBTABI,
            functionName: "ownerOf",
            args: [tokenId],
        },
        {
            address: credentialSbtAddress,
            abi: CredentialSBTABI,
            functionName: "credentialType",
            args: [tokenId],
        },
        {
            address: credentialSbtAddress,
            abi: CredentialSBTABI,
            functionName: "metadataHash",
            args: [tokenId],
        },
        {
            address: credentialSbtAddress,
            abi: CredentialSBTABI,
            functionName: "tokenURI",
            args: [tokenId],
        },
        {
            address: reputationCoreAddress,
            abi: ReputationCoreABI,
            functionName: "getScore",
            args: [tokenId],
        },
        {
            address: credentialSbtAddress,
            abi: CredentialSBTABI,
            functionName: "isRevoked",
            args: [tokenId],
        },
        {
            address: credentialSbtAddress,
            abi: CredentialSBTABI,
            functionName: "locked",
            args: [tokenId],
        },
    ]);

    const owner = results[0] as `0x${string}`;
    const ownerReputation = await getReputation(owner);

    return {
        tokenId,
        owner,
        credentialType: results[1] as string,
        metadataHash: results[2] as string,
        tokenUri: results[3] as string,
        score: results[4] as bigint,
        isRevoked: results[5] as boolean,
        isLocked: results[6] as boolean,
        ownerReputation,
    };
}

// ─── Write helpers ───────────────────────────────────────────────

export async function vote(tokenId: bigint, direction: 1 | -1): Promise<`0x${string}`> {
    if (!walletClient) throw new Error("Wallet not connected");
    const [address] = await walletClient.requestAddresses();
    const hash = await walletClient.writeContract({
        account: address,
        address: reputationCoreAddress,
        abi: ReputationCoreABI,
        functionName: "vote",
        args: [tokenId, direction],
    });
    return hash;
}

export async function mintCredential(
    to: `0x${string}`,
    credentialType: string,
    metadataHash: string
): Promise<`0x${string}`> {
    if (!walletClient) throw new Error("Wallet not connected");
    const [address] = await walletClient.requestAddresses();
    const hash = await walletClient.writeContract({
        account: address,
        address: credentialSbtAddress,
        abi: CredentialSBTABI,
        functionName: "mintCredential",
        args: [to, credentialType, metadataHash],
    });
    return hash;
}

export async function waitForTx(hash: `0x${string}`) {
    return publicClient.waitForTransactionReceipt({ hash });
}
