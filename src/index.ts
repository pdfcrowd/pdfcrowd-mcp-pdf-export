#!/usr/bin/env node
/**
 * PDFCrowd MCP Server
 *
 * Export content as PDF using the PDFCrowd API.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { CreatePdfSchema, type CreatePdfInput } from "./schemas/index.js";
import { createPdf } from "./services/pdfcrowd-client.js";
import { VERSION } from "./version.js";

const server = new McpServer({
  name: "PDF Export",
  version: VERSION
});

// Register the main tool
server.registerTool(
  "pdfcrowd_create_pdf",
  {
    title: "Create PDF",
      description: `Export any content (including charts) to PDF.
If input isn't HTML, create a well-designed layout first.
Check schema for valid parameters.
When creating HTML:
- No background color (white default)
- Use 16px base font size
- Use block flow for main structure (sections stack vertically)
- Flex/grid only inside non-breaking units (cards, headers) - they break poorly across pages
- break-inside:avoid and break-before:page work on block elements only (div, section, figure, table)
- Images: absolute URLs or inline data URIs; embed inline SVG for charts and infographics
- No animations - static PDF cannot capture them

On error: Read the error message carefully and follow its guidance. Report configuration issues to the user instead of trying other PDF tools.

Demo mode (watermarked). Upgrade: pdfcrowd.com/pricing`,
    inputSchema: CreatePdfSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  },
  async (params: CreatePdfInput) => {
    const result = await createPdf({
      html: params.html,
      url: params.url,
      file: params.file,
      outputPath: params.output_path,
      pageSize: params.page_size,
      orientation: params.orientation,
      noMargins: params.no_margins,
      title: params.title
    });

    if (!result.success) {
      return {
        content: [{ type: "text", text: `Error: ${result.error}` }],
        isError: true
      };
    }

    const lines = [
      `PDF saved to: ${result.outputPath}`,
      `Size: ${(result.metadata.outputSize / 1024).toFixed(1)} KB`,
      result.metadata.pageCount ? `Pages: ${result.metadata.pageCount}` : null,
      result.isDemo ? `\nDemo mode (watermarked). Upgrade: pdfcrowd.com/pricing` : null
    ].filter(Boolean);

    return {
      content: [{ type: "text", text: lines.join("\n") }]
    };
  }
);

// Main
async function main() {
  const username = process.env.PDFCROWD_USERNAME;
  const apiKey = process.env.PDFCROWD_API_KEY;

  if (!username || !apiKey) {
    console.error("ERROR: PDFCROWD_USERNAME and PDFCROWD_API_KEY required");
    console.error('  export PDFCROWD_USERNAME="your_username"');
    console.error('  export PDFCROWD_API_KEY="your_api_key"');
    process.exit(1);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("PDF Export MCP server running");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
