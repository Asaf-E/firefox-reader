const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const backgroundSource = fs.readFileSync(path.join(__dirname, "..", "background.js"), "utf8");

function loadBackground({ fetchImpl, extractorResult, messageResults, tabCapture } = {}) {
  const calls = {
    actionListener: null,
    created: [],
    hidden: [],
    injected: [],
    messages: 0,
    removed: [],
    stored: []
  };
  const browser = {
    action: {
      onClicked: {
        addListener(listener) {
          calls.actionListener = listener;
        }
      }
    },
    runtime: {
      getURL: (file) => `moz-extension://test/${file}`,
      onMessage: { addListener() {} }
    },
    storage: {
      local: {
        async set(value) {
          calls.stored.push(value);
        }
      }
    },
    scripting: {
      async executeScript(options) {
        calls.injected.push(options);
      }
    },
    tabs: {
      onUpdated: { addListener() {}, removeListener() {} },
      async create(options) {
        calls.created.push(options);
        return { id: calls.created.length, status: "complete", title: "Fallback chapter" };
      },
      async hide(id) {
        calls.hidden.push(id);
      },
      async remove(id) {
        calls.removed.push(id);
      },
      async sendMessage() {
        calls.messages += 1;
        if (messageResults?.length) {
          const result = messageResults.shift();
          if (result instanceof Error) throw result;
          return result;
        }
        return tabCapture;
      }
    }
  };

  class TestExtractor {
    static isLikelyChapterUrl(url) {
      return /\/chapter(?:\/|-)/i.test(url || "");
    }

    extract() {
      return extractorResult || {};
    }
  }

  const context = {
    AbortController,
    ChapterExtractor: TestExtractor,
    DOMParser: class {
      parseFromString() {
        return {};
      }
    },
    browser,
    clearTimeout,
    console,
    fetch: fetchImpl || (async () => {
      throw new Error("network unavailable");
    }),
    setTimeout
  };
  vm.createContext(context);
  vm.runInContext(backgroundSource, context, { filename: "background.js" });
  return { calls, context };
}

test("capture normalization preserves duplicate text and creates stable paragraph ids", () => {
  const { context } = loadBackground();
  const capture = context.normalizeCapture({
    url: "https://example.test/chapter/1",
    paragraphs: [" Wait. ", "Same line", { id: "custom", text: "Same line" }, ""]
  });

  assert.deepEqual(JSON.parse(JSON.stringify(capture.paragraphs)), [
    { id: "p1", text: "Wait." },
    { id: "p2", text: "Same line" },
    { id: "custom", text: "Same line" }
  ]);
});

test("direct chapter fetch uses the shared extractor without opening a tab", async () => {
  const requestedUrl = "https://example.test/novel/chapter/7";
  const finalUrl = "https://example.test/novel/chapter/7/";
  const { calls, context } = loadBackground({
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      url: finalUrl,
      text: async () => "<article>chapter</article>"
    }),
    extractorResult: {
      url: finalUrl,
      title: "Chapter 7",
      paragraphs: ["First paragraph", { id: "kept", text: "Second paragraph" }],
      nextUrl: "https://example.test/novel/chapter/8"
    }
  });

  const capture = await context.captureFromUrl(requestedUrl);

  assert.equal(capture.url, finalUrl);
  assert.deepEqual(JSON.parse(JSON.stringify(capture.paragraphs)), [
    { id: "p1", text: "First paragraph" },
    { id: "kept", text: "Second paragraph" }
  ]);
  assert.equal(capture.nextUrl, "https://example.test/novel/chapter/8");
  assert.equal(calls.created.length, 0);
});

test("toolbar capture injects packaged scripts when an existing tab has no receiver", async () => {
  const url = "https://example.test/novel/chapter/6";
  const messageResults = [
    new Error("Could not establish connection. Receiving end does not exist."),
    { url, title: "Chapter 6", paragraphs: ["Captured from the already-open page."] }
  ];
  const { calls } = loadBackground({ messageResults });

  await calls.actionListener({ id: 42, url, title: "Chapter 6" });

  assert.equal(calls.messages, 2);
  assert.deepEqual(JSON.parse(JSON.stringify(calls.injected)), [
    {
      target: { tabId: 42 },
      files: ["chapter-extractor.js", "content.js"]
    }
  ]);
  assert.equal(calls.stored[0].lastCapture.paragraphs[0].text, "Captured from the already-open page.");
  assert.equal(calls.created.at(-1).url, "moz-extension://test/reader.html");
});

test("anti-bot text from a direct request falls back to rendered page capture", async () => {
  const url = "https://example.test/novel/3235090.html";
  const { calls, context } = loadBackground({
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      url,
      text: async () => "<title>Just a moment...</title>"
    }),
    extractorResult: {
      url,
      title: "Just a moment...",
      paragraphs: ["Security check", "I'm not a robot.", "Abnormal activity detected."]
    },
    tabCapture: {
      url,
      title: "Chapter 10",
      paragraphs: ["The verified browser tab contains the actual chapter text."]
    }
  });

  const capture = await context.captureFromUrl(url);

  assert.equal(capture.title, "Chapter 10");
  assert.equal(capture.paragraphs[0].text, "The verified browser tab contains the actual chapter text.");
  assert.equal(calls.hidden.length, 1);
});

test("failed direct fetch falls back to a hidden tab and always removes it", async () => {
  const url = "https://example.test/novel/chapter/8";
  const { calls, context } = loadBackground({
    tabCapture: {
      url,
      title: "Chapter 8",
      paragraphs: ["Loaded by the rendered-page fallback."]
    }
  });

  const capture = await context.captureFromUrl(url);

  assert.equal(capture.paragraphs[0].text, "Loaded by the rendered-page fallback.");
  assert.deepEqual(calls.hidden, [1]);
  assert.deepEqual(calls.removed, [1]);
});
test("a chapter redirect to a non-chapter page is not accepted as chapter content", async () => {
  const requestedUrl = "https://example.test/novel/chapter/9";
  const { calls, context } = loadBackground({
    tabCapture: {
      url: "https://example.test/login",
      title: "Sign in",
      paragraphs: ["This must not be appended to the novel."]
    }
  });

  const capture = await context.captureFromUrl(requestedUrl);

  assert.equal(capture.url, "https://example.test/login");
  assert.deepEqual(Array.from(capture.paragraphs), []);
  assert.deepEqual(calls.removed, [1]);
});
