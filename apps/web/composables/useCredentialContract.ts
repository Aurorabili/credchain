import { BrowserProvider, Contract, type Signer } from "ethers";
import { useRuntimeConfig } from "nuxt/app";

const credentialAbi = [
    "function selfIssueCredential(string credentialId,string manifestCid,bytes32 manifestHash,uint32 fileCount,uint64 expiresAt) returns (uint256)",
    "function attestCredential(uint256 tokenId)",
    "function latestTokenId() view returns (uint256)",
    "function tokensOfOwner(address holder) view returns (uint256[])",
    "function credentialMeta(uint256 tokenId) view returns (tuple(string credentialId,string manifestCid,bytes32 manifestHash,uint32 fileCount,uint64 issuedAt,uint64 expiresAt,uint8 issueStatus,bool revoked))",
    "function issuerRegistry() view returns (address)",
    "function tokenIdOfCredential(string credentialId) view returns (uint256)",
    "function credentialIssuers(uint256 tokenId) view returns (address[])",
    "function verifyByTokenId(uint256 tokenId) view returns (tuple(bool exists,bool revoked,bool expired,address holder,string manifestCid,uint32 fileCount,uint8 issueStatus,uint32 issuerCount))",
    "function verifyByCredentialId(string credentialId) view returns (tuple(bool exists,bool revoked,bool expired,address holder,string manifestCid,uint32 fileCount,uint8 issueStatus,uint32 issuerCount))",
    "function revokeCredential(uint256 tokenId,string reason)"
];

const issuerRegistryAbi = [
    "function isGov(address account) view returns (bool)",
    "function isActiveIssuer(address issuer) view returns (bool)"
];

export function useCredentialContract() {
    const config = useRuntimeConfig();
    const chainId = Number(config.public.chainId || 31337);
    const contractAddress = String(config.public.credentialContractAddress || "").trim();

    if (!contractAddress) {
        throw new Error("CredChain 合约地址未配置，请检查 apps/web/.env 中的 NUXT_PUBLIC_CREDENTIAL_CONTRACT_ADDRESS。");
    }

    function assertWallet() {
        if (!window.ethereum) {
            throw new Error("未检测到 MetaMask，请先安装并刷新页面。");
        }
        return window.ethereum;
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
        const targetHex = `0x${chainId.toString(16)}`;

        try {
            await wallet.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: targetHex }]
            });
        } catch (error) {
            const err = error as { code?: number; message?: string };
            throw new Error(err.message || "请切换到本地链(31337)后重试");
        }
    }

    async function getSigner(): Promise<Signer> {
        const wallet = assertWallet();
        await requestAccounts();
        await ensureTargetChain();

        const provider = new BrowserProvider(wallet as any);
        return provider.getSigner();
    }

    async function connectWallet() {
        const accounts = await requestAccounts();
        await ensureTargetChain();
        return accounts[0];
    }

    async function getCurrentAddress() {
        if (!window.ethereum) {
            return "";
        }

        const accounts = (await window.ethereum.request({ method: "eth_accounts" })) as string[];
        return accounts[0] || "";
    }

    async function getContract() {
        const signer = await getSigner();
        return new Contract(contractAddress, credentialAbi, signer);
    }

    async function getIssuerRegistryContract() {
        const credential = await getContract();
        const signer = await getSigner();
        const registryAddress = await credential.issuerRegistry();
        return new Contract(registryAddress, issuerRegistryAbi, signer);
    }

    async function selfIssue(payload: {
        credentialId: string;
        manifestCid: string;
        manifestHash: string;
        fileCount: number;
        expiresAt?: number;
    }) {
        const contract = await getContract();
        const tx = await contract.selfIssueCredential(payload.credentialId, payload.manifestCid, payload.manifestHash, payload.fileCount, payload.expiresAt ?? 0);
        return tx.wait();
    }

    async function attest(tokenId: number) {
        const contract = await getContract();
        const tx = await contract.attestCredential(tokenId);
        return tx.wait();
    }

    async function tokenIdOfCredential(credentialId: string) {
        const contract = await getContract();
        return contract.tokenIdOfCredential(credentialId);
    }

    async function credentialIssuers(tokenId: number) {
        const contract = await getContract();
        return contract.credentialIssuers(tokenId);
    }

    async function latestTokenId() {
        const contract = await getContract();
        return contract.latestTokenId();
    }

    async function tokensOfOwner(holder: string) {
        const contract = await getContract();
        return contract.tokensOfOwner(holder);
    }

    async function credentialMeta(tokenId: number) {
        const contract = await getContract();
        return contract.credentialMeta(tokenId);
    }

    async function verifyByTokenId(tokenId: number) {
        const contract = await getContract();
        return contract.verifyByTokenId(tokenId);
    }

    async function verifyByCredentialId(credentialId: string) {
        const contract = await getContract();
        return contract.verifyByCredentialId(credentialId);
    }

    async function revoke(tokenId: number, reason: string) {
        const contract = await getContract();
        const tx = await contract.revokeCredential(tokenId, reason);
        return tx.wait();
    }

    async function getActorRoles(address: string) {
        const registry = await getIssuerRegistryContract();
        const [isGov, isIssuer] = await Promise.all([
            registry.isGov(address),
            registry.isActiveIssuer(address)
        ]);

        return {
            isGov: Boolean(isGov),
            isIssuer: Boolean(isIssuer)
        };
    }

    return {
        connectWallet,
        getCurrentAddress,
        selfIssue,
        attest,
        latestTokenId,
        tokensOfOwner,
        credentialMeta,
        tokenIdOfCredential,
        credentialIssuers,
        verifyByTokenId,
        verifyByCredentialId,
        revoke,
        getActorRoles
    };
}
