#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$ROOT_DIR/dist"
cd "$ROOT_DIR"

VERSION="$(python3 - <<'PY'
import json
from pathlib import Path
data = json.loads(Path("manifest.json").read_text())
print(data["version"])
PY
)"
OUTPUT="$DIST_DIR/novel-reader-${VERSION}-unsigned.xpi"

mkdir -p "$DIST_DIR"
rm -f "$OUTPUT"

zip -r "$OUTPUT" \
  manifest.json \
  chapter-extractor.js \
  legacy-data-migrator.js \
  rewrite-client.js \
  background.js \
  content.js \
  reader.html \
  reader.js \
  icons \
  LICENSE \
  PRIVACY.md

echo "Built $OUTPUT"
