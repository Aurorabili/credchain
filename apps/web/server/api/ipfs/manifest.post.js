import { createHash } from "node:crypto";
import { putObject } from "~/server/utils/ipfsStore";

export default defineEventHandler(async (event) => {
    const body = await readBody(event);

    if (!body?.manifest) {
        throw createError({ statusCode: 400, statusMessage: "manifest missing" });
    }

    const payload = JSON.stringify(body.manifest);
    const hash = createHash("sha256").update(payload).digest("hex");
    const manifestCid = await putObject("mock-manifest", body.manifest);

    return {
        manifestCid,
        manifestHash: `0x${hash}`,
        fileCount: body.manifest.attachments?.length || 0
    };
});
