export interface CredentialBusinessField {
    name: string;
    value: string;
    type: "text";
}

export interface CredentialEvidenceReference {
    cid: string;
    kind: "image" | "document" | "file";
    name: string;
    mimeType: string;
    size: number;
}

export interface CredentialEvidenceAsset extends CredentialEvidenceReference {
    url: string;
}

export interface CredentialMetadataDocument {
    version: "1.0";
    displayType: "certificate";
    businessType: string;
    title: string;
    description: string;
    issuer: {
        name: string;
        address: `0x${string}`;
    };
    recipient: {
        wallet: `0x${string}`;
    };
    issuedAt: string;
    fields: CredentialBusinessField[];
    evidence: CredentialEvidenceReference[];
}

export function inferEvidenceKind(mimeType: string): CredentialEvidenceReference["kind"] {
    if (mimeType.startsWith("image/")) return "image";
    if (
        mimeType === "application/pdf" ||
        mimeType.includes("word") ||
        mimeType.includes("excel") ||
        mimeType.includes("powerpoint") ||
        mimeType.startsWith("text/")
    ) {
        return "document";
    }
    return "file";
}

