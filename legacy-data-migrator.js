(() => {
  "use strict";

  class LegacyDataMigrator {
    static autoRewrite(settings) {
      return typeof settings?.autoRewrite === "boolean"
        ? settings.autoRewrite
        : Boolean(settings?.endpoint && settings?.model);
    }

    static capture(capture) {
      if (!capture?.url) return capture;
      const inferred = ChapterExtractor.inferBookUrl(capture.url);
      if (
        !inferred ||
        inferred === capture.url ||
        (capture.bookKey && !ChapterExtractor.isLikelyChapterUrl(capture.bookKey))
      ) {
        return capture;
      }
      return { ...capture, bookKey: inferred, bookUrl: capture.bookUrl || inferred };
    }

    static currentBooks(currentBooks) {
      const migrated = {};
      let changed = false;

      for (const entry of Object.values(currentBooks || {})) {
        if (!entry?.chapterUrl) continue;
        const inferred = ChapterExtractor.inferBookUrl(entry.chapterUrl);
        const needsMigration =
          !entry.bookKey || ChapterExtractor.isLikelyChapterUrl(entry.bookKey);
        const useInferred = needsMigration && inferred && inferred !== entry.chapterUrl;
        const bookKey = useInferred ? inferred : entry.bookKey || entry.chapterUrl;
        const nextEntry = {
          ...entry,
          bookKey,
          bookUrl: entry.bookUrl || (useInferred ? inferred : "")
        };
        const previous = migrated[bookKey];
        if (!previous || String(nextEntry.savedAt || "") > String(previous.savedAt || "")) {
          migrated[bookKey] = nextEntry;
        }
        if (bookKey !== entry.bookKey) changed = true;
      }

      if (Object.keys(migrated).length !== Object.keys(currentBooks || {}).length) changed = true;
      return { value: migrated, changed };
    }
  }

  globalThis.LegacyDataMigrator = LegacyDataMigrator;
})();
