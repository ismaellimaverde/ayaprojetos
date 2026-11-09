import type { PoolClient } from "pg";
// inOrg serializes writers on the organization row before checking this shared quota.
export async function projectAttachmentBytes(
  c: PoolClient,
  org: string,
  project: string,
) {
  return Number(
    (
      await c.query(
        `SELECT
    (SELECT coalesce(sum(octet_length(attachment)),0) FROM boss_private.project_sources WHERE org_id=$1 AND project_id=$2) +
    (SELECT coalesce(sum(octet_length(attachment)),0) FROM boss_private.library_files WHERE org_id=$1 AND project_id=$2) AS bytes`,
        [org, project],
      )
    ).rows[0].bytes,
  );
}
export const PROJECT_ATTACHMENT_LIMIT = 50 * 1024 * 1024;
