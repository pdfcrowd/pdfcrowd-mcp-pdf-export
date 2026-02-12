#!/usr/bin/env bash
#
# finalize-changelog.sh — Replace "Next release" with version + date
#
# Called by the npm "version" lifecycle hook. Reads the new version
# from package.json, replaces the "## Next release" header in
# CHANGELOG.md, and stages the file for commit.
#
# If no "## Next release" section exists, this is a no-op.

set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CHANGELOG="$PROJECT_DIR/CHANGELOG.md"

if [[ ! -f "$CHANGELOG" ]]; then
  exit 0
fi

if ! grep -q "^## Next release" "$CHANGELOG"; then
  # No "Next release" section — nothing to finalize
  git add "$CHANGELOG" 2>/dev/null || true
  exit 0
fi

cd "$PROJECT_DIR"

version=$(node -p "require('./package.json').version")
date=$(date +%Y-%m-%d)

sed -i "s/^## Next release/## $version ($date)/" "$CHANGELOG"
git add "$CHANGELOG"

echo "CHANGELOG.md finalized: $version ($date)"
