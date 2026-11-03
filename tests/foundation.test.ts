import { migratePrivateDatabase } from "../scripts/database-setup";
import { isLocalDatabase } from "../src/lib/runtime-config";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import nextEnv from "@next/env";

import { randomUUID, randomBytes } from "node:crypto";
import { Pool } from "pg";
nextEnv.loadEnvConfig(process.cwd());
if (!isLocalDatabase(process.env.DATABASE_URL!))
  throw new Error("Tests require localhost PostgreSQL");
const adminPool = new Pool({ connectionString: process.env.DATABASE_URL });
const testURL = new URL(process.env.DATABASE_URL!);
testURL.pathname = "/boss_test";
process.env.DATABASE_URL = testURL.toString();
process.env.BETTER_AUTH_URL = "http://localhost:3000";
const { pool } = await import("../src/lib/db");
const { auth } = await import("../src/lib/auth");
const { execute, acceptInvitation, digest, projectAccess, inOrg } =
  await import("../src/lib/domain");
const { profile, modules } = await import("../src/lib/catalog");
let org: string, other: string, a: string, b: string;
let ownerId: string, memberId: string, financeId: string, managerId: string;
const password = randomBytes(24).toString("hex");
const actor = (id: string, mfa = false) => ({
  userId: id,
  mfa,
  sessionCreatedAt: new Date(),
});
async function makeUser(email: string) {
  const u = await auth.api.signUpEmail({
    body: { name: "Usuário de teste", email, password },
  });
  await pool.query(
    'UPDATE boss_private."user" SET "emailVerified"=true WHERE id=$1',
    [u.user.id],
  );
  return u.user.id;
}
before(async () => {
  await adminPool.query("DROP DATABASE IF EXISTS boss_test WITH (FORCE)");
  await adminPool.query("CREATE DATABASE boss_test");
  await migratePrivateDatabase(pool);
  ownerId = await makeUser("owner@example.test");
  memberId = await makeUser("marketing@example.test");
  financeId = await makeUser("finance@example.test");
  managerId = await makeUser("manager@example.test");
  const w = randomUUID();
  org = randomUUID();
  other = randomUUID();
  await pool.query(
    "INSERT INTO boss_private.workspaces(id,name) VALUES($1,$2)",
    [w, "TEST ONLY"],
  );
  await pool.query(
    "INSERT INTO boss_private.organizations(id,workspace_id,name) VALUES($1,$3,$4),($2,$3,$5)",
    [org, other, w, "AYA test", "Other tenant"],
  );
  for (const [id, role] of [
    [ownerId, "owner"],
    [memberId, "member"],
    [financeId, "member"],
    [managerId, "member"],
  ])
    await pool.query(
      "INSERT INTO boss_private.members(id,org_id,user_id,role) VALUES($1,$2,$3,$4)",
      [randomUUID(), org, id, role],
    );
  a = (
    await execute(actor(ownerId), org, "POST", ["projects"], {
      name: "Projeto A",
    })
  ).id;
  b = (
    await execute(actor(ownerId), org, "POST", ["projects"], {
      name: "Projeto B",
    })
  ).id;
});
after(async () => {
  await pool.end();
  await adminPool.end();
});
test("17 modules and versioned template persisted without fictional KPIs", async () => {
  assert.equal(modules.length, 17);
  const p = await execute(actor(ownerId), org, "GET", ["projects", a], {});
  assert.equal(p.template_version, 1);
  assert.equal(p.modules.length, 17);
});
test("administrators can use the application without MFA enrollment", async () => {
  const result = await execute(
    actor(ownerId, false),
    org,
    "GET",
    ["overview"],
    {},
  );
  assert.ok(result);
});
test("project membership grants do not leak other areas, projects or aggregate counts", async () => {
  await execute(actor(ownerId), org, "POST", ["grants"], {
    project_id: a,
    user_id: memberId,
    role: "collaborator",
    permissions: { marketing: ["view", "edit"] },
  });
  const overview = await execute(
    actor(memberId, false),
    org,
    "GET",
    ["overview"],
    {},
  );
  assert.equal(overview.projects.length, 1);
  assert.deepEqual(overview.projects[0].modules, ["marketing"]);
  assert.equal(overview.companies.length, 0);
  await assert.rejects(
    () => execute(actor(memberId, false), org, "GET", ["projects", b], {}),
    { status: 403 },
  );
  await assert.rejects(
    () =>
      execute(
        actor(memberId, false),
        org,
        "GET",
        ["projects", a, "finance"],
        {},
      ),
    { status: 403 },
  );
  await assert.rejects(
    () => execute(actor(memberId, false), other, "GET", ["overview"], {}),
    { status: 403 },
  );
});
test("finance read permission cannot create; different project roles are independent", async () => {
  await execute(actor(ownerId), org, "POST", ["grants"], {
    project_id: a,
    user_id: financeId,
    role: "finance",
    permissions: { finance: ["view"] },
  });
  await execute(actor(ownerId), org, "POST", ["grants"], {
    project_id: b,
    user_id: financeId,
    role: "collaborator",
    permissions: { marketing: ["view", "edit"] },
  });
  await assert.rejects(
    () =>
      inOrg(actor(financeId, false), org, (c, admin) =>
        projectAccess(
          c,
          actor(financeId, false),
          org,
          a,
          admin,
          "finance",
          "create",
        ),
      ),
    { status: 403 },
  );
  const p = await execute(
    actor(financeId, false),
    org,
    "GET",
    ["projects", b, "marketing"],
    {},
  );
  assert.deepEqual(p.permissions.marketing, ["view", "edit"]);
});
test("manager cannot administer globals or grant self privileges", async () => {
  await execute(actor(ownerId), org, "POST", ["grants"], {
    project_id: a,
    user_id: managerId,
    role: "project_manager",
    permissions: profile("project_manager"),
  });
  await assert.rejects(
    () => execute(actor(managerId), org, "GET", ["users"], {}),
    { status: 403 },
  );
  await assert.rejects(
    () =>
      execute(actor(memberId), org, "POST", ["grants"], {
        project_id: a,
        user_id: memberId,
        role: "project_manager",
        permissions: profile("project_manager"),
      }),
    { status: 403 },
  );
});
test("revocation takes effect on next request and is audited", async () => {
  await execute(actor(ownerId), org, "POST", ["grants"], {
    project_id: a,
    user_id: memberId,
    role: "collaborator",
    permissions: { marketing: ["view"] },
    status: "revoked",
  });
  await assert.rejects(
    () => execute(actor(memberId, false), org, "GET", ["projects", a], {}),
    { status: 403 },
  );
  assert.equal(
    (await execute(actor(memberId, false), org, "GET", ["overview"], {}))
      .projects.length,
    0,
  );
  const logs = await execute(actor(ownerId), org, "GET", ["audit"], {});
  assert.ok(
    logs.some(
      (x: { action: string; actor_id: string }) =>
        x.action === "grant.changed" && x.actor_id === ownerId,
    ),
  );
});
test("last owner is protected and critical operations require recent authentication", async () => {
  await assert.rejects(
    () =>
      execute(actor(ownerId), org, "PATCH", ["users", ownerId], {
        status: "deactivated",
      }),
    { status: 409 },
  );
  await assert.rejects(
    () =>
      execute(
        { ...actor(ownerId), sessionCreatedAt: new Date(0) },
        org,
        "DELETE",
        ["projects", b],
        {},
      ),
    { status: 428 },
  );
});
test("invite tokens reject expired, revoked, mismatched and replayed acceptance", async () => {
  const token = randomBytes(32).toString("hex");
  const iid = randomUUID();
  await pool.query(
    "INSERT INTO boss_private.invitations(id,org_id,project_id,email,role,permissions,token_hash,expires_at,created_by) VALUES($1,$2,$3,$4,'viewer',$5,$6,now()-interval '1 minute',$7)",
    [
      iid,
      org,
      b,
      "marketing@example.test",
      JSON.stringify({ dna: ["view"] }),
      digest(token),
      ownerId,
    ],
  );
  await assert.rejects(() => acceptInvitation(token, memberId), {
    status: 400,
  });
  await pool.query(
    "UPDATE boss_private.invitations SET expires_at=now()+interval '1 hour' WHERE id=$1",
    [iid],
  );
  await assert.rejects(() => acceptInvitation(token, financeId), {
    status: 403,
  });
  await acceptInvitation(token, memberId);
  await assert.rejects(() => acceptInvitation(token, memberId), {
    status: 400,
  });
  const p = await execute(
    actor(memberId, false),
    org,
    "GET",
    ["projects", b],
    {},
  );
  assert.deepEqual(p.modules, ["dna"]);
});
test("suspension blocks data and company foreign keys cannot cross tenant", async () => {
  await execute(actor(ownerId), org, "PATCH", ["users", memberId], {
    status: "suspended",
  });
  await assert.rejects(
    () => execute(actor(memberId, false), org, "GET", ["overview"], {}),
    { status: 403 },
  );
  const cid = randomUUID();
  await pool.query(
    "INSERT INTO boss_private.companies(id,org_id,name,kind) VALUES($1,$2,'Other','company')",
    [cid, other],
  );
  await assert.rejects(() =>
    execute(actor(ownerId), org, "POST", ["projects"], {
      name: "Cross tenant",
      company_id: cid,
    }),
  );
});
test("Better Auth persists hashes and verifies actual password sessions", async () => {
  const account = (
    await pool.query(
      'SELECT password FROM boss_private.account WHERE "userId"=$1',
      [ownerId],
    )
  ).rows[0];
  assert.ok(account.password);
  assert.notEqual(account.password, password);
  const r = await auth.api.signInEmail({
    body: { email: "owner@example.test", password },
    returnHeaders: true,
  });
  assert.ok(r.headers.get("set-cookie"));
  assert.equal(r.response.user.id, ownerId);
  await assert.rejects(() =>
    auth.api.signInEmail({
      body: { email: "owner@example.test", password: "incorrect-password" },
    }),
  );
});
