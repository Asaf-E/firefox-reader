const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadRewriteFunctions() {
  let source = fs.readFileSync(path.join(__dirname, "..", "reader.js"), "utf8");
  source = source.slice(0, source.lastIndexOf("\ninit().catch"));
  const appearance = {};
  const context = {
    appearance,
    document: {
      documentElement: {
        style: {
          setProperty(name, value) {
            appearance[name] = value;
          }
        }
      }
    },
    LegacyDataMigrator: { autoRewrite: (settings) => settings?.autoRewrite === true },
    RewriteClient: class {},
    console
  };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: "reader.js" });
  return context;
}

const reader = loadRewriteFunctions();
const plain = (value) => JSON.parse(JSON.stringify(value));

test("responsive long-reading presets change only appearance preferences", () => {
  const current = {
    endpoint: "http://127.0.0.1:1234/v1/chat/completions",
    model: "qwen2.5-7b-instruct",
    rewriteEnabled: false,
    fontSize: "32",
    pageTheme: "night"
  };
  const day = plain(reader.withLongReadingPreset(current, "day"));
  const night = plain(reader.withLongReadingPreset(current, "night"));

  assert.deepEqual(day, {
    endpoint: current.endpoint,
    model: current.model,
    rewriteEnabled: false,
    fontSize: "responsive",
    fontFamily: "sans",
    lineHeight: "1.72",
    contentWidth: "responsive",
    pageTheme: "sand",
    panelTheme: "parchment",
    brightness: "80",
    textContrast: "soft"
  });
  assert.equal(night.pageTheme, "night");
  assert.equal(night.panelTheme, "ink");
  assert.equal(night.brightness, "90");
  assert.equal(night.textContrast, "soft");
  assert.equal(night.endpoint, current.endpoint);
  assert.equal(night.rewriteEnabled, false);
});

test("responsive appearance values survive settings normalization", () => {
  const settings = reader.normalizeSettings({
    fontSize: "responsive",
    contentWidth: "responsive",
    brightness: "70",
    textContrast: "balanced"
  });

  assert.equal(settings.fontSize, "responsive");
  assert.equal(settings.contentWidth, "responsive");
  assert.equal(settings.brightness, "70");
  assert.equal(settings.textContrast, "balanced");
  assert.equal(reader.normalizeSettings({ brightness: "45" }).brightness, "100");
  assert.equal(reader.normalizeSettings({ textContrast: "unknown" }).textContrast, "strong");

  reader.applyAppearance({
    ...settings,
    pageTheme: "sand",
    panelTheme: "parchment"
  });
  assert.equal(reader.appearance["--reader-font-size"], "clamp(21px, calc(15px + 0.4vw), 30px)");
  assert.equal(reader.appearance["--content-width"], "clamp(640px, 26vw, 900px)");
  assert.equal(reader.appearance["--reader-dim-opacity"], "0.3");
  assert.equal(reader.appearance["--reader-text-strength"], "88%");
});

test("rewrite master toggle is backward compatible and normalizes explicit opt-out", () => {
  assert.equal(reader.isRewriteEnabled(undefined), true);
  assert.equal(reader.isRewriteEnabled({ rewriteEnabled: false }), false);
  assert.equal(reader.normalizeSettings({}).rewriteEnabled, true);
  assert.equal(reader.normalizeSettings({ rewriteEnabled: false }).rewriteEnabled, false);
});

test("marked rewrite responses preserve paragraph order and reject malformed indexes", () => {
  assert.deepEqual(
    plain(reader.parseChunkResponse("[[1]] First cleaned line.\n\n[[2]] Second cleaned line.", 2)),
    ["First cleaned line.", "Second cleaned line."]
  );
  assert.equal(
    reader.parseChunkResponse("[[1]] First line.\n\n[[1]] Duplicate index.", 2),
    null
  );
  assert.equal(reader.parseChunkResponse("[[1]] Only one paragraph.", 2), null);
});

test("wrong paragraph counts fall back to the complete original chunk", () => {
  const source = ["First original paragraph.", "Second original paragraph."];
  const result = reader.validateChunkRewrite(source, ["Merged output."], "strict_cleanup");

  assert.deepEqual(plain(result.rewrittenParagraphs), source);
  assert.deepEqual(plain(result.warnings), ["wrong paragraph count"]);
});

test("unsafe numeric, speaker, and quantity changes keep each original paragraph", () => {
  const source = [
    "He waited 30 minutes beside the gate before entering.",
    "Mu Yuan said, \"Wait here until I return.\"",
    "There was more than one guard watching the narrow bridge.",
    "\"Leave now before the doors close.\""
  ];
  const rewritten = [
    "He waited 20 minutes beside the gate before entering.",
    "The stranger said, \"Wait here until I return.\"",
    "There was at least one guard watching the narrow bridge.",
    "\"Leave now before the doors close,\" Alice said."
  ];

  const result = reader.validateChunkRewrite(source, rewritten, "natural_prose");

  assert.deepEqual(plain(result.rewrittenParagraphs), source);
  assert.match(result.warnings.join(" "), /missing numeric token/);
  assert.match(result.warnings.join(" "), /speaker attribution changed/);
  assert.match(result.warnings.join(" "), /quantity phrase changed/);
  assert.match(result.warnings.join(" "), /speaker attribution added/);
});

test("valid light cleanup is accepted while model commentary is rejected", () => {
  const source = [
    "The corridor was quiet, and the old lamps flickered against the walls.",
    "The door opened slowly when Mira touched the handle."
  ];
  const rewritten = [
    "The corridor was quiet, while the old lamps flickered against the walls.",
    "Here's the rewritten paragraph: The door opened when Mira touched it."
  ];

  const result = reader.validateChunkRewrite(source, rewritten, "natural_prose");

  assert.equal(result.rewrittenParagraphs[0], rewritten[0]);
  assert.equal(result.rewrittenParagraphs[1], source[1]);
  assert.match(result.warnings.join(" "), /meta commentary/);
});

test("chunk creation supplies adjacent context without duplicating target text", () => {
  const chunks = plain(reader.createChunks(["One", "Two", "Three", "Four", "Five"], 2));

  assert.deepEqual(chunks, [
    { start: 0, end: 2, items: ["One", "Two"], prevText: "", nextText: "Three" },
    { start: 2, end: 4, items: ["Three", "Four"], prevText: "Two", nextText: "Five" },
    { start: 4, end: 5, items: ["Five"], prevText: "Four", nextText: "" }
  ]);
});
