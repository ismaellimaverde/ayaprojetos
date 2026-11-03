import { modules } from "./catalog";
import { moduleFields, type ModuleDocument } from "./module-fields";
import { summaryFromLegacy, type SummaryDocument } from "./rich-summary";
export function areaDocument(
  area: string,
  document: ModuleDocument,
): SummaryDocument {
  if (area === "executive")
    return summaryFromLegacy(document.fields, document.items);
  const content: SummaryDocument["content"] = [];
  const text = (value: string) =>
    value.split("\n").map((line) => ({
      type: "paragraph" as const,
      ...(line ? { content: [{ type: "text" as const, text: line }] } : {}),
    }));
  const label = (value: string): SummaryDocument["content"][number] => ({
    type: "paragraph",
    content: [{ type: "text", text: value, marks: [{ type: "bold" }] }],
  });
  for (const field of moduleFields[area] ?? [])
    if (document.fields[field.id]?.trim())
      content.push(label(field.label), ...text(document.fields[field.id]));
  for (const item of document.items) {
    content.push(
      label(`${item.archived ? "Arquivado — " : ""}${item.title}`),
      ...text(item.text),
    );
    for (const [key, value] of [
      ["Fonte", item.source],
      ["Período", item.period],
      ["Responsável", item.responsible],
    ])
      if (value) content.push(...text(`${key}: ${value}`));
  }
  return {
    type: "doc",
    content: content.length ? content : [{ type: "paragraph" }],
  };
}
export function hasPlanningContent(
  area: string,
  document: ModuleDocument,
): boolean {
  return areaDocument(area, document).content.some((block) =>
    block.content?.some((n) => n.type === "text" && n.text.trim()),
  );
}
export type LibraryDocument = {
  area: string;
  revision: number;
  updated_at: string;
  author_name: string;
  can_export: boolean;
  document?: ModuleDocument;
};
export function consolidatedDocument(
  documents: LibraryDocument[],
): SummaryDocument {
  const content: SummaryDocument["content"] = [];
  for (const entry of documents) {
    if (!entry.document) continue;
    content.push({
      type: "heading",
      attrs: { level: 1 },
      content: [
        {
          type: "text",
          text: modules.find((m) => m.id === entry.area)?.name ?? entry.area,
        },
      ],
    });
    content.push({
      type: "paragraph",
      content: [
        {
          type: "text",
          text: `Revisão ${entry.revision} · ${entry.author_name} · ${new Date(entry.updated_at).toLocaleDateString("pt-BR")}`,
        },
      ],
    });
    // Keep the main area heading as H1 and use bold subheadings in the consolidation.
    for (const block of areaDocument(entry.area, entry.document).content) {
      content.push(
        block.type === "heading"
          ? {
              type: "paragraph",
              attrs: { textAlign: block.attrs.textAlign },
              content: block.content?.map((n) =>
                n.type === "text"
                  ? {
                      ...n,
                      marks: [
                        ...(n.marks ?? []).filter((m) => m.type !== "bold"),
                        { type: "bold" },
                      ],
                    }
                  : n,
              ),
            }
          : block,
      );
    }
  }
  return {
    type: "doc",
    content: content.length ? content : [{ type: "paragraph" }],
  };
}
