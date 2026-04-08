import { getObject } from "~/server/utils/ipfsStore";

export default defineEventHandler(async (event) => {
    const cid = getRouterParam(event, "cid");
    if (!cid) {
        throw createError({ statusCode: 400, statusMessage: "cid required" });
    }

    const data = await getObject(cid);
    if (!data) {
        throw createError({ statusCode: 404, statusMessage: "not found" });
    }

    return data;
});
