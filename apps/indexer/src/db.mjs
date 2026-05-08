import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { config } from "./config.mjs";

let db;

function ensureDb() {
    if (!db) {
        mkdirSync(dirname(config.dbPath), { recursive: true });
        db = new DatabaseSync(config.dbPath);
        db.exec(`
            CREATE TABLE IF NOT EXISTS credentials (
                token_id INTEGER PRIMARY KEY,
                owner TEXT NOT NULL,
                business_type TEXT NOT NULL,
                metadata_cid TEXT NOT NULL,
                revoked INTEGER NOT NULL DEFAULT 0,
                score INTEGER NOT NULL DEFAULT 0,
                raw_vote_sum INTEGER NOT NULL DEFAULT 0,
                weight_sum INTEGER NOT NULL DEFAULT 0,
                vote_count INTEGER NOT NULL DEFAULT 0,
                minted_at TEXT,
                minted_block INTEGER,
                updated_at TEXT,
                updated_block INTEGER
            );
            CREATE INDEX IF NOT EXISTS idx_credentials_owner ON credentials(owner);
            CREATE INDEX IF NOT EXISTS idx_credentials_business_type ON credentials(business_type);
            CREATE TABLE IF NOT EXISTS sync_state (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
        `);
    }

    return db;
}

export function getDb() {
    return ensureDb();
}

export function getSyncValue(key) {
    const row = ensureDb()
        .prepare("SELECT value FROM sync_state WHERE key = ?")
        .get(key);

    return row ? row.value : null;
}

export function setSyncValue(key, value) {
    ensureDb()
        .prepare(`
            INSERT INTO sync_state(key, value)
            VALUES(?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `)
        .run(key, value);
}

export function getLastSyncedBlock() {
    const value = getSyncValue("last_synced_block");
    return value == null ? BigInt(-1) : BigInt(value);
}

export function setLastSyncedBlock(blockNumber) {
    setSyncValue("last_synced_block", blockNumber.toString());
}

export function clearIndexerState() {
    const database = ensureDb();
    database.exec(`
        DELETE FROM credentials;
        DELETE FROM sync_state;
    `);
}

export function upsertCredentialSnapshot(snapshot) {
    ensureDb()
        .prepare(`
            INSERT INTO credentials(
                token_id, owner, business_type, metadata_cid, revoked, score,
                raw_vote_sum, weight_sum, vote_count, minted_at, minted_block, updated_at, updated_block
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(token_id) DO UPDATE SET
                owner = excluded.owner,
                business_type = excluded.business_type,
                metadata_cid = excluded.metadata_cid,
                revoked = excluded.revoked,
                score = excluded.score,
                raw_vote_sum = excluded.raw_vote_sum,
                weight_sum = excluded.weight_sum,
                vote_count = excluded.vote_count,
                minted_at = COALESCE(credentials.minted_at, excluded.minted_at),
                minted_block = COALESCE(credentials.minted_block, excluded.minted_block),
                updated_at = excluded.updated_at,
                updated_block = excluded.updated_block
        `)
        .run(
            snapshot.tokenId,
            snapshot.owner,
            snapshot.businessType,
            snapshot.metadataCID,
            snapshot.isRevoked ? 1 : 0,
            snapshot.score,
            snapshot.rawVoteSum,
            snapshot.weightSum,
            snapshot.voteCount,
            snapshot.mintedAt,
            snapshot.mintedBlock,
            snapshot.updatedAt,
            snapshot.updatedBlock
        );
}

export function markCredentialRevoked(tokenId, updatedAt, updatedBlock) {
    ensureDb()
        .prepare(`
            UPDATE credentials
            SET revoked = 1, updated_at = ?, updated_block = ?
            WHERE token_id = ?
        `)
        .run(updatedAt, updatedBlock, tokenId);
}

function mapRow(row) {
    return {
        tokenId: row.token_id,
        owner: row.owner,
        businessType: row.business_type,
        metadataCID: row.metadata_cid,
        score: row.score,
        rawVoteSum: row.raw_vote_sum,
        weightSum: row.weight_sum,
        voteCount: row.vote_count,
        isRevoked: row.revoked === 1,
        mintedAt: row.minted_at,
        mintedBlock: row.minted_block,
        updatedAt: row.updated_at,
        updatedBlock: row.updated_block,
    };
}

export function listCredentials(owner) {
    const rows = owner
        ? ensureDb()
            .prepare(`
                SELECT * FROM credentials
                WHERE lower(owner) = lower(?)
                ORDER BY updated_block DESC, token_id DESC
            `)
            .all(owner)
        : ensureDb()
            .prepare(`
                SELECT * FROM credentials
                ORDER BY updated_block DESC, token_id DESC
            `)
            .all();

    return rows.map(mapRow);
}

export function getCredential(tokenId) {
    const row = ensureDb()
        .prepare("SELECT * FROM credentials WHERE token_id = ?")
        .get(tokenId);

    return row ? mapRow(row) : null;
}

export function getCredentialCount(owner) {
    const row = owner
        ? ensureDb().prepare("SELECT COUNT(*) AS count FROM credentials WHERE lower(owner) = lower(?)").get(owner)
        : ensureDb().prepare("SELECT COUNT(*) AS count FROM credentials").get();

    return Number(row?.count ?? 0);
}
