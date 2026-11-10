import { fileLimitLabel } from "./file-size";
import {
  projectAttachmentBytes,
  PROJECT_ATTACHMENT_LIMIT,
} from "./project-attachments";
import type { PoolClient } from "pg";
import {
  digest,
  DomainError,
  projectAccess,
  audit,
  type Actor,
} from "./domain";
import {
  sourceInput,
  SOURCE_LIMIT,
  fieldText,
  quoteState,
} from "./source-model";
import { moduleFields } from "./module-fields";
import { z } from "zod";
export function validateSourceAttachment(v: z.infer<typeof sourceInput>) {
  if (["book", "link"].includes(v.kind)) {
    if (v.data)
      throw new DomainError(400, "Tipo de fonte incompatível com anexo");
    if (v.kind === "link") {
      let u: URL;
      try {
        u = new URL(v.url);
      } catch {
        throw new DomainError(400, "Link inválido");
      }
      if (!["http:", "https:"].includes(u.protocol) || u.username || u.password)
        throw new DomainError(400, "Link inválido");
    }
    return null;
  }
  if (!v.data || !/^[A-Za-z0-9+/]+={0,2}$/.test(v.data))
    throw new DomainError(400, "Anexo inválido");
  const b = Buffer.from(v.data, "base64");
  if (b.length > SOURCE_LIMIT || b.toString("base64") !== v.data)
    throw new DomainError(
      400,
      `Anexo excede ${fileLimitLabel(SOURCE_LIMIT)} ou é inválido`,
    );
  const hex = b.subarray(0, 12).toString("hex"),
    ascii = b.subarray(0, 12).toString("ascii");
  const valid: Record<string, boolean> = {
    "image/png": hex.startsWith("89504e470d0a1a0a"),
    "image/jpeg": hex.startsWith("ffd8ff"),
    "image/gif": ascii.startsWith("GIF87a") || ascii.startsWith("GIF89a"),
    "image/webp": ascii.startsWith("RIFF") && ascii.endsWith("WEBP"),
    "application/pdf": ascii.startsWith("%PDF-"),
    "audio/mpeg":
      ascii.startsWith("ID3") || (b[0] === 255 && (b[1] & 224) === 224),
    "audio/wav": ascii.startsWith("RIFF") && ascii.endsWith("WAVE"),
    "audio/ogg": ascii.startsWith("OggS"),
    "audio/webm": hex.startsWith("1a45dfa3"),
    "audio/mp4": ascii.slice(4, 8) === "ftyp",
  };
  if (
    !valid[v.mime] ||
    (v.kind === "image" && !v.mime.startsWith("image/")) ||
    (v.kind === "audio" && !v.mime.startsWith("audio/")) ||
    (v.kind === "pdf" && v.mime !== "application/pdf")
  )
    throw new DomainError(400, "Formato do anexo não permitido");
  return b;
}
export async function sources(
  c: PoolClient,
  actor: Actor,
  org: string,
  admin: boolean,
  method: string,
  path: string[],
  body: unknown,
) {
  const [, projectId, area, action, target] = path;
  if (!Object.hasOwn(moduleFields, area ?? ""))
    throw new DomainError(404, "Área indisponível");
  const project = await projectAccess(c, actor, org, projectId, admin, area);
  const areas: string[] = project.modules;
  const writable =
    project.status === "active" &&
    ["edit", "create"].some((p) => project.permissions[area]?.includes(p));
  if (method !== "GET" && !writable)
    throw new DomainError(403, "Sem permissão para alterar fontes");
  const visible = `(s.area=ANY($3::text[]) OR EXISTS(SELECT 1 FROM boss_private.source_links l WHERE l.source_id=s.id AND l.org_id=s.org_id AND l.project_id=s.project_id AND l.area=ANY($3::text[])))`;
  if (method === "GET" && !action) {
    const rows = (
      await c.query(
        `SELECT s.id,s.area,s.name,s.kind,s.origin,s.note,s.url,s.filename,s.mime,s.created_at FROM boss_private.project_sources s WHERE s.org_id=$1 AND s.project_id=$2 AND ${visible} ORDER BY s.created_at DESC`,
        [org, projectId, areas],
      )
    ).rows;
    const links = (
      await c.query(
        "SELECT id,source_id,area,field,quote FROM boss_private.source_links WHERE org_id=$1 AND project_id=$2 AND area=ANY($3::text[])",
        [org, projectId, areas],
      )
    ).rows;
    const docs = (
      await c.query(
        "SELECT area,fields,items FROM boss_private.module_content WHERE org_id=$1 AND project_id=$2 AND area=ANY($3::text[])",
        [org, projectId, areas],
      )
    ).rows;
    return {
      writable,
      canRemove: writable && project.permissions[area]?.includes("delete"),
      sources: rows.map((s) => ({
        ...s,
        area: areas.includes(s.area) ? s.area : undefined,
        links: links
          .filter((l) => l.source_id === s.id)
          .map((l) => ({
            ...l,
            status: quoteState(
              fieldText(
                docs.find((d) => d.area === l.area) ?? null,
                l.field,
                l.area,
              ),
              l.quote,
            ),
          })),
      })),
    };
  }
  if (method === "POST" && !action) {
    const v = sourceInput.parse(body);
    const bytes = validateSourceAttachment(v);
    const existing = (
      await c.query(
        "SELECT id FROM boss_private.project_sources WHERE id=$1 AND org_id=$2 AND project_id=$3 AND created_by=$4 AND area=$5",
        [v.id, org, projectId, actor.userId, area],
      )
    ).rows[0];
    if (existing) return existing;
    const usage = (
      await c.query(
        "SELECT count(*)::int AS count FROM boss_private.project_sources WHERE org_id=$1 AND project_id=$2",
        [org, projectId],
      )
    ).rows[0];
    if (
      usage.count >= 100 ||
      (bytes !== null &&
        (await projectAttachmentBytes(c, org, projectId)) + bytes.length >
          PROJECT_ATTACHMENT_LIMIT)
    )
      throw new DomainError(
        409,
        `Limite do projeto: 100 fontes e ${fileLimitLabel(PROJECT_ATTACHMENT_LIMIT)} de anexos, incluindo a Biblioteca`,
      );
    await c.query(
      `INSERT INTO boss_private.project_sources(id,org_id,project_id,area,name,kind,origin,note,url,filename,mime,attachment,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        v.id,
        org,
        projectId,
        area,
        v.name,
        v.kind,
        v.origin,
        v.note,
        v.url,
        v.filename,
        v.mime,
        bytes,
        actor.userId,
      ],
    );
    await audit(c, org, actor.userId, "source.created", v.id, {
      project_id: projectId,
      area,
    });
    return { id: v.id };
  }
  if (action === "file" && method === "GET") {
    z.uuid().parse(target);
    const row = (
      await c.query(
        `SELECT s.attachment,s.mime FROM boss_private.project_sources s WHERE s.org_id=$1 AND s.project_id=$2 AND ${visible} AND s.id=$4`,
        [org, projectId, areas, target],
      )
    ).rows[0];
    if (!row?.attachment) throw new DomainError(404, "Anexo indisponível");
    return { privateFile: row.attachment as Buffer, mime: row.mime as string };
  }
  if (action === "links" && method === "POST") {
    const v = z
      .object({
        id: z.uuid(),
        source_id: z.uuid(),
        field: z.string().max(100).default(""),
        quote: z.string().trim().max(2000).default(""),
      })
      .strict()
      .parse(body);
    if (
      !!v.field !== !!v.quote ||
      (v.field &&
        !(v.field === "executive" && area === "executive") &&
        !(v.field === "document" && area !== "executive") &&
        !moduleFields[area].some((f) => f.id === v.field) &&
        !/^item:[a-f0-9-]{36}$/.test(v.field))
    )
      throw new DomainError(400, "Trecho inválido");
    const found = (
      await c.query(
        `SELECT s.id FROM boss_private.project_sources s WHERE s.org_id=$1 AND s.project_id=$2 AND ${visible} AND s.id=$4`,
        [org, projectId, areas, v.source_id],
      )
    ).rowCount;
    if (!found) throw new DomainError(404, "Fonte indisponível");
    const count = (
      await c.query(
        "SELECT count(*)::int AS count FROM boss_private.source_links WHERE org_id=$1 AND project_id=$2",
        [org, projectId],
      )
    ).rows[0].count;
    if (count >= 500)
      throw new DomainError(409, "Limite de vínculos do projeto atingido");
    await c.query(
      `INSERT INTO boss_private.source_links(id,org_id,project_id,source_id,area,field,quote,quote_hash,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING`,
      [
        v.id,
        org,
        projectId,
        v.source_id,
        area,
        v.field,
        v.quote,
        digest(v.quote),
        actor.userId,
      ],
    );
    await audit(c, org, actor.userId, "source.linked", v.source_id, {
      project_id: projectId,
      area,
    });
    return { ok: true };
  }
  if (action === "links" && method === "DELETE") {
    if (!project.permissions[area]?.includes("delete"))
      throw new DomainError(403, "Sem permissão para remover vínculo");
    z.uuid().parse(target);
    await c.query(
      "DELETE FROM boss_private.source_links WHERE id=$1 AND org_id=$2 AND project_id=$3 AND area=$4",
      [target, org, projectId, area],
    );
    await audit(c, org, actor.userId, "source.unlinked", target, {
      project_id: projectId,
      area,
    });
    return { ok: true };
  }
  throw new DomainError(405, "Operação não permitida");
}
