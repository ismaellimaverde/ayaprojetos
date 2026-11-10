import test from "node:test";
import assert from "node:assert/strict";
import {
  formatFileMB,
  fileLimitLabel,
  SOURCE_LIMIT,
  PROJECT_ATTACHMENT_LIMIT,
} from "../src/lib/file-size";
test("file size labels are decimal MB in pt-BR without changing effective byte limits", () => {
  assert.equal(SOURCE_LIMIT, 2097152);
  assert.equal(PROJECT_ATTACHMENT_LIMIT, 52428800);
  assert.equal(formatFileMB(1000000), "1,00 MB");
  assert.equal(formatFileMB(706787), "0,71 MB");
  assert.equal(
    fileLimitLabel(SOURCE_LIMIT),
    "aprox. 2,10 MB (2.097.152 bytes)",
  );
  assert.equal(
    fileLimitLabel(PROJECT_ATTACHMENT_LIMIT),
    "aprox. 52,43 MB (52.428.800 bytes)",
  );
});
