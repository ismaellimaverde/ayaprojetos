import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
import { Pool } from "pg";
import {
  databaseConfig,
  assertOperatorTarget,
  isLocalDatabase,
} from "../src/lib/runtime-config";
import { migratePrivateDatabase } from "./database-setup";
const url = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("Operator database connection required");
assertOperatorTarget("MIGRATION", url);
if (!isLocalDatabase(url) && !process.env.DATABASE_RUNTIME_ROLE)
  throw new Error("DATABASE_RUNTIME_ROLE required for hosted database setup");
const pool = new Pool(
  databaseConfig(
    { ...process.env, NETLIFY: "false", BOSS_HOSTED: "false" },
    url,
  ),
);
try {
  await migratePrivateDatabase(pool, process.env.DATABASE_RUNTIME_ROLE);
  console.log("Private schema migrations and access protections applied");
} finally {
  await pool.end();
}
