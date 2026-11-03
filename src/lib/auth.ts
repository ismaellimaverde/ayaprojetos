import { betterAuth } from "better-auth";
import { twoFactor } from "better-auth/plugins";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { drizzle } from "drizzle-orm/node-postgres";
import { pool } from "./db";
import * as schema from "./auth-schema";
import { deliver } from "./mail";
import { assertHostedIdentity } from "./runtime-config";
assertHostedIdentity();
export const auth = betterAuth({
  appName: "BOSS",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(drizzle(pool, { schema }), {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    requireEmailVerification: true,
    autoSignIn: false,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) =>
      deliver(user.email, "password-reset", url),
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: false,
    sendVerificationEmail: async ({ user, url }) =>
      deliver(user.email, "verification", url),
  },
  session: {
    expiresIn: 60 * 60 * 8,
    updateAge: 60 * 15,
    cookieCache: { enabled: false },
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 30,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/request-password-reset": { window: 60, max: 3 },
      "/send-verification-email": { window: 60, max: 3 },
    },
  },
  plugins: [twoFactor({ issuer: "BOSS — AYA Projetos" })],
  databaseHooks: {
    user: {
      update: {
        after: async (u) => {
          if (u.twoFactorEnabled)
            await pool.query(
              'DELETE FROM boss_private.session WHERE \"userId\"=$1',
              [u.id],
            );
        },
      },
    },
    session: {
      create: {
        after: async (s) => {
          await pool.query(
            "INSERT INTO boss_private.security_events(user_id,event) VALUES($1,$2)",
            [s.userId, "session.created"],
          );
        },
      },
    },
  },
});
