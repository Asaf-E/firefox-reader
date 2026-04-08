# Firefox Reader v0.1.4

## Highlights

- cleaner extension-owned reader for web novel chapters
- optional OpenAI-compatible rewrite flow
- chunked rewriting with validation guardrails
- side-by-side reading and improved-view modes
- bookmarks and per-book resume tracking
- automatic next-chapter continuation on supported sites
- expanded appearance controls for fonts, widths, and themes

## Included in this version

- chapter extraction and clean reader rendering
- optional rewrite setup through a hosted or local OpenAI-compatible endpoint
- progressive chunk-by-chunk rewrite updates
- safeguards against common rewrite failures:
  - paragraph drift
  - speaker attribution mistakes
  - quantity and timing drift
- per-chapter bookmark controls
- resume tracking per book
- multiple page and panel theme options
- packaged unsigned `.xpi` for development and release preparation

## Rewrite note

Rewrite is optional. The extension can still be used as a normal clean reader even without an API endpoint or model configured.

## Suggested model

For local rewriting, `qwen2.5-7b-instruct` has been a strong baseline for faithful cleanup in project testing.

## Packaging note

This version is packaged as an unsigned build for development and release preparation. Standard Firefox stable typically requires Mozilla signing for normal permanent installation.
