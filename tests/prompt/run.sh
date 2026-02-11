#!/usr/bin/env bash
#
# run.sh — Run prompt tests against the PDFCrowd MCP server
#
# Usage:
#   run.sh              # run all prompt tests
#   run.sh html-layout  # run a specific test

set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
PROMPTS_DIR="$SCRIPT_DIR/prompts"
OUTPUT_DIR="$SCRIPT_DIR/output"
CHECK_PDF="$SCRIPT_DIR/check-pdf.sh"
EXPECTED_PATH="$PROJECT_DIR/dist/index.js"
DEFAULT_TIMEOUT=300

# ── Prechecks ────────────────────────────────────────────────

for cmd in claude pdfinfo pdftotext; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "ERROR: $cmd not found."
    [[ "$cmd" == "claude" ]] && echo "  Install: https://docs.anthropic.com/en/docs/claude-code"
    [[ "$cmd" != "claude" ]] && echo "  Install: sudo apt install poppler-utils"
    exit 1
  fi
done

echo "Checking MCP server configuration..."
if ! claude mcp list 2>&1 | grep -q "$EXPECTED_PATH"; then
  echo "ERROR: MCP server not configured or not pointing to $EXPECTED_PATH"
  echo "Run:  claude mcp add pdfcrowd-mcp-pdf-export -- node $EXPECTED_PATH"
  exit 1
fi
echo "MCP server found."

# ── Determine tests ─────────────────────────────────────────

mkdir -p "$OUTPUT_DIR"
cd "$PROJECT_DIR"

if [[ $# -gt 0 ]]; then
  tests=("$PROMPTS_DIR/$1.txt")
  if [[ ! -f "${tests[0]}" ]]; then
    echo "ERROR: test not found: ${tests[0]}"
    echo "Available:"
    for f in "$PROMPTS_DIR"/*.txt; do echo "  $(basename "$f" .txt)"; done
    exit 1
  fi
else
  tests=("$PROMPTS_DIR"/*.txt)
fi

# ── Run tests ────────────────────────────────────────────────

passed=0
failed=0
total=${#tests[@]}

for test_file in "${tests[@]}"; do
  test_name=$(basename "$test_file" .txt)
  echo ""
  echo "━━━ $test_name ━━━"

  # Parse header
  output_file=""
  check_args=()
  test_timeout=$DEFAULT_TIMEOUT

  while IFS= read -r line; do
    [[ "$line" == "---" ]] && break

    if [[ "$line" =~ ^#\ *output:\ *(.+) ]]; then
      output_file="${BASH_REMATCH[1]}"
    elif [[ "$line" =~ ^#\ *pages:\ *(.+) ]]; then
      check_args+=(--pages "${BASH_REMATCH[1]}")
    elif [[ "$line" =~ ^#\ *bytesize:\ *(.+) ]]; then
      check_args+=(--bytesize "${BASH_REMATCH[1]}")
    elif [[ "$line" =~ ^#\ *contains:\ *(.+) ]]; then
      check_args+=(--contains "${BASH_REMATCH[1]}")
    elif [[ "$line" =~ ^#\ *not-contains:\ *(.+) ]]; then
      check_args+=(--not-contains "${BASH_REMATCH[1]}")
    elif [[ "$line" =~ ^#\ *timeout:\ *([0-9]+) ]]; then
      test_timeout="${BASH_REMATCH[1]}"
    elif [[ "$line" =~ ^#\ *[a-z] ]]; then
      echo "  ERROR: unknown header in $test_file: $line"
      exit 1
    fi
  done < "$test_file"

  if [[ -z "$output_file" ]]; then
    echo "  SKIP: no '# output:' in header"
    ((failed++))
    continue
  fi

  output_path="$OUTPUT_DIR/$output_file"

  # Extract prompt body (everything after the --- line)
  prompt_body=$(sed -n '/^---$/,$ { /^---$/d; p; }' "$test_file")
  prompt_body="${prompt_body//\$OUTPUT_DIR/$OUTPUT_DIR}"

  # Remove stale output so we don't pass on a leftover file
  rm -f "$output_path"

  # Run claude
  echo "  Running claude -p (timeout: ${test_timeout}s)..."
  claude_exit=0
  timeout --foreground "${test_timeout}s" claude -p "$prompt_body" --allowedTools "Bash,Read,Edit,Write" > "$OUTPUT_DIR/${test_name}.log" 2>&1 || claude_exit=$?

  if (( claude_exit != 0 )); then
    echo "  FAIL: claude exited with code $claude_exit"
    echo "  Log:  $OUTPUT_DIR/${test_name}.log"
    ((failed++))
    continue
  fi

  # Verify output exists
  if [[ ! -f "$output_path" ]]; then
    echo "  FAIL: output not created: $output_path"
    echo "  Log:  $OUTPUT_DIR/${test_name}.log"
    ((failed++))
    continue
  fi

  # Run checks
  if bash "$CHECK_PDF" "$output_path" "${check_args[@]}"; then
    echo "  OK"
    ((passed++))
  else
    echo "  Log:  $OUTPUT_DIR/${test_name}.log"
    ((failed++))
  fi
done

# ── Summary ──────────────────────────────────────────────────

echo ""
echo "================================"
echo "Results: $passed/$total passed"
if (( failed > 0 )); then
  echo "$failed test(s) FAILED"
  echo "Output: $OUTPUT_DIR/"
  exit 1
else
  echo "All tests passed."
  echo "Output: $OUTPUT_DIR/"
fi
