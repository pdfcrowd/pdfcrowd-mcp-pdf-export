# Development

## Building from Source

```bash
git clone https://github.com/pdfcrowd/pdfcrowd-mcp-pdf-export
cd pdfcrowd-mcp-pdf-export
npm install
npm run build
```

To use your local build, update your MCP config to point to the built file:

```json
{
  "mcpServers": {
    "pdfcrowd-export-pdf": {
      "command": "node",
      "args": ["/FULL/PATH/TO/pdfcrowd-mcp-pdf-export/dist/index.js"]
    }
  }
}
```

Replace `/FULL/PATH/TO/` with the actual path to your clone.

Credentials are resolved automatically: `~/.pdfcrowd-mcp` config file > environment variables > built-in demo. No `env` block is needed in the MCP config for development — the demo credentials are used by default.

## Make Targets

```bash
make help       # show all targets
make test       # quick test - converts example.com to PDF
make inspector  # debug with MCP Inspector
make schema     # show tool JSON schema
make dev        # run with auto-reload
```

## Bumping Version

Version is read from `package.json` at runtime - single source of truth.

```bash
# 1. Generate changelog (uses claude CLI to summarize git changes)
make changelog

# 2. Review and edit CHANGELOG.md as needed

# 3. Bump version (choose one) — this finalizes the changelog header and commits
npm version patch   # 1.0.0 → 1.0.1
npm version minor   # 1.0.0 → 1.1.0
npm version major   # 1.0.0 → 2.0.0

# 4. Build
npm run build
```

The `npm version` command automatically:
- Replaces the "Next release" header in CHANGELOG.md with the version and date
- Syncs the version into `server.json` (for the MCP registry)
- Commits and tags

## Publishing to npm

```bash
make npm-check       # preview package contents
make npm-publish-dry # dry run (validates without publishing)
make npm-publish     # publish to npm registry
```

## Publishing to MCP Registry

After publishing to npm, publish to the [MCP registry](https://registry.modelcontextprotocol.io/) separately:

```bash
make registry-login   # one-time GitHub auth (token is cached)
make registry-publish # publish server.json to the registry
```
