# Novel Reader

Novel Reader is an extension for reading web novel chapters in a cleaner interface and optionally rewriting awkward translation into more natural English with your own model endpoint.

## What it does

- extracts chapter text from normal web pages
- opens a clean reader view inside the extension
- keeps original and improved text available
- supports side-by-side reading
- can start rewriting automatically when the reader opens if you explicitly enable it
- can keep loading next chapters for a continuous reading flow
- saves bookmarks and per-book resume progress
- supports OpenAI-compatible local or hosted rewrite endpoints
- still works as a normal reader even if rewrite is not configured

## Current features

- chapter extraction from supported sites and generic article-like pages
- original / improved / side-by-side views
- chunked rewrite pipeline with guardrails for:
  - paragraph preservation
  - quote attribution
  - quantity and timing drift checks
  - fallback to original text on suspicious rewrites
- appearance controls:
  - one-click long-reading preset
  - font size
  - reading font
  - line spacing
  - content width
  - page theme
  - panel theme
  - reader brightness
  - body-text contrast
- automatic next-chapter loading when available
- per-chapter bookmark controls
- per-book resume tracking
- local storage for settings, bookmarks, resume state, and latest rewrite cache
- automatic rewriting is opt-in and disabled by default
- a master AI rewrite toggle prevents both manual and automatic requests without clearing settings

Existing settings, bookmarks, cached rewrites, and resume entries are migrated in place. Users upgrading from a version that automatically rewrote configured chapters keep that behavior until they disable the automatic-rewrite checkbox.

## Long-reading preset

The day and night presets use the system screen font, 1.72 line spacing, and a responsive
moderate line length. The size follows the reader viewport from 21–30px and the column scales
from 640–900px, so wide displays remain comfortable without making narrow windows oversized.
Day uses Sand/Parchment; Night uses Night/Ink. Both preserve rewrite settings and can be
customized afterward. Day starts at 80% reader brightness and Night at 90%; the toolbar can
dim either mode as low as 60%. This affects only the extension page, not the monitor backlight
or Firefox interface. Both presets use Soft body-text contrast to reduce harsh or glowing glyph
edges; Balanced and Strong remain available.

The evidence is strongest for adequate luminance contrast, 1.5–2 line spacing, moderate
line lengths, and dark-on-light display polarity. Night mode and the warm day hue
are comfort preferences rather than medical claims:

- [W3C text-spacing guidance](https://www.w3.org/WAI/WCAG21/Understanding/text-spacing)
- [W3C minimum text contrast](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [Screen-reading line-length study](https://doi.org/10.1006/ijhc.2001.0458)
- [Display-polarity study](https://doi.org/10.1080/00140130701306413)
- [Polarity, pupil size, and image sharpness study](https://doi.org/10.1080/00140139.2014.948496)

## Rewrite setup

Rewrite is optional.

If you leave rewrite settings empty, the extension still works for:

- normal reading
- bookmarks
- resume tracking
- chapter continuation

If you want rewriting, the extension expects an OpenAI-compatible `chat/completions` endpoint.

Examples:

- hosted:
  - `https://api.openai.com/v1/chat/completions`
- local:
  - `LM Studio`
  - `llama.cpp server`
  - `vLLM`
  - any OpenAI-compatible local wrapper

Suggested model based on current project testing:

- `qwen2.5-7b-instruct`

## Project files

- [manifest.json](./manifest.json)
- [chapter-extractor.js](./chapter-extractor.js)
- [legacy-data-migrator.js](./legacy-data-migrator.js)
- [rewrite-client.js](./rewrite-client.js)
- [background.js](./background.js)
- [content.js](./content.js)
- [reader.html](./reader.html)
- [reader.js](./reader.js)
- [ROADMAP.md](./ROADMAP.md)
- [AMO_SUBMISSION.md](./AMO_SUBMISSION.md)
- [PRIVACY.md](./PRIVACY.md)
- [RELEASE_NOTES_v0.1.7.md](./RELEASE_NOTES_v0.1.7.md)

## Architecture

- `ChapterExtractor` is shared by live-page capture and background chapter fetching. It prefers semantic HTML and standard metadata, then applies the legacy selectors and conservative URL fallbacks retained from earlier releases.
- `RewriteClient` contains the OpenAI-compatible request, timeout, error, and response-shape handling.
- `LegacyDataMigrator` preserves older settings and consolidates earlier chapter-specific resume keys.
- `content.js` and `background.js` are small adapters around those shared classes.
- Site-specific hostnames are not hard-coded. URL shapes are used only as fallbacks after standard content and navigation metadata.

## Tests

Install the development dependency and run the regression suite:

```sh
npm install
npm test
```

The suite covers Royal Road, generic semantic articles, legacy selectors, noise filtering,
relative navigation, missing-script recovery, anti-bot rejection, direct and rendered-page
capture, cleanup after hidden-tab fallbacks, saved-data migration, rewrite API behavior, and
rewrite-output safety guardrails.

## Temporary install

In Firefox:

1. open `about:debugging`
2. open `This Firefox`
3. click `Load Temporary Add-on...`
4. select either:
   - `manifest.json`
   - or the latest packaged `.xpi` from `dist/`

Current packaged build:

- `dist/novel-reader-0.1.7-unsigned.xpi`

## Packaging

Unsigned local package:

- `dist/novel-reader-0.1.7-unsigned.xpi`

For normal permanent install on standard Firefox stable, you will usually want Mozilla signing through AMO.

See:

- [AMO_SUBMISSION.md](./AMO_SUBMISSION.md)

## Releases

The `dist/` folder is ignored by default. Individual release artifacts can be explicitly allowed when they need to be attached or archived.

Recommended release flow:

- keep source code in git
- keep `dist/` out of the repo history
- attach `.xpi` files to GitHub Releases for tagged versions

## Development notes

- settings, bookmarks, resume data, and cached rewrites are stored locally by the extension
- chapter text is sent off-device only when you request rewriting or explicitly enable automatic rewriting
- temporary add-ons are removed when Firefox restarts
- a signed install is the better path for long-term use
- current target is desktop Firefox first

## Status

This project is now beyond the initial shell/MVP stage and includes:

- extraction
- reader UI
- rewrite integration
- caching and validation
- next-chapter continuation
- bookmarks and resume tracking
- packaging for release preparation
