import { getObject } from "~/server/utils/ipfsStore";

export default defineEventHandler(async (event) => {
    const cid = getRouterParam(event, "cid");
    if (!cid) {
        throw createError({ statusCode: 400, statusMessage: "cid required" });
    }

    const file = await getObject<{ fileName: string; mimeType?: string; contentBase64: string }>(cid);
    if (!file?.contentBase64) {
        throw createError({ statusCode: 404, statusMessage: "file not found" });
    }

    const buffer = Buffer.from(file.contentBase64, "base64");
    setHeader(event, "Content-Type", file.mimeType || "application/octet-stream");
    setHeader(event, "Content-Disposition", `attachment; filename=\"${file.fileName || `${cid}.bin`}\"`);

    return buffer;
});
