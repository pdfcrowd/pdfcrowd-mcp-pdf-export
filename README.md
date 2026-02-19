
[![Claude Code](https://img.shields.io/badge/Claude_Code-supported-blue)](https://claude.ai/download)
[![Codex](https://img.shields.io/badge/Codex_CLI-supported-blue)](https://github.com/openai/codex)
[![Gemini CLI](https://img.shields.io/badge/Gemini_CLI-supported-blue)](https://github.com/google-gemini/gemini-cli)
[![npm version](https://img.shields.io/npm/v/pdfcrowd-mcp-pdf-export)](https://www.npmjs.com/package/pdfcrowd-mcp-pdf-export)

# PDF Export for AI Agents

Well-designed PDFs from a single prompt. Describe what you need, get a professional document.

Powered by [PDFCrowd](https://pdfcrowd.com). [Learn more →](https://pdfcrowd.com/mcp-pdf-export/)

## Example

```
Analyze this project and create a comprehensive architecture overview PDF.
Include component diagrams and data flow. Save to architecture-overview.pdf
```

[![Architecture Overview](https://raw.githubusercontent.com/pdfcrowd/pdfcrowd-mcp-pdf-export/master/assets/architecture-overview.png)](https://raw.githubusercontent.com/pdfcrowd/pdfcrowd-mcp-pdf-export/master/assets/architecture-overview.pdf)

[More examples →](https://pdfcrowd.com/mcp-pdf-export/)

## Configuration

**Prerequisites:** [Node.js](https://nodejs.org/) 18 or later.

### Claude Code

Run once to register the server:

```
claude mcp add --scope user pdfcrowd-export-pdf -- npx -y pdfcrowd-mcp-pdf-export
```

Or add manually to `~/.claude.json` (user scope) or `.mcp.json` in your project root (project scope):

```json
{
  "mcpServers": {
    "pdfcrowd-export-pdf": {
      "command": "npx",
      "args": ["-y", "pdfcrowd-mcp-pdf-export"]
    }
  }
}
```

### Gemini CLI

```
gemini mcp add -s user pdfcrowd-export-pdf -- npx -y pdfcrowd-mcp-pdf-export
```

Or add manually to `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "pdfcrowd-export-pdf": {
      "command": "npx",
      "args": ["-y", "pdfcrowd-mcp-pdf-export"],
      "timeout": 65000
    }
  }
}
```

### Codex CLI

```
codex mcp add pdfcrowd-export-pdf -- npx -y pdfcrowd-mcp-pdf-export
```

Or add manually to `~/.codex/config.toml`:

```toml
[mcp_servers.pdfcrowd-export-pdf]
command = "npx"
args = ["-y", "pdfcrowd-mcp-pdf-export"]
tool_timeout_sec = 65
```

### Notes

- Restart your CLI after configuration to load the server

## Personal Credentials

Get started right away — no credentials or signup needed. Output includes a watermark. For watermark-free PDFs, [sign up](https://pdfcrowd.com/pricing/) for personal credentials.

Personal credentials can be set in:

1. **Config file** `~/.pdfcrowd-mcp`:
   ```
   PDFCROWD_USERNAME=your_username
   PDFCROWD_API_KEY=your_api_key
   ```
2. **Environment variables** `PDFCROWD_USERNAME` and `PDFCROWD_API_KEY`.

## Privacy

Your source code never leaves your machine — only the rendered document is sent to [PDFCrowd](https://pdfcrowd.com/privacy/) for PDF conversion.

## License

[MIT](LICENSE)
