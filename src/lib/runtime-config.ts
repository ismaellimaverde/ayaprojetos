import type { PoolConfig } from "pg";
import { X509Certificate } from "node:crypto";
export type Environment = Record<string, string | undefined>;
export const isHosted = (env: Environment) =>
  env.NETLIFY === "true" || env.BOSS_HOSTED === "true";
export function isLocalDatabase(value: string) {
  const u = new URL(value);
  return ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname);
}
export function databaseCA(env: Environment): string | undefined {
  if (!env.DATABASE_SSL_CA) {
    if (env.DATABASE_SSL_CA_SHA256)
      throw new Error(
        "DATABASE_SSL_CA is required when a fingerprint is configured",
      );
    return undefined;
  }
  const pem = env.DATABASE_SSL_CA.replace(/\\n/g, "\n").trim();
  if (
    !/^-----BEGIN CERTIFICATE-----\s+[A-Za-z0-9+/=\s]+-----END CERTIFICATE-----$/.test(
      pem,
    )
  )
    throw new Error("DATABASE_SSL_CA must contain one PEM CA certificate");
  let cert: X509Certificate;
  try {
    cert = new X509Certificate(pem);
  } catch {
    throw new Error("DATABASE_SSL_CA is not a valid X.509 certificate");
  }
  if (
    !cert.ca ||
    Date.now() < Date.parse(cert.validFrom) ||
    Date.now() > Date.parse(cert.validTo)
  )
    throw new Error("DATABASE_SSL_CA must be a currently valid CA certificate");
  if (env.DATABASE_SSL_CA_SHA256) {
    const expected = env.DATABASE_SSL_CA_SHA256.replaceAll(
      ":",
      "",
    ).toLowerCase();
    if (
      !/^[a-f0-9]{64}$/.test(expected) ||
      expected !== cert.fingerprint256.replaceAll(":", "").toLowerCase()
    )
      throw new Error("DATABASE_SSL_CA fingerprint mismatch");
  }
  return pem;
}
export function databaseConfig(
  env: Environment = process.env,
  connectionString = env.DATABASE_URL,
): PoolConfig {
  if (!connectionString) throw new Error("DATABASE_URL is required");
  const url = new URL(connectionString);
  if (!["postgres:", "postgresql:"].includes(url.protocol))
    throw new Error("PostgreSQL URL required");
  const local = isLocalDatabase(connectionString),
    hosted = isHosted(env);
  if (hosted && local)
    throw new Error("Hosted DATABASE_URL must target the confirmed database");
  const tls = env.DATABASE_SSL_MODE ?? (local ? "disable" : "verify-full");
  if (
    !["disable", "verify-full"].includes(tls) ||
    (!local && tls !== "verify-full")
  )
    throw new Error("Remote database requires verified TLS");
  const ca = databaseCA(env);
  // URL SSL options override pg's ssl object. Remove them so certificate validation cannot be weakened.
  for (const key of ["ssl", "sslmode", "sslcert", "sslkey", "sslrootcert"])
    url.searchParams.delete(key);
  const max = Number(env.DATABASE_POOL_MAX ?? (hosted ? "1" : "10"));
  if (!Number.isInteger(max) || max < 1 || max > 10)
    throw new Error("DATABASE_POOL_MAX must be 1..10");
  if (
    hosted &&
    [
      "postgres",
      "supabase_admin",
      "anon",
      "authenticated",
      "service_role",
    ].includes(decodeURIComponent(url.username).split(".")[0])
  )
    throw new Error("Use a dedicated BOSS server database role");
  return {
    connectionString: url.toString(),
    max,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 10000,
    allowExitOnIdle: true,
    ssl:
      tls === "disable"
        ? false
        : {
            rejectUnauthorized: true,
            ...(ca ? { ca } : {}),
          },
  };
}
export function assertHostedIdentity(env: Environment = process.env) {
  if (!isHosted(env)) return;
  const u = new URL(env.BETTER_AUTH_URL ?? "http://invalid");
  if (u.protocol !== "https:" || u.origin !== env.BETTER_AUTH_URL)
    throw new Error("BETTER_AUTH_URL must be the exact approved HTTPS origin");
  if ((env.BETTER_AUTH_SECRET?.length ?? 0) < 32)
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters");
}
export function assertOperatorTarget(
  kind: "MIGRATION" | "BOOTSTRAP",
  url: string,
  env: Environment = process.env,
) {
  if (isLocalDatabase(url)) return;
  if (isHosted(env))
    throw new Error(
      "Operator commands cannot run in hosted request/build environments",
    );
  if (
    env[`ALLOW_REMOTE_${kind}`] !== "yes" ||
    env.CONFIRMED_DATABASE_HOST !== new URL(url).hostname
  )
    throw new Error(
      `Remote ${kind.toLowerCase()} requires explicit authorization and confirmed host`,
    );
  if (new URL(url).port === "6543")
    throw new Error(
      "Operator connection must use direct or session mode, not transaction pooling",
    );
}
