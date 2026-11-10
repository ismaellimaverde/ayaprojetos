import { AREA_DOCUMENT_KEY, areaDocument } from "./planning-document";
import { parseSummary } from "./rich-summary";
import { z } from "zod";
import { documentText, fieldDocument, itemDocument } from "./rich-fields";
import { summaryFromLegacy } from "./rich-summary";
import type { ModuleDocument } from "./module-fields";
export { SOURCE_LIMIT } from "./file-size";
export const sourceInput = z
  .object({
    id: z.uuid(),
    name: z.string().trim().min(1).max(160),
    kind: z.enum(["image", "audio", "pdf", "link", "book"]),
    origin: z.string().max(1000).default(""),
    note: z.string().max(4000).default(""),
    url: z.string().max(2000).default(""),
    filename: z.string().max(200).default(""),
    mime: z.string().max(100).default(""),
    data: z.string().max(2796204).optional(),
  })
  .strict();
export type SourceSelection = { field: string; quote: string };
export type SourceLink = SourceSelection & {
  id: string;
  source_id: string;
  area: string;
  status?: string;
};
export type ProjectSource = {
  id: string;
  name: string;
  kind: string;
  origin: string;
  note: string;
  url: string;
  filename: string;
  mime: string;
  area?: string;
  created_at: string;
  links: SourceLink[];
};
export function fieldText(
  document: ModuleDocument | null,
  field: string,
  area?: string,
) {
  if (!document) return "";
  if (document.fields[AREA_DOCUMENT_KEY] && field)
    return documentText(parseSummary(document.fields[AREA_DOCUMENT_KEY]));
  if (field === "document")
    return area ? documentText(areaDocument(area, document)) : "";
  if (field === "executive")
    return documentText(summaryFromLegacy(document.fields, document.items));
  if (field.startsWith("item:")) {
    const item = document.items.find(
      (i) => i.id === field.slice(5) && !i.archived,
    );
    return item ? documentText(itemDocument(item)) : "";
  }
  return documentText(fieldDocument(document.fields, field));
}
export function quoteState(text: string, quote: string) {
  if (!quote) return "Referência geral";
  const at = text.indexOf(quote);
  if (at < 0) return "Trecho alterado, removido ou ainda não salvo";
  if (text.indexOf(quote, at + 1) >= 0)
    return "Trecho repetido: confira o vínculo";
  return "Trecho localizado";
}
