import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
import {
  databaseConfig,
  assertHostedIdentity,
} from "../src/lib/runtime-config";
import { mailConfiguration } from "../src/lib/mail";
const env = { ...process.env, BOSS_HOSTED: "true" };
const checks = [
  ["database", () => databaseConfig(env)],
  ["identity", () => assertHostedIdentity(env)],
  ["email", () => mailConfiguration(env)],
] as const;
let failed = false;
for (const [name, check] of checks) {
  try {
    check();
    console.log(`${name}: configured`);
  } catch (e) {
    failed = true;
    console.log(`${name}: ${(e as Error).message}`);
  }
}
if (failed) process.exitCode = 1;
// Validation only: no connection, migration, email, secret generation or deploy.
