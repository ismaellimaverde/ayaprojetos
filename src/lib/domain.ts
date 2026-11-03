import { randomUUID, randomBytes, createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { pool } from "./db";
import {
  modules,
  actions,
  roles,
  masterTemplate,
  type Permissions,
} from "./catalog";
import { z } from "zod";
import { moduleFields, type ModuleItem } from "./module-fields";
import { SUMMARY_KEY, parseSummary } from "./rich-summary";
import { hasPlanningContent } from "./planning-document";
import { deliver, deliveryStatus } from "./mail";
export class DomainError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const deny = () => {
  throw new DomainError(403, "Acesso não autorizado");
};
const notFound = () => {
  throw new DomainError(404, "Recurso indisponível");
};
export const idSchema = z.string().uuid();
const permissionSchema = z
  .record(z.string(), z.array(z.enum(actions)))
  .refine(
    (p) => Object.keys(p).every((k) => modules.some((m) => m.id === k)),
    "Área inválida",
  );
const name = z.string().trim().min(2).max(120);
export const entitySchema = z.object({
  name,
  description: z.string().max(3000).default(""),
  company_id: idSchema.nullable().default(null),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .default("BRL"),
  timezone: z
    .string()
    .refine((s) => {
      try {
        new Intl.DateTimeFormat("pt", { timeZone: s });
        return true;
      } catch {
        return false;
      }
    })
    .default("America/Fortaleza"),
  modules: z
    .array(z.string())
    .min(1)
    .refine((a) => a.every((i) => modules.some((m) => m.id === i)))
    .default(masterTemplate.modules),
});
export const inviteSchema = z.object({
  project_id: idSchema,
  email: z.email().transform((s) => s.toLowerCase()),
  role: z.enum(roles),
  permissions: permissionSchema,
});
export type Actor = {
  userId: string;
  mfa: boolean;
  sessionCreatedAt: Date;
  sessionId?: string;
};
export async function audit(
  c: PoolClient,
  org: string,
  actor: string,
  action: string,
  target: string,
  details: unknown = {},
) {
  await c.query(
    "INSERT INTO boss_private.audit_logs(org_id,actor_id,action,target_id,details) VALUES($1,$2,$3,$4,$5)",
    [org, actor, action, target, JSON.stringify(details)],
  );
}
export async function inOrg<T>(
  actor: Actor,
  org: string,
  fn: (c: PoolClient, admin: boolean) => Promise<T>,
): Promise<T> {
  idSchema.parse(org);
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    if (
      actor.sessionId &&
      !(
        await c.query(
          'SELECT 1 FROM boss_private.session WHERE id=$1 AND \"userId\"=$2 AND \"expiresAt\">now()',
          [actor.sessionId, actor.userId],
        )
      ).rowCount
    )
      throw new DomainError(401, "Sessão revogada");
    const member = (
      await c.query(
        "SELECT m.role FROM boss_private.members m JOIN boss_private.organizations o ON o.id=m.org_id WHERE m.org_id=$1 AND m.user_id=$2 AND m.status='active' FOR UPDATE OF o",
        [org, actor.userId],
      )
    ).rows[0];
    if (!member) deny();
    const admin = ["owner", "admin"].includes(member.role);
    const result = await fn(c, admin);
    await c.query("COMMIT");
    return result;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
export async function projectAccess(
  c: PoolClient,
  actor: Actor,
  org: string,
  id: string,
  admin: boolean,
  area?: string,
  action = "view",
) {
  idSchema.parse(id);
  const p = (
    await c.query(
      `SELECT p.*,c.name AS company_name,c.kind AS company_kind,
      CASE WHEN c.kind='unit' AND parent.kind='company' THEN parent.id END AS parent_company_id,
      CASE WHEN c.kind='unit' AND parent.kind='company' THEN parent.name END AS parent_company_name
      FROM boss_private.projects p
      LEFT JOIN boss_private.companies c ON c.id=p.company_id AND c.org_id=p.org_id
      LEFT JOIN boss_private.companies parent ON parent.id=c.parent_id AND parent.org_id=p.org_id
      WHERE p.id=$1 AND p.org_id=$2`,
      [id, org],
    )
  ).rows[0];
  if (!p) notFound();
  const g = (
    await c.query(
      "SELECT permissions FROM boss_private.grants WHERE org_id=$1 AND project_id=$2 AND user_id=$3 AND status='active'",
      [org, id, actor.userId],
    )
  ).rows[0];
  const permissions: Permissions = admin
    ? Object.fromEntries((p.modules as string[]).map((m) => [m, [...actions]]))
    : (g?.permissions ?? {});
  if (
    area
      ? !p.modules.includes(area) || !permissions[area]?.includes(action)
      : !Object.values(permissions).some((a) => a.includes("view"))
  )
    deny();
  const summaries = (
    await c.query(
      "SELECT area,revision,updated_at FROM boss_private.module_content WHERE org_id=$1 AND project_id=$2",
      [org, id],
    )
  ).rows.filter(
    (row) =>
      p.modules.includes(row.area) && permissions[row.area]?.includes("view"),
  );
  return {
    ...p,
    modules: p.modules.filter((m: string) => permissions[m]?.includes("view")),
    permissions,
    module_summaries: summaries,
  };
}
function requireAdmin(admin: boolean) {
  if (!admin) deny();
}
function fresh(actor: Actor) {
  if (Date.now() - actor.sessionCreatedAt.getTime() > 10 * 60 * 1000)
    throw new DomainError(428, "Entre novamente para confirmar esta operação");
}
export async function listOrganizations(userId: string) {
  return (
    await pool.query(
      "SELECT o.*,w.name AS workspace_name,m.role FROM boss_private.organizations o JOIN boss_private.workspaces w ON w.id=o.workspace_id JOIN boss_private.members m ON m.org_id=o.id WHERE m.user_id=$1 AND m.status='active' ORDER BY o.created_at",
      [userId],
    )
  ).rows;
}
export async function execute(
  actor: Actor,
  org: string,
  method: string,
  path: string[],
  body: unknown,
) {
  return inOrg(actor, org, async (c, admin) => {
    const [resource, id, sub] = path;
    if (resource === "project-library") {
      if (
        method !== "GET" ||
        !id ||
        (sub && sub !== "complete") ||
        path.length > 4 ||
        (path[3] && path[3] !== "export")
      )
        throw new DomainError(404, "Documento não encontrado");
      const project = await projectAccess(c, actor, org, id, admin);
      const rows = (
        await c.query(
          `SELECT m.area,m.revision,m.fields,m.items,m.updated_at,u.name AS author_name
        FROM boss_private.module_content m JOIN boss_private."user" u ON u.id=m.updated_by
        WHERE m.org_id=$1 AND m.project_id=$2 AND m.area=ANY($3::text[])`,
          [org, id, project.modules],
        )
      ).rows;
      const documents = modules.flatMap((module) => {
        const row = rows.find((r) => r.area === module.id);
        if (!row || !hasPlanningContent(module.id, row)) return [];
        return [
          {
            area: row.area,
            revision: row.revision,
            updated_at: row.updated_at,
            author_name: row.author_name,
            can_export:
              project.permissions[row.area]?.includes("export") ?? false,
            ...(sub === "complete" ? { document: row } : {}),
          },
        ];
      });
      if (path[3] === "export" && documents.some((d) => !d.can_export)) deny();
      return { project_name: project.name, documents };
    }
    if (resource === "module-content") {
      if (!id || !sub || !Object.hasOwn(moduleFields, sub))
        throw new DomainError(404, "Área não encontrada");
      const project = await projectAccess(
        c,
        actor,
        org,
        id,
        admin,
        sub,
        "view",
      );
      const allowed: string[] = project.permissions[sub] ?? [];
      if (method === "GET") {
        if (path[3] === "export" && !allowed.includes("export")) deny();
        if (path[3] === "history" || (path[3] === "export" && path[4])) {
          if (path[4]) {
            const revision = z.coerce.number().int().positive().parse(path[4]);
            const row = (
              await c.query(
                `SELECT r.revision,r.fields,r.items,r.created_at AS updated_at,u.name AS author_name
               FROM boss_private.module_revisions r JOIN boss_private."user" u ON u.id=r.author_id
               WHERE r.org_id=$1 AND r.project_id=$2 AND r.area=$3 AND r.revision=$4`,
                [org, id, sub, revision],
              )
            ).rows[0];
            if (!row) notFound();
            return row;
          }
          return (
            await c.query(
              `SELECT r.revision,r.created_at,u.name AS author_name
             FROM boss_private.module_revisions r JOIN boss_private."user" u ON u.id=r.author_id
             WHERE r.org_id=$1 AND r.project_id=$2 AND r.area=$3 ORDER BY r.revision DESC LIMIT 50`,
              [org, id, sub],
            )
          ).rows;
        }
        const row = (
          await c.query(
            `SELECT m.revision,m.fields,m.items,m.updated_at,u.name AS author_name
           FROM boss_private.module_content m JOIN boss_private."user" u ON u.id=m.updated_by
           WHERE m.org_id=$1 AND m.project_id=$2 AND m.area=$3`,
            [org, id, sub],
          )
        ).rows[0];
        return {
          document: row ?? { revision: 0, fields: {}, items: [] },
          permissions: allowed,
          archived: project.status !== "active",
        };
      }
      if (method !== "POST" || path.length !== 3)
        throw new DomainError(405, "Operação não permitida");
      if (project.status !== "active")
        throw new DomainError(
          409,
          "Projeto arquivado: conteúdo somente para leitura",
        );
      const itemSchema = z
        .object({
          id: z.uuid(),
          title: z.string().trim().min(1).max(160),
          text: z.string().max(10000),
          source: z.string().max(500),
          period: z.string().max(100),
          responsible: z.string().max(160),
          archived: z.boolean(),
        })
        .strict();
      const v = z
        .object({
          revision: z.number().int().min(0),
          fields: z.record(z.string(), z.string().max(1000000)),
          items: z.array(itemSchema).max(50),
        })
        .strict()
        .parse(body);
      const fieldIds = new Set(moduleFields[sub].map((f) => f.id));
      if (sub === "executive") fieldIds.add(SUMMARY_KEY);
      for (const [key, value] of Object.entries(v.fields)) {
        if (key === SUMMARY_KEY && sub === "executive") {
          try {
            parseSummary(value);
          } catch {
            throw new DomainError(400, "Formato do resumo inválido");
          }
        } else if (value.length > 10000)
          throw new DomainError(400, "Campo excede o limite");
      }
      if (
        Object.keys(v.fields).some((k) => !fieldIds.has(k)) ||
        new Set(v.items.map((i) => i.id)).size !== v.items.length
      )
        throw new DomainError(
          400,
          "Campos ou identificadores de itens inválidos",
        );
      const old = (
        await c.query(
          "SELECT revision,fields,items FROM boss_private.module_content WHERE org_id=$1 AND project_id=$2 AND area=$3 FOR UPDATE",
          [org, id, sub],
        )
      ).rows[0];
      if (!allowed.includes(old ? "edit" : "create")) deny();
      if ((old?.revision ?? 0) !== v.revision)
        throw new DomainError(
          409,
          "Outra pessoa atualizou esta área. Recarregue antes de salvar; suas alterações ainda estão no formulário.",
        );
      if (
        sub === "executive" &&
        old?.fields?.[SUMMARY_KEY] &&
        !v.fields[SUMMARY_KEY]
      ) {
        throw new DomainError(
          409,
          "O formato desta área foi atualizado. Recarregue antes de salvar.",
        );
      }
      // A new-format save must not erase or mutate the hidden legacy source fields/items.
      if (sub === "executive" && v.fields[SUMMARY_KEY]) {
        v.fields = {
          ...(old?.fields ?? {}),
          [SUMMARY_KEY]: v.fields[SUMMARY_KEY],
        };
        v.items = old?.items ?? [];
      }
      const previous: ModuleItem[] = old?.items ?? [];
      if (previous.some((i) => !v.items.some((n) => n.id === i.id)))
        throw new DomainError(
          400,
          "Arquive os itens em vez de removê-los do histórico",
        );
      if (
        v.items.some((i) => !previous.some((p) => p.id === i.id)) &&
        !allowed.includes("create")
      )
        deny();
      if (
        v.items.some(
          (i) => i.archived && !previous.find((p) => p.id === i.id)?.archived,
        ) &&
        !allowed.includes("delete")
      )
        deny();
      const revision = v.revision + 1;
      await c.query(
        `INSERT INTO boss_private.module_content(org_id,project_id,area,revision,fields,items,updated_by)
         VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(org_id,project_id,area)
         DO UPDATE SET revision=EXCLUDED.revision,fields=EXCLUDED.fields,items=EXCLUDED.items,updated_by=EXCLUDED.updated_by,updated_at=now()`,
        [
          org,
          id,
          sub,
          revision,
          JSON.stringify(v.fields),
          JSON.stringify(v.items),
          actor.userId,
        ],
      );
      await c.query(
        `INSERT INTO boss_private.module_revisions(org_id,project_id,area,revision,schema_version,fields,items,author_id)
         VALUES($1,$2,$3,$4,1,$5,$6,$7)`,
        [
          org,
          id,
          sub,
          revision,
          JSON.stringify(v.fields),
          JSON.stringify(v.items),
          actor.userId,
        ],
      );
      await audit(c, org, actor.userId, "module.saved", id, {
        area: sub,
        revision,
      });
      return { revision };
    }
    if (resource === "organizations" && method === "POST") {
      requireAdmin(admin);
      fresh(actor);
      const v = z.object({ name }).parse(body),
        w = randomUUID(),
        o = randomUUID();
      await c.query(
        "INSERT INTO boss_private.workspaces(id,name) VALUES($1,$2)",
        [w, v.name],
      );
      await c.query(
        "INSERT INTO boss_private.organizations(id,workspace_id,name) VALUES($1,$2,$3)",
        [o, w, v.name],
      );
      await c.query(
        "INSERT INTO boss_private.members(id,org_id,user_id,role) VALUES($1,$2,$3,'owner')",
        [randomUUID(), o, actor.userId],
      );
      await audit(c, o, actor.userId, "organization.created", o);
      return { id: o };
    }

    if (resource === "overview" && method === "GET") {
      const projects = (
        await c.query(
          `SELECT p.* FROM boss_private.projects p WHERE p.org_id=$1 AND ($3::boolean OR EXISTS(SELECT 1 FROM boss_private.grants g WHERE g.project_id=p.id AND g.org_id=$1 AND g.user_id=$2 AND g.status='active' AND EXISTS(SELECT 1 FROM jsonb_each(g.permissions) e WHERE e.value @> '["view"]'::jsonb))) ORDER BY p.created_at DESC`,
          [org, actor.userId, admin],
        )
      ).rows;
      const visible = [];
      for (const p of projects)
        visible.push(await projectAccess(c, actor, org, p.id, admin));
      const companies = admin
        ? (
            await c.query(
              "SELECT * FROM boss_private.companies WHERE org_id=$1 ORDER BY name",
              [org],
            )
          ).rows
        : [];
      return {
        projects: visible,
        companies,
        admin,
        template: masterTemplate,
        modules,
      };
    }
    if (resource === "projects") {
      if (method === "POST" && !id) {
        requireAdmin(admin);
        const v = entitySchema.parse(body);
        const pid = randomUUID();
        await c.query(
          "INSERT INTO boss_private.templates(id,version,modules) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
          [masterTemplate.id, 1, JSON.stringify(masterTemplate.modules)],
        );
        await c.query(
          "INSERT INTO boss_private.projects(id,org_id,company_id,name,description,currency,timezone,template_id,template_version,modules,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,1,$9,$10)",
          [
            pid,
            org,
            v.company_id,
            v.name,
            v.description,
            v.currency,
            v.timezone,
            masterTemplate.id,
            JSON.stringify(v.modules),
            actor.userId,
          ],
        );
        await audit(c, org, actor.userId, "project.created", pid);
        return { id: pid };
      }
      if (id) {
        const p = await projectAccess(c, actor, org, id, admin, sub);
        if (method === "GET") return p;
        requireAdmin(admin);
        if (method === "PATCH") {
          const v = entitySchema.parse(body);
          await c.query(
            "UPDATE boss_private.projects SET name=$3,description=$4,company_id=$5,currency=$6,timezone=$7,modules=$8,updated_at=now() WHERE id=$1 AND org_id=$2",
            [
              id,
              org,
              v.name,
              v.description,
              v.company_id,
              v.currency,
              v.timezone,
              JSON.stringify(v.modules),
            ],
          );
          await audit(c, org, actor.userId, "project.updated", id);
          return { ok: true };
        }
        if (method === "DELETE") {
          fresh(actor);
          await c.query(
            "UPDATE boss_private.projects SET status='archived',updated_at=now() WHERE id=$1 AND org_id=$2",
            [id, org],
          );
          await audit(c, org, actor.userId, "project.archived", id);
          return { ok: true };
        }
      }
    }
    if (resource === "companies") {
      requireAdmin(admin);
      if (method === "POST") {
        const v = z
          .object({
            name,
            kind: z.enum(["company", "brand", "unit"]),
            parent_id: idSchema.nullable().default(null),
          })
          .parse(body);
        const cid = randomUUID();
        await c.query(
          "INSERT INTO boss_private.companies(id,org_id,name,kind,parent_id) VALUES($1,$2,$3,$4,$5)",
          [cid, org, v.name, v.kind, v.parent_id],
        );
        await audit(c, org, actor.userId, "company.created", cid);
        return { id: cid };
      }
      if (id && method === "PATCH") {
        idSchema.parse(id);
        const v = z.object({ name }).parse(body);
        const r = await c.query(
          "UPDATE boss_private.companies SET name=$3 WHERE id=$1 AND org_id=$2 RETURNING id",
          [id, org, v.name],
        );
        if (!r.rowCount) notFound();
        await audit(c, org, actor.userId, "company.updated", id);
        return { ok: true };
      }
      if (id && method === "DELETE") {
        idSchema.parse(id);
        fresh(actor);
        const r = await c.query(
          "UPDATE boss_private.companies SET status='archived' WHERE id=$1 AND org_id=$2 RETURNING id",
          [id, org],
        );
        if (!r.rowCount) notFound();
        await audit(c, org, actor.userId, "company.archived", id);
        return { ok: true };
      }
    }
    if (resource === "users") {
      requireAdmin(admin);
      if (method === "GET") {
        return {
          users: (
            await c.query(
              'SELECT m.*,u.name,u.email,u."twoFactorEnabled",(SELECT max(s.created_at) FROM boss_private.security_events s WHERE s.user_id=u.id) AS last_login FROM boss_private.members m JOIN boss_private."user" u ON u.id=m.user_id WHERE m.org_id=$1 ORDER BY u.name',
              [org],
            )
          ).rows,
          grants: (
            await c.query("SELECT * FROM boss_private.grants WHERE org_id=$1", [
              org,
            ])
          ).rows,
          invitations: (
            await c.query(
              "SELECT id,email,role,project_id,status,expires_at FROM boss_private.invitations WHERE org_id=$1",
              [org],
            )
          ).rows,
        };
      }
      if (id && method === "PATCH") {
        fresh(actor);
        const v = z
          .object({
            status: z.enum(["active", "suspended", "deactivated"]),
            job_title: z.string().max(120).default(""),
          })
          .parse(body);
        const member = (
          await c.query(
            "SELECT * FROM boss_private.members WHERE org_id=$1 AND user_id=$2",
            [org, id],
          )
        ).rows[0];
        if (!member) notFound();
        if (member.role === "owner" && v.status !== "active") {
          const owners = await c.query(
            "SELECT 1 FROM boss_private.members WHERE org_id=$1 AND role='owner' AND status='active'",
            [org],
          );
          if ((owners.rowCount ?? 0) <= 1)
            throw new DomainError(
              409,
              "O último proprietário habilitado deve ser preservado",
            );
        }
        if (id === actor.userId)
          throw new DomainError(
            409,
            "Não altere seu próprio vínculo administrativo",
          );
        await c.query(
          "UPDATE boss_private.members SET status=$3,job_title=$4 WHERE org_id=$1 AND user_id=$2",
          [org, id, v.status, v.job_title],
        );
        if (v.status !== "active")
          await c.query('DELETE FROM boss_private.session WHERE "userId"=$1', [
            id,
          ]);
        await audit(c, org, actor.userId, "member.updated", id, {
          status: v.status,
        });
        return { ok: true };
      }
    }
    if (resource === "grants" && method === "POST") {
      requireAdmin(admin);
      fresh(actor);
      const v = inviteSchema
        .omit({ email: true })
        .extend({
          user_id: z.string().min(1),
          status: z.enum(["active", "revoked"]).default("active"),
        })
        .parse(body);
      if (v.user_id === actor.userId) deny();
      await projectAccess(c, actor, org, v.project_id, admin);
      const target = (
        await c.query(
          "SELECT role FROM boss_private.members WHERE org_id=$1 AND user_id=$2 AND status='active'",
          [org, v.user_id],
        )
      ).rows[0];
      if (!target) notFound();
      if (target.role !== "member")
        throw new DomainError(
          409,
          "Vínculos globais não são alterados pela matriz de projeto",
        );
      await c.query(
        "INSERT INTO boss_private.grants(id,org_id,project_id,user_id,role,permissions,source,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(project_id,user_id) DO UPDATE SET role=excluded.role,permissions=excluded.permissions,status=excluded.status,source=excluded.source",
        [
          randomUUID(),
          org,
          v.project_id,
          v.user_id,
          v.role,
          JSON.stringify(v.permissions),
          `admin:${actor.userId}`,
          v.status,
        ],
      );
      await audit(c, org, actor.userId, "grant.changed", v.user_id, {
        project: v.project_id,
        role: v.role,
        permissions: v.permissions,
        status: v.status,
      });
      return { ok: true };
    }
    if (resource === "invitations") {
      requireAdmin(admin);
      fresh(actor);
      if (method === "POST" && !id) {
        const v = inviteSchema.parse(body);
        const p = await projectAccess(c, actor, org, v.project_id, admin);
        if (Object.keys(v.permissions).some((k) => !p.modules.includes(k)))
          throw new DomainError(400, "Área não habilitada no projeto");
        const token = randomBytes(32).toString("hex"),
          iid = randomUUID();
        await c.query(
          "INSERT INTO boss_private.invitations(id,org_id,project_id,email,role,permissions,token_hash,expires_at,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,now()+interval '48 hours',$8)",
          [
            iid,
            org,
            v.project_id,
            v.email,
            v.role,
            JSON.stringify(v.permissions),
            digest(token),
            actor.userId,
          ],
        );
        await deliver(
          v.email,
          "invitation",
          `${process.env.BETTER_AUTH_URL}/invite?token=${token}`,
        );
        await audit(c, org, actor.userId, "invitation.created", iid, {
          email: v.email,
        });
        return { id: iid, delivery: deliveryStatus() };
      }
      if (id) {
        idSchema.parse(id);
        const inv = (
          await c.query(
            "SELECT * FROM boss_private.invitations WHERE id=$1 AND org_id=$2 AND status='pending'",
            [id, org],
          )
        ).rows[0];
        if (!inv) notFound();
        if (method === "DELETE") {
          await c.query(
            "UPDATE boss_private.invitations SET status='cancelled' WHERE id=$1 AND org_id=$2",
            [id, org],
          );
          await audit(c, org, actor.userId, "invitation.cancelled", id);
          return { ok: true };
        }
        if (method === "POST") {
          const token = randomBytes(32).toString("hex");
          await c.query(
            "UPDATE boss_private.invitations SET token_hash=$3,registration_attempts=0,expires_at=now()+interval '48 hours' WHERE id=$1 AND org_id=$2",
            [id, org, digest(token)],
          );
          await deliver(
            inv.email,
            "invitation",
            `${process.env.BETTER_AUTH_URL}/invite?token=${token}`,
          );
          await audit(c, org, actor.userId, "invitation.resent", id);
          return { delivery: deliveryStatus() };
        }
      }
    }
    if (resource === "audit" && method === "GET") {
      requireAdmin(admin);
      return (
        await c.query(
          'SELECT a.*,u.name AS actor FROM boss_private.audit_logs a JOIN boss_private."user" u ON u.id=a.actor_id WHERE org_id=$1 ORDER BY a.created_at DESC LIMIT 100',
          [org],
        )
      ).rows;
    }
    throw new DomainError(404, "Operação indisponível");
  });
}
export const digest = (s: string) =>
  createHash("sha256").update(s).digest("hex");
export async function acceptInvitation(token: string, userId: string) {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const inv = (
      await c.query(
        "SELECT * FROM boss_private.invitations WHERE token_hash=$1 AND status='pending' AND expires_at>now() FOR UPDATE",
        [digest(token)],
      )
    ).rows[0];
    if (!inv) throw new DomainError(400, "Convite inválido ou expirado");
    await c.query(
      "SELECT id FROM boss_private.organizations WHERE id=$1 FOR UPDATE",
      [inv.org_id],
    );
    const u = (
      await c.query(
        'SELECT email,"emailVerified" FROM boss_private."user" WHERE id=$1',
        [userId],
      )
    ).rows[0];
    if (!u?.emailVerified || u.email.toLowerCase() !== inv.email) deny();
    const m = (
      await c.query(
        "SELECT status FROM boss_private.members WHERE org_id=$1 AND user_id=$2",
        [inv.org_id, userId],
      )
    ).rows[0];
    if (m && m.status !== "active") deny();
    const existing = await c.query(
      "SELECT 1 FROM boss_private.grants WHERE project_id=$1 AND user_id=$2",
      [inv.project_id, userId],
    );
    if (existing.rowCount)
      throw new DomainError(
        409,
        "Conflito de acesso: administrador deve revisar o vínculo existente",
      );
    await c.query(
      "INSERT INTO boss_private.members(id,org_id,user_id,role) VALUES($1,$2,$3,'member') ON CONFLICT(org_id,user_id) DO NOTHING",
      [randomUUID(), inv.org_id, userId],
    );
    await c.query(
      "INSERT INTO boss_private.grants(id,org_id,project_id,user_id,role,permissions,source) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [
        randomUUID(),
        inv.org_id,
        inv.project_id,
        userId,
        inv.role,
        JSON.stringify(inv.permissions),
        `invitation:${inv.id}`,
      ],
    );
    await c.query(
      "UPDATE boss_private.invitations SET status='accepted' WHERE id=$1",
      [inv.id],
    );
    await audit(c, inv.org_id, userId, "invitation.accepted", inv.id);
    await c.query("COMMIT");
    return { ok: true };
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
