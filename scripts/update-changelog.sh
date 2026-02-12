#!/usr/bin/env bash
#
# update-changelog.sh — Generate CHANGELOG.md entry using claude -p
#
# Summarizes git changes since the last tag into a consolidated
# changelog entry with a "## Next release" header. Review and edit
# the result, then run `npm version patch/minor/major` to finalize.
#
# Usage:
#   bash scripts/update-changelog.sh

set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CHANGELOG="$PROJECT_DIR/CHANGELOG.md"

# ── Prechecks ────────────────────────────────────────────────

if ! command -v claude &>/dev/null; then
  echo "ERROR: claude CLI not found."
  echo "  Install: https://docs.anthropic.com/en/docs/claude-code"
  exit 1
fi

cd "$PROJECT_DIR"

# ── Find previous tag ───────────────────────────────────────

prev_tag=$(git describe --tags --abbrev=0 HEAD 2>/dev/null || true)

if [[ -z "$prev_tag" ]]; then
  # No tags at all — use root commit
  prev_ref=$(git rev-list --max-parents=0 HEAD)
  range_label="initial commit to HEAD"
  log_range="$prev_ref..HEAD"
else
  range_label="$prev_tag to HEAD"
  log_range="$prev_tag..HEAD"
fi

# ── Gather git context ──────────────────────────────────────

git_log=$(git log "$log_range" --oneline)

if [[ -z "$git_log" ]]; then
  echo "No changes since $prev_tag. Nothing to do."
  exit 0
fi

git_stat=$(git diff "$log_range" --stat)

echo "Changes: $range_label ($(echo "$git_log" | wc -l | tr -d ' ') commits)"

# ── Read existing changelog (strip "# Changelog" header and any "Next release" section) ──

existing_entries=""
if [[ -f "$CHANGELOG" ]]; then
  # Remove the "# Changelog" header and any existing "## Next release" section,
  # keeping only finalized version entries
  existing_entries=$(sed '1{/^# Changelog/d}' "$CHANGELOG" \
    | sed '/^## Next release/,/^## [^N]/{ /^## [^N]/!d; }' \
    | sed '/^$/{ N; /^\n$/d; }')
fi

# ── Build prompt ────────────────────────────────────────────

prompt=$(cat <<'PROMPT_END'
Generate ONLY a changelog section for the changes below. Output raw markdown, no preamble, no explanations, no fences.

Start directly with "## Next release" followed by the entries.

Rules:
- Group changes into categories using ### headers: Features, Improvements, Fixes, Other
  - Only include categories that have entries
  - Omit category headers if there is only one category
- Consolidate related commits into single bullet points
- Mid-detail level: not one bullet per commit, but not too vague either

PROMPT_END
)

prompt+=$'\n--- GIT LOG ---\n'"$git_log"
prompt+=$'\n\n--- GIT DIFF STAT ---\n'"$git_stat"

# ── Run claude ──────────────────────────────────────────────

echo "Running claude to generate changelog..."
new_section=$(claude -p "$prompt" --tools "")

# Strip any preamble before "## Next release" (LLM sometimes adds text)
new_section=$(echo "$new_section" | sed -n '/^## Next release/,$p')

if [[ -z "$new_section" ]]; then
  echo "ERROR: claude did not produce a valid changelog section."
  exit 1
fi

# ── Assemble the file ───────────────────────────────────────

{
  echo "# Changelog"
  echo ""
  echo "$new_section"
  if [[ -n "$existing_entries" ]]; then
    echo ""
    echo "$existing_entries"
  fi
} > "$CHANGELOG"

echo ""
echo "CHANGELOG.md updated. Review the changes:"
echo "  $CHANGELOG"
echo ""
echo "If satisfied, run: npm version patch|minor|major"
