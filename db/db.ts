import {createClient} from "@libsql/client";
import {ApiError} from "../utils/apiError.ts";

const TURSO_DB_URL = process.env.TURSO_DB_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_DB_URL || !TURSO_AUTH_TOKEN) {
    throw new ApiError(400, "Missing DB URL or Token");
}

export const db = createClient({
    url: TURSO_DB_URL,
    authToken: TURSO_AUTH_TOKEN
})

const initializeDB = async () => {
    try {
        await db.execute(
            `CREATE TABLE IF NOT EXISTS images (
                id TEXT PRIMARY KEY,
                hash_value TEXT NOT NULL,
                caption TEXT,
                url TEXT NOT NULL,
                uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
             );`
        );
        console.log('Database schema initialized.');
    } catch (err) {
        console.log("Error while initializing DB: ", err);
    }
}

export { initializeDB };