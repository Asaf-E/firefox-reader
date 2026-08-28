# Novel Reader AMO Submission

This repo now includes a packaged unsigned build in `dist/` and a manifest that is cleaner for Firefox signing.

## What is ready

- Firefox-compatible MV3 background script
- extension icon asset
- fixed extension id for Gecko builds
- packaged `.xpi` build in `dist/`
- a privacy disclosure in `PRIVACY.md`
- regression tests for generic, Royal Road, legacy selector, and rewrite API behavior

## What you still need for a normal permanent install on Firefox stable

1. Log into the AMO developer account that owns Novel Reader.
2. Open the existing Novel Reader product and choose to upload a new version.
3. Upload `dist/novel-reader-0.1.7-unsigned.xpi`; do not submit it as a new add-on.
4. Complete or update the listing details:
   - extension name
   - summary / description
   - screenshots
   - categories
   - privacy notes
5. Explain the `scripting`, `tabHide`, broad host, and website activity permissions in the reviewer notes.
6. Add the privacy policy text from `PRIVACY.md` to the AMO listing.
7. Wait for signing / review.
8. Install the signed build or publish it through AMO.

## Notes

- The current packaged build is still unsigned until AMO signs it.
- Automatic rewriting is disabled by default for new installations. Existing configured users retain the prior behavior and can disable it in settings. Chapter text is sent only after a manual rewrite request or while automatic rewriting is enabled.
- While developing, you can still use `about:debugging` for temporary loading.
- If you change the extension id later, Firefox may treat it as a different extension for updates/storage.

## Reviewer permission notes

- `activeTab`: captures the page only after the user clicks the toolbar button.
- `scripting`: recovers capture from an already-open page when the installed content script is missing; it injects only the extension's packaged extractor after a toolbar click.
- `storage`: keeps reader preferences, bookmarks, progress, and the latest local rewrite cache.
- `tabHide`: briefly hides a temporary inactive tab used only when a site cannot be extracted through a direct chapter request; the tab is removed immediately after capture.
- `<all_urls>`: supports user-selected novel sites, next-chapter requests, and user-configured rewrite endpoints without hard-coding a list of publishers.
- `websiteActivity`: discloses that extracted chapter text can be sent to the rewrite endpoint chosen by the user. Rewriting is optional.

## Suggested store description seed

Novel Reader extracts chapter text from web novel pages, rewrites awkward translation into cleaner English with your own model endpoint, and lets you keep reading with saved progress, bookmarks, and chapter continuation.
