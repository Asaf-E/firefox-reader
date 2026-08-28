(() => {
  "use strict";

  class RewriteClient {
    constructor({ fetchImpl = globalThis.fetch?.bind(globalThis), timeoutMs = 120000 } = {}) {
      if (typeof fetchImpl !== "function") throw new Error("The Fetch API is unavailable.");
      this.fetch = fetchImpl;
      this.timeoutMs = timeoutMs;
    }

    async complete({ endpoint, apiKey, model, messages, temperature = 0.2 }) {
      if (!endpoint) throw new Error("Set an API endpoint before rewriting.");
      if (!model) throw new Error("Set a model before rewriting.");

      const headers = { "Content-Type": "application/json" };
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

      const response = await this.request(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ model, temperature, messages })
      });
      if (!response.ok) throw new Error(await this.readError(response));
      return this.extractText(await response.json());
    }

    async request(url, options) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        return await this.fetch(url, { ...options, signal: controller.signal });
      } catch (error) {
        if (error?.name === "AbortError") {
          throw new Error("Rewrite request timed out. Please try again.");
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
      }
    }

    async readError(response) {
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await response.json().catch(() => null);
        return data?.error?.message || data?.message || `Request failed with status ${response.status}`;
      }
      return (await response.text().catch(() => "")) || `Request failed with status ${response.status}`;
    }

    extractText(data) {
      const direct = data?.choices?.[0]?.message?.content;
      if (typeof direct === "string" && direct.trim()) return direct.trim();
      if (Array.isArray(direct)) {
        const text = direct.map((item) => item?.text || item?.content || "").join("").trim();
        if (text) return text;
      }
      if (typeof data?.output_text === "string" && data.output_text.trim()) {
        return data.output_text.trim();
      }
      const text = (data?.output || [])
        .flatMap((item) => item?.content || [])
        .map((item) => item?.text || "")
        .join("")
        .trim();
      if (text) return text;
      throw new Error(
        "The model returned no final text. Try a non-reasoning instruct model for rewriting."
      );
    }
  }

  globalThis.RewriteClient = RewriteClient;
})();
