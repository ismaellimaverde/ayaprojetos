import { randomBytes, randomUUID } from "node:crypto";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { z } from "zod";

// Operator-only plan. Never imported by the app, never logs or executes SQL.
// SQL contains a password hash: keep it out of logs, Git and chat.
export async function ownerBootstrapPlan(input: {
  name: string;
  email: string;
}) {
  const { name, email } = z
    .object({
      name: z.string().trim().min(2).max(120),
      email: z.email().transform((v) => v.toLowerCase()),
    })
    .parse(input);
  const password = randomBytes(32).toString("hex");
  const hash = await hashPassword(password);
  if (!(await verifyPassword({ hash, password })))
    throw new Error("Password hashing check failed");
  const userId = randomUUID(),
    accountId = randomUUID(),
    orgId = randomUUID();
  const workspaceId = randomUUID(),
    memberId = randomUUID();
  // E-string quoting remains safe regardless of standard_conforming_strings.
  const literal = (s: string) =>
    "E'" + s.replaceAll("\\", "\\\\").replaceAll("'", "''") + "'";
  const sql = `BEGIN;
SELECT pg_advisory_xact_lock(827342);
DO $guard$ BEGIN
 IF EXISTS (SELECT 1 FROM boss_private."user")
 OR EXISTS (SELECT 1 FROM boss_private.account)
 OR EXISTS (SELECT 1 FROM boss_private.members)
 OR EXISTS (SELECT 1 FROM boss_private.organizations)
 OR EXISTS (SELECT 1 FROM boss_private.workspaces)
 THEN RAISE EXCEPTION 'Owner bootstrap requires empty identity and organization state'; END IF;
END $guard$;
INSERT INTO boss_private."user"(id,name,email,"emailVerified","twoFactorEnabled") VALUES (${literal(userId)},${literal(name)},${literal(email)},false,false);
INSERT INTO boss_private.account(id,"accountId","providerId","userId",password) VALUES (${literal(accountId)},${literal(userId)},'credential',${literal(userId)},${literal(hash)});
INSERT INTO boss_private.workspaces(id,name) VALUES (${literal(workspaceId)},'AYA Projetos');
INSERT INTO boss_private.organizations(id,workspace_id,name) VALUES (${literal(orgId)},${literal(workspaceId)},'AYA Projetos');
INSERT INTO boss_private.members(id,org_id,user_id,role) VALUES (${literal(memberId)},${literal(orgId)},${literal(userId)},'owner');
INSERT INTO boss_private.audit_logs(org_id,actor_id,action,target_id) VALUES (${literal(orgId)},${literal(userId)},'owner.bootstrapped',${literal(userId)});
COMMIT;`;
  return { sql, userId, orgId };
}
