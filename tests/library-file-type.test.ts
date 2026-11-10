import test from "node:test";
import assert from "node:assert/strict";
import { libraryFileType } from "../src/lib/library-file-type";
test("file labels use upload MIME, never infer formats from external link paths or Drive IDs", () => {
  assert.equal(libraryFileType({ url: "", mime: "application/pdf" }), "PDF");
  assert.equal(libraryFileType({ url: "", mime: "image/png" }), "PNG");
  assert.equal(libraryFileType({ url: "", mime: "application/msword" }), "DOC");
  assert.equal(
    libraryFileType({ url: "", mime: "application/vnd.ms-excel" }),
    "XLS",
  );
  assert.equal(
    libraryFileType({
      url: "https://example.org/pretend.pdf",
      mime: "application/pdf",
    }),
    "Link",
  );
  assert.equal(
    libraryFileType({ url: "https://drive.google.com/file/d/fixture/view" }),
    "Link",
  );
  assert.equal(libraryFileType({ url: "", mime: "text/html" }), "Arquivo");
});
