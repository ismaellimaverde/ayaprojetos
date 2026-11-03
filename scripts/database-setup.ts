import type { Pool } from "pg";
import { readFile, readdir } from "node:fs/promises";
const ident = (value: string) => '"' + value.replaceAll('"', '""') + '"';
// Executes only when explicitly called by the operator or isolated local fixtures; never at request/build startup.
export async function migratePrivateDatabase(pool: Pool, runtimeRole?: string) {
  if (
    runtimeRole &&
    (!/^[a-z_][a-z0-9_]{0,62}$/.test(runtimeRole) ||
      [
        "postgres",
        "anon",
        "authenticated",
        "service_role",
        "supabase_admin",
      ].includes(runtimeRole))
  )
    throw new Error("Dedicated runtime role required");
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query("SELECT pg_advisory_xact_lock(827341)");
    // Do not silently duplicate an earlier BOSS installation into a different schema.
    const legacy = (
      await c.query(
        "SELECT to_regclass('public.schema_migrations') IS NOT NULL AS present",
      )
    ).rows[0].present;
    if (legacy)
      throw new Error(
        "Legacy public installation detected; reviewed data move is required before migration",
      );
    await c.query("CREATE SCHEMA IF NOT EXISTS boss_private");
    await c.query("REVOKE ALL ON SCHEMA boss_private FROM PUBLIC");
    await c.query("SET LOCAL search_path TO boss_private, pg_catalog");
    await c.query(
      "CREATE TABLE IF NOT EXISTS boss_private.schema_migrations(version text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now())",
    );
    for (const file of (await readdir("migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort()) {
      const version = file.split("_")[0];
      if (
        !(
          await c.query(
            "SELECT 1 FROM boss_private.schema_migrations WHERE version=$1",
            [version],
          )
        ).rowCount
      ) {
        await c.query(await readFile(`migrations/${file}`, "utf8"));
        await c.query(
          "INSERT INTO boss_private.schema_migrations(version) VALUES($1)",
          [version],
        );
      }
    }
    const roles = (
      await c.query(
        "SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role')",
      )
    ).rows.map((r) => r.rolname as string);
    for (const role of ["PUBLIC", ...roles.map(ident)]) {
      await c.query(`REVOKE ALL ON SCHEMA boss_private FROM ${role}`);
      await c.query(
        `REVOKE ALL ON ALL TABLES IN SCHEMA boss_private FROM ${role}`,
      );
      await c.query(
        `REVOKE ALL ON ALL SEQUENCES IN SCHEMA boss_private FROM ${role}`,
      );
      await c.query(
        `ALTER DEFAULT PRIVILEGES IN SCHEMA boss_private REVOKE ALL ON TABLES FROM ${role}`,
      );
      await c.query(
        `ALTER DEFAULT PRIVILEGES IN SCHEMA boss_private REVOKE ALL ON SEQUENCES FROM ${role}`,
      );
    }
    const tables = (
      await c.query(
        "SELECT tablename FROM pg_tables WHERE schemaname='boss_private'",
      )
    ).rows;
    for (const { tablename } of tables)
      await c.query(
        `ALTER TABLE boss_private.${ident(tablename)} ENABLE ROW LEVEL SECURITY`,
      );
    if (runtimeRole) {
      if (
        !(
          await c.query(
            "SELECT 1 FROM pg_roles WHERE rolname=$1 AND NOT rolsuper AND NOT rolbypassrls",
            [runtimeRole],
          )
        ).rowCount
      )
        throw new Error(
          "Runtime role must already exist and be non-superuser, non-BYPASSRLS",
        );
      const role = ident(runtimeRole);
      await c.query(`GRANT USAGE ON SCHEMA boss_private TO ${role}`);
      for (const { tablename } of tables) {
        if (tablename === "schema_migrations") continue;
        const table = `boss_private.${ident(tablename)}`;
        await c.query(
          `GRANT SELECT,INSERT,UPDATE,DELETE ON ${table} TO ${role}`,
        );
        await c.query(`DROP POLICY IF EXISTS boss_server_access ON ${table}`);
        await c.query(
          `CREATE POLICY boss_server_access ON ${table} FOR ALL TO ${role} USING (true) WITH CHECK (true)`,
        );
      }
      await c.query(
        `GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA boss_private TO ${role}`,
      );
    }
    await c.query("COMMIT");
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
