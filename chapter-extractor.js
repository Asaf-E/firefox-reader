(() => {
  "use strict";

  const CHAPTER_LABEL_PATTERN = /\b(?:chapter|chapters|ch\.?)(?=\s|\d|[-_:]|$)/i;
  const NOISE_PATTERN =
    /(^|[\s_-])(advert|ads|breadcrumb|comment|comments|discussion|disqus|footer|genre|login|menu|modal|nav|popup|recommend|register|related|replies|reply|share|sidebar|signin|signup|social|tag|toolbar|widget|wpd|wpdiscuz)([\s_-]|$)/i;
  const CONTENT_MARKER_PATTERN =
    /(^|[\s_-])(article|body|chapter|content|entry|fiction|novel|post|read|reader|reading|story|text)([\s_-]|$)/i;
  const BAD_TAGS = new Set(["ASIDE", "DIALOG", "FOOTER", "FORM", "HEADER", "NAV"]);
  const CONTENT_SELECTORS = [
    "[data-chapter-content]",
    "#chapter-content",
    ".chapter-content",
    ".chapter-body",
    ".chapter-text",
    "#arrticle",
    "article.story #arrticle",
    ".story.fullstory .text",
    ".read-container .text-left",
    ".entry-content .text-left",
    ".read-container .reading-content",
    ".entry-content .reading-content",
    ".reading-content",
    ".read-content",
    ".post-content",
    ".entry-content",
    "main article",
    "[role='main'] article",
    "article",
    "main"
  ];
  const JUNK_SELECTORS = [
    "script",
    "style",
    "noscript",
    "template",
    "iframe",
    "ins",
    "svg",
    "[id^='bg-ssp']",
    "[class*='free-support']",
    "[class*='advert']",
    "[class*='adsbygoogle']"
  ];

  class ChapterExtractor {
    constructor(document, pageUrl, options = {}) {
      this.document = document;
      this.pageUrl = pageUrl || document?.URL || "";
      this.isVisible = options.isVisible || (() => true);
    }

    extract() {
      const container = this.findMainContainer();
      const title = this.findTitle(container);

      return {
        url: this.pageUrl,
        title,
        paragraphs: this.collectContent(container),
        nextUrl: this.findNextUrl(container),
        ...this.findBookInfo(container, title)
      };
    }

    static isLikelyChapterUrl(url) {
      if (!url) return false;
      try {
        const path = new URL(url).pathname;
        return (
          /\/(?:chapter|chapters)(?:\/|-)/i.test(path) ||
          /chapter-\d+/i.test(path) ||
          /\/mtl-reader\/\d+\/\d+\/?$/i.test(path) ||
          /\/\d+-\d+\/?$/i.test(path) ||
          /\/\d+\.html$/i.test(path)
        );
      } catch (error) {
        return false;
      }
    }

    static inferBookUrl(pageUrl) {
      try {
        const url = new URL(pageUrl);
        const path = url.pathname;
        const patterns = [
          /^(\/fiction\/[^/]+\/[^/]+)(?:\/(?:chapter|chapters)(?:\/|-))/i,
          /^(\/(?:novel|book|series)\/[^/]+)(?:\/(?:chapter|chapters)(?:\/|-))/i,
          /^(\/mtl-reader\/\d+)\/\d+\/?$/i,
          /^(\/[^/]+)\/\d+\.html$/i
        ];
        for (const pattern of patterns) {
          const match = path.match(pattern);
          if (match) return `${url.origin}${match[1]}`;
        }

        const pair = path.match(/^\/chapter\/(\d+)-\d+\/?$/i);
        if (pair) return `${url.origin}/book/${pair[1]}`;

        const segments = path.split("/").filter(Boolean);
        const chapterIndex = segments.findIndex((segment) =>
          /^(?:chapter|chapters|ch)(?:-|$)/i.test(segment)
        );
        if (chapterIndex > 0) {
          return `${url.origin}/${segments.slice(0, chapterIndex).join("/")}`;
        }
        return `${url.origin}${path}`;
      } catch (error) {
        return pageUrl;
      }
    }

    normalize(text) {
      return String(text || "").replace(/\s+/g, " ").trim();
    }

    absoluteUrl(href) {
      if (typeof href !== "string" || !href.trim()) return "";
      try {
        const url = new URL(href, this.pageUrl);
        return /^https?:$/i.test(url.protocol) ? url.href : "";
      } catch (error) {
        return "";
      }
    }

    marker(node) {
      const className =
        typeof node?.className === "string" ? node.className : node?.className?.baseVal || "";
      return `${node?.id || ""} ${className}`.toLowerCase();
    }

    isHidden(node) {
      let current = node;
      while (current) {
        if (current.hidden || current.getAttribute?.("aria-hidden") === "true") return true;
        const inlineStyle = current.getAttribute?.("style") || "";
        if (/display\s*:\s*none|visibility\s*:\s*hidden/i.test(inlineStyle)) return true;
        current = current.parentElement;
      }
      return false;
    }

    hasNoiseAncestor(node) {
      let current = node;
      while (current) {
        if (NOISE_PATTERN.test(this.marker(current))) return true;
        current = current.parentElement;
      }
      return false;
    }

    isExcluded(node) {
      let current = node;
      while (current) {
        if (BAD_TAGS.has(current.tagName)) return true;
        current = current.parentElement;
      }
      return this.hasNoiseAncestor(node);
    }

    isShown(node) {
      return Boolean(node && !this.isHidden(node) && this.isVisible(node));
    }

    isUsable(node) {
      return this.isShown(node) && !this.isExcluded(node);
    }

    isMetadataUsable(node) {
      if (!this.isShown(node) || this.hasNoiseAncestor(node)) return false;
      return !node.closest?.("aside, dialog, footer, form");
    }

    cleanText(node) {
      if (!node) return "";
      const clone = node.cloneNode(true);
      for (const junk of clone.querySelectorAll(JUNK_SELECTORS.join(","))) junk.remove();
      for (const br of clone.querySelectorAll("br")) br.replaceWith("\n");
      return clone.textContent || "";
    }

    collectParagraphs(container) {
      if (!container) return [];
      return Array.from(container.querySelectorAll("p"))
        .filter((node) => this.isUsable(node))
        .map((node) => this.normalize(this.cleanText(node)))
        .filter(Boolean);
    }

    collectTextBlocks(container) {
      if (!container) return [];
      const clone = container.cloneNode(true);
      for (const junk of clone.querySelectorAll(JUNK_SELECTORS.join(","))) junk.remove();
      for (const br of clone.querySelectorAll("br")) br.replaceWith("\n\n");
      for (const block of clone.querySelectorAll("div, li, blockquote")) {
        block.append(this.document.createTextNode("\n\n"));
      }
      return String(clone.textContent || "")
        .replace(/\r/g, "")
        .split(/\n\s*\n+/)
        .map((text) => this.normalize(text))
        .filter(Boolean);
    }

    collectContent(container) {
      const paragraphs = this.collectParagraphs(container);
      return paragraphs.length ? paragraphs : this.collectTextBlocks(container);
    }

    hasEnoughText(paragraphs) {
      const substantial = paragraphs.filter((text) => text.length >= 20);
      const total = paragraphs.reduce((sum, text) => sum + text.length, 0);
      return substantial.length >= 3 || total >= 300;
    }

    linkDensity(node) {
      const total = this.normalize(this.cleanText(node)).length;
      if (!total) return 0;
      const linked = Array.from(node.querySelectorAll("a"))
        .reduce((sum, link) => sum + this.normalize(link.textContent).length, 0);
      return linked / total;
    }

    findPreferredContainer() {
      for (const selector of CONTENT_SELECTORS) {
        for (const candidate of this.document.querySelectorAll(selector)) {
          if (!this.isUsable(candidate)) continue;
          if (this.hasEnoughText(this.collectContent(candidate))) return candidate;
        }
      }
      return null;
    }

    findMainContainer() {
      const preferred = this.findPreferredContainer();
      if (preferred) return preferred;

      const scores = new Map();
      const addScore = (node, value) => {
        if (!this.isUsable(node)) return;
        scores.set(node, (scores.get(node) || 0) + value);
      };

      for (const paragraph of this.document.querySelectorAll("p")) {
        if (!this.isUsable(paragraph)) continue;
        const length = this.normalize(this.cleanText(paragraph)).length;
        if (length < 20) continue;
        const value = 1 + Math.min(4, Math.floor(length / 140));
        addScore(paragraph.parentElement, value);
        addScore(paragraph.parentElement?.parentElement, value * 0.5);
      }

      let best = null;
      let bestScore = 0;
      for (const [candidate, value] of scores) {
        const semanticBonus = CONTENT_MARKER_PATTERN.test(this.marker(candidate)) ? 1.35 : 1;
        const score = value * semanticBonus * (1 - Math.min(this.linkDensity(candidate), 0.9));
        if (score > bestScore) {
          best = candidate;
          bestScore = score;
        }
      }
      if (best) return best;

      for (const candidate of this.document.querySelectorAll("article, main, [role='main'], section, div")) {
        if (!this.isUsable(candidate)) continue;
        const paragraphs = this.collectTextBlocks(candidate);
        if (!this.hasEnoughText(paragraphs)) continue;
        const total = paragraphs.reduce((sum, text) => sum + text.length, 0);
        const score = (total + paragraphs.length * 80) * (1 - Math.min(this.linkDensity(candidate), 0.9));
        if (score > bestScore) {
          best = candidate;
          bestScore = score;
        }
      }

      return best || this.document.body;
    }

    normalizeTitle(rawTitle) {
      const title = this.normalize(rawTitle);
      if (!title) return "";
      const pipeParts = title.split(" | ").map((part) => this.normalize(part)).filter(Boolean);
      if (pipeParts.length > 1) {
        return pipeParts.find((part) => CHAPTER_LABEL_PATTERN.test(part)) || pipeParts[0];
      }
      return title;
    }

    findTitle(container) {
      const candidates = [];
      const add = (value, weight) => {
        const title = this.normalizeTitle(value);
        if (title) candidates.push({ title, weight });
      };

      add(container?.querySelector("h1, h2, h3")?.textContent, 110);
      for (const heading of this.document.querySelectorAll("h1, h2, h3")) {
        if (!this.isMetadataUsable(heading)) continue;
        add(heading.textContent, heading.tagName === "H1" ? 160 : 45);
      }
      add(this.document.querySelector("meta[property='og:title']")?.getAttribute("content"), 75);
      add(this.document.title, 55);

      candidates.sort((a, b) => {
        const score = ({ title, weight }) =>
          weight + (CHAPTER_LABEL_PATTERN.test(title) ? 120 : 0) + Math.min(title.length, 80);
        return score(b) - score(a);
      });
      return candidates[0]?.title || "Untitled page";
    }

    inferBookUrl() {
      return ChapterExtractor.inferBookUrl(this.pageUrl);
    }

    bookTitleFrom(text) {
      const value = this.normalize(text);
      if (!value) return "";
      const beforeChapter = value.match(/^(.*?)(?:\s*[-|:]\s*)?(?:chapter|ch\.?)\b/i)?.[1];
      return this.normalize(beforeChapter) || value;
    }

    findBookInfo(container, chapterTitle) {
      const inferredUrl = this.inferBookUrl();
      let best = null;

      for (const link of this.document.querySelectorAll("a[href]")) {
        if (!this.isShown(link)) continue;
        const href = this.absoluteUrl(link.getAttribute("href"));
        const text = this.normalize(link.textContent);
        if (!href || href === this.pageUrl || text.length < 2) continue;
        if (ChapterExtractor.isLikelyChapterUrl(href)) continue;

        const target = new URL(href);
        const pathDepth = target.pathname.split("/").filter(Boolean).length;
        let score = 0;
        if (String(link.rel || "").split(/\s+/).includes("up")) score += 260;
        if (this.pageUrl.startsWith(`${href.replace(/\/$/, "")}/`)) score += 170;
        if (link.closest(".breadcrumb, .breadcrumbs, .fiction, .novel, .series, [class*='breadcrumb'], [class*='series']")) score += 100;
        if (/\/(?:fiction|novel|book|series)\//i.test(target.pathname)) score += 70;
        if (this.normalize(chapterTitle).includes(text)) score += 60;
        if (container?.contains(link)) score += 15;
        if (target.origin === new URL(this.pageUrl).origin) score += 20;
        if (pathDepth < 2) score -= 180;

        if (!best || score > best.score) best = { href, text, score };
      }

      const trusted = best?.score >= 140;
      return {
        bookKey: trusted ? best.href : inferredUrl,
        bookTitle: trusted ? this.bookTitleFrom(best.text) : this.bookTitleFrom(chapterTitle) || "Current book",
        bookUrl: trusted ? best.href : inferredUrl !== this.pageUrl ? inferredUrl : ""
      };
    }

    inferNextUrl() {
      const rules = [
        [/(\/mtl-reader\/\d+\/)(\d+)(\/?$)/i, 2],
        [/(chapter-)(\d+)(\/?$)/i, 2],
        [/(\/chapter\/\d+-)(\d+)(\/?$)/i, 2]
      ];
      for (const [pattern, numberIndex] of rules) {
        const match = this.pageUrl.match(pattern);
        if (!match) continue;
        const next = String(Number(match[numberIndex]) + 1);
        return this.pageUrl.replace(pattern, `$1${next}$3`);
      }
      return "";
    }

    findNextUrl(container) {
      const declared = this.document.querySelector("link[rel~='next'][href]");
      const declaredUrl = this.absoluteUrl(declared?.getAttribute("href"));
      if (declaredUrl && declaredUrl !== this.pageUrl) return declaredUrl;

      let best = null;
      for (const link of this.document.querySelectorAll("a[href]")) {
        if (!this.isShown(link)) continue;
        const href = this.absoluteUrl(link.getAttribute("href"));
        if (!href || href === this.pageUrl) continue;
        const marker = this.normalize(
          `${link.textContent || ""} ${link.getAttribute("aria-label") || ""} ${link.getAttribute("title") || ""} ${link.rel || ""} ${this.marker(link)}`
        ).toLowerCase();
        let score = 0;
        if (String(link.rel || "").split(/\s+/).includes("next")) score += 300;
        if (/\bnext(?:\s+chapter)?\b|\bchapter\s+next\b|›|»|→/i.test(marker)) score += 180;
        if (/(^|[\s_-])(next|nextchap|nextchapter)([\s_-]|$)/i.test(marker)) score += 100;
        if (ChapterExtractor.isLikelyChapterUrl(href)) score += 60;
        if (container?.contains(link)) score += 25;
        if (link.closest(".pagination, .nav-links, .chapter-nav, .wp-manga-chapter-nav, .post-nav, [class*='pagination']")) score += 45;
        if (this.hasNoiseAncestor(link) && !String(link.rel || "").split(/\s+/).includes("next")) {
          score -= 180;
        }
        if (!best || score > best.score) best = { href, score };
      }
      return best?.score >= 120 ? best.href : this.inferNextUrl();
    }
  }

  globalThis.ChapterExtractor = ChapterExtractor;
})();
