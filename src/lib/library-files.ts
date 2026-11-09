import type { PoolClient } from "pg";
import { z } from "zod";
import { projectAccess, DomainError, audit, type Actor } from "./domain";
import { validateSourceAttachment } from "./source-domain";
import {
  projectAttachmentBytes,
  PROJECT_ATTACHMENT_LIMIT,
} from "./project-attachments";
const name = z.string().trim().min(1).max(160);
const itemInput = z
  .object({
    id: z.uuid(),
    folder_id: z.uuid(),
    name,
    category: z.enum(["image", "video", "document"]),
    url: z.string().max(2000).default(""),
    filename: z.string().max(200).default(""),
    mime: z.string().max(100).default(""),
    data: z.string().max(2796204).optional(),
  })
  .strict();
function httpsLink(value: string) {
  try {
    const u = new URL(value);
    if (
      value !== value.trim() ||
      /[\u0000-\u0020\u007f]/.test(value) ||
      u.protocol !== "https:" ||
      u.username ||
      u.password
    )
      throw new Error();
    return u.toString();
  } catch {
    throw new DomainError(400, "Informe um link HTTPS sem credenciais");
  }
}
export async function libraryFiles(
  c: PoolClient,
  actor: Actor,
  org: string,
  admin: boolean,
  method: string,
  path: string[],
  body: unknown,
) {
  const [, projectId, action, target] = path;
  const project = await projectAccess(c, actor, org, projectId, admin);
  const visible: string[] = project.modules;
  const can = (area: string, permission: string) =>
    visible.includes(area) && project.permissions[area]?.includes(permission);
  const writing = (area: string, permission: string) => {
    if (project.status !== "active" || !can(area, permission))
      throw new DomainError(
        403,
        "Sem permissão para alterar arquivos nesta área",
      );
  };
  const folder = async (id: string) => {
    const row = (
      await c.query(
        "SELECT id,name,area FROM boss_private.library_folders WHERE id=$1 AND org_id=$2 AND project_id=$3 AND area=ANY($4::text[])",
        [id, org, projectId, visible],
      )
    ).rows[0];
    if (!row) throw new DomainError(404, "Pasta indisponível");
    return row;
  };
  if (method === "GET" && (!action || action === "trash")) {
    const folders = (
      await c.query(
        "SELECT id,name,area FROM boss_private.library_folders WHERE org_id=$1 AND project_id=$2 AND area=ANY($3::text[]) ORDER BY lower(name),id",
        [org, projectId, visible],
      )
    ).rows;
    const files = (
      await c.query(
        "SELECT id,folder_id,area,name,category,url,filename,mime,octet_length(attachment) AS bytes,updated_at,deleted_at FROM boss_private.library_files WHERE org_id=$1 AND project_id=$2 AND area=ANY($3::text[]) AND (deleted_at IS NOT NULL)=$4 ORDER BY lower(name),id",
        [
          org,
          projectId,
          action === "trash"
            ? visible.filter((a) => can(a, "delete"))
            : visible,
          action === "trash",
        ],
      )
    ).rows;
    return {
      folders,
      files: files.map((f) => ({
        ...f,
        can_edit: project.status === "active" && !!can(f.area, "edit"),
        can_download: !f.deleted_at && !!can(f.area, "export"),
        can_delete: project.status === "active" && !!can(f.area, "delete"),
      })),
      areas: visible.map((area) => ({
        id: area,
        can_create: project.status === "active" && !!can(area, "create"),
        can_edit: project.status === "active" && !!can(area, "edit"),
      })),
    };
  }
  if (action === "folders" && method === "POST" && !target) {
    const v = z
      .object({ id: z.uuid(), name: name.max(120), area: z.string().max(80) })
      .strict()
      .parse(body);
    writing(v.area, "create");
    const old = (
      await c.query(
        "SELECT id FROM boss_private.library_folders WHERE id=$1 AND org_id=$2 AND project_id=$3 AND area=$4 AND created_by=$5",
        [v.id, org, projectId, v.area, actor.userId],
      )
    ).rows[0];
    if (old) return old;
    if (
      Number(
        (
          await c.query(
            "SELECT count(*) FROM boss_private.library_folders WHERE org_id=$1 AND project_id=$2",
            [org, projectId],
          )
        ).rows[0].count,
      ) >= 50
    )
      throw new DomainError(409, "Limite de 50 pastas por projeto");
    await c.query(
      "INSERT INTO boss_private.library_folders(id,org_id,project_id,area,name,created_by) VALUES($1,$2,$3,$4,$5,$6)",
      [v.id, org, projectId, v.area, v.name, actor.userId],
    );
    await audit(c, org, actor.userId, "library.folder.created", v.id, {
      project_id: projectId,
      area: v.area,
    });
    return { id: v.id };
  }
  if (action === "items" && method === "POST" && !target) {
    const v = itemInput.parse(body),
      group = await folder(v.folder_id);
    writing(group.area, "create");
    let bytes: Buffer | null = null,
      url = "";
    if (v.data !== undefined) {
      if (v.category === "video" || v.url)
        throw new DomainError(
          400,
          "Vídeos somente por link; escolha link ou upload",
        );
      bytes = validateSourceAttachment({
        ...v,
        kind: v.category === "image" ? "image" : "pdf",
        origin: "",
        note: "",
      });
    } else {
      url = httpsLink(v.url);
      if (v.mime || v.filename)
        throw new DomainError(400, "Metadados de anexo sem upload");
    }
    const old = (
      await c.query(
        "SELECT id FROM boss_private.library_files WHERE id=$1 AND org_id=$2 AND project_id=$3 AND area=$4 AND created_by=$5",
        [v.id, org, projectId, group.area, actor.userId],
      )
    ).rows[0];
    if (old) return old;
    const count = Number(
      (
        await c.query(
          "SELECT count(*) FROM boss_private.library_files WHERE org_id=$1 AND project_id=$2",
          [org, projectId],
        )
      ).rows[0].count,
    );
    if (
      count >= 200 ||
      (bytes !== null &&
        (await projectAttachmentBytes(c, org, projectId)) + bytes.length >
          PROJECT_ATTACHMENT_LIMIT)
    )
      throw new DomainError(
        409,
        "Limite: 200 arquivos e 50 MB de anexos por projeto, incluindo Fontes",
      );
    await c.query(
      "INSERT INTO boss_private.library_files(id,org_id,project_id,folder_id,area,name,category,url,filename,mime,attachment,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)",
      [
        v.id,
        org,
        projectId,
        group.id,
        group.area,
        v.name,
        v.category,
        url,
        v.filename,
        v.mime,
        bytes,
        actor.userId,
      ],
    );
    await audit(c, org, actor.userId, "library.file.created", v.id, {
      project_id: projectId,
      area: group.area,
    });
    return { id: v.id };
  }
  if (
    (action === "items" && method === "DELETE") ||
    (action === "restore" && method === "POST")
  ) {
    z.uuid().parse(target);
    const row = (
      await c.query(
        "SELECT id,area,deleted_at FROM boss_private.library_files WHERE id=$1 AND org_id=$2 AND project_id=$3 AND area=ANY($4::text[])",
        [target, org, projectId, visible],
      )
    ).rows[0];
    if (!row) throw new DomainError(404, "Arquivo indisponível");
    writing(row.area, "delete");
    const removing = method === "DELETE";
    if (Boolean(row.deleted_at) === removing) return { ok: true };
    await c.query(
      "UPDATE boss_private.library_files SET deleted_at=$1,deleted_by=$2,updated_at=now() WHERE id=$3 AND org_id=$4 AND project_id=$5",
      [
        removing ? new Date() : null,
        removing ? actor.userId : null,
        target,
        org,
        projectId,
      ],
    );
    await audit(
      c,
      org,
      actor.userId,
      removing ? "library.file.trashed" : "library.file.restored",
      target,
      { project_id: projectId, area: row.area },
    );
    return { ok: true };
  }
  if (
    (action === "file" && method === "GET") ||
    (action === "items" && method === "PATCH")
  ) {
    z.uuid().parse(target);
    const row = (
      await c.query(
        "SELECT id,area FROM boss_private.library_files WHERE id=$1 AND org_id=$2 AND project_id=$3 AND area=ANY($4::text[]) AND deleted_at IS NULL",
        [target, org, projectId, visible],
      )
    ).rows[0];
    if (!row) throw new DomainError(404, "Arquivo indisponível");
    if (method === "GET") {
      if (!can(row.area, "export"))
        throw new DomainError(
          403,
          "Sem permissão para baixar arquivos desta área",
        );
      const file = (
        await c.query(
          "SELECT attachment,mime FROM boss_private.library_files WHERE id=$1 AND org_id=$2 AND project_id=$3",
          [target, org, projectId],
        )
      ).rows[0];
      if (!file.attachment)
        throw new DomainError(404, "Este registro contém apenas um link");
      return {
        privateFile: file.attachment as Buffer,
        mime: file.mime as string,
      };
    }
    writing(row.area, "edit");
    const v = z.object({ name, folder_id: z.uuid() }).strict().parse(body),
      group = await folder(v.folder_id);
    if (group.area !== row.area)
      throw new DomainError(
        400,
        "Mova somente entre pastas da mesma área para preservar o acesso",
      );
    await c.query(
      "UPDATE boss_private.library_files SET name=$1,folder_id=$2,updated_at=now() WHERE id=$3 AND org_id=$4 AND project_id=$5",
      [v.name, group.id, target, org, projectId],
    );
    await audit(c, org, actor.userId, "library.file.organized", target, {
      project_id: projectId,
      area: row.area,
    });
    return { ok: true };
  }
  throw new DomainError(405, "Operação não permitida");
}
