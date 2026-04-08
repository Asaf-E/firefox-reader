const NOISE_PATTERN =
  /(^|[\s_-])(comment|comments|reply|replies|discussion|disqus|wpd|wpdiscuz|sidebar|widget|related|recommend|share|social|footer|breadcrumb|menu|nav|login|register|signup|signin|modal|popup|toolbar|tag|genre)([\s_-]|$)/i;

const PRIMARY_CONTAINER_SELECTORS = [
  ".read-container .text-left",
  ".entry-content .text-left",
  ".read-container .reading-content",
  ".entry-content .reading-content",
  ".chapter-content",
  ".entry-content",
  "article",
  "main article",
  "[role='main'] article",
  "main"
];

function isVisible(node) {
  const style = window.getComputedStyle(node);
  return style.display !== "none" && style.visibility !== "hidden";
}

function hasNoiseMarker(node) {
  const id = node.id || "";
  const className =
    typeof node.className === "string" ? node.className : node.className?.baseVal || "";
  const marker = `${id} ${className}`.toLowerCase();
  return NOISE_PATTERN.test(marker);
}

function isInsideNoiseContainer(node) {
  let current = node.parentElement;
  while (current) {
    if (hasNoiseMarker(current)) return true;
    current = current.parentElement;
  }
  return false;
}

function normalizeText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function extractParagraphsFromText(text) {
  const chunks = text
    .replace(/\r/g, "")
    .split(/\n\s*\n+/)
    .map((line) => normalizeText(line))
    .filter((line) => line.length >= 20);

  return Array.from(new Set(chunks));
}

function collectParagraphsFrom(container) {
  const nodes = Array.from(container.querySelectorAll("p"));
  const paragraphs = [];
  const seen = new Set();

  for (const node of nodes) {
    if (!isVisible(node)) continue;
    if (isInsideNoiseContainer(node)) continue;

    const value = normalizeText(node.textContent || "");
    if (value.length < 20) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    paragraphs.push(value);
  }

  return paragraphs;
}

function isBadTag(node) {
  const tag = node.tagName;
  return (
    tag === "NAV" ||
    tag === "ASIDE" ||
    tag === "FOOTER" ||
    tag === "HEADER" ||
    tag === "FORM"
  );
}

function getLinkDensity(node) {
  const textLength = normalizeText(node.textContent || "").length;
  if (textLength === 0) return 0;

  const linkText = Array.from(node.querySelectorAll("a"))
    .map((a) => normalizeText(a.textContent || "").length)
    .reduce((sum, n) => sum + n, 0);

  return linkText / textLength;
}

function addScore(scores, node, amount) {
  if (!node || isBadTag(node) || hasNoiseMarker(node) || !isVisible(node)) return;
  scores.set(node, (scores.get(node) || 0) + amount);
}

function pickPreferredContainer() {
  for (const selector of PRIMARY_CONTAINER_SELECTORS) {
    const candidates = Array.from(document.querySelectorAll(selector));
    for (const candidate of candidates) {
      if (!isVisible(candidate)) continue;
      if (hasNoiseMarker(candidate)) continue;

      const paragraphs = collectParagraphsFrom(candidate);
      if (paragraphs.length >= 3) return candidate;

      const textParagraphs = extractParagraphsFromText(candidate.innerText || "");
      if (textParagraphs.length >= 3) return candidate;
    }
  }
  return null;
}

function pickMainContainer() {
  const preferred = pickPreferredContainer();
  if (preferred) return preferred;

  const paragraphNodes = Array.from(document.querySelectorAll("p")).filter((node) => {
    if (!isVisible(node)) return false;
    if (isInsideNoiseContainer(node)) return false;
    return normalizeText(node.textContent || "").length >= 20;
  });

  const scores = new Map();

  for (const node of paragraphNodes) {
    const textLength = normalizeText(node.textContent || "").length;
    const baseScore = 1 + Math.min(3, Math.floor(textLength / 140));

    addScore(scores, node.parentElement, baseScore);
    addScore(scores, node.parentElement?.parentElement || null, baseScore * 0.5);
  }

  let best = null;
  let bestScore = -1;

  for (const [candidate, score] of scores.entries()) {
    const linkPenalty = 1 - Math.min(getLinkDensity(candidate), 0.9);
    const finalScore = score * linkPenalty;
    if (finalScore > bestScore) {
      best = candidate;
      bestScore = finalScore;
    }
  }

  // Fallback for sites that use div/br text blocks instead of <p>.
  if (!best) {
    const selector = "article, main, [role='main'], section, div";
    const candidates = Array.from(document.querySelectorAll(selector)).filter((node) => {
      if (!isVisible(node)) return false;
      if (isBadTag(node)) return false;
      if (hasNoiseMarker(node)) return false;
      return true;
    });

    for (const candidate of candidates) {
      const paragraphs = extractParagraphsFromText(candidate.innerText || "");
      if (paragraphs.length < 4) continue;

      const totalChars = paragraphs.reduce((sum, p) => sum + p.length, 0);
      const linkPenalty = 1 - Math.min(getLinkDensity(candidate), 0.9);
      const score = (paragraphs.length * 80 + totalChars) * linkPenalty;

      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
  }

  return best ?? document.body;
}

function collectVisibleParagraphs(mainContainer) {
  const main = collectParagraphsFrom(mainContainer);
  if (main.length >= 3) return main;

  const mainText = extractParagraphsFromText(mainContainer.innerText || "");
  if (mainText.length >= 3) return mainText;

  if (mainContainer !== document.body) return [];

  // Last resort fallback for pages where no main container was found.
  const fromBodyP = collectParagraphsFrom(document.body);
  if (fromBodyP.length > 0) return fromBodyP;

  return extractParagraphsFromText(document.body.innerText || "");
}

function normalizeTitleCandidate(rawTitle) {
  const title = normalizeText(rawTitle || "");
  if (!title) return "";

  if (title.includes(" | ")) {
    const parts = title.split(" | ").map((p) => normalizeText(p)).filter(Boolean);
    const chapterIndex = parts.findIndex((p) => /chapter|ch\./i.test(p));
    if (chapterIndex > 0) return `${parts[chapterIndex - 1]} | ${parts[chapterIndex]}`;
    return parts[0] || title;
  }

  if (title.includes(" - ")) {
    const parts = title.split(" - ").map((p) => normalizeText(p)).filter(Boolean);
    const chapterIndex = parts.findIndex((p) => /chapter|ch\./i.test(p));
    if (chapterIndex > 0) {
      const chapterParts = [parts[chapterIndex - 1], parts[chapterIndex]];
      if (parts[chapterIndex + 1] && !/wuxiaworld|site|novel|read/i.test(parts[chapterIndex + 1])) {
        chapterParts.push(parts[chapterIndex + 1]);
      }
      return chapterParts.join(" - ");
    }
    if (/chapter|ch\./i.test(parts[0] || "")) return parts.slice(0, 2).join(" - ");
    return parts[0] || title;
  }

  return title;
}

function getTitle(mainContainer) {
  const candidates = [];
  const headings = Array.from(
    document.querySelectorAll("h1, h2, h3, main h2, main h3, article h2, article h3")
  );

  for (const heading of headings) {
    if (!isVisible(heading)) continue;
    if (isInsideNoiseContainer(heading)) continue;
    const value = normalizeText(heading.textContent || "");
    if (value) candidates.push(value);
  }

  if (mainContainer) {
    const localHeading = mainContainer.querySelector("h1, h2, h3");
    const value = normalizeText(localHeading?.textContent || "");
    if (value) candidates.push(value);
  }

  const ogTitle = document.querySelector("meta[property='og:title']")?.content || "";
  if (ogTitle) candidates.push(ogTitle);

  candidates.push(document.title || "");

  const normalized = candidates
    .map((title) => normalizeTitleCandidate(title))
    .filter(Boolean);

  let best = "";
  let bestScore = -1;
  for (const candidate of normalized) {
    const chapterBonus = /chapter|ch\./i.test(candidate) ? 100 : 0;
    const score = chapterBonus + Math.min(candidate.length, 140);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return best || "Untitled page";
}

function normalizeBookTitleCandidate(text) {
  const value = normalizeText(text || "");
  if (!value) return "";

  const chapterMatch = value.match(/^(.*?)(?:\s*[-|:]\s*)?(?:chapter|ch\.?)\b/i);
  if (chapterMatch?.[1]) {
    return normalizeText(chapterMatch[1]);
  }

  return value;
}

function inferBookKeyFromUrl(url) {
  try {
    const parsed = new URL(url);
    const chapterNovelMatch = parsed.pathname.match(/^(\/novel\/[^/]+)\//i);
    if (chapterNovelMatch) {
      return `${parsed.origin}${chapterNovelMatch[1]}/`;
    }

    const htmlMatch = parsed.pathname.match(/^(\/[^/]+)\/\d+\.html$/i);
    if (htmlMatch) {
      return `${parsed.origin}${htmlMatch[1]}/`;
    }

    const chapterPairMatch = parsed.pathname.match(/^\/chapter\/(\d+)-\d+\/?$/i);
    if (chapterPairMatch) {
      return `${parsed.origin}/book/${chapterPairMatch[1]}`;
    }

    return `${parsed.origin}${parsed.pathname}`;
  } catch (error) {
    return url;
  }
}

function getBookInfo(mainContainer, chapterTitle) {
  const normalizedChapterTitle = normalizeBookTitleCandidate(chapterTitle);
  const candidates = Array.from(document.querySelectorAll("a[href]"));
  let bestUrl = "";
  let bestTitle = normalizedChapterTitle;
  let bestScore = 0;

  for (const link of candidates) {
    const href = absoluteUrl(link.getAttribute("href") || "");
    if (!href) continue;
    if (href === window.location.href) continue;
    if (!/^https?:/i.test(href)) continue;
    if (/chapter-\d+|\/chapter\/\d+-\d+|\/\d+\.html$/i.test(new URL(href).pathname)) continue;

    const text = normalizeText(link.textContent || "");
    if (text.length < 3) continue;

    const normalizedText = normalizeBookTitleCandidate(text);
    let score = 0;
    if (normalizedChapterTitle && normalizedText && normalizedChapterTitle === normalizedText) {
      score += 260;
    } else if (normalizedChapterTitle && normalizedText && normalizedChapterTitle.includes(normalizedText)) {
      score += 180;
    }

    if (link.closest("nav, .breadcrumb, .breadcrumbs, .post-title, .summary__content, .series, .novel")) {
      score += 50;
    }
    if (mainContainer && mainContainer.contains(link)) score += 10;
    if (!isVisible(link)) score -= 30;
    if (isInsideNoiseContainer(link)) score -= 60;

    try {
      const target = new URL(href);
      if (target.origin === window.location.origin) score += 40;
      if (/\/novel\//i.test(target.pathname)) score += 60;
      if (/\/book\//i.test(target.pathname)) score += 30;
    } catch (error) {
      score -= 20;
    }

    if (score > bestScore) {
      bestScore = score;
      bestUrl = href;
      bestTitle = normalizedText || text;
    }
  }

  const inferredBookKey = inferBookKeyFromUrl(window.location.href);
  const shouldTrustDetectedBookUrl =
    bestScore >= 220 &&
    !!bestUrl &&
    (() => {
      try {
        const { pathname } = new URL(bestUrl);
        return /\/novel\//i.test(pathname) || /\/book\//i.test(pathname);
      } catch (error) {
        return false;
      }
    })();

  const bookKey = shouldTrustDetectedBookUrl ? bestUrl : inferredBookKey;
  const bookTitle = bestTitle || normalizedChapterTitle || "Current book";

  return {
    bookKey,
    bookTitle,
    bookUrl: shouldTrustDetectedBookUrl ? bestUrl : ""
  };
}

function absoluteUrl(href) {
  try {
    return new URL(href, window.location.href).href;
  } catch (error) {
    return "";
  }
}

function inferNextChapterUrl() {
  const current = window.location.href;
  const chapterDashMatch = current.match(/(chapter-)(\d+)(\/?$)/i);
  if (chapterDashMatch) {
    const next = String(Number(chapterDashMatch[2]) + 1);
    return current.replace(/(chapter-)(\d+)(\/?$)/i, `$1${next}$3`);
  }

  const chapterPairMatch = current.match(/(\/chapter\/\d+-)(\d+)(\/?$)/i);
  if (chapterPairMatch) {
    const next = String(Number(chapterPairMatch[2]) + 1);
    return current.replace(/(\/chapter\/\d+-)(\d+)(\/?$)/i, `$1${next}$3`);
  }

  return "";
}

function getNextChapterUrl(mainContainer) {
  const candidates = Array.from(document.querySelectorAll("a[href]"));
  let bestUrl = "";
  let bestScore = 0;

  for (const link of candidates) {
    if (!isVisible(link)) continue;

    const href = absoluteUrl(link.getAttribute("href") || "");
    if (!href) continue;
    if (href === window.location.href) continue;
    if (!/^https?:/i.test(href)) continue;

    const text = normalizeText(link.textContent || "");
    const label = `${text} ${link.getAttribute("aria-label") || ""} ${link.getAttribute("title") || ""}`;
    const marker = `${label} ${link.rel || ""} ${link.className || ""} ${link.id || ""}`.toLowerCase();

    let score = 0;
    if (link.rel === "next") score += 300;
    if (/\bnext\b|\bnext chapter\b|\bchapter next\b|›|»|→/i.test(marker)) score += 180;
    if (/(^|[\s_-])(next|nextchap|nextchapter)([\s_-]|$)/i.test(marker)) score += 120;
    if (mainContainer && mainContainer.contains(link)) score += 25;
    if (link.closest(".pagination, .nav-links, .chapter-nav, .wp-manga-chapter-nav, .post-nav")) {
      score += 40;
    }
    if (isInsideNoiseContainer(link) && score < 180) score -= 120;

    try {
      const target = new URL(href);
      if (target.origin === window.location.origin) score += 40;
      if (target.pathname.includes("/chapter") || /chapter-\d+/i.test(target.pathname)) {
        score += 60;
      }
    } catch (error) {
      score -= 20;
    }

    if (score > bestScore) {
      bestScore = score;
      bestUrl = href;
    }
  }

  if (bestScore >= 120) return bestUrl;
  return inferNextChapterUrl();
}

browser.runtime.onMessage.addListener((message) => {
  if (message?.type !== "CAPTURE_MINIMAL") return undefined;
  const mainContainer = pickMainContainer();

  return Promise.resolve({
    url: window.location.href,
    title: getTitle(mainContainer),
    paragraphs: collectVisibleParagraphs(mainContainer),
    nextUrl: getNextChapterUrl(mainContainer),
    ...getBookInfo(mainContainer, getTitle(mainContainer))
  });
});
