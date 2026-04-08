const CAPTURE_KEY = "lastCapture";
const SETTINGS_KEY = "rewriteSettings";
const LATEST_REWRITE_KEY = "latestRewrite";
const BOOKMARKS_KEY = "chapterBookmarks";
const CURRENT_BOOKS_KEY = "currentChaptersByBook";

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

const REWRITE_CHUNK_SIZE = 6;
const MAX_PROTECTED_TERMS = 12;
const SPEECH_VERBS =
  "say|said|says|tell|told|ask|asked|reply|replied|shout|shouted|whisper|whispered|mutter|muttered|call|called|order|ordered|warn|warned|add|added|remark|remarked|muse|mused|note|noted|creak|creaked";
const QUANTITY_COMPARISON_PATTERN =
  /\b(more than one|at least one|no more than one|no less than one)\s+([A-Z]?[A-Za-z][A-Za-z'-]*(?:\s+[A-Z]?[A-Za-z][A-Za-z'-]*){0,2})\b/gi;
const FRACTIONAL_TIME_PATTERNS = [
  /\b(?:a\s+full\s+)?half an hour\b/gi,
  /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+and a half\s+[A-Za-z]+\b/gi
];

const state = {
  capture: null,
  settings: null,
  chapters: [],
  bookmarks: {},
  currentBooks: {},
  viewMode: "side_by_side",
  improvedText: "",
  improvedParagraphs: [],
  isRewriting: false,
  rewriteNotice: "",
  isAppendingNext: false,
  autoRewriteStarted: false,
  activeChapterIndex: 0,
  scrollTicking: false
};

const elements = {};
const PAGE_THEMES = {
  day: {
    bg: "#f6f4ef",
    panel: "#fffdf8",
    panelBorder: "#dfd6c7",
    accent: "#7d3f12",
    accentStrong: "#5b2d0d",
    muted: "#665f58",
    shadow: "rgba(78, 57, 37, 0.08)",
    text: "#1f1f1f",
    inputBg: "#fff",
    inputBorder: "#cbbda7",
    colorScheme: "light"
  },
  sand: {
    bg: "#f1e6d2",
    panel: "#fbf4e8",
    panelBorder: "#ddccb1",
    accent: "#9a6530",
    accentStrong: "#74481f",
    muted: "#6d5c4d",
    shadow: "rgba(110, 81, 50, 0.10)",
    text: "#1f1b16",
    inputBg: "#fffaf2",
    inputBorder: "#d6c09e",
    colorScheme: "light"
  },
  gray: {
    bg: "#eceff2",
    panel: "#f7f8fa",
    panelBorder: "#d4d9e0",
    accent: "#4e647b",
    accentStrong: "#33475c",
    muted: "#5e6875",
    shadow: "rgba(52, 64, 79, 0.08)",
    text: "#161b22",
    inputBg: "#ffffff",
    inputBorder: "#c6ced8",
    colorScheme: "light"
  },
  forest: {
    bg: "#15201c",
    panel: "#1b2924",
    panelBorder: "#30453d",
    accent: "#c7b77a",
    accentStrong: "#e6d89f",
    muted: "#9fb1aa",
    shadow: "rgba(0, 0, 0, 0.22)",
    text: "#edf5f1",
    inputBg: "#14201b",
    inputBorder: "#385248",
    colorScheme: "dark"
  },
  ocean: {
    bg: "#101c2d",
    panel: "#15263a",
    panelBorder: "#28425f",
    accent: "#7cc7d8",
    accentStrong: "#a8e4ef",
    muted: "#9db6cc",
    shadow: "rgba(0, 0, 0, 0.24)",
    text: "#eef6ff",
    inputBg: "#101b2a",
    inputBorder: "#36506d",
    colorScheme: "dark"
  },
  dusk: {
    bg: "#1a2027",
    panel: "#222a34",
    panelBorder: "#343f4c",
    accent: "#d0a26d",
    accentStrong: "#e9c293",
    muted: "#9aa8b8",
    shadow: "rgba(0, 0, 0, 0.24)",
    text: "#edf2f7",
    inputBg: "#18202a",
    inputBorder: "#3a4656",
    colorScheme: "dark"
  },
  night: {
    bg: "#10151b",
    panel: "#171e26",
    panelBorder: "#27323f",
    accent: "#d79c61",
    accentStrong: "#f1c490",
    muted: "#99a8b8",
    shadow: "rgba(0, 0, 0, 0.28)",
    text: "#e8eef5",
    inputBg: "#111923",
    inputBorder: "#344252",
    colorScheme: "dark"
  }
};
const PANEL_THEMES = {
  paper: {
    bg: "rgba(255, 252, 245, 0.78)",
    border: "#e8dece",
    text: "#1f1f1f",
    muted: "#6a625a"
  },
  parchment: {
    bg: "rgba(245, 235, 214, 0.88)",
    border: "#d5bf96",
    text: "#1d1711",
    muted: "#6b573e"
  },
  gray: {
    bg: "rgba(236, 240, 244, 0.88)",
    border: "#cfd6df",
    text: "#18202a",
    muted: "#5f6976"
  },
  mist: {
    bg: "rgba(241, 246, 250, 0.8)",
    border: "#d5e1ea",
    text: "#18222d",
    muted: "#64717d"
  },
  glass: {
    bg: "rgba(255, 255, 255, 0.55)",
    border: "rgba(255, 255, 255, 0.85)",
    text: "#1f1f1f",
    muted: "#6b6258"
  },
  sage: {
    bg: "rgba(225, 235, 225, 0.88)",
    border: "#bccdbb",
    text: "#172019",
    muted: "#536356"
  },
  navy: {
    bg: "rgba(19, 31, 51, 0.92)",
    border: "#395172",
    text: "#edf4ff",
    muted: "#adc0da"
  },
  ink: {
    bg: "rgba(17, 23, 31, 0.92)",
    border: "#334152",
    text: "#e8eef5",
    muted: "#a7b4c2"
  },
  midnight: {
    bg: "rgba(12, 16, 24, 0.95)",
    border: "#2b3446",
    text: "#f2f6fb",
    muted: "#b0bccd"
  }
};
const CONTENT_WIDTHS = new Set(["640", "720", "800", "860", "980", "1120", "1280"]);
const FONT_SIZES = ["12", "16", "20", "24", "28", "32", "36", "40"];

function cacheElements() {
  elements.title = document.getElementById("title");
  elements.url = document.getElementById("url");
  elements.status = document.getElementById("status");
  elements.error = document.getElementById("error");
  elements.toolbar = document.getElementById("toolbar");
  elements.settings = document.getElementById("settings");
  elements.bookmarksPanel = document.getElementById("bookmarks-panel");
  elements.bookmarksList = document.getElementById("bookmarks-list");
  elements.clearBookmarks = document.getElementById("clear-bookmarks");
  elements.resumePanel = document.getElementById("resume-panel");
  elements.resumeList = document.getElementById("resume-list");
  elements.clearResume = document.getElementById("clear-resume");
  elements.paragraphs = document.getElementById("paragraphs");
  elements.selectionStatus = document.getElementById("selection-status");
  elements.rewriteMode = document.getElementById("rewrite-mode");
  elements.viewMode = document.getElementById("view-mode");
  elements.fontSize = document.getElementById("font-size");
  elements.contentWidth = document.getElementById("content-width");
  elements.pageTheme = document.getElementById("page-theme");
  elements.panelTheme = document.getElementById("panel-theme");
  elements.rewriteButton = document.getElementById("rewrite-button");
  elements.endpoint = document.getElementById("endpoint");
  elements.model = document.getElementById("model");
  elements.apiKey = document.getElementById("api-key");
  elements.saveSettings = document.getElementById("save-settings");
  elements.settingsStatus = document.getElementById("settings-status");
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
    pageTheme:
      pageTheme && PAGE_THEMES[pageTheme] ? pageTheme : DEFAULT_SETTINGS.pageTheme,
    panelTheme:
      panelTheme && PANEL_THEMES[panelTheme] ? panelTheme : DEFAULT_SETTINGS.panelTheme,
    contentWidth: CONTENT_WIDTHS.has(contentWidth) ? contentWidth : DEFAULT_SETTINGS.contentWidth
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

function applyAppearance(settings) {
  const root = document.documentElement;
  const pageThemeName =
    settings?.pageTheme && PAGE_THEMES[settings.pageTheme]
      ? settings.pageTheme
      : DEFAULT_SETTINGS.pageTheme;
  const panelThemeName =
    settings?.panelTheme && PANEL_THEMES[settings.panelTheme]
      ? settings.panelTheme
      : DEFAULT_SETTINGS.panelTheme;
  const pageTheme = PAGE_THEMES[pageThemeName];
  const panelTheme = PANEL_THEMES[panelThemeName];
  const fontSize =
    normalizeFontSizeValue(settings?.fontSize);
  const contentWidth = CONTENT_WIDTHS.has(settings?.contentWidth)
    ? settings.contentWidth
    : DEFAULT_SETTINGS.contentWidth;

  root.style.setProperty("--bg", pageTheme.bg);
  root.style.setProperty("--panel", pageTheme.panel);
  root.style.setProperty("--panel-border", pageTheme.panelBorder);
  root.style.setProperty("--accent", pageTheme.accent);
  root.style.setProperty("--accent-strong", pageTheme.accentStrong);
  root.style.setProperty("--muted", pageTheme.muted);
  root.style.setProperty("--shadow", pageTheme.shadow);
  root.style.setProperty("--text", pageTheme.text);
  root.style.setProperty("--input-bg", pageTheme.inputBg);
  root.style.setProperty("--input-border", pageTheme.inputBorder);
  root.style.setProperty("--reading-panel-bg", panelTheme.bg);
  root.style.setProperty("--reading-panel-border", panelTheme.border);
  root.style.setProperty("--reading-panel-text", panelTheme.text);
  root.style.setProperty("--reading-panel-muted", panelTheme.muted);
  root.style.setProperty("--reader-font-size", `${fontSize}px`);
  root.style.setProperty("--content-width", `${contentWidth}px`);
  root.style.colorScheme = pageTheme.colorScheme;
}

function setError(message) {
  if (!message) {
    elements.error.hidden = true;
    elements.error.textContent = "";
    return;
  }

  elements.error.hidden = false;
  elements.error.textContent = message;
}

function setStatus(message) {
  if (!message) {
    elements.status.hidden = true;
    elements.status.textContent = "";
    return;
  }

  elements.status.hidden = false;
  elements.status.textContent = message;
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

function getParagraphs() {
  const paragraphs = Array.isArray(state.capture?.paragraphs) ? state.capture.paragraphs : [];
  return paragraphs
    .map((item, index) => {
      if (typeof item === "string") {
        return {
          id: `p${index + 1}`,
          text: item
        };
      }

      return {
        id: item?.id || `p${index + 1}`,
        text: item?.text || ""
      };
    })
    .filter((item) => item.text);
}

function getOriginalText() {
  return getParagraphs().map((item) => item.text);
}

function getRewritableParagraphs() {
  return getOriginalText();
}

function getLastRealParagraphText(items) {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    const text = typeof item === "string" ? item : item?.text || "";
    if (text) return text;
  }

  return "";
}

function getRenderableItems(paragraphs) {
  if (!Array.isArray(paragraphs) || paragraphs.length === 0) {
    return [];
  }

  const items = [];
  let offset = 0;

  for (const [chapterIndex, chapter] of state.chapters.entries()) {
    items.push({
      kind: "chapter",
      chapterIndex,
      title: chapter.title,
      url: chapter.url,
      bookmarked: Boolean(chapter.url && state.bookmarks[chapter.url])
    });

    const nextOffset = Math.min(offset + chapter.paragraphCount, paragraphs.length);
    for (const text of paragraphs.slice(offset, nextOffset)) {
      items.push({
        kind: "paragraph",
        text
      });
    }
    offset = nextOffset;
  }

  for (const text of paragraphs.slice(offset)) {
    items.push({
      kind: "paragraph",
      text
    });
  }

  return items;
}

function normalizePromptText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hashText(text) {
  let hash = 5381;

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 33) ^ text.charCodeAt(index);
  }

  return (hash >>> 0).toString(36);
}

function getSourceSignature(paragraphs) {
  const joined = paragraphs.join("\n\n");
  return `${paragraphs.length}:${hashText(joined)}`;
}

function getImprovedParagraphs() {
  if (Array.isArray(state.improvedParagraphs) && state.improvedParagraphs.length > 0) {
    return state.improvedParagraphs;
  }

  if (!state.improvedText.trim()) return [];

  const lines = state.improvedText
    .replace(/\r/g, "")
    .split(/\n\s*\n+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return lines.length > 0 ? lines : [state.improvedText.trim()];
}

function updateRewriteStatus() {
  if (state.isRewriting && state.rewriteNotice) {
    elements.selectionStatus.textContent = state.rewriteNotice;
    return;
  }

  if (state.improvedText.trim() && state.rewriteNotice) {
    elements.selectionStatus.textContent = state.rewriteNotice;
    return;
  }

  if (state.improvedText.trim()) {
    elements.selectionStatus.textContent = "Rewritten text is available below.";
    return;
  }

  elements.selectionStatus.textContent =
    "Rewrite applies to the extracted chapter body only. The title stays unchanged.";
}

function createReadingPanel(label, items, emptyMessage, options = {}) {
  const panel = document.createElement("section");
  panel.className = "reading-panel";

  const heading = document.createElement("h2");
  heading.textContent = label;
  panel.appendChild(heading);

  const body = document.createElement("div");
  body.className = "reading-body";

  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-text";
    empty.textContent = emptyMessage;
    body.appendChild(empty);
  } else {
    for (const item of items) {
      if (item.kind === "chapter") {
        const chapterHeader = document.createElement("div");
        chapterHeader.className = "chapter-marker";
        if (Number.isInteger(item.chapterIndex)) {
          chapterHeader.dataset.chapterIndex = String(item.chapterIndex);
        }

        const headingRow = document.createElement("div");
        headingRow.className = "chapter-marker-row";

        const chapterHeading = document.createElement("h3");
        chapterHeading.textContent = item.title || "Chapter";
        chapterHeading.className = "chapter-marker-title";
        headingRow.appendChild(chapterHeading);

        if (item.url) {
          const bookmarkButton = document.createElement("button");
          bookmarkButton.type = "button";
          bookmarkButton.className = `chapter-bookmark${item.bookmarked ? " bookmarked" : ""}`;
          bookmarkButton.textContent = item.bookmarked ? "Bookmarked" : "Bookmark";
          bookmarkButton.addEventListener("click", () => {
            toggleBookmark(item).catch((error) => {
              console.warn("Failed to toggle bookmark.", error);
            });
          });
          headingRow.appendChild(bookmarkButton);
        }

        chapterHeader.appendChild(headingRow);

        if (item.url) {
          const chapterLink = document.createElement("a");
          chapterLink.href = item.url;
          chapterLink.target = "_blank";
          chapterLink.rel = "noreferrer";
          chapterLink.className = "chapter-marker-link";
          chapterLink.textContent = item.url;
          chapterHeader.appendChild(chapterLink);
        }

        body.appendChild(chapterHeader);
        continue;
      }

      const text = item.text;
      const paragraph = document.createElement("p");
      if (text) {
        paragraph.textContent = text;
      } else if (options.pendingPlaceholder) {
        paragraph.textContent = options.pendingPlaceholder;
        paragraph.className = "empty-text";
      } else {
        paragraph.textContent = "";
      }
      body.appendChild(paragraph);
    }
  }

  panel.appendChild(body);
  return panel;
}

function renderText() {
  const original = getOriginalText();
  const improved = getImprovedParagraphs();
  const originalItems = getRenderableItems(original);
  const improvedItems = getRenderableItems(improved);

  elements.paragraphs.textContent = "";
  elements.paragraphs.className = `reading-layout${
    state.viewMode === "side_by_side" ? " side-by-side" : ""
  }`;

  if (state.viewMode !== "improved") {
    elements.paragraphs.appendChild(
      createReadingPanel("Original", originalItems, "No extracted body text was found.")
    );
  }

  if (state.viewMode !== "original") {
    elements.paragraphs.appendChild(
      createReadingPanel(
        "Improved",
        improvedItems,
        "The body text has not been rewritten yet.",
        state.isRewriting ? { pendingPlaceholder: "Rewriting this paragraph..." } : {}
      )
    );
  }

  updateRewriteStatus();
}

function renderBookmarks() {
  const entries = Object.values(state.bookmarks || {}).sort((a, b) =>
    String(b.savedAt || "").localeCompare(String(a.savedAt || ""))
  );

  if (entries.length === 0) {
    elements.bookmarksPanel.hidden = true;
    elements.bookmarksList.textContent = "";
    return;
  }

  elements.bookmarksPanel.hidden = false;
  elements.bookmarksList.textContent = "";

  for (const entry of entries) {
    const article = document.createElement("article");
    article.className = "bookmark-item";

    const row = document.createElement("div");
    row.className = "bookmark-item-row";

    const title = document.createElement("h3");
    title.className = "bookmark-item-title";
    title.textContent = entry.title || "Chapter";
    row.appendChild(title);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "bookmark-item-remove";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => {
      removeBookmark(entry.url).catch((error) => {
        console.warn("Failed to remove bookmark.", error);
      });
    });
    row.appendChild(removeButton);
    article.appendChild(row);

    const link = document.createElement("a");
    link.href = entry.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.className = "bookmark-item-link";
    link.textContent = entry.url;
    article.appendChild(link);

    const meta = document.createElement("p");
    meta.className = "bookmark-item-meta";
    meta.textContent = entry.savedAt
      ? `Saved ${new Date(entry.savedAt).toLocaleString()}`
      : "Saved";
    article.appendChild(meta);

    elements.bookmarksList.appendChild(article);
  }
}

function renderResumeList() {
  const entries = Object.values(state.currentBooks || {}).sort((a, b) =>
    String(b.savedAt || "").localeCompare(String(a.savedAt || ""))
  );

  if (entries.length === 0) {
    elements.resumePanel.hidden = true;
    elements.resumeList.textContent = "";
    return;
  }

  elements.resumePanel.hidden = false;
  elements.resumeList.textContent = "";

  for (const entry of entries) {
    const article = document.createElement("article");
    article.className = "bookmark-item";

    const row = document.createElement("div");
    row.className = "bookmark-item-row";

    const title = document.createElement("h3");
    title.className = "bookmark-item-title";
    title.textContent = entry.bookTitle || "Book";
    row.appendChild(title);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "bookmark-item-remove";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => {
      removeCurrentBook(entry.bookKey).catch((error) => {
        console.warn("Failed to remove resume entry.", error);
      });
    });
    row.appendChild(removeButton);
    article.appendChild(row);

    const chapterTitle = document.createElement("p");
    chapterTitle.className = "bookmark-item-meta";
    chapterTitle.textContent = entry.chapterTitle || "Current chapter";
    article.appendChild(chapterTitle);

    const link = document.createElement("a");
    link.href = entry.chapterUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.className = "bookmark-item-link";
    link.textContent = entry.chapterUrl;
    article.appendChild(link);

    const meta = document.createElement("p");
    meta.className = "bookmark-item-meta";
    meta.textContent = entry.savedAt
      ? `Updated ${new Date(entry.savedAt).toLocaleString()}`
      : "Updated";
    article.appendChild(meta);

    elements.resumeList.appendChild(article);
  }
}

function populateSettingsForm() {
  const settings = state.settings || {};
  elements.endpoint.value = settings.endpoint || "";
  elements.model.value = settings.model || "";
  elements.apiKey.value = settings.apiKey || "";
  elements.rewriteMode.value = settings.mode || "strict_cleanup";
  elements.fontSize.value = settings.fontSize || DEFAULT_SETTINGS.fontSize;
  elements.contentWidth.value = settings.contentWidth || DEFAULT_SETTINGS.contentWidth;
  elements.pageTheme.value = settings.pageTheme || DEFAULT_SETTINGS.pageTheme;
  elements.panelTheme.value = settings.panelTheme || DEFAULT_SETTINGS.panelTheme;
  state.viewMode = settings.viewMode || DEFAULT_SETTINGS.viewMode;
  applyAppearance(settings);
}

function collectSettingsForm() {
  return {
    endpoint: elements.endpoint.value,
    model: elements.model.value,
    apiKey: elements.apiKey.value,
    mode: elements.rewriteMode.value,
    fontSize: elements.fontSize.value,
    viewMode: state.viewMode,
    contentWidth: elements.contentWidth.value,
    pageTheme: elements.pageTheme.value,
    panelTheme: elements.panelTheme.value
  };
}

function syncControls() {
  elements.toolbar.hidden = false;
  elements.settings.hidden = false;
  elements.viewMode.value = state.viewMode;
  elements.rewriteButton.disabled = state.isRewriting || getParagraphs().length === 0;
  elements.rewriteButton.textContent = state.isRewriting ? "Rewriting..." : "Rewrite text";
}

async function getStoredSettings() {
  const stored = await browser.storage.local.get(SETTINGS_KEY);
  return {
    ...DEFAULT_SETTINGS,
    ...normalizeSettings(stored[SETTINGS_KEY])
  };
}

async function saveStoredSettings(settings) {
  const next = {
    ...DEFAULT_SETTINGS,
    ...normalizeSettings(settings)
  };

  await browser.storage.local.set({
    [SETTINGS_KEY]: next
  });

  return next;
}

async function getStoredBookmarks() {
  const stored = await browser.storage.local.get(BOOKMARKS_KEY);
  return stored[BOOKMARKS_KEY] || {};
}

async function saveStoredBookmarks(bookmarks) {
  await browser.storage.local.set({
    [BOOKMARKS_KEY]: bookmarks
  });
}

async function clearStoredBookmarks() {
  await browser.storage.local.set({
    [BOOKMARKS_KEY]: {}
  });
}

async function getStoredCurrentBooks() {
  const stored = await browser.storage.local.get(CURRENT_BOOKS_KEY);
  return stored[CURRENT_BOOKS_KEY] || {};
}

async function saveStoredCurrentBooks(currentBooks) {
  await browser.storage.local.set({
    [CURRENT_BOOKS_KEY]: currentBooks
  });
}

async function clearStoredCurrentBooks() {
  await browser.storage.local.set({
    [CURRENT_BOOKS_KEY]: {}
  });
}

async function getLatestRewrite() {
  const stored = await browser.storage.local.get(LATEST_REWRITE_KEY);
  return stored[LATEST_REWRITE_KEY] || null;
}

async function saveLatestRewrite(payload) {
  await browser.storage.local.set({
    [LATEST_REWRITE_KEY]: payload
  });
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

function buildChunkPrompt(payload) {
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
    "Context paragraph before this chunk (do not rewrite, context only):",
    normalizePromptText(payload.prevText || "(none)"),
    "",
    "Context paragraph after this chunk (do not rewrite, context only):",
    normalizePromptText(payload.nextText || "(none)"),
    "",
    "Rewrite only the target paragraphs below.",
    "Preserve all names, terms, facts, counts, and timeline details exactly.",
    "Preserve comparison and quantity phrases exactly when they carry meaning, such as 'more than one', 'half an hour', and 'two and a half days'.",
    "Do not change who is speaking any quoted line.",
    "If a paragraph includes a named speaker such as 'Mu Yuan said', keep the same named speaker.",
    "Do not replace a named speaker with a pronoun or a different noun phrase.",
    "If a paragraph is only a quoted line with no speaker tag, do not add a speaker tag or narration to it.",
    "Keep the same paragraph order.",
    "Output exactly the same number of paragraphs as the input.",
    "Do not merge, split, drop, or repeat paragraphs.",
    "Do not add new descriptions, emotional flavor, or inferred meaning.",
    "Do not turn brief narration into more dramatic prose.",
    "Return each paragraph in this exact machine-readable format:",
    "[[1]] rewritten paragraph 1",
    "[[2]] rewritten paragraph 2",
    "and so on, with one blank line between paragraphs.",
    "Do not include any commentary before or after the rewritten paragraphs.",
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
    .replace(/^\[\[\d+\]\]\s*/gm, "")
    .replace(/^\d+[.)]\s+/gm, "")
    .trim();
}

function parseChunkResponse(text, expectedCount) {
  const normalized = text.replace(/\r/g, "").trim();
  const matches = Array.from(
    normalized.matchAll(/\[\[(\d+)\]\]\s*([\s\S]*?)(?=\n\s*\[\[\d+\]\]|\s*$)/g)
  );

  if (matches.length === expectedCount) {
    const byIndex = new Map();
    for (const match of matches) {
      const index = Number(match[1]);
      byIndex.set(index, stripParagraphMarkers(match[2]));
    }

    const ordered = Array.from({ length: expectedCount }, (_, index) =>
      byIndex.get(index + 1) || ""
    );

    if (ordered.every(Boolean)) return ordered;
  }

  const fallback = stripParagraphMarkers(normalized)
    .split(/\n\s*\n+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (fallback.length === expectedCount) return fallback;

  return null;
}

function getLengthRatioBounds(mode) {
  switch (mode) {
    case "natural_prose":
      return { min: 0.55, max: 1.75 };
    case "translation_repair":
      return { min: 0.6, max: 1.8 };
    case "strict_cleanup":
    default:
      return { min: 0.65, max: 1.55 };
  }
}

function extractNumericTokens(text) {
  return Array.from(new Set(text.match(/\b[A-Za-z0-9.+-]*\d[A-Za-z0-9.+-]*\b/g) || []));
}

function containsMetaText(text) {
  return /^(here(?:'| i)?s|rewritten|output|note:|explanation:|summary:)/i.test(text.trim());
}

function hasSuspiciousSpeakerChange(source, rewritten) {
  const sourceSpeakers = extractDialogueSpeakers(source);
  if (sourceSpeakers.length === 0) return false;

  return sourceSpeakers.every((speaker) => !rewritten.includes(speaker));
}

function hasInsertedDialogueAttribution(source, rewritten) {
  if (!isStandaloneQuoteParagraph(source)) return false;
  return hasDialogueAttribution(rewritten);
}

function hasSensitiveQuantityDrift(source, rewritten) {
  const phrases = extractSensitiveQuantityPhrases(source);
  if (phrases.length === 0) return [];

  const reasons = [];

  for (const phrase of phrases) {
    if (phrase.kind === "comparison") {
      const nounPattern = new RegExp(`\\b${escapeRegExp(phrase.nounPhrase)}\\b`, "i");
      if (!nounPattern.test(rewritten)) continue;

      const exactPattern = new RegExp(`\\b${escapeRegExp(phrase.full)}\\b`, "i");
      if (exactPattern.test(rewritten)) continue;

      const altPattern = new RegExp(
        `\\b(?:more than one|at least one|no more than one|no less than one)\\s+${escapeRegExp(phrase.nounPhrase)}\\b`,
        "i"
      );
      if (altPattern.test(rewritten)) {
        reasons.push(`quantity phrase changed: ${phrase.full}`);
      }
      continue;
    }

    const exactPattern = new RegExp(`\\b${escapeRegExp(phrase.full)}\\b`, "i");
    if (exactPattern.test(rewritten)) continue;

    const anchorPattern = new RegExp(`\\b${escapeRegExp(phrase.anchor)}\\b`, "i");
    if (anchorPattern.test(rewritten)) {
      reasons.push(`quantity phrase changed: ${phrase.full}`);
    }
  }

  return reasons;
}

function validateParagraphRewrite(source, rewritten, mode) {
  const original = source.trim();
  const next = rewritten.trim();
  const reasons = [];

  if (!next) {
    reasons.push("empty output");
    return { valid: false, reasons };
  }

  if (containsMetaText(next)) {
    reasons.push("meta commentary");
  }

  const { min, max } = getLengthRatioBounds(mode);
  const ratio = next.length / Math.max(original.length, 1);
  if (ratio < min || ratio > max) {
    reasons.push(`length ratio ${ratio.toFixed(2)} outside ${min}-${max}`);
  }

  const numericTokens = extractNumericTokens(original);
  const missingNumeric = numericTokens.filter((token) => !next.includes(token));
  if (missingNumeric.length > 0) {
    reasons.push(`missing numeric token(s): ${missingNumeric.join(", ")}`);
  }

  if (hasSuspiciousSpeakerChange(original, next)) {
    reasons.push("speaker attribution changed");
  }

  if (hasInsertedDialogueAttribution(original, next)) {
    reasons.push("speaker attribution added");
  }

  reasons.push(...hasSensitiveQuantityDrift(original, next));

  return {
    valid: reasons.length === 0,
    reasons
  };
}

function validateChunkRewrite(sourceParagraphs, rewrittenParagraphs, mode) {
  if (sourceParagraphs.length !== rewrittenParagraphs.length) {
    return {
      rewrittenParagraphs: sourceParagraphs,
      warnings: ["wrong paragraph count"]
    };
  }

  const warnings = [];
  const nextParagraphs = [...rewrittenParagraphs];

  for (const [index, source] of sourceParagraphs.entries()) {
    const validation = validateParagraphRewrite(source, rewrittenParagraphs[index], mode);
    if (!validation.valid) {
      warnings.push(`paragraph ${index + 1}: ${validation.reasons.join(", ")}`);
      nextParagraphs[index] = source;
    }
  }

  const protectedTerms = extractProtectedTerms(sourceParagraphs);
  if (protectedTerms.length > 0) {
    const outputText = nextParagraphs.join("\n");
    const missingProtected = protectedTerms.filter((term) => !outputText.includes(term));
    if (missingProtected.length >= 3) {
      return {
        rewrittenParagraphs: sourceParagraphs,
        warnings: [`missing protected terms: ${missingProtected.slice(0, 5).join(", ")}`]
      };
    }
  }

  return {
    rewrittenParagraphs: nextParagraphs,
    warnings
  };
}

function createChunks(paragraphs, size) {
  const chunks = [];

  for (let start = 0; start < paragraphs.length; start += size) {
    const end = Math.min(start + size, paragraphs.length);
    chunks.push({
      start,
      end,
      items: paragraphs.slice(start, end),
      prevText: paragraphs[start - 1] || "",
      nextText: paragraphs[end] || ""
    });
  }

  return chunks;
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

  throw new Error(
    "The model returned no final text. If you're using a reasoning model in LM Studio, try a non-reasoning instruct model for rewriting."
  );
}

async function rewriteChunk(payload) {
  const settings = {
    ...(await getStoredSettings()),
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
          content: buildChunkPrompt(payload)
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(await readErrorResponse(response));
  }

  return extractResponseText(await response.json());
}

async function loadCapture() {
  const stored = await browser.storage.local.get(CAPTURE_KEY);
  state.capture = stored[CAPTURE_KEY] || null;
  state.improvedText = "";
  state.improvedParagraphs = [];
  state.rewriteNotice = "";
  state.chapters = [];
  state.activeChapterIndex = -1;

  if (!state.capture) {
    elements.title.textContent = "Firefox Reader";
    elements.url.textContent = "No source page loaded.";
    elements.url.removeAttribute("href");
    setStatus("No captured page yet. Open a page and click the toolbar button.");
    return false;
  }

  elements.title.textContent = state.capture.title || "Untitled page";
  elements.url.textContent = state.capture.url || "";
  elements.url.href = state.capture.url || "#";

  if (getParagraphs().length === 0) {
    elements.title.textContent = state.capture.title || "Firefox Reader";
    elements.url.textContent = state.capture.url || "No source page loaded.";
    if (state.capture.url) {
      elements.url.href = state.capture.url;
    } else {
      elements.url.removeAttribute("href");
    }
    setStatus("No extracted paragraphs were found for this page.");
    return false;
  }

  state.chapters = [
    {
      title: state.capture.title || "Untitled page",
      url: state.capture.url || "",
      paragraphCount: getParagraphs().length,
      bookKey: state.capture.bookKey || state.capture.url || "",
      bookTitle: state.capture.bookTitle || state.capture.title || "Current book",
      bookUrl: state.capture.bookUrl || ""
    }
  ];

  setStatus("");

  if (!state.capture.nextUrl && state.chapters[0]) {
    bookmarkChapterIfNeeded(state.chapters[0]).catch((error) => {
      console.warn("Failed to auto-bookmark the last chapter.", error);
    });
  }
  return true;
}

async function loadSettings() {
  state.settings = await getStoredSettings();
  populateSettingsForm();
}

async function loadBookmarks() {
  state.bookmarks = await getStoredBookmarks();
  renderBookmarks();
}

async function loadCurrentBooks() {
  state.currentBooks = await getStoredCurrentBooks();
  renderResumeList();
}

async function clearBookmarks() {
  state.bookmarks = {};
  await clearStoredBookmarks();
  renderBookmarks();
  renderText();
}

async function clearResumeList() {
  state.currentBooks = {};
  await clearStoredCurrentBooks();
  renderResumeList();
}

async function removeBookmark(url) {
  if (!url || !state.bookmarks[url]) return;

  const nextBookmarks = {
    ...state.bookmarks
  };
  delete nextBookmarks[url];
  state.bookmarks = nextBookmarks;
  await saveStoredBookmarks(nextBookmarks);
  renderBookmarks();
  renderText();
}

async function removeCurrentBook(bookKey) {
  if (!bookKey || !state.currentBooks[bookKey]) return;

  const nextCurrentBooks = {
    ...state.currentBooks
  };
  delete nextCurrentBooks[bookKey];
  state.currentBooks = nextCurrentBooks;
  await saveStoredCurrentBooks(nextCurrentBooks);
  renderResumeList();
}

async function restoreLatestRewriteForCurrentPage() {
  if (!state.capture?.url) return;

  const cached = await getLatestRewrite();
  if (!cached) return;

  const originalParagraphs = getOriginalText();
  const sourceSignature = getSourceSignature(originalParagraphs);
  if (cached.url !== state.capture.url || cached.sourceSignature !== sourceSignature) {
    return;
  }

  const improvedParagraphs = Array.isArray(cached.improvedParagraphs)
    ? cached.improvedParagraphs.filter((item) => typeof item === "string")
    : [];
  if (improvedParagraphs.length !== originalParagraphs.length) return;

  state.improvedParagraphs = improvedParagraphs;
  state.improvedText =
    typeof cached.improvedText === "string" && cached.improvedText.trim()
      ? cached.improvedText
      : improvedParagraphs.join("\n\n");
  state.rewriteNotice = "Loaded the latest saved rewrite for this page.";
}

async function toggleBookmark(chapter) {
  if (!chapter?.url) return;

  const bookmarks = {
    ...state.bookmarks
  };

  if (bookmarks[chapter.url]) {
    delete bookmarks[chapter.url];
  } else {
    bookmarks[chapter.url] = {
      title: chapter.title || "Chapter",
      url: chapter.url,
      savedAt: new Date().toISOString()
    };
  }

  state.bookmarks = bookmarks;
  await saveStoredBookmarks(bookmarks);
  renderBookmarks();
  renderText();
}

async function bookmarkChapterIfNeeded(chapter) {
  if (!chapter?.url) return;
  if (state.bookmarks[chapter.url]) return;

  state.bookmarks = {
    ...state.bookmarks,
    [chapter.url]: {
      title: chapter.title || "Chapter",
      url: chapter.url,
      savedAt: new Date().toISOString()
    }
  };

  await saveStoredBookmarks(state.bookmarks);
  renderBookmarks();
  renderText();
}

async function setCurrentChapterForBook(chapter) {
  if (!chapter?.bookKey || !chapter?.url) return;

  state.currentBooks = {
    ...state.currentBooks,
    [chapter.bookKey]: {
      bookKey: chapter.bookKey,
      bookTitle: chapter.bookTitle || chapter.title || "Current book",
      bookUrl: chapter.bookUrl || "",
      chapterTitle: chapter.title || "Chapter",
      chapterUrl: chapter.url,
      savedAt: new Date().toISOString()
    }
  };

  await saveStoredCurrentBooks(state.currentBooks);
  renderResumeList();
}

function getTrackingPanelSelector() {
  if (state.viewMode === "original" || !state.improvedText.trim()) {
    return ".reading-panel:first-child";
  }

  if (state.viewMode === "improved") {
    return ".reading-panel:first-child";
  }

  return ".reading-panel:last-child";
}

function getTrackedChapterHeaders() {
  const panel = elements.paragraphs.querySelector(getTrackingPanelSelector());
  if (!panel) return [];
  return Array.from(panel.querySelectorAll(".chapter-marker[data-chapter-index]"));
}

function getChapterIndexInView() {
  const headers = getTrackedChapterHeaders();
  if (headers.length === 0) return 0;

  const threshold = Math.min(180, Math.max(96, window.innerHeight * 0.22));
  let selected = Number(headers[0].dataset.chapterIndex || 0);

  for (const header of headers) {
    const rect = header.getBoundingClientRect();
    const chapterIndex = Number(header.dataset.chapterIndex || 0);
    if (rect.top <= threshold) {
      selected = chapterIndex;
    } else {
      break;
    }
  }

  return selected;
}

function scheduleCurrentChapterUpdate() {
  if (state.scrollTicking) return;
  state.scrollTicking = true;

  window.requestAnimationFrame(() => {
    state.scrollTicking = false;
    updateCurrentChapterFromViewport().catch((error) => {
      console.warn("Failed to update current chapter.", error);
    });
  });
}

async function updateCurrentChapterFromViewport() {
  const chapterIndex = getChapterIndexInView();
  if (!Number.isInteger(chapterIndex) || chapterIndex < 0) return;
  if (chapterIndex >= state.chapters.length) return;
  if (state.activeChapterIndex === chapterIndex) return;

  state.activeChapterIndex = chapterIndex;
  await setCurrentChapterForBook(state.chapters[chapterIndex]);
}

function canAutoRewrite() {
  const settings = state.settings || {};
  return Boolean(settings.endpoint && settings.model);
}

function updateImprovedTextFromParagraphs() {
  state.improvedText = state.improvedParagraphs.join("\n\n");
}

async function rewriteParagraphBatch(paragraphs, options = {}) {
  if (!Array.isArray(paragraphs) || paragraphs.length === 0) {
    return { rewrittenParagraphs: [], warnings: [] };
  }

  const chunks = createChunks(paragraphs, REWRITE_CHUNK_SIZE);
  if (options.prevText && chunks[0]) {
    chunks[0].prevText = options.prevText;
  }
  if (options.nextText && chunks[chunks.length - 1]) {
    chunks[chunks.length - 1].nextText = options.nextText;
  }

  const rewrittenParagraphs = [];
  const validationWarnings = [];

  for (const [index, chunk] of chunks.entries()) {
    if (typeof options.onChunkStart === "function") {
      options.onChunkStart(index, chunks.length, chunk);
    }

    const chunkText = await rewriteChunk({
      title: options.title || state.capture?.title,
      url: options.url || state.capture?.url,
      mode: elements.rewriteMode.value,
      paragraphs: chunk.items,
      prevText: chunk.prevText,
      nextText: chunk.nextText,
      settings: collectSettingsForm()
    });

    const parsed = parseChunkResponse(chunkText, chunk.items.length);
    if (!parsed) {
      validationWarnings.push(
        `Chunk ${index + 1} returned the wrong paragraph structure, so the original text was kept for that chunk.`
      );
      rewrittenParagraphs.push(...chunk.items);
      if (typeof options.onChunkComplete === "function") {
        options.onChunkComplete(index, chunk.start, chunk.items, {
          usedFallback: true,
          warnings: validationWarnings
        });
      }
      continue;
    }

    const validated = validateChunkRewrite(chunk.items, parsed, elements.rewriteMode.value);
    if (validated.warnings.length > 0) {
      validationWarnings.push(`Chunk ${index + 1}: ${validated.warnings.join("; ")}`);
    }

    rewrittenParagraphs.push(...validated.rewrittenParagraphs);
    if (typeof options.onChunkComplete === "function") {
      options.onChunkComplete(index, chunk.start, validated.rewrittenParagraphs, {
        usedFallback: false,
        warnings: validated.warnings
      });
    }
  }

  return {
    rewrittenParagraphs,
    warnings: validationWarnings
  };
}

async function saveSettings() {
  elements.saveSettings.disabled = true;
  elements.settingsStatus.textContent = "Saving...";

  try {
    state.settings = await saveStoredSettings(collectSettingsForm());

    populateSettingsForm();
    elements.settingsStatus.textContent = "Saved.";
  } catch (error) {
    elements.settingsStatus.textContent = "Failed to save settings.";
    setError(error.message || "Failed to save settings.");
  } finally {
    elements.saveSettings.disabled = false;
  }
}

async function rewriteText() {
  if (state.isRewriting || getParagraphs().length === 0) return;

  state.isRewriting = true;
  state.improvedText = "";
  state.improvedParagraphs = [];
  state.rewriteNotice = "Preparing rewrite...";
  elements.settingsStatus.textContent = "";
  setError("");
  renderText();
  syncControls();

  try {
    const paragraphs = getRewritableParagraphs();
    state.improvedParagraphs = Array(paragraphs.length).fill("");
    const result = await rewriteParagraphBatch(paragraphs, {
      title: state.capture.title,
      url: state.capture.url,
      onChunkStart: (index, total) => {
        state.rewriteNotice = `Rewriting chunk ${index + 1} of ${total}...`;
        renderText();
      },
      onChunkComplete: (_index, start, chunkParagraphs) => {
        for (const [itemIndex, text] of chunkParagraphs.entries()) {
          state.improvedParagraphs[start + itemIndex] = text;
        }
        renderText();
      }
    });

    state.improvedParagraphs = [...result.rewrittenParagraphs];
    updateImprovedTextFromParagraphs();
    state.settings.mode = elements.rewriteMode.value;
    state.rewriteNotice = "Rewritten text is available below.";
    if (result.warnings.length > 0) {
      console.warn("Rewrite validation warnings:", result.warnings);
    }
    await saveLatestRewrite({
      url: state.capture.url,
      sourceSignature: getSourceSignature(paragraphs),
      improvedText: state.improvedText,
      improvedParagraphs: [...result.rewrittenParagraphs],
      savedAt: new Date().toISOString()
    });
    renderText();
    scheduleCurrentChapterUpdate();
  } catch (error) {
    state.rewriteNotice = "";
    setError(error.message || "Rewrite failed.");
  } finally {
    state.isRewriting = false;
    updateRewriteStatus();
    syncControls();
  }
}

async function loadNextChapter() {
  if (state.isAppendingNext || state.isRewriting) return;
  if (!state.capture?.nextUrl) return;

  state.isAppendingNext = true;
  state.rewriteNotice = "Loading the next chapter...";
  renderText();

  try {
    const payload = await browser.runtime.sendMessage({
      type: "CAPTURE_URL",
      url: state.capture.nextUrl
    });

    if (!payload?.paragraphs?.length) {
      throw new Error("The next chapter could not be extracted.");
    }

    const nextParagraphs = payload.paragraphs.map((item) =>
      typeof item === "string" ? item : item?.text || ""
    ).filter(Boolean);
    const originalParagraphs = getParagraphs();
    const previousText = getLastRealParagraphText(originalParagraphs);

    state.capture.paragraphs = [...originalParagraphs, ...nextParagraphs].map((item, index) =>
      typeof item === "string" ? { id: `p${index + 1}`, text: item } : item
    );
    state.capture.nextUrl = payload.nextUrl || "";
    state.chapters.push({
      title: payload.title || payload.url || "Next chapter",
      url: payload.url || "",
      paragraphCount: nextParagraphs.length,
      bookKey: state.capture.bookKey || payload.bookKey || payload.url || "",
      bookTitle: state.capture.bookTitle || payload.bookTitle || payload.title || "Current book",
      bookUrl: state.capture.bookUrl || payload.bookUrl || ""
    });

    const improvedExists =
      state.improvedParagraphs.length > 0 || Boolean(state.improvedText.trim());

    if (improvedExists) {
      if (state.improvedParagraphs.length === 0) {
        state.improvedParagraphs = getImprovedParagraphs();
      }

      const markerIndex = state.improvedParagraphs.length;
      state.improvedParagraphs.push(...Array(nextParagraphs.length).fill(""));
      updateImprovedTextFromParagraphs();
      renderText();

      if (canAutoRewrite()) {
        const result = await rewriteParagraphBatch(nextParagraphs, {
          title: payload.title,
          url: payload.url,
          prevText: previousText,
          onChunkStart: (index, total) => {
            state.rewriteNotice = `Loading next chapter: rewriting chunk ${index + 1} of ${total}...`;
            renderText();
          },
          onChunkComplete: (_index, start, chunkParagraphs) => {
            for (const [itemIndex, text] of chunkParagraphs.entries()) {
              state.improvedParagraphs[markerIndex + start + itemIndex] = text;
            }
            updateImprovedTextFromParagraphs();
            renderText();
          }
        });

        if (result.warnings.length > 0) {
          console.warn("Next chapter rewrite validation warnings:", result.warnings);
        }

        updateImprovedTextFromParagraphs();
        state.rewriteNotice = "Loaded the next chapter.";
      } else {
        state.improvedParagraphs.splice(markerIndex, nextParagraphs.length);
        updateImprovedTextFromParagraphs();
        state.rewriteNotice = "Loaded the next chapter.";
      }
    } else {
      state.rewriteNotice = "Loaded the next chapter.";
    }

    if (!state.capture.nextUrl) {
      await bookmarkChapterIfNeeded(state.chapters[state.chapters.length - 1]);
    }

    renderText();
    scheduleCurrentChapterUpdate();
    maybeLoadNextChapterSoon();
  } catch (error) {
    console.warn("Failed to append the next chapter.", error);
    state.rewriteNotice = "Reached the end of the current loaded content.";
    state.capture.nextUrl = "";
    await bookmarkChapterIfNeeded(state.chapters[state.chapters.length - 1]);
    renderText();
    scheduleCurrentChapterUpdate();
  } finally {
    state.isAppendingNext = false;
  }
}

function maybeLoadNextChapterSoon() {
  if (state.isAppendingNext || state.isRewriting) return;
  if (!state.capture?.nextUrl) return;

  const nearBottom =
    window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 600;
  if (nearBottom) {
    loadNextChapter().catch((error) => {
      console.warn("Failed to load the next chapter.", error);
    });
  }
}

function bindEvents() {
  elements.viewMode.addEventListener("change", async () => {
    state.viewMode = elements.viewMode.value;
    renderText();
    scheduleCurrentChapterUpdate();

    if (!state.settings) return;
    state.settings.viewMode = state.viewMode;

    try {
      state.settings = await saveStoredSettings({
        ...state.settings,
        viewMode: state.viewMode
      });
    } catch (error) {
      console.warn("Failed to save view mode preference.", error);
    }
  });

  elements.rewriteMode.addEventListener("change", () => {
    if (state.settings) {
      state.settings.mode = elements.rewriteMode.value;
    }
  });

  elements.fontSize.addEventListener("change", async () => {
    if (!state.settings) return;
    state.settings.fontSize = elements.fontSize.value;
    applyAppearance(state.settings);

    try {
      state.settings = await saveStoredSettings({
        ...state.settings,
        fontSize: elements.fontSize.value
      });
    } catch (error) {
      console.warn("Failed to save font size preference.", error);
    }
  });

  elements.contentWidth.addEventListener("change", async () => {
    if (!state.settings) return;
    state.settings.contentWidth = elements.contentWidth.value;
    applyAppearance(state.settings);

    try {
      state.settings = await saveStoredSettings({
        ...state.settings,
        contentWidth: elements.contentWidth.value
      });
    } catch (error) {
      console.warn("Failed to save content width preference.", error);
    }
  });

  elements.pageTheme.addEventListener("change", async () => {
    if (!state.settings) return;
    state.settings.pageTheme = elements.pageTheme.value;
    applyAppearance(state.settings);

    try {
      state.settings = await saveStoredSettings({
        ...state.settings,
        pageTheme: elements.pageTheme.value
      });
    } catch (error) {
      console.warn("Failed to save page theme preference.", error);
    }
  });

  elements.panelTheme.addEventListener("change", async () => {
    if (!state.settings) return;
    state.settings.panelTheme = elements.panelTheme.value;
    applyAppearance(state.settings);

    try {
      state.settings = await saveStoredSettings({
        ...state.settings,
        panelTheme: elements.panelTheme.value
      });
    } catch (error) {
      console.warn("Failed to save panel theme preference.", error);
    }
  });

  elements.rewriteButton.addEventListener("click", () => {
    rewriteText().catch((error) => {
      setError(error.message || "Rewrite failed.");
      state.isRewriting = false;
      syncControls();
    });
  });

  elements.saveSettings.addEventListener("click", () => {
    saveSettings().catch((error) => {
      elements.settingsStatus.textContent = "Failed to save settings.";
      setError(error.message || "Failed to save settings.");
    });
  });

  elements.clearBookmarks.addEventListener("click", () => {
    clearBookmarks().catch((error) => {
      console.warn("Failed to clear bookmarks.", error);
    });
  });

  elements.clearResume.addEventListener("click", () => {
    clearResumeList().catch((error) => {
      console.warn("Failed to clear resume reading.", error);
    });
  });

  window.addEventListener("scroll", () => {
    maybeLoadNextChapterSoon();
    scheduleCurrentChapterUpdate();
  });
}

async function init() {
  cacheElements();
  bindEvents();

  await loadBookmarks();
  await loadCurrentBooks();
  await loadSettings();
  const hasCapture = await loadCapture();
  if (!hasCapture) {
    syncControls();
    renderText();
    return;
  }
  await restoreLatestRewriteForCurrentPage();
  syncControls();
  renderText();
  scheduleCurrentChapterUpdate();

  if (!state.improvedText.trim() && canAutoRewrite() && !state.autoRewriteStarted) {
    state.autoRewriteStarted = true;
    rewriteText().catch((error) => {
      setError(error.message || "Rewrite failed.");
      state.isRewriting = false;
      syncControls();
    });
  } else {
    maybeLoadNextChapterSoon();
  }
}

init().catch((error) => {
  cacheElements();
  setStatus("Failed to load reader data.");
  setError(error.message || "Reader init error.");
  console.error("Reader init error:", error);
});
