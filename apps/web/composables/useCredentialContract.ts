import type { CredentialAttestationPayload, IndexedCredentialSigner, InstitutionAuthManifest } from "@credchain/shared";
import { BrowserProvider, Contract, JsonRpcProvider, type Signer } from "ethers";
import { useRuntimeConfig } from "nuxt/app";

const credentialAbi = [
    "event CredentialIssued(uint256 indexed tokenId,string indexed credentialId,address indexed holder,uint8 credentialType,uint8 trustStatus,string manifestCid,bytes32 manifestHash,uint32 fileCount,uint64 expiresAt,address primarySigner,uint8 primarySignerRole,uint256 primaryInstitutionAuthTokenId,uint64 signedAt)",
    "event CredentialAttestedBySig(uint256 indexed tokenId,address indexed signer,uint8 signerRole,uint256 institutionAuthTokenId,bytes32 attestationDigest,bytes32 manifestHash,uint64 signedAt)",
    "function selfIssueCredential(string credentialId,string manifestCid,bytes32 manifestHash,uint32 fileCount,uint64 expiresAt,uint256 institutionAuthTokenId) returns (uint256)",
    "function issueInstitutionAuthCredential(address authorizedWallet,string credentialId,string manifestCid,bytes32 manifestHash,uint32 fileCount,uint64 expiresAt) returns (uint256)",
    "function latestTokenId() view returns (uint256)",
    "function tokensOfOwner(address holder) view returns (uint256[])",
    "function credentialMeta(uint256 tokenId) view returns (tuple(string credentialId,string manifestCid,bytes32 manifestHash,uint32 fileCount,uint64 issuedAt,uint64 expiresAt,uint8 credentialType,uint8 trustStatus,bool revoked))",
    "function issuerRegistry() view returns (address)",
    "function tokenIdOfCredential(string credentialId) view returns (uint256)",
    "function hasSigned(uint256 tokenId,address signer) view returns (bool)",
    "function hasActiveInstitutionAuth(address account) view returns (bool)",
    "function activeInstitutionAuthTokenOf(address account) view returns (uint256)",
    "function activeInstitutionAuthTokensOf(address account) view returns (uint256[])",
    "function hashCredentialAttestation((uint256 tokenId,string credentialId,bytes32 manifestHash,uint8 signerRole,uint256 institutionAuthTokenId,uint256 nonce,uint64 deadline) payload) view returns (bytes32)",
    "function attestBySig((uint256 tokenId,string credentialId,bytes32 manifestHash,uint8 signerRole,uint256 institutionAuthTokenId,uint256 nonce,uint64 deadline) payload,bytes signature)",
    "function isAttestationUsed(bytes32 digest) view returns (bool)",
    "function verifyByTokenId(uint256 tokenId) view returns (tuple(bool exists,bool revoked,bool expired,bool trusted,address holder,string manifestCid,uint32 fileCount,uint8 credentialType,uint8 trustStatus,uint32 signerCount,uint32 governanceSignerCount,uint32 institutionSignerCount))",
    "function verifyByCredentialId(string credentialId) view returns (tuple(bool exists,bool revoked,bool expired,bool trusted,address holder,string manifestCid,uint32 fileCount,uint8 credentialType,uint8 trustStatus,uint32 signerCount,uint32 governanceSignerCount,uint32 institutionSignerCount))",
    "function revokeCredential(uint256 tokenId,string reason)"
];

const issuerRegistryAbi = [
    "function isGov(address account) view returns (bool)"
];

const domainName = "CredChain Credential Attestation";
const domainVersion = "1";

export function useCredentialContract() {
    const config = useRuntimeConfig();
    const chainId = Number(config.public.chainId || 1337);
    const contractAddress = String(config.public.credentialContractAddress || "").trim();
    const rpcUrl = String(config.public.rpcUrl || "http://127.0.0.1:8545");

    if (!contractAddress) {
        throw new Error("CredChain 合约地址未配置，请检查 apps/web/.env 中的 NUXT_PUBLIC_CREDENTIAL_CONTRACT_ADDRESS。");
    }

    function assertWallet() {
        if (!window.ethereum) {
            throw new Error("未检测到 MetaMask，请先安装并刷新页面。");
        }
        return window.ethereum;
    }

    function targetHexChainId() {
        return `0x${chainId.toString(16)}`;
    }

    async function addTargetChain() {
        const wallet = assertWallet();
        await wallet.request({
            method: "wallet_addEthereumChain",
            params: [{
                chainId: targetHexChainId(),
                chainName: "CredChain Local Hardhat",
                nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
                rpcUrls: [rpcUrl]
            }]
        });
    }

    async function getKnownAccounts() {
        const wallet = assertWallet();
        return (await wallet.request({ method: "eth_accounts" })) as string[];
    }

    async function requestAccounts() {
        const wallet = assertWallet();
        const accounts = (await wallet.request({ method: "eth_requestAccounts" })) as string[];
        if (!accounts.length) {
            throw new Error("钱包未返回账户");
        }
        return accounts;
    }

    async function ensureTargetChain() {
        const wallet = assertWallet();
        try {
            await wallet.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: targetHexChainId() }]
            });
        } catch (error) {
            const err = error as { code?: number; message?: string };
            if (err.code === 4902) {
                await addTargetChain();
                return;
            }
            throw new Error(err.message || `请切换到本地链(${chainId})后重试`);
        }
    }

    function getWalletProvider() {
        return new BrowserProvider(assertWallet() as any);
    }

    function getRpcProvider() {
        return new JsonRpcProvider(rpcUrl, chainId);
    }

    async function getSigner(): Promise<Signer> {
        await ensureTargetChain();
        const accounts = await getKnownAccounts();
        if (!accounts.length) {
            await requestAccounts();
        }
        return getWalletProvider().getSigner();
    }

    async function connectWallet() {
        const accounts = await requestAccounts();
        await ensureTargetChain();
        return accounts[0];
    }

    async function getCurrentAddress() {
        if (!window.ethereum) return "";
        const accounts = await getKnownAccounts();
        return accounts[0] || "";
    }

    async function getReadContract() {
        return new Contract(contractAddress, credentialAbi, getRpcProvider());
    }

    async function getWriteContract() {
        const signer = await getSigner();
        return new Contract(contractAddress, credentialAbi, signer);
    }

    async function getIssuerRegistryContract() {
        const credential = await getReadContract();
        const registryAddress = await credential.issuerRegistry();
        return new Contract(registryAddress, issuerRegistryAbi, getRpcProvider());
    }

    async function selfIssue(payload: {
        credentialId: string;
        manifestCid: string;
        manifestHash: string;
        fileCount: number;
        expiresAt?: number;
        institutionAuthTokenId?: number;
    }) {
        const contract = await getWriteContract();
        const tx = await contract.selfIssueCredential(
            payload.credentialId,
            payload.manifestCid,
            payload.manifestHash,
            payload.fileCount,
            payload.expiresAt ?? 0,
            payload.institutionAuthTokenId ?? 0
        );
        return tx.wait();
    }

    async function issueInstitutionAuth(payload: {
        authorizedWallet: string;
        credentialId: string;
        manifestCid: string;
        manifestHash: string;
        fileCount: number;
        expiresAt?: number;
    }) {
        const contract = await getWriteContract();
        const tx = await contract.issueInstitutionAuthCredential(
            payload.authorizedWallet,
            payload.credentialId,
            payload.manifestCid,
            payload.manifestHash,
            payload.fileCount,
            payload.expiresAt ?? 0
        );
        return tx.wait();
    }

    async function hashCredentialAttestation(payload: CredentialAttestationPayload) {
        const contract = await getReadContract();
        return contract.hashCredentialAttestation(payload);
    }

    async function signAttestationPayload(payload: CredentialAttestationPayload) {
        const signer = await getSigner();
        const signature = await signer.signTypedData(
            {
                name: domainName,
                version: domainVersion,
                chainId,
                verifyingContract: contractAddress
            },
            {
                CredentialAttestation: [
                    { name: "tokenId", type: "uint256" },
                    { name: "credentialId", type: "string" },
                    { name: "manifestHash", type: "bytes32" },
                    { name: "signerRole", type: "uint8" },
                    { name: "institutionAuthTokenId", type: "uint256" },
                    { name: "nonce", type: "uint256" },
                    { name: "deadline", type: "uint64" }
                ]
            },
            payload
        );

        const digest = await hashCredentialAttestation(payload);
        return {
            payload,
            signature,
            digest: String(digest)
        };
    }

    async function attestBySig(payload: CredentialAttestationPayload, signature: string) {
        const contract = await getWriteContract();
        const tx = await contract.attestBySig(payload, signature);
        return tx.wait();
    }

    async function attest(tokenId: number, params: {
        credentialId: string;
        manifestHash: string;
        signerRole: number;
        institutionAuthTokenId?: number;
        deadline?: number;
        nonce?: number;
    }) {
        const payload: CredentialAttestationPayload = {
            tokenId,
            credentialId: params.credentialId,
            manifestHash: params.manifestHash,
            signerRole: params.signerRole,
            institutionAuthTokenId: params.institutionAuthTokenId ?? 0,
            nonce: params.nonce ?? Date.now(),
            deadline: params.deadline ?? Math.floor(Date.now() / 1000) + 15 * 60
        };
        const signed = await signAttestationPayload(payload);
        await attestBySig(signed.payload, signed.signature);
        return signed;
    }

    async function tokenIdOfCredential(credentialId: string) {
        const contract = await getReadContract();
        return contract.tokenIdOfCredential(credentialId);
    }

    async function hasSigned(tokenId: number, signer: string) {
        const contract = await getReadContract();
        return contract.hasSigned(tokenId, signer);
    }

    async function isAttestationUsed(digest: string) {
        const contract = await getReadContract();
        return contract.isAttestationUsed(digest);
    }

    async function activeInstitutionAuthTokensOf(account: string) {
        const contract = await getReadContract();
        return contract.activeInstitutionAuthTokensOf(account);
    }

    async function latestTokenId() {
        const contract = await getReadContract();
        return contract.latestTokenId();
    }

    async function tokensOfOwner(holder: string) {
        const contract = await getReadContract();
        return contract.tokensOfOwner(holder);
    }

    async function credentialMeta(tokenId: number) {
        const contract = await getReadContract();
        return contract.credentialMeta(tokenId);
    }

    async function getCredentialSignerViews(tokenId: number) {
        const contract = await getReadContract();
        const [issuedEvents, attestedEvents] = await Promise.all([
            contract.queryFilter(contract.filters.CredentialIssued(tokenId)),
            contract.queryFilter(contract.filters.CredentialAttestedBySig(tokenId))
        ]);

        const signers: IndexedCredentialSigner[] = [];
        const institutionTokenIds = new Set<number>();

        if (issuedEvents.length) {
            const args = issuedEvents[0].args;
            const institutionAuthTokenId = Number(args.primaryInstitutionAuthTokenId);
            if (institutionAuthTokenId > 0) {
                institutionTokenIds.add(institutionAuthTokenId);
            }
            signers.push({
                signer: String(args.primarySigner),
                signerRole: Number(args.primarySignerRole) === 2 ? "governance" : Number(args.primarySignerRole) === 1 ? "institution" : "holder",
                institutionAuthTokenId: institutionAuthTokenId || undefined,
                signedAt: Number(args.signedAt),
                manifestHash: String(args.manifestHash)
            });
        }

        for (const event of attestedEvents) {
            const args = event.args;
            const institutionAuthTokenId = Number(args.institutionAuthTokenId);
            if (institutionAuthTokenId > 0) {
                institutionTokenIds.add(institutionAuthTokenId);
            }
            signers.push({
                signer: String(args.signer),
                signerRole: Number(args.signerRole) === 2 ? "governance" : "institution",
                institutionAuthTokenId: institutionAuthTokenId || undefined,
                signedAt: Number(args.signedAt),
                attestationDigest: String(args.attestationDigest),
                manifestHash: String(args.manifestHash)
            });
        }

        if (!institutionTokenIds.size) {
            return signers.sort((a, b) => a.signedAt - b.signedAt);
        }

        const institutionManifests = new Map<number, { institutionName?: string; institutionCode?: string }>();
        await Promise.all([...institutionTokenIds].map(async (institutionTokenId) => {
            const meta = await credentialMeta(institutionTokenId);
            const manifest = await $fetch<InstitutionAuthManifest>(`/api/ipfs/object/${String(meta.manifestCid)}`);
            institutionManifests.set(institutionTokenId, {
                institutionName: manifest.institutionName,
                institutionCode: manifest.institutionCode
            });
        }));

        return signers
            .map((signer) => {
                if (!signer.institutionAuthTokenId) return signer;
                const institution = institutionManifests.get(signer.institutionAuthTokenId);
                return {
                    ...signer,
                    institutionName: institution?.institutionName,
                    institutionCode: institution?.institutionCode
                } satisfies IndexedCredentialSigner;
            })
            .sort((a, b) => a.signedAt - b.signedAt);
    }

    async function verifyByTokenId(tokenId: number) {
        const contract = await getReadContract();
        return contract.verifyByTokenId(tokenId);
    }

    async function verifyByCredentialId(credentialId: string) {
        const contract = await getReadContract();
        return contract.verifyByCredentialId(credentialId);
    }

    async function revoke(tokenId: number, reason: string) {
        const contract = await getWriteContract();
        const tx = await contract.revokeCredential(tokenId, reason);
        return tx.wait();
    }

    async function getActorRoles(account: string) {
        const [registry, credential] = await Promise.all([
            getIssuerRegistryContract(),
            getReadContract()
        ]);

        const [isGov, institutionAuthTokenIds] = await Promise.all([
            registry.isGov(account),
            credential.activeInstitutionAuthTokensOf(account)
        ]);

        return {
            isGov: Boolean(isGov),
            hasInstitutionAuth: (institutionAuthTokenIds as bigint[]).length > 0,
            institutionAuthTokenIds: (institutionAuthTokenIds as bigint[]).map((tokenId) => Number(tokenId))
        };
    }

    return {
        connectWallet,
        getCurrentAddress,
        selfIssue,
        issueInstitutionAuth,
        hashCredentialAttestation,
        signAttestationPayload,
        attestBySig,
        attest,
        latestTokenId,
        tokensOfOwner,
        credentialMeta,
        getCredentialSignerViews,
        tokenIdOfCredential,
        hasSigned,
        isAttestationUsed,
        activeInstitutionAuthTokensOf,
        verifyByTokenId,
        verifyByCredentialId,
        revoke,
        getActorRoles
    };
}
