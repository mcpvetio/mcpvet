#!/usr/bin/env bash
# Compute SHA-256 checksums for all build artifacts. Use this after `pnpm build`
# to verify deterministic output (same source = same hash).
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -d "dist" ]; then
  echo "dist/ not found — run pnpm build first" >&2
  exit 1
fi

CHECKSUM_FILE="dist/SHA256SUMS"
: > "$CHECKSUM_FILE"

find dist -type f -not -name SHA256SUMS | sort | while read -r f; do
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$f" >> "$CHECKSUM_FILE"
  else
    sha256sum "$f" >> "$CHECKSUM_FILE"
  fi
done

echo "wrote $CHECKSUM_FILE" >&2
cat "$CHECKSUM_FILE"
