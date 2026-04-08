import { putObject } from "~/server/utils/ipfsStore";

export default defineEventHandler(async (event) => {
    const body = await readBody<{ fileName: string; contentBase64: string; mimeType?: string }>(event);

    if (!body?.fileName || !body?.contentBase64) {
        throw createError({ statusCode: 400, statusMessage: "invalid payload" });
    }

    const cid = await putObject("mock-file", {
        fileName: body.fileName,
        contentBase64: body.contentBase64,
        mimeType: body.mimeType || "application/octet-stream"
    });

    return {
        cid
    };
});
