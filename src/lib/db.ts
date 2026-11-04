import { Pool } from "pg";
import { databaseConfig } from "./runtime-config";
import {
  assertRuntimeAvailable,
  RuntimeUnavailableError,
} from "./runtime-availability";
const globalDB = globalThis as unknown as { bossPool?: Pool };

export function getPool(): Pool {
  assertRuntimeAvailable();
  if (globalDB.bossPool) return globalDB.bossPool;
  let config;
  try {
    config = databaseConfig();
  } catch {
    throw new RuntimeUnavailableError();
  }
  const pool = new Pool(config);
  pool.on("error", () =>
    console.error(JSON.stringify({ event: "database.pool.error" })),
  );
  globalDB.bossPool = pool;
  return pool;
}
