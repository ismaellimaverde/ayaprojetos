import { Pool } from "pg";
const globalDB = globalThis as unknown as { bossPool?: Pool };
export const pool =
  globalDB.bossPool ??
  new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
globalDB.bossPool = pool;
