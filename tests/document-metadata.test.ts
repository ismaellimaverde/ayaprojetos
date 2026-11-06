import { test } from "node:test";
import assert from "node:assert/strict";
import { updatedAtLabel } from "../src/lib/document-metadata";
test("document timestamp uses recorded date/time and does not invent missing metadata", () => {
  assert.equal(updatedAtLabel(undefined), "Última atualização: não informada");
  assert.equal(updatedAtLabel("invalid"), "Última atualização: não informada");
  const date = "2026-11-04T12:34:56Z";
  assert.equal(
    updatedAtLabel(date),
    `Última atualização: ${new Date(date).toLocaleString("pt-BR")}`,
  );
});
