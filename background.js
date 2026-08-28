const CAPTURE_KEY = "lastCapture";
const CHAPTER_FETCH_TIMEOUT_MS = 30000;
const CHALLENGE_TITLE_PATTERN =
  /^(?:access denied|attention required|checking your browser|just a moment|security check|verify you are human)/i;
const CHALLENGE_TEXT_PATTERNS = [
  /\bcaptcha\b/i,
  /\bcloudflare\b/i,
  /\bi(?:'|’)m not a robot\b/i,
  /\bsecurity check\b/i,
  /\bverify (?:that )?you are human\b/i,
  /\babnormal activity\b/i
];

function normalizeParagraphs(paragraphs) {
  return (Array.isArray(paragraphs) ? paragraphs : [])
    .map((item, index) => ({
      id: typeof item === "object" && item?.id ? item.id : `p${index + 1}`,
      text: String(typeof item === "object" ? item?.text || "" : item || "").trim()
    }))
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

function isAccessChallenge(capture) {
  if (CHALLENGE_TITLE_PATTERN.test(String(capture?.title || "").trim())) return true;
  const text = (capture?.paragraphs || [])
    .map((item) => (typeof item === "object" ? item?.text : item))
    .join("\n");
  return CHALLENGE_TEXT_PATTERNS.filter((pattern) => pattern.test(text)).length >= 2;
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function captureFromFetchedHtml(url) {
  const response = await fetchWithTimeout(
    url,
    { credentials: "include", redirect: "follow" },
    CHAPTER_FETCH_TIMEOUT_MS
  );
  if (!response.ok) throw new Error(`Chapter request failed with status ${response.status}.`);

  const finalUrl = response.url || url;
  const document = new DOMParser().parseFromString(await response.text(), "text/html");
  return normalizeCapture(new ChapterExtractor(document, finalUrl).extract());
}

async function captureFromTab(tabId) {
  try {
    return await browser.tabs.sendMessage(tabId, { type: "CAPTURE_MINIMAL" });
  } catch (error) {
    return null;
  }
}

async function injectCaptureScripts(tabId) {
  try {
    await browser.scripting.executeScript({
      target: { tabId },
      files: ["chapter-extractor.js", "content.js"]
    });
    return true;
  } catch (error) {
    return false;
  }
}

async function waitForTabComplete(tabId, currentStatus) {
  if (currentStatus === "complete") return;
  await new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timeoutId);
      browser.tabs.onUpdated.removeListener(onUpdated);
      resolve();
    };
    const onUpdated = (updatedTabId, changeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === "complete") finish();
    };
    const timeoutId = setTimeout(finish, 15000);
    browser.tabs.onUpdated.addListener(onUpdated);
  });
}

function redirectedAwayFromChapter(requestedUrl, capture) {
  return Boolean(
    ChapterExtractor.isLikelyChapterUrl(requestedUrl) &&
      capture?.url &&
      capture.url !== requestedUrl &&
      !ChapterExtractor.isLikelyChapterUrl(capture.url)
  );
}

async function captureFromHiddenTab(url) {
  const tab = await browser.tabs.create({ url, active: false });
  try {
    if (tab.id != null) await browser.tabs.hide(tab.id).catch(() => {});
    await waitForTabComplete(tab.id, tab.status);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const capture = normalizeCapture(await captureFromTab(tab.id));
      if (capture.paragraphs.length && !isAccessChallenge(capture)) return capture;
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
    return normalizeCapture({ url, title: tab.title });
  } finally {
    if (tab.id != null) await browser.tabs.remove(tab.id).catch(() => {});
  }
}

async function captureFromUrl(url) {
  let capture;
  try {
    capture = await captureFromFetchedHtml(url);
    if (!capture.paragraphs.length || isAccessChallenge(capture)) {
      throw new Error("Fetched page did not contain accessible chapter text.");
    }
  } catch (error) {
    capture = await captureFromHiddenTab(url);
  }

  if (redirectedAwayFromChapter(url, capture)) {
    return normalizeCapture({ url: capture.url, title: capture.title });
  }
  return capture;
}

async function captureClickedTab(tab) {
  let capture = await captureFromTab(tab.id);
  if (!capture && tab.id != null && (await injectCaptureScripts(tab.id))) {
    capture = await captureFromTab(tab.id);
  }

  const normalized = normalizeCapture(capture);
  if (normalized.paragraphs.length && !isAccessChallenge(normalized)) return normalized;
  if (/^https?:/i.test(tab.url || "")) {
    try {
      return await captureFromUrl(tab.url);
    } catch (error) {
      // Fall through to a useful empty capture when the page cannot be accessed.
    }
  }
  return normalizeCapture({ url: tab.url, title: tab.title });
}

async function openReader(payload) {
  await browser.storage.local.set({
    [CAPTURE_KEY]: {
      ...normalizeCapture(payload),
      capturedAt: new Date().toISOString()
    }
  });
  await browser.tabs.create({ url: browser.runtime.getURL("reader.html") });
}

browser.action.onClicked.addListener(async (tab) => {
  await openReader(await captureClickedTab(tab));
});

browser.runtime.onMessage.addListener((message) => {
  if (message?.type !== "CAPTURE_URL") return undefined;
  return captureFromUrl(message.url);
});
