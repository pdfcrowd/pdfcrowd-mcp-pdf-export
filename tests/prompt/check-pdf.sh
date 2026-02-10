#!/usr/bin/env bash
#
# check-pdf.sh — Validate a PDF using poppler tools (pdfinfo, pdftotext)
#
# Usage:
#   check-pdf.sh <file> [--pages ">=2"] [--bytesize ">=5000"] [--contains "text"] [--not-contains "text"]

set -u

file="${1:?Usage: check-pdf.sh <file> [--pages SPEC] [--bytesize SPEC] [--contains TEXT] [--not-contains TEXT]}"
shift

if [[ ! -f "$file" ]]; then
  echo "  FAIL: file not found: $file"
  exit 1
fi

# PDF magic bytes
magic=$(head -c 4 "$file")
if [[ "$magic" != "%PDF" ]]; then
  echo "  FAIL: not a valid PDF (missing %PDF header)"
  exit 1
fi

# File size > 1 KB
size=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file" 2>/dev/null)
if (( size < 1024 )); then
  echo "  FAIL: PDF too small (${size} bytes)"
  exit 1
fi

errors=0

while (( $# > 0 )); do
  case "$1" in
    --pages)
      spec="$2"; shift 2
      actual=$(pdfinfo "$file" 2>/dev/null | awk '/^Pages:/ {print $2}')
      if [[ -z "$actual" ]]; then
        echo "  FAIL: could not read page count (is pdfinfo installed?)"
        ((errors++))
        continue
      fi

      if [[ "$spec" =~ ^([><=!]+)[[:space:]]*([0-9]+)$ ]]; then
        op="${BASH_REMATCH[1]}"
        expected="${BASH_REMATCH[2]}"
      elif [[ "$spec" =~ ^([0-9]+)$ ]]; then
        op="="
        expected="${BASH_REMATCH[1]}"
      else
        echo "  FAIL: invalid pages spec: $spec"
        ((errors++))
        continue
      fi

      pass=false
      case "$op" in
        ">="     ) (( actual >= expected )) && pass=true ;;
        "<="     ) (( actual <= expected )) && pass=true ;;
        ">"      ) (( actual > expected ))  && pass=true ;;
        "<"      ) (( actual < expected ))  && pass=true ;;
        "="|"==" ) (( actual == expected )) && pass=true ;;
        *        ) echo "  FAIL: unknown operator: $op"; ((errors++)); continue ;;
      esac

      if ! $pass; then
        echo "  FAIL: pages: expected ${op}${expected}, got ${actual}"
        ((errors++))
      fi
      ;;

    --bytesize)
      spec="$2"; shift 2

      if [[ "$spec" =~ ^([><=!]+)[[:space:]]*([0-9]+)$ ]]; then
        op="${BASH_REMATCH[1]}"
        expected="${BASH_REMATCH[2]}"
      elif [[ "$spec" =~ ^([0-9]+)$ ]]; then
        op="="
        expected="${BASH_REMATCH[1]}"
      else
        echo "  FAIL: invalid bytesize spec: $spec"
        ((errors++))
        continue
      fi

      pass=false
      case "$op" in
        ">="     ) (( size >= expected )) && pass=true ;;
        "<="     ) (( size <= expected )) && pass=true ;;
        ">"      ) (( size > expected ))  && pass=true ;;
        "<"      ) (( size < expected ))  && pass=true ;;
        "="|"==" ) (( size == expected )) && pass=true ;;
        *        ) echo "  FAIL: unknown operator: $op"; ((errors++)); continue ;;
      esac

      if ! $pass; then
        echo "  FAIL: bytesize: expected ${op}${expected}, got ${size}"
        ((errors++))
      fi
      ;;

    --contains)
      text="$2"; shift 2
      if ! pdftotext "$file" - 2>/dev/null | grep -qiF "$text"; then
        echo "  FAIL: text not found: \"$text\""
        ((errors++))
      fi
      ;;

    --not-contains)
      text="$2"; shift 2
      if pdftotext "$file" - 2>/dev/null | grep -qiF "$text"; then
        echo "  FAIL: unwanted text found: \"$text\""
        ((errors++))
      fi
      ;;

    *)
      echo "  WARN: unknown option: $1"; shift
      ;;
  esac
done

if (( errors > 0 )); then
  exit 1
fi
exit 0
