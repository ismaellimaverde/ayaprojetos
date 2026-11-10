/** Only server-validated upload MIME is authoritative. External links are not fetched. */
export function libraryFileType(file: { url: string; mime?: string }): string {
  if (file.url) return "Link";
  const names: Record<string, string> = {
    "application/pdf": "PDF",
    "image/png": "PNG",
    "image/jpeg": "JPEG",
    "image/gif": "GIF",
    "image/webp": "WebP",
    "application/msword": "DOC",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "DOCX",
    "application/vnd.ms-excel": "XLS",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  };
  return names[file.mime || ""] || "Arquivo";
}
