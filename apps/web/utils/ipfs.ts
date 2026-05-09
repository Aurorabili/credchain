import type {
    CredentialEvidenceReference,
    CredentialMetadataDocument,
} from "./credentialMetadata";

interface KuboAddResponse {
    Hash: string;
    Name: string;
    Size: string;
}

function getIpfsConfig() {
    const runtimeConfig = useRuntimeConfig();

    return {
        apiBase: runtimeConfig.public.ipfsApiBase.replace(/\/$/, ""),
        gatewayBase: runtimeConfig.public.ipfsGatewayBase.replace(/\/$/, ""),
    };
}

async function parseKuboAddResponse(response: Response) {
    const payload = (await response.text()).trim();
    const lastLine = payload.split("\n").filter(Boolean).pop();

    if (!lastLine) {
        throw new Error("IPFS upload returned an empty response");
    }

    return JSON.parse(lastLine) as KuboAddResponse;
}

async function addToIpfs(file: File) {
    const { apiBase } = getIpfsConfig();
    const formData = new FormData();
    formData.append("file", file, file.name);

    const response = await fetch(
        `${apiBase}/add?pin=true&cid-version=1`,
        {
            method: "POST",
            body: formData,
        }
    );

    if (!response.ok) {
        const message = await response.text().catch(() => "");
        throw new Error(message || `IPFS upload failed with status ${response.status}`);
    }

    return parseKuboAddResponse(response);
}

export function toGatewayUrl(uriOrCid: string) {
    const { gatewayBase } = getIpfsConfig();

    if (!uriOrCid) return "";
    if (/^https?:\/\//.test(uriOrCid)) return uriOrCid;
    if (uriOrCid.startsWith("ipfs://")) {
        return `${gatewayBase}/${uriOrCid.slice("ipfs://".length)}`;
    }
    return `${gatewayBase}/${uriOrCid}`;
}

export async function putMetadata(document: CredentialMetadataDocument) {
    const file = new File(
        [JSON.stringify(document, null, 2)],
        "metadata.json",
        { type: "application/json" }
    );
    const result = await addToIpfs(file);
    return result.Hash;
}

export async function getMetadata(cid: string) {
    const response = await fetch(toGatewayUrl(cid));
    if (!response.ok) return null;
    return await response.json() as CredentialMetadataDocument;
}

export async function putFile(file: File) {
    const result = await addToIpfs(file);

    return {
        cid: result.Hash,
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
    } satisfies CredentialEvidenceReference;
}
