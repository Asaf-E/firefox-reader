# Novel Reader Release Notes

This repo now includes a packaged unsigned build in `dist/` and a manifest that is cleaner for Firefox signing.

## What is ready

- MV3 manifest with a single `service_worker`
- extension icon asset
- fixed extension id for Gecko builds
- packaged `.xpi` build in `dist/`

## What you still need for a normal permanent install on Firefox stable

1. Create or log into an AMO developer account.
2. Upload the packaged `.xpi`.
3. Complete the listing details:
   - extension name
   - summary / description
   - screenshots
   - categories
   - privacy notes
4. Wait for signing / review.
5. Install the signed build or publish it through AMO.

## Notes

- The current packaged build is still unsigned until AMO signs it.
- While developing, you can still use `about:debugging` for temporary loading.
- If you change the extension id later, Firefox may treat it as a different extension for updates/storage.

## Suggested store description seed

Novel Reader extracts chapter text from web novel pages, rewrites awkward translation into cleaner English with your own model endpoint, and lets you keep reading with saved progress, bookmarks, and chapter continuation.
