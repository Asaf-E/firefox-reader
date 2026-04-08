# Novel Reader

Novel Reader is an extension for reading web novel chapters in a cleaner interface and optionally rewriting awkward translation into more natural English with your own model endpoint.

## What it does

- extracts chapter text from normal web pages
- opens a clean reader view inside the extension
- keeps original and improved text available
- supports side-by-side reading
- can start rewriting automatically when the reader opens
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
  - font size
  - content width
  - page theme
  - panel theme
- automatic next-chapter loading when available
- per-chapter bookmark controls
- per-book resume tracking
- local storage for settings, bookmarks, resume state, and latest rewrite cache

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
- [background.js](./background.js)
- [content.js](./content.js)
- [reader.html](./reader.html)
- [reader.js](./reader.js)
- [ROADMAP.md](./ROADMAP.md)
- [AMO_SUBMISSION.md](./AMO_SUBMISSION.md)
- [RELEASE_NOTES_v0.1.4.md](./RELEASE_NOTES_v0.1.4.md)

## Temporary install

In Firefox:

1. open `about:debugging`
2. open `This Firefox`
3. click `Load Temporary Add-on...`
4. select either:
   - `manifest.json`
   - or the latest packaged `.xpi` from `dist/`

Current packaged build:

- `dist/novel-reader-0.1.6-unsigned.xpi`

## Packaging

Unsigned local package:

- `dist/novel-reader-0.1.6-unsigned.xpi`

For normal permanent install on standard Firefox stable, you will usually want Mozilla signing through AMO.

See:

- [AMO_SUBMISSION.md](./AMO_SUBMISSION.md)

## Releases

The `dist/` folder is ignored in git on purpose, so packaged `.xpi` files do not appear in the normal repository file tree on GitHub.

Recommended release flow:

- keep source code in git
- keep `dist/` out of the repo history
- attach `.xpi` files to GitHub Releases for tagged versions

## Development notes

- storage is local to the extension
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
