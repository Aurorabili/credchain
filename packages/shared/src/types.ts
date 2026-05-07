export interface CredentialMetadata {
    name: string;
    description: string;
    image: string;
    credentialType: string;
    attributes: Array<{ trait_type: string; value: string }>;
    issuedAt: string;
    expiresAt?: string;
    issuer: string;
}

export interface SBTView {
    tokenId: bigint;
    owner: `0x${string}`;
    credentialType: string;
    metadataHash: string;
    score: bigint;
    isRevoked: boolean;
}

export interface ReputationView {
    account: `0x${string}`;
    reputation: bigint;
    weight: bigint;
    kycVerified: boolean;
}
