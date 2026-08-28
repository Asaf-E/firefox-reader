const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { JSDOM } = require("jsdom");

require("../chapter-extractor.js");

const FIXTURES = path.join(__dirname, "fixtures");

function extract(name, url) {
  const html = fs.readFileSync(path.join(FIXTURES, name), "utf8");
  const dom = new JSDOM(html, { url });
  return new ChapterExtractor(dom.window.document, url).extract();
}

function extractHtml(html, url = "https://example.test/novel/story/chapter-1") {
  const dom = new JSDOM(html, { url });
  return new ChapterExtractor(dom.window.document, url).extract();
}

test("Royal Road keeps short and repeated paragraphs and groups the book", () => {
  const result = extract(
    "royal-road.html",
    "https://www.royalroad.com/fiction/178930/example-fiction/chapter/1/ch-01"
  );

  assert.equal(result.title, "Ch 01 - A Quiet Beginning");
  assert.equal(result.paragraphs.length, 5);
  assert.equal(result.paragraphs[0], "Wait.");
  assert.equal(result.paragraphs[1], result.paragraphs[2]);
  assert.equal(result.bookKey, "https://www.royalroad.com/fiction/178930/example-fiction");
  assert.equal(
    result.nextUrl,
    "https://www.royalroad.com/fiction/178930/example-fiction/chapter/2/ch-02"
  );
});

test("legacy arrticle and MTL URL continuation remain supported", () => {
  const result = extract(
    "legacy-arrticle.html",
    "https://legacy.example/mtl-reader/42/9/"
  );

  assert.equal(result.paragraphs.length, 3);
  assert.equal(result.bookKey, "https://legacy.example/mtl-reader/42");
  assert.equal(result.nextUrl, "https://legacy.example/mtl-reader/42/10/");
});

test("generic semantic articles need no site-specific rule", () => {
  const result = extract(
    "generic-article.html",
    "https://generic.example/series/generic-novel/chapter-4"
  );

  assert.equal(result.title, "Chapter 4");
  assert.equal(result.paragraphs.length, 3);
  assert.equal(result.bookKey, "https://generic.example/series/generic-novel");
  assert.equal(result.nextUrl, "https://generic.example/series/generic-novel/chapter-5");
});

test("legacy content selectors remain compatible", () => {
  const wrappers = [
    '<div id="arrticle">%s</div>',
    '<div class="story fullstory"><div class="text">%s</div></div>',
    '<div class="read-container"><div class="text-left">%s</div></div>',
    '<div class="entry-content"><div class="text-left">%s</div></div>',
    '<div class="read-container"><div class="reading-content">%s</div></div>',
    '<div class="entry-content"><div class="reading-content">%s</div></div>',
    '<div class="chapter-content">%s</div>',
    '<div class="entry-content">%s</div>'
  ];
  const paragraphs = [
    "The first compatibility paragraph contains enough text to identify the intended reading area.",
    "The second compatibility paragraph keeps older supported layouts working after the refactor.",
    "The third compatibility paragraph verifies that the complete body remains available."
  ];
  const body = paragraphs.map((text) => `<p>${text}</p>`).join("");

  for (const wrapper of wrappers) {
    const result = extractHtml(wrapper.replace("%s", body));
    assert.deepEqual(result.paragraphs, paragraphs);
  }
});

test("div and br based chapter bodies work without paragraph elements", () => {
  const result = extractHtml(`
    <h1>Chapter 1</h1>
    <div data-chapter-content>
      <div>The opening block contains substantial prose even though the page does not use paragraph tags.</div>
      <br>
      <div>The middle block remains separate because generic block boundaries are preserved.</div>
      <br>
      <div>The closing block confirms compatibility with div and line-break based chapter layouts.</div>
    </div>
  `);

  assert.deepEqual(result.paragraphs, [
    "The opening block contains substantial prose even though the page does not use paragraph tags.",
    "The middle block remains separate because generic block boundaries are preserved.",
    "The closing block confirms compatibility with div and line-break based chapter layouts."
  ]);
});

test("hidden, navigation, and comment text never leaks into chapter paragraphs", () => {
  const result = extractHtml(`
    <header><p>This navigation introduction is deliberately long enough to look like prose.</p></header>
    <article>
      <h1>Chapter 12</h1>
      <p>The first real paragraph remains available even when unrelated prose surrounds the chapter.</p>
      <div class="comments"><p>A long reader comment must never become part of the extracted chapter body.</p></div>
      <p hidden>A hidden promotional paragraph must never become part of the extracted chapter body.</p>
      <p>The second real paragraph verifies that noise containers are excluded by their semantic markers.</p>
      <p>The third real paragraph gives the extractor enough evidence to select this article confidently.</p>
    </article>
  `);

  assert.deepEqual(result.paragraphs, [
    "The first real paragraph remains available even when unrelated prose surrounds the chapter.",
    "The second real paragraph verifies that noise containers are excluded by their semantic markers.",
    "The third real paragraph gives the extractor enough evidence to select this article confidently."
  ]);
});

test("standard relative metadata links work without site-specific selectors", () => {
  const result = extractHtml(
    `
      <head><link rel="next" href="chapter-14"></head>
      <body>
        <nav class="breadcrumbs"><a rel="up" href="./">A Generic Book</a></nav>
        <main><article>
          <h1>Chapter 13</h1>
          <p>The first paragraph contains enough meaningful prose for generic semantic extraction.</p>
          <p>The second paragraph confirms that relative navigation metadata resolves correctly.</p>
          <p>The third paragraph makes this a realistic compact chapter fixture for regression testing.</p>
        </article></main>
      </body>
    `,
    "https://example.test/series/a-generic-book/chapter-13"
  );

  assert.equal(result.bookUrl, "https://example.test/series/a-generic-book/");
  assert.equal(result.bookTitle, "A Generic Book");
  assert.equal(result.nextUrl, "https://example.test/series/a-generic-book/chapter-14");
});

test("invalid and same-page next links are ignored in favor of conservative URL inference", () => {
  const result = extractHtml(
    `
      <article>
        <h1>Chapter 20</h1>
        <p>The opening paragraph provides meaningful story text for the fallback chapter detector.</p>
        <p>The middle paragraph contains more story text without introducing navigation noise.</p>
        <p>The closing paragraph confirms that unsafe links do not replace conservative inference.</p>
        <a rel="next" href="javascript:alert('no')">Next</a>
        <a class="next" href="/story/chapter-20">Next chapter</a>
      </article>
    `,
    "https://example.test/story/chapter-20"
  );

  assert.equal(result.nextUrl, "https://example.test/story/chapter-21");
});
