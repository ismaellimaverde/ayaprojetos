import { test } from "node:test";
import assert from "node:assert/strict";
import {
  textDocument,
  documentText,
  fieldDocument,
  richFieldKey,
  parseRichField,
} from "../src/lib/rich-fields";
import {
  areaDocument,
  consolidatedDocument,
} from "../src/lib/planning-document";
test("separate rich fields preserve literal legacy content and document ordering", () => {
  const original = {
    purpose: "<img src=x onerror=alert(1)>\nSegunda linha",
    mission: "Missão original",
  };
  const fields = {
    ...original,
    [richFieldKey("mission")]: JSON.stringify({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [
            {
              type: "text",
              text: "Missão formatada",
              marks: [{ type: "italic" }],
            },
          ],
        },
      ],
    }),
  };
  assert.equal(
    documentText(fieldDocument(fields, "purpose")),
    original.purpose,
  );
  assert.equal(documentText(textDocument("a\n\nb")), "a\n\nb");
  const doc = { revision: 2, fields, items: [] };
  const rendered = areaDocument("dna", doc);
  assert.match(JSON.stringify(rendered), /Missão formatada/);
  assert.match(JSON.stringify(rendered), /italic/);
  assert.match(JSON.stringify(rendered), /<img/);
  const full = consolidatedDocument([
    {
      area: "dna",
      revision: 2,
      updated_at: "2026-11-04",
      author_name: "Teste",
      can_export: true,
      document: doc,
    },
  ]);
  assert.match(documentText(full), /Segunda linha/);
  assert.equal(original.mission, "Missão original");
  assert.throws(() =>
    parseRichField(JSON.stringify(textDocument("x".repeat(10001)))),
  );
  assert.throws(() =>
    parseRichField('{"type":"doc","content":[{"type":"script"}]}'),
  );
});
