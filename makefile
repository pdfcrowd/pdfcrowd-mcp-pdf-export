# PDFCrowd MCP Server Makefile

# Default credentials (override with environment variables)
PDFCROWD_USERNAME ?= demo
PDFCROWD_API_KEY ?= demo

.PHONY: all build clean install run dev inspector test schema help

all: build

# Install dependencies
install:
	npm install

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

# Quick test - convert example.com to PDF
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

# Show tool schema as JSON
schema: build
	@node -e " \
		import { zodToJsonSchema } from 'zod-to-json-schema'; \
		import { CreatePdfSchema } from './dist/schemas/index.js'; \
		console.log(JSON.stringify(zodToJsonSchema(CreatePdfSchema), null, 2)); \
	"

# Show help
help:
	@echo "PDFCrowd MCP Server"
	@echo ""
	@echo "Targets:"
	@echo "  make install    - Install npm dependencies"
	@echo "  make build      - Build TypeScript to JavaScript"
	@echo "  make clean      - Remove build artifacts and node_modules"
	@echo "  make run        - Run the MCP server (stdio mode)"
	@echo "  make dev        - Run in development mode with auto-reload"
	@echo "  make inspector  - Run MCP Inspector for debugging"
	@echo "  make test       - Quick test: convert example.com to PDF"
	@echo "  make schema     - Show tool JSON schema"
	@echo ""
	@echo "Environment variables:"
	@echo "  PDFCROWD_USERNAME - PDFCrowd username (default: demo)"
	@echo "  PDFCROWD_API_KEY  - PDFCrowd API key"
