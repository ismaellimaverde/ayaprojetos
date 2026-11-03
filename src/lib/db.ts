import { Pool } from "pg";
import { databaseConfig } from "./runtime-config";
const globalDB = globalThis as unknown as { bossPool?: Pool };
export const pool = globalDB.bossPool ?? new Pool(databaseConfig());
if (!globalDB.bossPool)
  pool.on("error", () =>
    console.error(JSON.stringify({ event: "database.pool.error" })),
  );
globalDB.bossPool = pool;
