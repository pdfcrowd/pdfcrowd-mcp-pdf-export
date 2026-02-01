# PDFCrowd MCP Server

MCP server for exporting content as PDF using the PDFCrowd API.

## Setup

```bash
git clone <repo-url>
cd pdfcrowd-mcp-server
npm install
npm run build
```

## Configure Claude Code

Add to `~/.mcp.json`:

```json
{
  "mcpServers": {
    "pdfcrowd": {
      "command": "node",
      "args": ["/absolute/path/to/pdfcrowd-mcp-server/dist/index.js"],
      "env": {
        "PDFCROWD_USERNAME": "your_username",
        "PDFCROWD_API_KEY": "your_api_key"
      }
    }
  }
}
```

Restart Claude Code to load the server.

## Credentials

- Demo: use `demo` / `demo` (produces watermarked PDFs)
- Production: get credentials at [pdfcrowd.com/pricing](https://pdfcrowd.com/pricing/)

## Development

```bash
make help       # show all targets
make test       # quick test
make inspector  # debug with MCP Inspector
make schema     # show tool JSON schema
```
