export type CredentialStatus = "self" | "trusted" | "revoked" | "expired";
export type CredentialKind = "standard" | "institution-auth";
export type SignerRole = "holder" | "institution" | "governance";

export interface CredentialAttachment {
    name: string;
    mimeType: string;
    size: number;
    cid: string;
    sha256: string;
}

export interface CredentialManifest {
    schemaVersion: "credchain-manifest-v1";
    credentialType: "standard";
    credentialId: string;
    holder: string;
    issuerSet: string[];
    issuedAt: number;
    expiresAt?: number;
    attachments: CredentialAttachment[];
}

export interface InstitutionAuthManifest {
    schemaVersion: "credchain-institution-auth-v1";
    credentialType: "institution-auth";
    credentialId: string;
    institutionName: string;
    institutionCode: string;
    authorizedWallet: string;
    grantedBy: string;
    issuedAt: number;
    expiresAt?: number;
    description?: string;
    attachments: CredentialAttachment[];
}

export type AnyCredentialManifest = CredentialManifest | InstitutionAuthManifest;

export interface OnchainCredentialMeta {
    tokenId: bigint;
    credentialId: string;
    manifestCid: string;
    manifestHash: string;
    fileCount: number;
    revoked: boolean;
    issuedAt: number;
    expiresAt?: number;
    credentialType: number;
    trustStatus: number;
}

export interface CredentialAttestationPayload {
    tokenId: number;
    credentialId: string;
    manifestHash: string;
    signerRole: number;
    institutionAuthTokenId: number;
    nonce: number;
    deadline: number;
}

export interface InstitutionAuthorizationPayload {
    authorizedWallet: string;
    credentialId: string;
    manifestHash: string;
    expiresAt: number;
    nonce: number;
    deadline: number;
}

export interface IndexedCredentialSigner {
    signer: string;
    signerRole: SignerRole;
    institutionAuthTokenId?: number;
    institutionName?: string;
    institutionCode?: string;
    signedAt: number;
    attestationDigest: string;
    manifestHash: string;
}

export interface IndexedCredentialTrustView {
    tokenId: number;
    signerCount: number;
    governanceSignerCount: number;
    institutionSignerCount: number;
    signers: IndexedCredentialSigner[];
}
