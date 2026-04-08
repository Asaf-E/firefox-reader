# Roadmap

This roadmap keeps the public repo focused on product direction rather than internal scratch notes.

## Current status

The project already supports:

- extracting chapter text from supported sites and generic chapter-like pages
- opening an extension-owned reader view
- optional rewrite through an OpenAI-compatible endpoint
- chunked rewriting with validation guardrails
- side-by-side reading
- appearance customization
- bookmarks and per-book resume tracking
- automatic next-chapter continuation when supported
- local packaging for release preparation

## Near-term priorities

### 1. Signed desktop release

- submit the extension for Mozilla signing
- verify permanent installation flow on standard Firefox
- tighten release docs and metadata

### 2. Better release workflow

- create GitHub Releases for tagged versions
- attach packaged `.xpi` builds as release assets
- add a short changelog / release summary per version

### 3. Reader polish

- continue refining the reading UI
- improve typography and layout options
- keep dark/light panel contrast strong and predictable

### 4. Safer rewrite quality

- continue improving validation rules for subtle meaning drift
- preserve speaker attribution and quantity phrases
- keep fallback-to-original behavior for suspicious rewrites

## Medium-term work

### 5. Better extraction coverage

- improve generic extraction for more sites
- add site-specific overrides where needed
- improve next-chapter detection reliability

### 6. Stronger library features

- better bookmark and resume management
- clearer saved-chapter browsing
- optional export flow for saved chapters or books

### 7. Full-book workflows

- save improved chapters more intentionally
- support building an improved full-book reading flow
- explore export targets such as HTML or EPUB

## Longer-term exploration

### 8. Mobile-friendly reading path

Browser extension support is limited on iPhone and iPad, so mobile should not depend on the extension itself.

Possible directions:

- lightweight web reader backed by saved chapters
- cloud-synced personal library
- export-first workflow for external reading apps
- simplified Android-specific follow-up later

### 9. Distribution hardening

- move from personal-use setup toward a cleaner public release
- improve settings explanations and onboarding
- decide on long-term release and support scope

## Design principles

- desktop Firefox first
- reading experience first, rewriting second
- preserve meaning over stylistic flourish
- avoid silent bad rewrites
- prefer clean, low-friction workflows
