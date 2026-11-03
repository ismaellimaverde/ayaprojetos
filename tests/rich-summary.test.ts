import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseSummary,
  safeLink,
  summaryFromLegacy,
  SUMMARY_KEY,
} from "../src/lib/rich-summary";
test("rich summary validates only bounded document nodes, safe links and known fonts", () => {
  const doc = {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 1 },
        content: [
          {
            type: "text",
            text: "<script>literal</script>",
            marks: [
              { type: "bold" },
              { type: "link", attrs: { href: "https://example.com" } },
            ],
          },
        ],
      },
    ],
  };
  assert.deepEqual(parseSummary(JSON.stringify(doc)), doc);
  for (const href of [
    "javascript:alert(1)",
    "data:text/html,hi",
    "//evil.example",
    " javaScript:alert(1)",
    "java\nscript:alert(1)",
  ]) {
    assert.equal(safeLink(href), false);
    const invalid = structuredClone(doc);
    invalid.content[0].content[0].marks[1].attrs = { href };
    assert.throws(() => parseSummary(JSON.stringify(invalid)));
  }
  for (const invalid of [
    { type: "doc", content: [{ type: "script" }] },
    {
      type: "doc",
      content: [{ type: "paragraph", attrs: { onclick: "alert(1)" } }],
    },
    {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "x",
              marks: [
                {
                  type: "textStyle",
                  attrs: { fontFamily: "url(https://evil)" },
                },
              ],
            },
          ],
        },
      ],
    },
  ])
    assert.throws(() => parseSummary(JSON.stringify(invalid)));
});
test("legacy fields and archived items are converted as literal text without mutation", () => {
  const fields = {
    business: "Negócio <img src=x onerror=alert(1)>",
    problem: "Linha 1\nLinha 2",
  };
  const items = [
    {
      id: "sample",
      title: "Evidência",
      text: "Nota",
      source: "Fonte",
      period: "2026",
      responsible: "Equipe",
      archived: true,
    },
  ];
  const before = JSON.stringify({ fields, items });
  const doc = summaryFromLegacy(fields, items);
  assert.equal(JSON.stringify({ fields, items }), before);
  for (const value of [
    "Negócio",
    "<img",
    "Linha 2",
    "Arquivado",
    "Fonte",
    "Equipe",
  ])
    assert.ok(JSON.stringify(doc).includes(value));
  assert.deepEqual(
    summaryFromLegacy({ ...fields, [SUMMARY_KEY]: JSON.stringify(doc) }, items),
    doc,
  );
});
