#!/usr/bin/env node
/**
 * PDFCrowd MCP Server
 *
 * Export content as PDF using the PDFCrowd API.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { z } from "zod";
import { CreatePdfSchema, type CreatePdfInput } from "./schemas/index.js";
import { createPdf } from "./services/pdfcrowd-client.js";
import { VERSION } from "./version.js";

const server = new McpServer({
  name: "PDF Export",
  version: VERSION
});

// Topic content for pdfcrowd_info tool
const TOPICS = {
  html_layout: `HTML Layout Guidelines for PDF Export:
- Reset default spacing: html,body{margin:0;padding:0} - content should start exactly at PDF margins
- Content is auto-scaled to fit page width - avoid setting explicit container widths
- Wrap code/logs/CLI output in <pre> to preserve whitespace and formatting
- Use 16px base font size
- Use block flow for main structure (sections stack vertically)
- Flex/grid only inside non-breaking units (cards, headers) - they break poorly across pages
- break-inside:avoid and break-before:page work on block elements only (div, section, figure, table)
- TOC: only if requested or appropriate; entries must link to section anchors
- Images: absolute URLs or inline data URIs
- For visualizations, use Mermaid from CDN (https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js) - choose the appropriate diagram type for the data.`
} as const;

type TopicKey = keyof typeof TOPICS;
const VALID_TOPICS = Object.keys(TOPICS) as TopicKey[];

// Register the main tool
server.registerTool(
  "pdfcrowd_create_pdf",
  {
    title: "Create PDF",
      description: `Export any content (including charts) to PDF.
If input isn't HTML, create a well-designed layout first.
Use only parameters in this tool's schema, output_path is required.
IMPORTANT: Before creating HTML, first call pdfcrowd_info(topic: "html_layout") to get the layout guidelines.

On error: Read the error message carefully and follow its guidance. Report configuration issues to the user instead of trying other PDF tools.
`,
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
      margins: params.margins,
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

// Info tool for users
server.registerTool(
  "pdfcrowd_info",
  {
    title: "PDF Export Info",
    description: "Get usage tips and upgrade info for PDF Export",
    inputSchema: z.object({
      topic: z.string()
        .optional()
        .describe(`Optional topic for specific guidance. Available: ${VALID_TOPICS.join(", ")}`)
    })
  },
  async (params: { topic?: string }) => {
    // Return topic-specific content if requested
    if (params.topic) {
      if (params.topic in TOPICS) {
        return { content: [{ type: "text", text: TOPICS[params.topic as TopicKey] }] };
      }
      // Invalid topic - return guidance
      return {
        content: [{ type: "text", text: `Unknown topic: "${params.topic}". Available topics: ${VALID_TOPICS.join(", ")}` }]
      };
    }

    // Default: general info
    const isDemo = process.env.PDFCROWD_USERNAME === "demo";
    const lines = [
      `PDF Export v${VERSION} | pdfcrowd.com`,
      `Status: ${isDemo ? 'DEMO (watermarked)' : 'Licensed'}`,
      isDemo ? 'Remove watermark: pdfcrowd.com/pricing' : null,
      '',
      'Prompt pattern: [Read/analyze content] → [Create PDF with structure] → [Save to path]',
      '',
      `Available topics: ${VALID_TOPICS.join(", ")}`,
      '',
      'Support: support@pdfcrowd.com'
    ].filter(line => line !== null);

    return { content: [{ type: "text", text: lines.join('\n') }] };
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
