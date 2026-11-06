import { migratePrivateDatabase } from "./database-setup";
import { isLocalDatabase } from "../src/lib/runtime-config";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
import { Pool } from "pg";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
if (!isLocalDatabase(process.env.DATABASE_URL!))
  throw new Error("Tests require localhost PostgreSQL");
const root = new Pool({ connectionString: process.env.DATABASE_URL });
await root.query("DROP DATABASE IF EXISTS boss_e2e WITH (FORCE)");
await root.query("CREATE DATABASE boss_e2e");
await root.end();
const url = new URL(process.env.DATABASE_URL!);
url.pathname = "/boss_e2e";
process.env.DATABASE_URL = url.toString();
process.env.BETTER_AUTH_URL = "http://localhost:3100";
const { getPool } = await import("../src/lib/db");
const pool = getPool();
await migratePrivateDatabase(pool);
const { getAuth } = await import("../src/lib/auth");
const auth = getAuth();
const password = randomBytes(24).toString("hex"),
  email = "e2e-owner@example.test";
const u = await auth.api.signUpEmail({
  body: { name: "Proprietário de teste", email, password },
});
await pool.query(
  'UPDATE boss_private."user" SET "emailVerified"=true WHERE id=$1',
  [u.user.id],
);
const w = randomUUID(),
  org = randomUUID();
await pool.query("INSERT INTO boss_private.workspaces(id,name) VALUES($1,$2)", [
  w,
  "AYA · TESTE E2E",
]);
await pool.query(
  "INSERT INTO boss_private.organizations(id,workspace_id,name) VALUES($1,$2,$3)",
  [org, w, "AYA · TESTE E2E"],
);
await pool.query(
  "INSERT INTO boss_private.members(id,org_id,user_id,role) VALUES($1,$2,$3,'owner')",
  [randomUUID(), org, u.user.id],
);
await pool.end();
await mkdir(".data", { recursive: true, mode: 0o700 });
await writeFile(".data/e2e.json", JSON.stringify({ email, password, org }), {
  mode: 0o600,
});
const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", "--port", "3100"],
  { stdio: "inherit", env: process.env },
);
for (const signal of ["SIGTERM", "SIGINT"] as const)
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 0));
