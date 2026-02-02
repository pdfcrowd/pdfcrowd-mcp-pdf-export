# Development

## Quick Start

```bash
npm install
npm run build
```

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
