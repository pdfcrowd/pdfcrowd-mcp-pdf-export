#!/usr/bin/env bash
#
# sync-server-version.sh — Sync version across server.json and plugin.json
#
# Called by the npm "version" lifecycle hook. Reads the new version
# from package.json and updates version fields in server.json and
# .claude-plugin/plugin.json.

set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SERVER_JSON="$PROJECT_DIR/server.json"

if [[ ! -f "$SERVER_JSON" ]]; then
  echo "server.json not found, skipping"
  exit 0
fi

cd "$PROJECT_DIR"

version=$(node -p "require('./package.json').version")

sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$version\"/g" "$SERVER_JSON"
git add "$SERVER_JSON"

echo "server.json synced to version $version"

PLUGIN_JSON="$PROJECT_DIR/.claude-plugin/plugin.json"

if [[ -f "$PLUGIN_JSON" ]]; then
  sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$version\"/g" "$PLUGIN_JSON"
  git add "$PLUGIN_JSON"
  echo "plugin.json synced to version $version"
fi
