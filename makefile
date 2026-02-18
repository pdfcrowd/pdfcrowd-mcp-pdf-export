# PDFCrowd MCP Server Makefile

# Default credentials (override with environment variables)
PDFCROWD_USERNAME ?= demo
PDFCROWD_API_KEY ?= demo

.PHONY: all build clean install install-dev run dev inspector test test-unit test-prompt test-all test-npx schema help npm-check npm-pack npm-publish npm-publish-dry changelog registry-publish registry-login

all: build

# Install dependencies
install:
	npm install

# Install dev dependencies (vitest, etc.)
install-dev:
	npm install --include=dev

# Build TypeScript to JavaScript
build:
	npm run build

# Clean build artifacts
clean:
	rm -rf dist
	rm -rf node_modules

# Run the MCP server (stdio mode)
run: build
	PDFCROWD_USERNAME=$(PDFCROWD_USERNAME) \
	PDFCROWD_API_KEY=$(PDFCROWD_API_KEY) \
	node dist/index.js

# Run in development mode with auto-reload
dev:
	PDFCROWD_USERNAME=$(PDFCROWD_USERNAME) \
	PDFCROWD_API_KEY=$(PDFCROWD_API_KEY) \
	npm run dev

# Run MCP Inspector for debugging (no auto-open browser)
inspector: build
	@echo "Inspector URL will be printed below - open it manually in a browser"
	@BROWSER=none \
	PDFCROWD_USERNAME=$(PDFCROWD_USERNAME) \
	PDFCROWD_API_KEY=$(PDFCROWD_API_KEY) \
	npx @modelcontextprotocol/inspector node dist/index.js

# Run unit tests (vitest)
test-unit:
	npx vitest run

# Run prompt tests (requires claude CLI)
test-prompt: build
	bash tests/prompt/run.sh $(TEST)

# Run all tests
test-all: test-unit test-prompt

# Quick smoke test - convert example.com to PDF
test: build
	@echo "Testing PDF creation..."
	@PDFCROWD_USERNAME=$(PDFCROWD_USERNAME) \
	PDFCROWD_API_KEY=$(PDFCROWD_API_KEY) \
	node -e " \
		import('./dist/services/pdfcrowd-client.js').then(async (client) => { \
			const result = await client.createPdf({ url: 'https://example.com', outputPath: '/tmp/mcp-test.pdf' }); \
			if (result.success) { \
				console.log('Success! PDF saved to:', result.outputPath); \
				console.log('Pages:', result.metadata.pageCount); \
				console.log('Size:', result.metadata.outputSize, 'bytes'); \
				console.log('Demo mode:', result.isDemo); \
			} else { \
				console.error('Error:', result.error); \
				process.exit(1); \
			} \
		}).catch(e => { console.error('Error:', e); process.exit(1); }); \
	"

# Test npx install - verifies the package loads without missing modules
test-npx: build
	@echo "Packing tarball..."
	@npm pack --quiet
	@echo "Testing npx install..."
	@TARBALL=$$(ls -t pdfcrowd-mcp-pdf-export-*.tgz | head -1); \
	LOG=$$(mktemp); \
	PDFCROWD_USERNAME=demo PDFCROWD_API_KEY=demo \
	timeout 10 npx --yes "./$${TARBALL}" > "$$LOG" 2>&1; \
	if grep -q "PDF Export MCP server running" "$$LOG"; then \
		echo "OK: server loaded successfully"; \
	else \
		echo "FAIL: server did not start"; cat "$$LOG"; \
		rm -f "$$LOG" "$${TARBALL}"; exit 1; \
	fi; \
	rm -f "$$LOG" "$${TARBALL}"

# Show tool schema as JSON
schema: build
	@node -e " \
		import { zodToJsonSchema } from 'zod-to-json-schema'; \
		import { CreatePdfSchema } from './dist/schemas/index.js'; \
		console.log(JSON.stringify(zodToJsonSchema(CreatePdfSchema), null, 2)); \
	"

# Check package before publishing
npm-check: build
	@echo "Checking package..."
	@npm pack --dry-run
	@echo ""
	@echo "Package contents above. Review before publishing."

# Create tarball without publishing
npm-pack: build
	npm pack

# Dry run publish (validates everything without actually publishing)
npm-publish-dry: build
	npm publish --dry-run

# Publish to npm (requires npm login)
npm-publish: build
	@echo "Publishing to npm..."
	@echo "Make sure you have:"
	@echo "  1. Updated version in package.json"
	@echo "  2. Committed all changes"
	@echo "  3. Logged in with 'npm login'"
	@echo ""
	@read -p "Continue? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	npm publish

# Generate changelog entry for unreleased changes (uses claude CLI)
changelog:
	bash scripts/update-changelog.sh

# Login to MCP registry (required once, token is cached)
registry-login:
	mcp-publisher login github

# Publish to MCP registry (requires prior login)
registry-publish:
	npm run publish-registry

# Show help
help:
	@echo "PDFCrowd MCP Server"
	@echo ""
	@echo "Targets:"
	@echo "  make install     - Install npm dependencies"
	@echo "  make install-dev - Install dev dependencies (vitest)"
	@echo "  make build      - Build TypeScript to JavaScript"
	@echo "  make clean      - Remove build artifacts and node_modules"
	@echo "  make run        - Run the MCP server (stdio mode)"
	@echo "  make dev        - Run in development mode with auto-reload"
	@echo "  make inspector  - Run MCP Inspector for debugging"
	@echo "  make test        - Quick smoke test: convert example.com to PDF"
	@echo "  make test-unit   - Run unit tests (vitest)"
	@echo "  make test-prompt - Run prompt tests (needs claude CLI + MCP)"
	@echo "  make test-all    - Run unit + prompt tests"
	@echo "  make test-npx    - Test npx install loads without missing modules"
	@echo "  make schema      - Show tool JSON schema"
	@echo ""
	@echo "NPM publishing:"
	@echo "  make npm-check       - Preview package contents"
	@echo "  make npm-pack        - Create tarball without publishing"
	@echo "  make npm-publish-dry - Dry run publish (validates without publishing)"
	@echo "  make npm-publish     - Publish to npm registry"
	@echo ""
	@echo "Changelog:"
	@echo "  make changelog       - Generate changelog entry (uses claude CLI)"
	@echo ""
	@echo "MCP Registry:"
	@echo "  make registry-login   - Login to MCP registry (one-time)"
	@echo "  make registry-publish - Publish to MCP registry"
	@echo ""
	@echo "Environment variables:"
	@echo "  PDFCROWD_USERNAME - PDFCrowd username (default: demo)"
	@echo "  PDFCROWD_API_KEY  - PDFCrowd API key"
