const CAPTURE_KEY = "lastCapture";
const SETTINGS_KEY = "rewriteSettings";

const DEFAULT_SETTINGS = {
  endpoint: "https://api.openai.com/v1/chat/completions",
  model: "",
  apiKey: "",
  mode: "strict_cleanup",
  fontSize: "20",
  viewMode: "side_by_side",
  pageTheme: "day",
  panelTheme: "paper",
  contentWidth: "980"
};

const MAX_PROTECTED_TERMS = 12;
const SPEECH_VERBS =
  "say|said|says|tell|told|ask|asked|reply|replied|shout|shouted|whisper|whispered|mutter|muttered|call|called|order|ordered|warn|warned|add|added|remark|remarked|muse|mused|note|noted|creak|creaked";
const QUANTITY_COMPARISON_PATTERN =
  /\b(more than one|at least one|no more than one|no less than one)\s+([A-Z]?[A-Za-z][A-Za-z'-]*(?:\s+[A-Z]?[A-Za-z][A-Za-z'-]*){0,2})\b/gi;
const FRACTIONAL_TIME_PATTERNS = [
  /\b(?:a\s+full\s+)?half an hour\b/gi,
  /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+and a half\s+[A-Za-z]+\b/gi
];
const FONT_SIZES = ["16", "20", "24", "28", "32"];

function normalizeParagraphs(paragraphs) {
  const list = Array.isArray(paragraphs) ? paragraphs : [];

  return list
    .map((item, index) => {
      if (typeof item === "string") {
        return {
          id: `p${index + 1}`,
          text: item.trim()
        };
      }

      return {
        id: item?.id || `p${index + 1}`,
        text: typeof item?.text === "string" ? item.text.trim() : ""
      };
    })
    .filter((item) => item.text);
}

function normalizeCapture(payload) {
  return {
    url: payload?.url || "",
    title: payload?.title || "Untitled page",
    paragraphs: normalizeParagraphs(payload?.paragraphs),
    nextUrl: payload?.nextUrl || "",
    bookKey: payload?.bookKey || "",
    bookTitle: payload?.bookTitle || "",
    bookUrl: payload?.bookUrl || ""
  };
}

function normalizeSettings(settings) {
  const fontSize = typeof settings?.fontSize === "string" ? settings.fontSize.trim() : "";
  const viewMode = typeof settings?.viewMode === "string" ? settings.viewMode.trim() : "";
  const pageTheme =
    typeof settings?.pageTheme === "string"
      ? settings.pageTheme.trim()
      : typeof settings?.theme === "string"
        ? settings.theme.trim()
        : "";
  const panelTheme = typeof settings?.panelTheme === "string" ? settings.panelTheme.trim() : "";
  const contentWidth =
    typeof settings?.contentWidth === "string" ? settings.contentWidth.trim() : "";
  return {
    endpoint: typeof settings?.endpoint === "string" ? settings.endpoint.trim() : "",
    model: typeof settings?.model === "string" ? settings.model.trim() : "",
    apiKey: typeof settings?.apiKey === "string" ? settings.apiKey.trim() : "",
    mode: typeof settings?.mode === "string" ? settings.mode.trim() : DEFAULT_SETTINGS.mode,
    fontSize: normalizeFontSizeValue(fontSize),
    viewMode: ["original", "side_by_side", "improved"].includes(viewMode)
      ? viewMode
      : DEFAULT_SETTINGS.viewMode,
    pageTheme: ["day", "gray", "dusk", "night"].includes(pageTheme)
      ? pageTheme
      : DEFAULT_SETTINGS.pageTheme,
    panelTheme:
      panelTheme && ["paper", "gray", "mist", "glass", "ink"].includes(panelTheme)
        ? panelTheme
        : DEFAULT_SETTINGS.panelTheme,
    contentWidth: ["720", "860", "980", "1120"].includes(contentWidth)
      ? contentWidth
      : DEFAULT_SETTINGS.contentWidth
  };
}

function normalizeFontSizeValue(fontSize) {
  if (!fontSize || !Number.isFinite(Number(fontSize))) {
    return DEFAULT_SETTINGS.fontSize;
  }

  const numeric = Number(fontSize);
  const pxValue = numeric < 10 ? numeric * 16 : numeric;
  let best = FONT_SIZES[0];
  let bestDistance = Math.abs(Number(best) - pxValue);

  for (const option of FONT_SIZES.slice(1)) {
    const distance = Math.abs(Number(option) - pxValue);
    if (distance < bestDistance) {
      best = option;
      bestDistance = distance;
    }
  }

  return best;
}

function normalizePromptText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function looksLikeChapterUrl(url) {
  if (!url) return false;

  try {
    const { pathname } = new URL(url);
    return (
      /\/chapter(?:\/|-\d)/i.test(pathname) ||
      /chapter-\d+/i.test(pathname) ||
      /\/\d+-\d+\/?$/i.test(pathname) ||
      /\/\d+\.html$/i.test(pathname)
    );
  } catch (error) {
    return false;
  }
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function getSettings() {
  const stored = await browser.storage.local.get(SETTINGS_KEY);
  return {
    ...DEFAULT_SETTINGS,
    ...normalizeSettings(stored[SETTINGS_KEY])
  };
}

async function saveSettings(settings) {
  const next = {
    ...DEFAULT_SETTINGS,
    ...normalizeSettings(settings)
  };

  await browser.storage.local.set({
    [SETTINGS_KEY]: next
  });

  return next;
}

function buildSystemPrompt(mode) {
  const modeInstruction = {
    strict_cleanup:
      "Do minimal cleanup only. Fix grammar, punctuation, spacing, and clearly awkward phrasing while changing as little wording as possible.",
    natural_prose:
      "Rewrite into more natural prose, but stay close to the original wording and avoid adding flourish or dramatic tone.",
    translation_repair:
      "Repair awkward machine-translated phrasing into fluent English while preserving names, lore, events, tone, and paragraph boundaries."
  };

  return [
    "You improve translated novel chapter text for readability.",
    "Preserve exact meaning, names, special terms, tone, and key details.",
    "Make the smallest necessary edits.",
    "Do not summarize, censor harmless content, add exposition, add emotional emphasis, or change paragraph boundaries.",
    "Do not change facts, timing, quantities, ranks, names, or cause-and-effect.",
    "Do not make the prose more heroic, poetic, cinematic, or dramatic than the source.",
    "If a sentence is understandable, prefer a light cleanup instead of a rewrite.",
    "Do not include the title in the output.",
    "Return plain text only for the rewritten body text.",
    "Do not number paragraphs.",
    "Do not repeat paragraphs.",
    modeInstruction[mode] || modeInstruction.strict_cleanup
  ].join(" ");
}

function extractProtectedTerms(paragraphs) {
  const text = paragraphs.join("\n");
  const terms = new Set();
  const capitalizedMatches =
    text.match(/\b(?:[A-Z][A-Za-z0-9'+-]*)(?:\s+[A-Z][A-Za-z0-9'+-]*)+\b/g) || [];
  const numericMatches = text.match(/\b[A-Za-z0-9.+-]*\d[A-Za-z0-9.+-]*\b/g) || [];

  for (const match of [...capitalizedMatches, ...numericMatches]) {
    const term = match.trim();
    if (term.length < 3) continue;
    terms.add(term);
  }

  return Array.from(terms)
    .sort((a, b) => b.length - a.length)
    .slice(0, MAX_PROTECTED_TERMS);
}

function extractDialogueSpeakers(text) {
  if (!/["\u201c\u201d]/.test(text)) return [];

  const firstQuoteIndex = text.search(/["\u201c\u201d]/);
  if (firstQuoteIndex === -1) return [];

  const preQuote = text.slice(0, firstQuoteIndex);
  const pattern = new RegExp(
    `\\b([A-Z][A-Za-z0-9'+-]*(?:\\s+[A-Z][A-Za-z0-9'+-]*){0,2})\\b(?=[^.!?\\n"]{0,100}\\b(?:${SPEECH_VERBS})\\b)`,
    "g"
  );
  const speakers = new Set();

  for (const match of preQuote.matchAll(pattern)) {
    const candidate = match[1].trim();
    if (candidate.length < 2) continue;
    speakers.add(candidate);
  }

  return Array.from(speakers);
}

function extractChunkDialogueSpeakers(paragraphs) {
  const speakers = new Set();

  for (const paragraph of paragraphs) {
    for (const speaker of extractDialogueSpeakers(paragraph)) {
      speakers.add(speaker);
    }
  }

  return Array.from(speakers);
}

function hasDialogueAttribution(text) {
  const attributionPattern = new RegExp(
    `\\b(?:${SPEECH_VERBS})\\b|\\b[A-Z][A-Za-z0-9'+-]*(?:\\s+[A-Z][A-Za-z0-9'+-]*){0,2}\\b\\s+(?:${SPEECH_VERBS})\\b`,
    "i"
  );
  return attributionPattern.test(text);
}

function isStandaloneQuoteParagraph(text) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (!/^["\u201c]/.test(trimmed)) return false;

  const quoteCount = (trimmed.match(/["\u201c\u201d]/g) || []).length;
  if (quoteCount < 2) return false;

  return !hasDialogueAttribution(trimmed);
}

function extractSensitiveQuantityPhrases(text) {
  const phrases = [];

  for (const match of text.matchAll(QUANTITY_COMPARISON_PATTERN)) {
    phrases.push({
      kind: "comparison",
      full: match[0].trim(),
      nounPhrase: match[2].trim()
    });
  }

  for (const pattern of FRACTIONAL_TIME_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      const full = match[0].trim();
      const words = full.split(/\s+/);
      phrases.push({
        kind: "exact_phrase",
        full,
        anchor: words[words.length - 1].toLowerCase()
      });
    }
  }

  return phrases;
}

function buildChapterPrompt(payload) {
  const sourceParagraphs = (payload.paragraphs || []).map((text) => normalizePromptText(text));
  const protectedTerms = extractProtectedTerms(sourceParagraphs);
  const dialogueSpeakers = extractChunkDialogueSpeakers(sourceParagraphs);
  const paragraphBlock = sourceParagraphs
    .map((text, index) => `[${index + 1}] ${text}`)
    .join("\n\n");

  return [
    `Title: ${payload.title || "Untitled page"}`,
    `Mode: ${payload.mode}`,
    `Paragraph count: ${sourceParagraphs.length}`,
    "",
    "Rewrite the following body text only.",
    "Preserve all names, terms, facts, counts, and timeline details exactly.",
    "Preserve comparison and quantity phrases exactly when they carry meaning, such as 'more than one', 'half an hour', and 'two and a half days'.",
    "Do not change who is speaking any quoted line.",
    "If a paragraph includes a named speaker such as 'Mu Yuan said', keep the same named speaker.",
    "Do not replace a named speaker with a pronoun or a different noun phrase.",
    "If a paragraph is only a quoted line with no speaker tag, do not add a speaker tag or narration to it.",
    "Keep the same paragraph order.",
    "Output exactly the same number of paragraphs as the input.",
    "Separate each output paragraph with a blank line.",
    "Do not add new descriptions, emotional flavor, or inferred meaning.",
    "Do not turn brief narration into more dramatic prose.",
    "Do not include paragraph numbers like [1] or any commentary.",
    protectedTerms.length > 0 ? "" : null,
    protectedTerms.length > 0 ? `Protected terms: ${protectedTerms.join(", ")}` : null,
    dialogueSpeakers.length > 0 ? `Dialogue speakers to preserve exactly: ${dialogueSpeakers.join(", ")}` : null,
    "",
    paragraphBlock
  ]
    .filter(Boolean)
    .join("\n");
}

function stripParagraphMarkers(text) {
  return text
    .replace(/^\[\d+\]\s*/gm, "")
    .replace(/^\d+[.)]\s+/gm, "")
    .trim();
}

async function readErrorResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const data = await response.json().catch(() => null);
    const message = data?.error?.message || data?.message;
    return message || `Request failed with status ${response.status}`;
  }

  const text = await response.text().catch(() => "");
  return text || `Request failed with status ${response.status}`;
}

function extractResponseText(data) {
  const direct = data?.choices?.[0]?.message?.content;
  if (typeof direct === "string" && direct.trim()) return stripParagraphMarkers(direct);

  if (Array.isArray(direct)) {
    const joined = direct
      .map((item) => item?.text || item?.content || "")
      .join("")
      .trim();
    if (joined) return stripParagraphMarkers(joined);
  }

  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return stripParagraphMarkers(data.output_text);
  }

  const output = data?.output?.flatMap((item) => item?.content || []) || [];
  const text = output
    .map((item) => item?.text || "")
    .join("")
    .trim();

  if (text) return stripParagraphMarkers(text);

  throw new Error("The model response did not include rewritten text.");
}

async function rewriteChapter(payload) {
  const settings = {
    ...(await getSettings()),
    ...normalizeSettings(payload?.settings)
  };
  if (!settings.endpoint) throw new Error("Set an API endpoint before rewriting.");
  if (!settings.model) throw new Error("Set a model before rewriting.");
  if (!Array.isArray(payload?.paragraphs) || payload.paragraphs.length === 0) {
    throw new Error("No extracted text is available to rewrite.");
  }

  const headers = {
    "Content-Type": "application/json"
  };

  if (settings.apiKey) {
    headers.Authorization = `Bearer ${settings.apiKey}`;
  }

  const response = await fetch(settings.endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: settings.model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(payload.mode)
        },
        {
          role: "user",
          content: buildChapterPrompt(payload)
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(await readErrorResponse(response));
  }

  return extractResponseText(await response.json());
}

async function captureFromTab(tabId) {
  try {
    return await browser.tabs.sendMessage(tabId, { type: "CAPTURE_MINIMAL" });
  } catch (error) {
    console.warn("Content script did not respond.", error);
    return null;
  }
}

async function waitForTabComplete(tabId) {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      browser.tabs.onUpdated.removeListener(handleUpdate);
      resolve();
    }, 15000);

    function handleUpdate(updatedTabId, changeInfo) {
      if (updatedTabId !== tabId) return;
      if (changeInfo.status !== "complete") return;

      clearTimeout(timeoutId);
      browser.tabs.onUpdated.removeListener(handleUpdate);
      resolve();
    }

    browser.tabs.onUpdated.addListener(handleUpdate);
  });
}

async function captureFromUrl(url) {
  const tab = await browser.tabs.create({
    url,
    active: false
  });

  try {
    await waitForTabComplete(tab.id);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const payload = await captureFromTab(tab.id);
      if (payload?.paragraphs?.length) {
        const normalized = normalizeCapture(payload);
        if (
          looksLikeChapterUrl(url) &&
          normalized.url &&
          normalized.url !== url &&
          !looksLikeChapterUrl(normalized.url)
        ) {
          return {
            url: normalized.url,
            title: normalized.title,
            paragraphs: [],
            nextUrl: ""
          };
        }
        return normalized;
      }

      await new Promise((resolve) => setTimeout(resolve, 350));
    }

    return {
      url,
      title: tab.title || "Untitled page",
      paragraphs: [],
      nextUrl: ""
    };
  } finally {
    if (tab.id) {
      await browser.tabs.remove(tab.id).catch(() => {});
    }
  }
}

async function openReaderWithPayload(payload) {
  const normalized = normalizeCapture(payload);

  await browser.storage.local.set({
    [CAPTURE_KEY]: {
      ...normalized,
      capturedAt: new Date().toISOString()
    }
  });

  await browser.tabs.create({
    url: browser.runtime.getURL("reader.html")
  });
}

browser.action.onClicked.addListener(async (tab) => {
  const payload = (await captureFromTab(tab.id)) ?? {
    url: tab.url ?? "",
    title: tab.title ?? "Untitled page",
    paragraphs: []
  };

  await openReaderWithPayload(payload);
});

browser.runtime.onMessage.addListener((message) => {
  switch (message?.type) {
    case "GET_REWRITE_SETTINGS":
      return getSettings();
    case "SAVE_REWRITE_SETTINGS":
      return saveSettings(message.settings);
    case "REWRITE_CHAPTER":
      return rewriteChapter(message.payload).then((improvedText) => ({ improvedText }));
    case "CAPTURE_URL":
      return captureFromUrl(message.url);
    default:
      return undefined;
  }
});
