import { test } from "node:test";
import assert from "node:assert/strict";
import nextEnv from "@next/env";
import { Pool } from "pg";
import { X509Certificate } from "node:crypto";
import { rootCertificates, createSecureContext } from "node:tls";
import {
  databaseConfig,
  assertHostedIdentity,
  assertOperatorTarget,
  isLocalDatabase,
} from "../src/lib/runtime-config";
import { mailConfiguration } from "../src/lib/mail";
import { migratePrivateDatabase } from "../scripts/database-setup";
nextEnv.loadEnvConfig(process.cwd());
const testCA = rootCertificates.find((pem) => {
  const c = new X509Certificate(pem);
  return (
    c.ca &&
    Date.parse(c.validFrom) <= Date.now() &&
    Date.parse(c.validTo) > Date.now()
  );
})!;
test("serverless pool is bounded, TLS verified, URL cannot override TLS policy", () => {
  const cfg = databaseConfig({
    NETLIFY: "true",
    DATABASE_URL:
      "postgresql://boss_app.project:test-only@pooler.example.test:6543/postgres?ssl=false&sslmode=no-verify",
    DATABASE_SSL_CA: testCA,
  });
  assert.equal(cfg.max, 1);
  assert.equal(cfg.connectionTimeoutMillis, 10000);
  assert.deepEqual(cfg.ssl, { rejectUnauthorized: true, ca: testCA.trim() });
  assert.ok(!cfg.connectionString!.includes("sslmode"));
  assert.ok(!cfg.connectionString!.includes("ssl="));
  assert.equal(cfg.options, undefined);
  assert.throws(
    () =>
      databaseConfig({
        NETLIFY: "true",
        DATABASE_URL:
          "postgresql://postgres.project:test-only@pooler.example.test:6543/postgres",
      }),
    /dedicated/,
  );
  assert.throws(
    () =>
      databaseConfig({
        DATABASE_URL: "postgresql://boss_app:test-only@remote.example.test/db",
        DATABASE_SSL_MODE: "disable",
      }),
    /verified TLS/,
  );
});
test("operator actions cannot target remote services without explicit host confirmation", () => {
  const url = "postgresql://operator:test-only@db.example.test:5432/postgres";
  assert.throws(
    () => assertOperatorTarget("MIGRATION", url, {}),
    /authorization/,
  );
  assert.throws(
    () =>
      assertOperatorTarget("BOOTSTRAP", url, {
        ALLOW_REMOTE_BOOTSTRAP: "yes",
        CONFIRMED_DATABASE_HOST: "different.example.test",
      }),
    /confirmed host/,
  );
  assert.throws(
    () =>
      assertOperatorTarget("MIGRATION", url, {
        NETLIFY: "true",
        ALLOW_REMOTE_MIGRATION: "yes",
        CONFIRMED_DATABASE_HOST: "db.example.test",
      }),
    /hosted/,
  );
  assertOperatorTarget("MIGRATION", url, {
    ALLOW_REMOTE_MIGRATION: "yes",
    CONFIRMED_DATABASE_HOST: "db.example.test",
  });
});
test("hosted identity requires exact HTTPS origin and a strong configured secret", () => {
  assert.throws(
    () =>
      assertHostedIdentity({
        NETLIFY: "true",
        BETTER_AUTH_URL: "http://localhost:3000",
      }),
    /HTTPS/,
  );
  assert.throws(
    () =>
      assertHostedIdentity({
        NETLIFY: "true",
        BETTER_AUTH_URL: "https://boss.example.test",
      }),
    /32/,
  );
});
test("local mail cannot run on Netlify; SMTP remains opt-in with certificate checks", () => {
  assert.throws(
    () => mailConfiguration({ NETLIFY: "true", MAIL_MODE: "local" }),
    /unavailable/,
  );
  assert.throws(
    () => mailConfiguration({ MAIL_MODE: "smtp" }),
    /not configured/,
  );
  const cfg = mailConfiguration({
    NETLIFY: "true",
    MAIL_MODE: "smtp",
    EMAIL_DELIVERY_ENABLED: "true",
    SMTP_HOST: "smtp.example.test",
    SMTP_USER: "test-only",
    SMTP_PASSWORD: "not-a-real-credential",
    MAIL_FROM: "BOSS <noreply@example.test>",
  });
  assert.equal(cfg.mode, "smtp");
  if (cfg.mode === "smtp") {
    assert.equal(cfg.transport.requireTLS, true);
    assert.equal(cfg.transport.tls.rejectUnauthorized, true);
    assert.equal(cfg.transport.port, 587);
  }
});
test("private schema denies Data API roles and permits only the server role, with RLS defense", async () => {
  if (!isLocalDatabase(process.env.DATABASE_URL!))
    throw new Error("Tests require localhost PostgreSQL");
  const admin = new Pool({ connectionString: process.env.DATABASE_URL });
  const url = new URL(process.env.DATABASE_URL!);
  url.pathname = "/boss_hosting_test";
  const db = new Pool({ connectionString: url.toString() });
  const runtime = `boss_runtime_test_${process.pid}`,
    created: string[] = [];
  try {
    await admin.query("DROP DATABASE IF EXISTS boss_hosting_test WITH (FORCE)");
    await admin.query("CREATE DATABASE boss_hosting_test");
    for (const role of ["anon", "authenticated", "service_role", runtime])
      if (
        !(await admin.query("SELECT 1 FROM pg_roles WHERE rolname=$1", [role]))
          .rowCount
      ) {
        await admin.query(
          `CREATE ROLE "${role}" NOLOGIN NOSUPERUSER NOBYPASSRLS`,
        );
        created.push(role);
      }
    await migratePrivateDatabase(db, runtime);
    await migratePrivateDatabase(db, runtime);
    assert.equal(
      (await db.query("SELECT to_regclass('public.user') IS NULL AS isolated"))
        .rows[0].isolated,
      true,
    );
    const tables = (
      await db.query(
        "SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='boss_private' AND c.relkind='r'",
      )
    ).rows;
    assert.ok(tables.length > 15);
    assert.ok(tables.every((t) => t.relrowsecurity));
    const c = await db.connect();
    try {
      for (const role of ["anon", "authenticated", "service_role"]) {
        await c.query(`SET ROLE "${role}"`);
        await assert.rejects(
          () => c.query('SELECT * FROM boss_private."user"'),
          { code: "42501" },
        );
        for (const table of ["project_sources", "source_links"])
          await assert.rejects(
            () => c.query(`SELECT * FROM boss_private.${table}`),
            { code: "42501" },
          );
        await c.query("RESET ROLE");
      }
      await c.query(`SET ROLE "${runtime}"`);
      for (const table of ["project_sources", "source_links"])
        await c.query(`SELECT * FROM boss_private.${table}`);
      await c.query(
        'INSERT INTO boss_private."user"(id,name,email) VALUES($1,$2,$3)',
        ["test-user", "Test only", "test@example.test"],
      );
      assert.equal(
        (await c.query('SELECT * FROM boss_private."user"')).rowCount,
        1,
      );
      await assert.rejects(
        () => c.query("CREATE TABLE boss_private.forbidden(id int)"),
        { code: "42501" },
      );
      await c.query("RESET ROLE");
      // Even an accidental table/USAGE grant does not grant rows to anon.
      await c.query("GRANT USAGE ON SCHEMA boss_private TO anon");
      await c.query('GRANT SELECT ON boss_private."user" TO anon');
      await c.query("SET ROLE anon");
      assert.equal(
        (await c.query('SELECT * FROM boss_private."user"')).rowCount,
        0,
      );
      await c.query("RESET ROLE");
    } finally {
      c.release();
    }
  } finally {
    await db.end();
    await admin.query("DROP DATABASE IF EXISTS boss_hosting_test WITH (FORCE)");
    for (const role of created) await admin.query(`DROP ROLE "${role}"`);
    await admin.end();
  }
});

test("database CA validates PEM, newline encoding and optional verified fingerprint without weakening TLS", () => {
  const cert = new X509Certificate(testCA);
  const env = {
    DATABASE_URL:
      "postgresql://boss_app:test-only@pooler.example.test:6543/postgres",
    DATABASE_SSL_CA: testCA.replaceAll("\n", "\\n"),
    DATABASE_SSL_CA_SHA256: cert.fingerprint256,
  };
  const cfg = databaseConfig(env);
  assert.ok(cfg.ssl && typeof cfg.ssl === "object");
  if (cfg.ssl && typeof cfg.ssl === "object") {
    assert.equal(cfg.ssl.rejectUnauthorized, true);
    assert.equal(cfg.ssl.checkServerIdentity, undefined);
    assert.equal(cfg.ssl.ca, testCA.trim());
    assert.doesNotThrow(() => createSecureContext(cfg.ssl as object));
  }
  assert.throws(
    () => databaseConfig({ ...env, DATABASE_SSL_CA: "invalid" }),
    /PEM/,
  );
  assert.throws(
    () => databaseConfig({ ...env, DATABASE_SSL_CA_SHA256: "00".repeat(32) }),
    /fingerprint/,
  );
  assert.throws(
    () => databaseConfig({ ...env, DATABASE_SSL_CA: "" }),
    /required/,
  );
  assert.throws(
    () =>
      databaseConfig({
        ...env,
        DATABASE_SSL_CA: testCA + "\n-----BEGIN PRIVATE KEY-----",
      }),
    /PEM/,
  );
});
