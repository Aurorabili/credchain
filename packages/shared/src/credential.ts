export type CredentialStatus = "active" | "revoked" | "expired";

export interface CredentialAttachment {
    name: string;
    mimeType: string;
    size: number;
    cid: string;
    sha256: string;
}

export interface CredentialManifest {
    schemaVersion: "credchain-manifest-v1";
    credentialId: string;
    holder: string;
    issuerSet: string[];
    issuedAt: number;
    expiresAt?: number;
    attachments: CredentialAttachment[];
}

export interface OnchainCredentialMeta {
    tokenId: bigint;
    credentialId: string;
    manifestCid: string;
    manifestHash: string;
    fileCount: number;
    revoked: boolean;
    issuedAt: number;
    expiresAt?: number;
}
