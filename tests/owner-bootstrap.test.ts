import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import nextEnv from "@next/env";
import { Pool } from "pg";
import { ownerBootstrapPlan } from "../scripts/owner-bootstrap-plan";
import { migratePrivateDatabase } from "../scripts/database-setup";
import { isLocalDatabase } from "../src/lib/runtime-config";
nextEnv.loadEnvConfig(process.cwd());

test("operator bootstrap preserves verification, password reset and optional MFA invariants", async () => {
  if (!isLocalDatabase(process.env.DATABASE_URL!))
    throw new Error("Local tests only");
  const admin = new Pool({ connectionString: process.env.DATABASE_URL });
  const url = new URL(process.env.DATABASE_URL!);
  url.pathname = "/boss_owner_bootstrap_test";
  process.env.DATABASE_URL = url.toString();
  process.env.MAIL_MODE = "local";
  process.env.BETTER_AUTH_URL = "http://localhost:3200";
  const { pool } = await import("../src/lib/db");
  const { auth } = await import("../src/lib/auth");
  const { inOrg } = await import("../src/lib/domain");
  const email = "operator-bootstrap@example.test";
  const origin = process.env.BETTER_AUTH_URL;
  const post = (path: string, body: object) =>
    auth.handler(
      new Request(`${origin}/api/auth/${path}`, {
        method: "POST",
        headers: { "content-type": "application/json", origin },
        body: JSON.stringify(body),
      }),
    );
  async function mail(kind: string) {
    for (const f of (await readdir(".data/mail")).sort().reverse()) {
      const value = JSON.parse(await readFile(`.data/mail/${f}`, "utf8"));
      if (value.to === email && value.kind === kind) return new URL(value.url);
    }
    throw new Error("Expected local message missing");
  }
  try {
    await admin.query(
      "DROP DATABASE IF EXISTS boss_owner_bootstrap_test WITH (FORCE)",
    );
    await admin.query("CREATE DATABASE boss_owner_bootstrap_test");
    await migratePrivateDatabase(pool);
    const plan = await ownerBootstrapPlan({
      name: "Operator ' \\ test",
      email,
    });
    await pool.query(plan.sql);
    const u = (await pool.query('SELECT * FROM boss_private."user"')).rows[0];
    assert.equal(u.emailVerified, false);
    assert.equal(u.twoFactorEnabled, false);
    const account = (
      await pool.query(
        'SELECT "providerId","accountId","userId" FROM boss_private.account',
      )
    ).rows[0];
    assert.deepEqual(account, {
      providerId: "credential",
      accountId: plan.userId,
      userId: plan.userId,
    });
    assert.equal(
      (await pool.query("SELECT count(*)::int AS n FROM boss_private.session"))
        .rows[0].n,
      0,
    );
    assert.equal(
      (await pool.query("SELECT action FROM boss_private.audit_logs")).rows[0]
        .action,
      "owner.bootstrapped",
    );
    const c = await pool.connect();
    try {
      await assert.rejects(() => c.query(plan.sql));
      await c.query("ROLLBACK");
    } finally {
      c.release();
    }
    assert.equal(
      (await pool.query('SELECT count(*)::int AS n FROM boss_private."user"'))
        .rows[0].n,
      1,
    );
    assert.equal(
      (
        await post("send-verification-email", {
          email,
          callbackURL: `${origin}/recover`,
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await post("request-password-reset", {
          email,
          redirectTo: `${origin}/recover`,
        })
      ).status,
      200,
    );
    const reset = await mail("password-reset");
    const token = reset.pathname.split("/").at(-1)!;
    const password = randomBytes(32).toString("hex");
    assert.equal(
      (await post("reset-password", { token, newPassword: password })).status,
      200,
    );
    assert.notEqual(
      (await post("sign-in/email", { email, password })).status,
      200,
    );
    const verification = await mail("verification");
    assert.equal((await auth.handler(new Request(verification))).status, 302);
    assert.equal(
      (await post("sign-in/email", { email, password })).status,
      200,
    );
    assert.equal(
      await inOrg(
        { userId: plan.userId, mfa: false, sessionCreatedAt: new Date() },
        plan.orgId,
        async () => true,
      ),
      true,
    );
    assert.notEqual(
      (await post("reset-password", { token, newPassword: password })).status,
      200,
    );
    // First verification request above consumed one of three allowed attempts.
    for (let i = 0; i < 2; i++)
      assert.equal(
        (
          await post("send-verification-email", {
            email: "nonexistent-access@example.test",
            callbackURL: `${origin}/recover`,
          })
        ).status,
        200,
      );
    assert.equal(
      (
        await post("send-verification-email", {
          email: "nonexistent-access@example.test",
          callbackURL: `${origin}/recover`,
        })
      ).status,
      429,
    );
  } finally {
    await pool.end();
    await admin.query(
      "DROP DATABASE IF EXISTS boss_owner_bootstrap_test WITH (FORCE)",
    );
    await admin.end();
  }
});
