import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { Pool } from "pg";
import { z } from "zod";
import {
  assertOperatorTarget,
  databaseConfig,
} from "../src/lib/runtime-config";
import { mailConfiguration } from "../src/lib/mail";
const url = process.env.DATABASE_OPERATOR_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("Operator database connection required");
assertOperatorTarget("BOOTSTRAP", url);
mailConfiguration();
const input = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z.email().transform((s) => s.toLowerCase()),
    password: z.string().min(12).max(128),
  })
  .parse(JSON.parse(readFileSync(0, "utf8")));
// Separate direct/session-mode connection holds a cluster-wide lock throughout signup.
// This avoids a max=1 runtime-pool deadlock and concurrent first-owner provisioning.
const control = new Pool(
  databaseConfig({ ...process.env, DATABASE_POOL_MAX: "1" }, url),
);
const c = await control.connect();
const { pool } = await import("../src/lib/db");
const { auth } = await import("../src/lib/auth");
let lock = false;
try {
  const result = await c.query(
    "SELECT pg_try_advisory_lock(827342) AS acquired",
  );
  if (!result.rows[0].acquired) throw new Error("Another bootstrap is running");
  lock = true;
  const sameDatabase = await pool.query(
    "SELECT NOT pg_try_advisory_xact_lock(827342) AS same_database",
  );
  if (!sameDatabase.rows[0].same_database)
    throw new Error(
      "Operator and runtime connections must target the same database",
    );
  if ((await c.query("SELECT 1 FROM boss_private.members LIMIT 1")).rowCount)
    throw new Error("Bootstrap already completed");
  const u = await auth.api.signUpEmail({ body: input });
  await c.query("BEGIN");
  const w = randomUUID(),
    o = randomUUID();
  await c.query("INSERT INTO boss_private.workspaces(id,name) VALUES($1,$2)", [
    w,
    "AYA Projetos",
  ]);
  await c.query(
    "INSERT INTO boss_private.organizations(id,workspace_id,name) VALUES($1,$2,$3)",
    [o, w, "AYA Projetos"],
  );
  await c.query(
    "INSERT INTO boss_private.members(id,org_id,user_id,role) VALUES($1,$2,$3,'owner')",
    [randomUUID(), o, u.user.id],
  );
  await c.query(
    "INSERT INTO boss_private.audit_logs(org_id,actor_id,action,target_id) VALUES($1,$2,'owner.bootstrapped',$2)",
    [o, u.user.id],
  );
  await c.query("COMMIT");
  console.log(
    "Owner provisioned. Complete email verification and MFA before administration.",
  );
} catch {
  await c.query("ROLLBACK");
  throw new Error(
    "Bootstrap did not complete. No public setup endpoint exists; inspect operator state privately before retrying.",
  );
} finally {
  if (lock) await c.query("SELECT pg_advisory_unlock(827342)");
  c.release();
  await control.end();
  await pool.end();
}
