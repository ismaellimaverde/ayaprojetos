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
const { getPool } = await import("../src/lib/db");
const pool = getPool();
const { getAuth } = await import("../src/lib/auth");
const auth = getAuth();
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

test("project affiliation exposes only scoped company/unit metadata without changing grants", async () => {
  const company = await execute(actor(ownerId), org, "POST", ["companies"], {
    name: "Parent company",
    kind: "company",
  });
  const unit = await execute(actor(ownerId), org, "POST", ["companies"], {
    name: "Branch unit",
    kind: "unit",
    parent_id: company.id,
  });
  const project = await execute(actor(ownerId), org, "POST", ["projects"], {
    name: "Unit-linked project",
    company_id: unit.id,
  });
  const read = await execute(
    actor(ownerId),
    org,
    "GET",
    ["projects", project.id],
    undefined,
  );
  assert.equal(read.company_id, unit.id);
  assert.equal(read.company_name, "Branch unit");
  assert.equal(read.parent_company_id, company.id);
  assert.equal(read.parent_company_name, "Parent company");
  await assert.rejects(
    execute(actor(memberId), org, "GET", ["projects", project.id], undefined),
  );
  await assert.rejects(
    execute(actor(ownerId), other, "GET", ["projects", project.id], undefined),
  );
});

test("module content persists contextual fields and items with history, conflict checks and scoped permissions", async () => {
  const project = await execute(actor(ownerId), org, "POST", ["projects"], {
    name: "Editable plan",
    modules: ["executive", "finance"],
  });
  const itemId = randomUUID();
  const first = {
    revision: 0,
    fields: { business: "A real planning description" },
    items: [
      {
        id: itemId,
        title: "Evidence",
        text: "Interview notes",
        source: "Team interview",
        period: "2026-11",
        responsible: "Project team",
        archived: false,
      },
    ],
  };
  assert.equal(
    (
      await execute(
        actor(ownerId),
        org,
        "POST",
        ["module-content", project.id, "executive"],
        first,
      )
    ).revision,
    1,
  );
  const loaded = await execute(
    actor(ownerId),
    org,
    "GET",
    ["module-content", project.id, "executive"],
    undefined,
  );
  assert.equal(loaded.document.fields.business, first.fields.business);
  assert.equal(loaded.document.items[0].id, itemId);
  assert.equal(loaded.document.revision, 1);
  const reader = await makeUser("module-reader@example.test");
  const editor = await makeUser("module-editor@example.test");
  for (const id of [reader, editor])
    await pool.query(
      "INSERT INTO boss_private.members(id,org_id,user_id,role) VALUES($1,$2,$3,'member')",
      [randomUUID(), org, id],
    );
  for (const [user, permissions] of [
    [reader, { executive: ["view"] }],
    [editor, { executive: ["view", "edit", "create"] }],
  ] as const)
    await pool.query(
      "INSERT INTO boss_private.grants(id,org_id,project_id,user_id,role,permissions,source) VALUES($1,$2,$3,$4,'viewer',$5,'test')",
      [randomUUID(), org, project.id, user, JSON.stringify(permissions)],
    );
  assert.equal(
    (
      await execute(
        actor(reader),
        org,
        "GET",
        ["module-content", project.id, "executive"],
        undefined,
      )
    ).document.revision,
    1,
  );
  await assert.rejects(
    execute(
      actor(reader),
      org,
      "POST",
      ["module-content", project.id, "executive"],
      { ...first, revision: 1 },
    ),
    /Acesso/,
  );
  await assert.rejects(
    execute(
      actor(reader),
      org,
      "GET",
      ["module-content", project.id, "finance"],
      undefined,
    ),
    /Acesso/,
  );
  await assert.rejects(
    execute(
      actor(reader),
      org,
      "GET",
      ["module-content", a, "executive"],
      undefined,
    ),
  );
  await assert.rejects(
    execute(
      actor(ownerId),
      other,
      "GET",
      ["module-content", project.id, "executive"],
      undefined,
    ),
  );
  await assert.rejects(
    execute(
      actor(editor),
      org,
      "POST",
      ["module-content", project.id, "executive"],
      { ...first, revision: 1, items: [{ ...first.items[0], archived: true }] },
    ),
    /Acesso/,
  );
  await assert.rejects(
    execute(
      actor(ownerId),
      org,
      "POST",
      ["module-content", project.id, "executive"],
      { ...first, revision: 1, items: [] },
    ),
    /Arquive/,
  );
  await assert.rejects(
    execute(
      actor(ownerId),
      org,
      "POST",
      ["module-content", project.id, "executive"],
      { ...first, revision: 1, fields: { unknown: "No" } },
    ),
    /Campos/,
  );
  const concurrent = await Promise.allSettled(
    ["First writer", "Second writer"].map((business) =>
      execute(
        actor(editor),
        org,
        "POST",
        ["module-content", project.id, "executive"],
        { ...first, revision: 1, fields: { business } },
      ),
    ),
  );
  assert.equal(concurrent.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(
    concurrent.filter((r) => r.status === "rejected" && r.reason.status === 409)
      .length,
    1,
  );
  const history = await execute(
    actor(reader),
    org,
    "GET",
    ["module-content", project.id, "executive", "history"],
    undefined,
  );
  assert.equal(history.length, 2);
  const snapshot = await execute(
    actor(reader),
    org,
    "GET",
    ["module-content", project.id, "executive", "history", "1"],
    undefined,
  );
  assert.equal(snapshot.fields.business, first.fields.business);
  await assert.rejects(
    pool.query(
      "UPDATE boss_private.module_revisions SET fields='{}' WHERE project_id=$1",
      [project.id],
    ),
    /append-only/,
  );
  const current = await execute(
    actor(ownerId),
    org,
    "GET",
    ["module-content", project.id, "executive"],
    undefined,
  );
  await execute(
    actor(ownerId),
    org,
    "POST",
    ["module-content", project.id, "executive"],
    {
      ...first,
      revision: 2,
      fields: current.document.fields,
      items: [{ ...first.items[0], archived: true }],
    },
  );
  assert.equal(
    (
      await execute(
        actor(ownerId),
        org,
        "GET",
        ["module-content", project.id, "executive"],
        undefined,
      )
    ).document.items[0].archived,
    true,
  );
  await execute(actor(ownerId), org, "PATCH", ["projects", project.id], {
    name: "Editable plan",
    modules: ["finance"],
  });
  await assert.rejects(
    execute(
      actor(ownerId),
      org,
      "GET",
      ["module-content", project.id, "executive"],
      undefined,
    ),
    /Acesso/,
  );
  await execute(actor(ownerId), org, "PATCH", ["projects", project.id], {
    name: "Editable plan",
    modules: ["executive", "finance"],
  });
  assert.equal(
    (
      await execute(
        actor(ownerId),
        org,
        "GET",
        ["module-content", project.id, "executive"],
        undefined,
      )
    ).document.revision,
    3,
  );
  await pool.query(
    "UPDATE boss_private.grants SET status='revoked' WHERE project_id=$1 AND user_id=$2",
    [project.id, reader],
  );
  await assert.rejects(
    execute(
      actor(reader),
      org,
      "GET",
      ["module-content", project.id, "executive", "history"],
      undefined,
    ),
    /Acesso/,
  );
  await execute(
    actor(ownerId),
    org,
    "DELETE",
    ["projects", project.id],
    undefined,
  );
  await assert.rejects(
    execute(
      actor(ownerId),
      org,
      "POST",
      ["module-content", project.id, "executive"],
      { ...first, revision: 3 },
    ),
    /arquivado/,
  );
});

test("executive rich saves preserve legacy data, reject XSS, and enforce export grants", async () => {
  const { SUMMARY_KEY } = await import("../src/lib/rich-summary");
  const project = await execute(actor(ownerId), org, "POST", ["projects"], {
    name: "Rich summary",
    modules: ["executive"],
  });
  const path = ["module-content", project.id, "executive"];
  const item = {
    id: randomUUID(),
    title: "Original item",
    text: "Evidence",
    source: "",
    period: "",
    responsible: "",
    archived: false,
  };
  await execute(actor(ownerId), org, "POST", path, {
    revision: 0,
    fields: { business: "Original business" },
    items: [item],
  });
  const rich = JSON.stringify({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Texto rico", marks: [{ type: "bold" }] },
        ],
      },
    ],
  });
  await execute(actor(ownerId), org, "POST", path, {
    revision: 1,
    fields: { [SUMMARY_KEY]: rich },
    items: [],
  });
  const current = (await execute(actor(ownerId), org, "GET", path, undefined))
    .document;
  assert.equal(current.fields.business, "Original business");
  assert.deepEqual(current.items, [item]);
  assert.equal(current.fields[SUMMARY_KEY], rich);
  await assert.rejects(
    execute(actor(ownerId), org, "POST", path, {
      revision: 2,
      fields: { business: "Old client" },
      items: [item],
    }),
    /formato/,
  );
  const bad = JSON.stringify({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "XSS",
            marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
          },
        ],
      },
    ],
  });
  await assert.rejects(
    execute(actor(ownerId), org, "POST", path, {
      revision: 2,
      fields: { [SUMMARY_KEY]: bad },
      items: [],
    }),
    /Formato/,
  );
  const reader = await makeUser("summary-reader@example.test");
  await pool.query(
    "INSERT INTO boss_private.members(id,org_id,user_id,role) VALUES($1,$2,$3,'member')",
    [randomUUID(), org, reader],
  );
  await pool.query(
    "INSERT INTO boss_private.grants(id,org_id,project_id,user_id,role,permissions,source) VALUES($1,$2,$3,$4,'viewer',$5,'test')",
    [
      randomUUID(),
      org,
      project.id,
      reader,
      JSON.stringify({ executive: ["view"] }),
    ],
  );
  await assert.rejects(
    execute(actor(reader), org, "GET", [...path, "export"], undefined),
    /Acesso/,
  );
  await assert.rejects(
    execute(actor(reader), org, "GET", [...path, "export", "1"], undefined),
    /Acesso/,
  );
  assert.equal(
    (await execute(actor(ownerId), org, "GET", [...path, "export"], undefined))
      .document.revision,
    2,
  );
  assert.equal(
    (
      await execute(
        actor(ownerId),
        org,
        "GET",
        [...path, "export", "1"],
        undefined,
      )
    ).fields.business,
    "Original business",
  );
});

test("project library derives ordered documents without leaking restricted areas or allowing ungranted exports", async () => {
  const project = await execute(actor(ownerId), org, "POST", ["projects"], {
    name: "Library test",
    modules: ["executive", "dna", "finance", "risks"],
  });
  for (const [area, fields] of [
    ["finance", { premises: "Private finance" }],
    ["dna", { purpose: "Visible purpose" }],
    ["executive", { business: "Visible summary" }],
  ] as const) {
    // Use the actual configured field ID for finance, whose contents must stay private.
    const { moduleFields } = await import("../src/lib/module-fields");
    const values =
      area === "finance"
        ? { [moduleFields.finance[0].id]: "Private finance" }
        : fields;
    await execute(
      actor(ownerId),
      org,
      "POST",
      ["module-content", project.id, area],
      { revision: 0, fields: values, items: [] },
    );
  }
  await execute(
    actor(ownerId),
    org,
    "POST",
    ["module-content", project.id, "risks"],
    { revision: 0, fields: {}, items: [] },
  );
  const reader = await makeUser("library-reader@example.test");
  await pool.query(
    "INSERT INTO boss_private.members(id,org_id,user_id,role) VALUES($1,$2,$3,'member')",
    [randomUUID(), org, reader],
  );
  const grant = randomUUID();
  await pool.query(
    "INSERT INTO boss_private.grants(id,org_id,project_id,user_id,role,permissions,source) VALUES($1,$2,$3,$4,'viewer',$5,'test')",
    [
      grant,
      org,
      project.id,
      reader,
      JSON.stringify({ executive: ["view", "export"], dna: ["view"] }),
    ],
  );
  const list = await execute(
    actor(reader),
    org,
    "GET",
    ["project-library", project.id],
    undefined,
  );
  assert.deepEqual(
    list.documents.map((d: { area: string }) => d.area),
    ["executive", "dna"],
  );
  assert.ok(!JSON.stringify(list).includes("Visible summary"));
  const combined = await execute(
    actor(reader),
    org,
    "GET",
    ["project-library", project.id, "complete"],
    undefined,
  );
  assert.ok(JSON.stringify(combined).includes("Visible summary"));
  assert.ok(!JSON.stringify(combined).includes("Private finance"));
  await assert.rejects(
    execute(
      actor(reader),
      org,
      "GET",
      ["project-library", project.id, "complete", "export"],
      undefined,
    ),
    /Acesso/,
  );
  const owner = await execute(
    actor(ownerId),
    org,
    "GET",
    ["project-library", project.id, "complete", "export"],
    undefined,
  );
  assert.deepEqual(
    owner.documents.map((d: { area: string }) => d.area),
    ["executive", "dna", "finance"],
  );
  await assert.rejects(
    execute(
      actor(reader),
      other,
      "GET",
      ["project-library", project.id, "complete"],
      undefined,
    ),
    /Acesso|encontrado/,
  );
  await assert.rejects(
    execute(
      actor(reader),
      org,
      "GET",
      ["project-library", b, "complete"],
      undefined,
    ),
    /Acesso/,
  );
  await pool.query(
    "UPDATE boss_private.grants SET status='revoked' WHERE id=$1",
    [grant],
  );
  await assert.rejects(
    execute(
      actor(reader),
      org,
      "GET",
      ["project-library", project.id, "complete"],
      undefined,
    ),
    /Acesso/,
  );
});

test("all planning fields support rich content with isolated persistence, history and old-client protection", async () => {
  const { moduleFields } = await import("../src/lib/module-fields");
  const { richFieldKey, textDocument } = await import("../src/lib/rich-fields");
  const areas = Object.keys(moduleFields).filter((a) => a !== "executive");
  const project = await execute(actor(ownerId), org, "POST", ["projects"], {
    name: "Rich fields test",
    modules: areas,
  });
  for (const area of areas) {
    const fields = moduleFields[area];
    const path = ["module-content", project.id, area];
    const legacy = Object.fromEntries(
      fields.map((f) => [f.id, `Original ${f.label}`]),
    );
    const item = {
      id: randomUUID(),
      title: "Item",
      text: "Original item",
      source: "Source",
      period: "2026",
      responsible: "Team",
      archived: false,
    };
    await execute(actor(ownerId), org, "POST", path, {
      revision: 0,
      fields: legacy,
      items: [item],
    });
    const rich = JSON.stringify(textDocument("Formatted content"));
    const next = { ...legacy, [richFieldKey(fields[0].id)]: rich };
    const items = [{ ...item, rich_text_v1: rich }];
    await execute(actor(ownerId), org, "POST", path, {
      revision: 1,
      fields: next,
      items,
    });
    const current = (await execute(actor(ownerId), org, "GET", path, undefined))
      .document;
    assert.equal(current.fields[fields[0].id], "Formatted content");
    assert.equal(current.fields[fields[1].id], legacy[fields[1].id]);
    assert.equal(current.items[0].text, "Formatted content");
    assert.equal(current.items[0].period, "2026");
    const old = await execute(
      actor(ownerId),
      org,
      "GET",
      [...path, "history", "1"],
      undefined,
    );
    assert.deepEqual(old.fields, legacy);
    assert.equal(old.items[0].text, "Original item");
    await assert.rejects(
      execute(actor(ownerId), org, "POST", path, {
        revision: 2,
        fields: legacy,
        items,
      }),
      /formato/,
    );
    await assert.rejects(
      execute(actor(ownerId), org, "POST", path, {
        revision: 2,
        fields: next,
        items: [item],
      }),
      /formato/,
    );
    const bad = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "x",
              marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
            },
          ],
        },
      ],
    });
    await assert.rejects(
      execute(actor(ownerId), org, "POST", path, {
        revision: 2,
        fields: { ...next, [richFieldKey(fields[0].id)]: bad },
        items,
      }),
      /Formato/,
    );
    await assert.rejects(
      execute(actor(ownerId), org, "POST", path, {
        revision: 2,
        fields: next,
        items: [{ ...item, rich_text_v1: bad }],
      }),
      /Formato/,
    );
    await assert.rejects(
      execute(actor(ownerId), other, "GET", path, undefined),
    );
    await assert.rejects(
      execute(actor(memberId), org, "POST", path, {
        revision: 2,
        fields: next,
        items,
      }),
      /Acesso/,
    );
  }
});

test("private source library isolates attachments, reuses references, preserves exports and reconciles excerpts", async () => {
  const project = (
    await execute(actor(ownerId), org, "POST", ["projects"], {
      name: "Source test project",
    })
  ).id;
  const restricted = await makeUser("source-reader@example.test");
  await pool.query(
    "INSERT INTO boss_private.members(id,org_id,user_id,role) VALUES($1,$2,$3,'member')",
    [randomUUID(), org, restricted],
  );
  const grant = async (permissions: Record<string, string[]>) =>
    execute(actor(ownerId), org, "POST", ["grants"], {
      project_id: project,
      user_id: restricted,
      role: "collaborator",
      permissions,
    });
  await grant({ dna: ["view", "edit"], executive: ["view"] });
  const call = (
    user: string,
    area: string,
    method = "GET",
    tail: string[] = [],
    data: unknown = {},
  ) =>
    execute(
      actor(user),
      org,
      method,
      ["sources", project, area, ...tail],
      data,
    );
  const id = randomUUID(),
    png = Buffer.from("89504e470d0a1a0a00000000", "hex");
  const input = {
    id,
    name: "PRIVATE source material",
    kind: "image",
    mime: "image/png",
    data: png.toString("base64"),
    filename: "private.png",
    note: "INTERNAL ONLY",
    origin: "private interview",
  };
  assert.equal((await call(ownerId, "finance", "POST", [], input)).id, id);
  await call(ownerId, "finance", "POST", [], input); // idempotent source creation
  assert.equal((await call(ownerId, "finance")).sources.length, 1);
  assert.equal((await call(restricted, "dna")).sources.length, 0);
  await assert.rejects(
    call(restricted, "dna", "GET", ["file", id]),
    /indisponível/,
  );
  await assert.rejects(
    call(restricted, "dna", "POST", ["links"], {
      id: randomUUID(),
      source_id: id,
    }),
    /indisponível/,
  );
  const link = {
    id: randomUUID(),
    source_id: id,
    field: "purpose",
    quote: "A frase de planejamento",
  };
  await call(ownerId, "dna", "POST", ["links"], link);
  await call(ownerId, "dna", "POST", ["links"], { ...link, id: randomUUID() });
  await call(ownerId, "executive", "POST", ["links"], {
    id: randomUUID(),
    source_id: id,
  });
  assert.equal((await call(ownerId, "dna")).sources[0].links.length, 2);
  const data = await call(restricted, "dna");
  assert.equal(data.sources.length, 1);
  assert.equal(data.sources[0].links.length, 2);
  assert.ok(!("attachment" in data.sources[0]));
  assert.ok(!("data" in data.sources[0]));
  assert.deepEqual(
    (await call(restricted, "dna", "GET", ["file", id])).privateFile,
    png,
  );
  await grant({ dna: ["view", "edit"] });
  assert.equal((await call(restricted, "dna")).sources[0].links.length, 1);
  await execute(
    actor(ownerId),
    org,
    "POST",
    ["module-content", project, "dna"],
    { revision: 0, fields: { purpose: "A frase de planejamento" }, items: [] },
  );
  assert.equal(
    (await call(ownerId, "dna")).sources[0].links.find(
      (l: { field: string }) => l.field === "purpose",
    ).status,
    "Trecho localizado",
  );
  const exported = await execute(
    actor(ownerId),
    org,
    "GET",
    ["project-library", project, "complete", "export"],
    {},
  );
  assert.ok(!JSON.stringify(exported).includes("INTERNAL ONLY"));
  assert.ok(!JSON.stringify(exported).includes("PRIVATE source material"));
  await execute(
    actor(ownerId),
    org,
    "POST",
    ["module-content", project, "dna"],
    { revision: 1, fields: { purpose: "Conteúdo modificado" }, items: [] },
  );
  assert.match(
    (await call(ownerId, "dna")).sources[0].links.find(
      (l: { field: string }) => l.field === "purpose",
    ).status,
    /alterado, removido/,
  );
  await execute(
    actor(ownerId),
    org,
    "POST",
    ["module-content", project, "dna"],
    { revision: 2, fields: { purpose: "" }, items: [] },
  );
  assert.match(
    (await call(ownerId, "dna")).sources[0].links.find(
      (l: { field: string }) => l.field === "purpose",
    ).status,
    /alterado, removido/,
  );
  await assert.rejects(
    execute(actor(ownerId), other, "GET", ["sources", project, "dna"], {}),
    /autorizado|indisponível/,
  );
  await assert.rejects(
    execute(
      actor(ownerId),
      org,
      "GET",
      ["sources", b, "executive", "file", id],
      {},
    ),
    /indisponível/,
  );
  await assert.rejects(
    call(restricted, "dna", "DELETE", ["links", link.id]),
    /permissão/,
  );
  await call(ownerId, "dna", "DELETE", ["links", link.id]);
  assert.equal(
    (await call(ownerId, "dna")).sources[0].links.filter(
      (l: { area: string }) => l.area === "dna",
    ).length,
    0,
  );
  assert.deepEqual(
    (await call(ownerId, "finance", "GET", ["file", id])).privateFile,
    png,
  );
  await call(ownerId, "dna", "POST", ["links"], {
    id: randomUUID(),
    source_id: id,
    field: "purpose",
    quote: "漢".repeat(2000),
  });
  await grant({ executive: ["view"] });
  await assert.rejects(
    call(restricted, "dna", "GET", ["file", id]),
    /autorizado/,
  );
  await assert.rejects(
    call(restricted, "executive", "POST", [], {
      id: randomUUID(),
      name: "Blocked",
      kind: "book",
    }),
    /permissão/,
  );
  await assert.rejects(
    call(ownerId, "dna", "POST", [], {
      id: randomUUID(),
      name: "Unsafe",
      kind: "link",
      url: "javascript:alert(1)",
    }),
    /inválido/,
  );
  await assert.rejects(
    call(ownerId, "dna", "POST", [], {
      ...input,
      id: randomUUID(),
      data: Buffer.from("<script>x</script>").toString("base64"),
    }),
    /permitido/,
  );
  await assert.rejects(
    call(ownerId, "dna", "POST", [], {
      ...input,
      id: randomUUID(),
      data: Buffer.alloc(2097153).toString("base64"),
    }),
  );
  // Metadata-only references exist before any narrative is written.
  await call(ownerId, "market", "POST", [], {
    id: randomUUID(),
    name: "Livro de referência",
    kind: "book",
    origin: "Autor, página 42",
  });
  assert.equal((await call(ownerId, "market")).sources.length, 2);
});

test("unified area documents preserve semantic originals, history and source anchors across all areas", async () => {
  const { moduleFields } = await import("../src/lib/module-fields");
  const { AREA_DOCUMENT_KEY, areaDocument } =
    await import("../src/lib/planning-document");
  const { documentText, textDocument } = await import("../src/lib/rich-fields");
  const { fieldText, quoteState } = await import("../src/lib/source-model");
  const project = await execute(actor(ownerId), org, "POST", ["projects"], {
    name: "Unified isolated",
    modules: Object.keys(moduleFields),
  });
  for (const area of Object.keys(moduleFields).filter(
    (a) => a !== "executive",
  )) {
    const path = ["module-content", project.id, area];
    const first = moduleFields[area][0];
    const fields = { [first.id]: "Original semantic text" };
    const items = [
      {
        id: randomUUID(),
        title: "Original structured item",
        text: "Original detail",
        source: "Book",
        period: "2026",
        responsible: "Team",
        archived: false,
      },
    ];
    await execute(actor(ownerId), org, "POST", path, {
      revision: 0,
      fields,
      items,
    });
    const before = (await execute(actor(ownerId), org, "GET", path, undefined))
      .document;
    const converted = areaDocument(area, before);
    assert.ok(
      fieldText(before, "document", area).includes("Original semantic text"),
    );
    assert.ok(documentText(converted).includes(first.label));
    assert.ok(documentText(converted).includes("Original detail"));
    await execute(actor(ownerId), org, "POST", path, {
      revision: 1,
      fields: { [AREA_DOCUMENT_KEY]: JSON.stringify(converted) },
      items: [],
    });
    const saved = (await execute(actor(ownerId), org, "GET", path, undefined))
      .document;
    assert.equal(saved.fields[first.id], fields[first.id]);
    assert.deepEqual(saved.items, items);
    assert.equal(
      quoteState(fieldText(saved, first.id), "Original semantic text"),
      "Trecho localizado",
    );
    await assert.rejects(
      execute(actor(ownerId), org, "POST", path, {
        revision: 2,
        fields,
        items,
      }),
      /formato/,
    );
    const changed = JSON.stringify(textDocument("Revised narrative"));
    await execute(actor(ownerId), org, "POST", path, {
      revision: 2,
      fields: { [AREA_DOCUMENT_KEY]: changed },
      items: [],
    });
    const revised = (await execute(actor(ownerId), org, "GET", path, undefined))
      .document;
    assert.equal(
      documentText(areaDocument(area, revised)),
      "Revised narrative",
    );
    assert.equal(revised.fields[first.id], fields[first.id]);
    assert.deepEqual(revised.items, items);
    assert.match(
      quoteState(fieldText(revised, first.id), "Original semantic text"),
      /alterado/,
    );
    await assert.rejects(
      execute(actor(ownerId), org, "POST", path, {
        revision: 3,
        fields: { [AREA_DOCUMENT_KEY]: '{"type":"script"}' },
        items: [],
      }),
      /inválido/,
    );
  }
});
