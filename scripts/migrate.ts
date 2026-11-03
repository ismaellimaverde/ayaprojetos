import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const { pool } = await import("../src/lib/db");
import { readFile, readdir } from "node:fs/promises";
const c = await pool.connect();
try {
  await c.query("BEGIN");
  await c.query("SELECT pg_advisory_xact_lock(827341)");
  await c.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations(version text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now())",
  );
  for (const file of (await readdir("migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    const version = file.split("_")[0];
    if (
      !(
        await c.query("SELECT 1 FROM schema_migrations WHERE version=$1", [
          version,
        ])
      ).rowCount
    ) {
      await c.query(await readFile(`migrations/${file}`, "utf8"));
      await c.query("INSERT INTO schema_migrations(version) VALUES($1)", [
        version,
      ]);
    }
  }
  await c.query("COMMIT");
  console.log("All migrations applied or already current");
} catch (e) {
  await c.query("ROLLBACK");
  throw e;
} finally {
  c.release();
  await pool.end();
}
