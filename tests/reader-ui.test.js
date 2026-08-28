const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { JSDOM } = require("jsdom");

const document = new JSDOM(
  fs.readFileSync(path.join(__dirname, "..", "reader.html"), "utf8")
).window.document;

test("reader toolbar exposes responsive day/night presets and the rewrite toggle", () => {
  const dayPreset = document.getElementById("long-reading-day");
  const nightPreset = document.getElementById("long-reading-night");
  const rewriteEnabled = document.getElementById("rewrite-enabled");

  assert.equal(dayPreset?.tagName, "BUTTON");
  assert.equal(nightPreset?.tagName, "BUTTON");
  assert.match(dayPreset.textContent, /day/i);
  assert.match(nightPreset.textContent, /night/i);
  assert.ok(document.querySelector("#font-size option[value='responsive']"));
  assert.ok(document.querySelector("#content-width option[value='responsive']"));
  assert.ok(document.querySelector("#reader-brightness option[value='60']"));
  assert.ok(document.querySelector("#text-contrast option[value='soft']"));
  assert.equal(rewriteEnabled?.type, "checkbox");
  assert.equal(rewriteEnabled.checked, true);
});
