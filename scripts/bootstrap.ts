import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
const { pool } = await import("../src/lib/db");
const { auth } = await import("../src/lib/auth");
// Credentials arrive through stdin, not argv, source or a committed env file.
const input = JSON.parse(readFileSync(0, "utf8")) as {
  name: string;
  email: string;
  password: string;
};
if ((await pool.query("SELECT 1 FROM members LIMIT 1")).rowCount)
  throw new Error("Bootstrap já concluído");
const u = await auth.api.signUpEmail({ body: input });
const c = await pool.connect();
try {
  await c.query("BEGIN");
  await c.query("SELECT pg_advisory_xact_lock(827342)");
  if ((await c.query("SELECT 1 FROM members LIMIT 1")).rowCount)
    throw new Error("Bootstrap já concluído");
  const w = randomUUID(),
    o = randomUUID();
  await c.query("INSERT INTO workspaces(id,name) VALUES($1,$2)", [
    w,
    "AYA Projetos",
  ]);
  await c.query(
    "INSERT INTO organizations(id,workspace_id,name) VALUES($1,$2,$3)",
    [o, w, "AYA Projetos"],
  );
  await c.query(
    "INSERT INTO members(id,org_id,user_id,role) VALUES($1,$2,$3,'owner')",
    [randomUUID(), o, u.user.id],
  );
  await c.query(
    "INSERT INTO audit_logs(org_id,actor_id,action,target_id) VALUES($1,$2,'owner.bootstrapped',$2)",
    [o, u.user.id],
  );
  await c.query("COMMIT");
  console.log(
    "Proprietário provisionado. Verifique e-mail na caixa local, entre e ative MFA antes de administrar.",
  );
} catch (e) {
  await c.query("ROLLBACK");
  throw e;
} finally {
  c.release();
  await pool.end();
}
