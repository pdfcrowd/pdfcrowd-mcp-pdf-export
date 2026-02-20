# Changelog

## Next release

### Features
- Add Claude Code plugin and marketplace support with plugin descriptors
- Support reading credentials from `~/.pdfcrowd-mcp` config file

### Improvements
- Persist agent temp files and add server-side cleanup
- Rename `mermaid_diagrams` topic to `diagrams`
- Improve marketplace plugin descriptions and clean up configuration docs

### Fixes
- Fix credential resolution and warning overwrite behavior
- Add `.gitignore` entries for token files and fix version sync script


## 1.1.2 (2026-02-18)

### Fixes

- Replaced `archiver` with `yazl` for ZIP bundling to fix npx install failure

### Improvements

- Added `make test-npx` target and updated prompt tests to use local npx tarball instead of global MCP config
## 1.1.1 (2026-02-17)

- Added MCP registry publishing support with `server.json` configuration and version sync script
- Updated development tooling: new makefile targets for registry publishing and version synchronization
## 1.1.0 (2026-02-16)

### Features
- Add automatic local asset bundling for PDF export
- Add `viewport_width` parameter for HTML rendering width control
- Add `margins` parameter, replacing the previous `no_margins` flag
- Add `pdfcrowd_info` tool with topic-based guidance (html_layout, mermaid_diagrams, local_assets, parameters)
- Add changelog generation scripts using Claude CLI

### Improvements
- Add unit tests and prompt-based test framework with fixtures
- Streamline README with visual example, homepage link, and badges for npm version and supported MCP clients
- Improve tool descriptions and schema for better agent behavior
- Enhance Mermaid diagram instructions with pagination guidelines and syntax error prevention
- Add non-ASCII text guidance to HTML layout topic
- Instruct agents to use absolute paths for local assets and agent-invented UUIDs for temp filenames
- Use resolved OS temp dir for temp file paths
- Enable full-bleed layout for single-page PDFs

### Fixes
- Fix installation instructions in README
- Fix prompt test runner performance
- Accept `0` as a valid value for margins parameter
- Override deprecated `glob@10` with `glob@13` in archiver-utils
