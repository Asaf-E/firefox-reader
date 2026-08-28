const assert = require("node:assert/strict");
const test = require("node:test");

require("../rewrite-client.js");

test("default fetch keeps the browser global as its receiver", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = function browserFetch() {
    assert.equal(this, globalThis);
    return Promise.resolve(
      new Response(
        JSON.stringify({ choices: [{ message: { content: "Browser-bound response." } }] }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
  };

  try {
    const client = new RewriteClient();
    assert.equal(
      await client.complete({
        endpoint: "https://api.example/v1/chat/completions",
        model: "model",
        messages: []
      }),
      "Browser-bound response."
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rewrite client sends an OpenAI-compatible request and reads chat output", async () => {
  let request;
  const client = new RewriteClient({
    fetchImpl: async (url, options) => {
      request = { url, options };
      return new Response(
        JSON.stringify({ choices: [{ message: { content: "[[1]] Rewritten text." } }] }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
  });

  const text = await client.complete({
    endpoint: "https://api.example/v1/chat/completions",
    apiKey: "secret",
    model: "instruct-model",
    messages: [{ role: "user", content: "Rewrite this." }]
  });

  assert.equal(text, "[[1]] Rewritten text.");
  assert.equal(request.url, "https://api.example/v1/chat/completions");
  assert.equal(request.options.headers.Authorization, "Bearer secret");
  assert.equal(JSON.parse(request.options.body).model, "instruct-model");
});

test("rewrite client supports output_text responses and useful API errors", async () => {
  const outputClient = new RewriteClient({
    fetchImpl: async () =>
      new Response(JSON.stringify({ output_text: "Rewritten output." }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
  });
  assert.equal(
    await outputClient.complete({ endpoint: "https://api.example", model: "model", messages: [] }),
    "Rewritten output."
  );

  const errorClient = new RewriteClient({
    fetchImpl: async () =>
      new Response(JSON.stringify({ error: { message: "Invalid model" } }), {
        status: 400,
        headers: { "content-type": "application/json" }
      })
  });
  await assert.rejects(
    errorClient.complete({ endpoint: "https://api.example", model: "model", messages: [] }),
    /Invalid model/
  );
});

test("rewrite client aborts a stalled request", async () => {
  const client = new RewriteClient({
    timeoutMs: 5,
    fetchImpl: (_url, { signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      })
  });

  await assert.rejects(
    client.complete({ endpoint: "https://api.example", model: "model", messages: [] }),
    /timed out/
  );
});
