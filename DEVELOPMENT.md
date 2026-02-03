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
      "args": ["/FULL/PATH/TO/pdfcrowd-mcp-pdf-export/dist/index.js"],
      "env": {
        "PDFCROWD_USERNAME": "demo",
        "PDFCROWD_API_KEY": "demo"
      },
      "timeout": 65000
    }
  }
}
```

Replace `/FULL/PATH/TO/` with the actual path to your clone.

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
# Bump version (choose one)
npm version patch   # 1.0.0 → 1.0.1
npm version minor   # 1.0.0 → 1.1.0
npm version major   # 1.0.0 → 2.0.0

# Build
npm run build
```

## Publishing to npm

```bash
make npm-check       # preview package contents
make npm-publish-dry # dry run (validates without publishing)
make npm-publish     # publish to npm registry
```
