# Novel Reader v0.1.7

## Highlights

- preserves short and intentionally repeated fiction paragraphs
- replaces duplicated extraction code with one shared generic `ChapterExtractor`
- retains all earlier content selectors and URL continuation fallbacks
- recognizes Royal Road `/fiction/` URLs for per-book resume tracking
- adds an explicit automatic-rewrite preference that is disabled by default
- adds timeouts for chapter and rewrite requests
- keeps the next-chapter URL after a temporary failure and provides a retry action
- improves continuous chapter loading and end-of-book feedback
- includes additional page, panel, font-size, and content-width choices
- adds reading-font and line-spacing controls
- uses Original view with Sand, Parchment, and an 800px reading width as the new-install comfort defaults
- isolates OpenAI-compatible requests in a tested `RewriteClient`
- rejects malformed or duplicate rewrite paragraph markers instead of accepting ambiguous output
- fixes Firefox rewrite requests by preserving the required browser `fetch` receiver
- adds responsive day/night presets, reader dimming, soft text contrast, and an AI rewrite toggle
- recovers extraction when a page was already open before the extension was installed or updated
- rejects CAPTCHA and browser-verification responses instead of treating them as chapter text
- migrates existing settings and resume entries without clearing user data
- removes the unnecessary broad `tabs` permission while retaining existing functionality

The `scripting` permission is used only after a toolbar click when the current tab has no
content-script receiver. It injects the extension's packaged extractor into that active tab.

## Privacy

Normal reader use does not send chapter text to a rewrite endpoint. Text is sent only after a manual rewrite request or when automatic rewriting has been explicitly enabled.
