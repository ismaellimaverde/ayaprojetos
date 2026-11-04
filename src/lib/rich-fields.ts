import { parseSummary, type SummaryDocument } from "./rich-summary";

export const richFieldKey = (id: string) => `rich_field_v1:${id}`;
export function textDocument(text: string): SummaryDocument {
  return {
    type: "doc",
    content: text.split("\n").map((line) => ({
      type: "paragraph",
      ...(line ? { content: [{ type: "text", text: line }] } : {}),
    })),
  };
}
export function documentText(doc: SummaryDocument): string {
  return doc.content
    .map((block) =>
      (block.content ?? [])
        .map((node) => (node.type === "text" ? node.text : "\n"))
        .join(""),
    )
    .join("\n");
}
export function parseRichField(value: string): SummaryDocument {
  const doc = parseSummary(value);
  if (documentText(doc).length > 10000)
    throw new Error("Campo excede 10.000 caracteres");
  return doc;
}
export function fieldDocument(
  fields: Record<string, string>,
  id: string,
): SummaryDocument {
  return fields[richFieldKey(id)]
    ? parseRichField(fields[richFieldKey(id)])
    : textDocument(fields[id] ?? "");
}
export function itemDocument(item: {
  text: string;
  rich_text_v1?: string;
}): SummaryDocument {
  return item.rich_text_v1
    ? parseRichField(item.rich_text_v1)
    : textDocument(item.text);
}
