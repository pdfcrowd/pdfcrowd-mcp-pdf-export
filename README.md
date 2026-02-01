# PDFCrowd MCP Server

An MCP server for exporting content as PDF using the [PDFCrowd API](https://pdfcrowd.com/).

## Use Case

Claude creates well-designed HTML layouts from any content, then exports to PDF. The converter supports modern CSS3 and JavaScript.

## Installation

```bash
npm install
npm run build
```

## Configuration

Add to `~/.mcp.json`:

```json
{
  "mcpServers": {
    "pdfcrowd": {
      "command": "node",
      "args": ["/path/to/pdfcrowd-mcp-server/dist/index.js"],
      "env": {
        "PDFCROWD_USERNAME": "demo",
        "PDFCROWD_API_KEY": "demo"
      }
    }
  }
}
```

Demo mode produces watermarked PDFs. Get a license at [pdfcrowd.com/pricing](https://pdfcrowd.com/pricing/).

## Tool

### pdfcrowd_create_pdf

Export content as PDF. Provide one of: `html`, `url`, or `file`.

```json
{
  "html": "<h1>Hello World</h1>",
  "output_path": "/tmp/hello.pdf"
}
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `html` | string | - | HTML content to convert |
| `url` | string | - | URL to convert |
| `file` | string | - | Path to local HTML file |
| `output_path` | string | required | Where to save the PDF |
| `page_size` | string | A4 | A3, A4, A5, Letter |
| `orientation` | string | portrait | portrait or landscape |
| `no_margins` | boolean | false | Remove all margins |
| `title` | string | - | PDF title metadata |

## Development

```bash
make install    # Install dependencies
make build      # Build TypeScript
make test       # Quick test
make inspector  # Debug with MCP Inspector
make help       # Show all targets
```

## License

MIT
