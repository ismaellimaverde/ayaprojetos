import test from "node:test";
import assert from "node:assert/strict";
import { matchesFileName } from "../src/lib/file-search";
test("instant file search is a normalized substring with empty and accented queries", () => {
  assert.equal(
    matchesFileName("Orçamento São João.pdf", "ORCAMENTO SAO"),
    true,
  );
  assert.equal(matchesFileName("Relatorio.pdf", "RELATÓRIO"), true);
  assert.equal(matchesFileName("imagem.png", "  "), true);
  assert.equal(matchesFileName("imagem.png", "gEm"), true);
  assert.equal(matchesFileName("imagem.png", "vídeo"), false);
});
