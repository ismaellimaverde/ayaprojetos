import { z } from "zod";
import { moduleFields, type ModuleItem } from "./module-fields";

export const SUMMARY_KEY = "summary_rich_v1";
export const summaryFonts = ["Arial", "Georgia", "Courier New"] as const;
export function safeLink(value: string): boolean {
  if (value !== value.trim() || /[\u0000-\u0020\u007f]/.test(value))
    return false;
  try {
    const url = new URL(value);
    return ["https:", "http:", "mailto:"].includes(url.protocol);
  } catch {
    return false;
  }
}
const mark = z.union([
  z.object({ type: z.enum(["bold", "italic"]) }).strict(),
  z
    .object({
      type: z.literal("textStyle"),
      attrs: z.object({ fontFamily: z.enum(summaryFonts) }).strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal("link"),
      attrs: z
        .object({
          href: z.string().max(2000).refine(safeLink),
          target: z.enum(["_blank", "_self"]).nullable().optional(),
          rel: z.string().max(100).nullable().optional(),
          class: z.null().optional(),
          title: z.string().max(500).nullable().optional(),
        })
        .strict(),
    })
    .strict(),
]);
const inline = z.union([
  z
    .object({
      type: z.literal("text"),
      text: z.string().max(500000),
      marks: z.array(mark).max(4).optional(),
    })
    .strict(),
  z.object({ type: z.literal("hardBreak") }).strict(),
]);
const block = z.union([
  z
    .object({
      type: z.literal("paragraph"),
      content: z.array(inline).max(10000).optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("heading"),
      attrs: z.object({ level: z.literal(1) }).strict(),
      content: z.array(inline).max(10000).optional(),
    })
    .strict(),
]);
export const summarySchema = z
  .object({ type: z.literal("doc"), content: z.array(block).min(1).max(3000) })
  .strict()
  .refine(
    (d) => JSON.stringify(d).length <= 1000000,
    "Texto excede o limite do editor",
  );
export type SummaryDocument = z.infer<typeof summarySchema>;
export function parseSummary(value: string): SummaryDocument {
  return summarySchema.parse(JSON.parse(value));
}
const paragraph = (text: string): SummaryDocument["content"][number] => ({
  type: "paragraph",
  ...(text ? { content: [{ type: "text", text }] } : {}),
});
// Read conversion only: original fields/items remain stored, and are never deleted by a rich save.
export function summaryFromLegacy(
  fields: Record<string, string>,
  items: ModuleItem[],
): SummaryDocument {
  if (fields[SUMMARY_KEY]) return parseSummary(fields[SUMMARY_KEY]);
  const content: SummaryDocument["content"] = [];
  for (const field of moduleFields.executive) {
    if (fields[field.id])
      content.push(
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: field.label }],
        },
        ...fields[field.id].split("\n").map(paragraph),
      );
  }
  for (const item of items) {
    content.push(
      {
        type: "heading",
        attrs: { level: 1 },
        content: [
          {
            type: "text",
            text: `${item.archived ? "Arquivado — " : ""}${item.title}`,
          },
        ],
      },
      ...item.text.split("\n").map(paragraph),
    );
    for (const [label, value] of [
      ["Fonte", item.source],
      ["Período", item.period],
      ["Responsável", item.responsible],
    ])
      if (value) content.push(paragraph(`${label}: ${value}`));
  }
  return { type: "doc", content: content.length ? content : [paragraph("")] };
}
