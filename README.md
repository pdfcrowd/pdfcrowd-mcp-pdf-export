
[![Claude Code](https://img.shields.io/badge/Claude_Code-supported-blue)](https://claude.ai/download)
[![Codex](https://img.shields.io/badge/Codex_CLI-supported-blue)](https://github.com/openai/codex)
[![Gemini CLI](https://img.shields.io/badge/Gemini_CLI-supported-blue)](https://github.com/google-gemini/gemini-cli)
[![npm version](https://img.shields.io/npm/v/pdfcrowd-mcp-pdf-export)](https://www.npmjs.com/package/pdfcrowd-mcp-pdf-export)

# PDF Export for AI Agents

MCP server for PDF export. Install locally, use from Claude Code, Codex, Gemini CLI, or any MCP-compatible client.

Reports, documentation, code reviews — anything your AI can describe, it can now export.

Powered by [PDFCrowd](https://pdfcrowd.com).

## What You Can Do

**The pattern:**
```
[Analyze/Read something] → [Create PDF with specific structure] → [Save to path]
```

**Document your API from code:**
```
Read the route handlers in src/api/, generate API documentation
with endpoints, parameters, and examples. Save to docs/api.pdf
```

**Document your database schema:**
```
Explore the codebase and create a PDF documenting
all DB tables, relationships, column types, and indexes. Save to docs/schema.pdf
```

**Automate reports (non-interactive):**
```bash
claude -p "Analyze git commits from last week, create a sprint
  summary PDF at reports/sprint.pdf" && \
  mail -s "Sprint Report" team@company.com -A reports/sprint.pdf
```

[More example prompts →](SAMPLE_PROMPTS.md)

## Configuration

### Claude Code / Gemini CLI

Add to your config file:
- Claude Code: `~/.mcp.json`
- Gemini CLI: `~/.gemini/settings.json`

```json
{
  "mcpServers": {
    "pdfcrowd-export-pdf": {
      "command": "npx",
      "args": ["-y", "pdfcrowd-mcp-pdf-export"],
      "env": {
        "PDFCROWD_USERNAME": "demo",
        "PDFCROWD_API_KEY": "demo"
      },
      "timeout": 65000
    }
  }
}
```

### Codex CLI

Add to `~/.codex/config.toml`:

```toml
[mcp_servers.pdfcrowd-export-pdf]
command = "npx"
args = ["-y", "pdfcrowd-mcp-pdf-export"]
tool_timeout_sec = 65

[mcp_servers.pdfcrowd-export-pdf.env]
PDFCROWD_USERNAME = "demo"
PDFCROWD_API_KEY = "demo"
```

### Notes

- Restart your CLI after configuration to load the server
- Timeout is set to 65 seconds because complex PDFs may take up to 60 seconds to generate

## Credentials

- Default: produces watermarked PDFs (no signup needed)
- Remove watermarks: get credentials at [pdfcrowd.com/pricing](https://pdfcrowd.com/pricing/)

## Privacy Notice

PDFs are generated remotely on PDFCrowd servers. When you use this tool:

- **Data transmitted**: Your content (HTML, URL, or file) is sent to PDFCrowd servers via HTTPS
- **Data retention**: Content is retained only during processing, then permanently deleted (typically within 30 minutes)
- **No copies**: No copies of your content are kept or shared
- **Location**: PDFCrowd is based in the Czech Republic (EU), GDPR applies
- **Privacy policy**: [pdfcrowd.com/privacy](https://pdfcrowd.com/privacy/)

For sensitive or confidential content, review PDFCrowd's privacy policy before use.

## Development

See [DEVELOPMENT.md](DEVELOPMENT.md) for building from source, testing, and contributing.

## License

[MIT](LICENSE)
