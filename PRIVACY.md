# Novel Reader Privacy Policy

Novel Reader does not include analytics, advertising, tracking, or data sales.

## Data stored locally

The extension stores the following information in Firefox extension storage:

- reader appearance and rewrite settings
- an optional API endpoint, model name, and API key supplied by the user
- bookmarks and per-book reading progress
- the most recent rewritten chapter cache
- the most recently captured chapter text used to open the reader

This information remains in the user's Firefox profile unless the user clears it or removes the extension.

## Data sent to other services

Normal reader use does not send chapter text to a rewrite service.

When the user presses **Rewrite text**, or explicitly enables automatic rewriting, Novel Reader sends the extracted chapter title and text, the selected model name, and rewrite instructions to the API endpoint configured by the user. If an API key is configured, it is sent to that endpoint in an authorization header. The endpoint operator's privacy policy and terms apply to that request.

To continue reading, the extension may request the next chapter directly from the source website. Those requests are subject to the source website's privacy policy and may use the website cookies already present in Firefox.

## User control

Rewriting is optional, and automatic rewriting is disabled by default for new installations. Upgrades preserve the previous automatic-rewrite behavior for users who had already configured a model endpoint; it can be disabled at any time in rewrite settings. Users can remove stored bookmarks and resume entries from the reader. Removing the extension deletes its local extension storage according to Firefox's normal extension-removal behavior.
