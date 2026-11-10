// Limits remain binary byte counts; display units are decimal MB (1,000,000 bytes).
export const SOURCE_LIMIT = 2 * 1024 * 1024;
export const PROJECT_ATTACHMENT_LIMIT = 50 * 1024 * 1024;
export function formatFileMB(bytes: number): string {
  return `${(bytes / 1_000_000).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MB`;
}
export function fileLimitLabel(bytes: number): string {
  return `aprox. ${formatFileMB(bytes)} (${bytes.toLocaleString("pt-BR")} bytes)`;
}
