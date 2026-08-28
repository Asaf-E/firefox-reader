function isVisible(node) {
  let current = node;
  while (current?.nodeType === Node.ELEMENT_NODE) {
    const style = window.getComputedStyle(current);
    if (style.display === "none" || style.visibility === "hidden") return false;
    current = current.parentElement;
  }
  return true;
}

browser.runtime.onMessage.addListener((message) => {
  if (message?.type !== "CAPTURE_MINIMAL") return undefined;
  return new ChapterExtractor(document, window.location.href, { isVisible }).extract();
});
