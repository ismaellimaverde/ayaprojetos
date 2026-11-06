import { test } from "node:test";
import assert from "node:assert/strict";
import { quoteState, fieldText } from "../src/lib/source-model";
import { textDocument } from "../src/lib/rich-fields";
import { areaDocument } from "../src/lib/planning-document";
import { textPositions } from "../src/lib/source-decorations";
import { Schema } from "@tiptap/pm/model";
test("source anchors flag changed, removed and repeated quotes without leaking into document export", () => {
  assert.equal(quoteState("Antes frase depois", "frase"), "Trecho localizado");
  assert.match(quoteState("frase frase", "frase"), /repetido/);
  assert.match(quoteState("", "frase"), /alterado, removido/);
  assert.equal(quoteState("", ""), "Referência geral");
  const doc = {
    revision: 1,
    fields: {
      summary_rich_v1: JSON.stringify(
        textDocument("Uma frase\nOutro parágrafo"),
      ),
    },
    items: [],
  };
  assert.equal(fieldText(doc, "executive"), "Uma frase\nOutro parágrafo");
  assert.ok(!JSON.stringify(areaDocument("executive", doc)).includes("source"));
  const schema = new Schema({
    nodes: {
      doc: { content: "paragraph+" },
      paragraph: { content: "text*" },
      text: {},
    },
  });
  const pm = schema.nodeFromJSON(textDocument("Uma frase\nOutro parágrafo"));
  const mapped = textPositions(pm);
  assert.equal(mapped.text, "Uma frase\nOutro parágrafo");
  const at = mapped.text.indexOf("frase\nOutro");
  assert.equal(
    pm.textBetween(mapped.positions[at], mapped.positions[at + 10] + 1, "\n"),
    "frase\nOutro",
  );
});
