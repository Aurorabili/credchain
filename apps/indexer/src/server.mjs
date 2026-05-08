import { createServer } from "node:http";
import { URL } from "node:url";
import { config } from "./config.mjs";
import {
    getIndexedCredential,
    getIndexedCredentialCount,
    getIndexerStatus,
    listIndexedCredentials,
    startIndexerScheduler,
    stopIndexerScheduler,
    syncIndexer,
} from "./indexer.mjs";

function sendJson(response, statusCode, payload) {
    response.writeHead(statusCode, {
        "content-type": "application/json; charset=utf-8",
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET,OPTIONS",
        "access-control-allow-headers": "content-type",
    });
    response.end(JSON.stringify(payload, null, 2));
}

function notFound(response) {
    sendJson(response, 404, { error: "Not found" });
}

const server = createServer(async (request, response) => {
    if (!request.url) {
        notFound(response);
        return;
    }

    if (request.method === "OPTIONS") {
        response.writeHead(204, {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "GET,OPTIONS",
            "access-control-allow-headers": "content-type",
        });
        response.end();
        return;
    }

    if (request.method !== "GET") {
        sendJson(response, 405, { error: "Method not allowed" });
        return;
    }

    try {
        await syncIndexer();
        const url = new URL(request.url, `http://${request.headers.host || `${config.host}:${config.port}`}`);
        const path = url.pathname.replace(/\/+$/, "") || "/";

        if (path === "/api/indexer/health") {
            sendJson(response, 200, { ok: true, ...getIndexerStatus() });
            return;
        }

        if (path === "/api/indexer/credentials") {
            const owner = url.searchParams.get("owner") || undefined;
            sendJson(response, 200, { credentials: listIndexedCredentials(owner) });
            return;
        }

        if (path === "/api/indexer/stats") {
            const owner = url.searchParams.get("owner") || undefined;
            sendJson(response, 200, { credentialCount: getIndexedCredentialCount(owner) });
            return;
        }

        if (path.startsWith("/api/indexer/credentials/")) {
            const tokenId = Number(path.split("/").pop());
            if (!Number.isInteger(tokenId) || tokenId <= 0) {
                sendJson(response, 400, { error: "Invalid token ID" });
                return;
            }

            const credential = getIndexedCredential(tokenId);
            if (!credential) {
                sendJson(response, 404, { error: "Credential not found" });
                return;
            }

            sendJson(response, 200, { credential });
            return;
        }

        notFound(response);
    } catch (error) {
        console.error("[indexer] request failed:", error);
        sendJson(response, 500, {
            error: error instanceof Error ? error.message : "Unexpected indexer error",
        });
    }
});

try {
    await syncIndexer();
} catch (error) {
    console.warn("[indexer] initial sync skipped:", error instanceof Error ? error.message : error);
}
startIndexerScheduler();

server.listen(config.port, config.host, () => {
    console.log(`[indexer] listening on http://${config.host}:${config.port}`);
});

process.on("SIGINT", () => {
    stopIndexerScheduler();
    server.close(() => process.exit(0));
});

process.on("SIGTERM", () => {
    stopIndexerScheduler();
    server.close(() => process.exit(0));
});
