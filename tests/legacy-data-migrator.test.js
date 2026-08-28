const assert = require("node:assert/strict");
const test = require("node:test");

require("../chapter-extractor.js");
require("../legacy-data-migrator.js");

const chapterUrl =
  "https://www.royalroad.com/fiction/178930/example-fiction/chapter/1/ch-01";
const bookUrl = "https://www.royalroad.com/fiction/178930/example-fiction";

test("legacy automatic rewrite behavior is preserved only for configured users", () => {
  assert.equal(LegacyDataMigrator.autoRewrite({}), false);
  assert.equal(
    LegacyDataMigrator.autoRewrite({ endpoint: "https://api.example", model: "model" }),
    true
  );
  assert.equal(
    LegacyDataMigrator.autoRewrite({
      endpoint: "https://api.example",
      model: "model",
      autoRewrite: false
    }),
    false
  );
});

test("legacy chapter-specific capture and resume keys migrate without losing data", () => {
  const capture = LegacyDataMigrator.capture({
    url: chapterUrl,
    bookKey: chapterUrl,
    title: "Ch 01"
  });
  assert.equal(capture.bookKey, bookUrl);
  assert.equal(capture.title, "Ch 01");

  const { value, changed } = LegacyDataMigrator.currentBooks({
    [chapterUrl]: {
      bookKey: chapterUrl,
      chapterUrl,
      chapterTitle: "Ch 01",
      savedAt: "2026-01-01T00:00:00.000Z"
    }
  });
  assert.equal(changed, true);
  assert.equal(value[bookUrl].chapterTitle, "Ch 01");
  assert.equal(value[bookUrl].chapterUrl, chapterUrl);
});
