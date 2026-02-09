#!/usr/bin/env node
/**
 * PDFCrowd MCP Server
 *
 * Export content as PDF using the PDFCrowd API.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { CreatePdfSchema, DEFAULT_MARGIN, DEFAULT_VIEWPORT_WIDTH, type CreatePdfInput } from "./schemas/index.js";
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
- Content is rendered at a default viewport width of ${DEFAULT_VIEWPORT_WIDTH} and auto-scaled to fit page width. Use the viewport_width parameter to change the rendering width (e.g., wider for landscape layouts)
- Wrap code/logs/CLI output in <pre> to preserve whitespace and formatting
- Use light backgrounds throughout ALL sections including cover/title pages (white/transparent for body) - dark/gradient backgrounds render poorly in print/PDF
- Use 16px base font size
- Use block flow for main structure (sections stack vertically)
- Flex/grid only inside non-breaking units (cards, headers) - they break poorly across pages
- Cover/title pages: white/transparent background, break-after:page. No min-height:100vh - it overflows to two pages
- break-inside:avoid and break-before:page work on block elements only (div, section, figure, table)
- TOC: only if requested or appropriate; entries must link to section anchors
- Images: absolute URLs or inline data URIs
- Default page margins: ${DEFAULT_MARGIN}mm. Do not use page-level backgrounds or borders
- For single-page full-bleed PDFs (certificates, posters): pass margins=0 to the tool, set page height in CSS to 100vh;
- For diagrams, use Mermaid - IMPORTANT: first call pdfcrowd_info(topic: "mermaid_diagrams")
`,
  mermaid_diagrams: `Mermaid Diagrams in Paginated PDFs:
- CDN: https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js
- Init: mermaid.initialize({startOnLoad:true, theme:'neutral'})
- Keep diagrams small (6-8 nodes max) - split complex ones into multiple diagrams
- Width & legibility: diagrams are scaled to fit page width - too-wide diagrams become illegible. Always prefer vertical/top-down layouts. Only place nodes side-by-side when their combined label text is short (rough limit: ~60 characters total across a horizontal row). This applies everywhere: flowchart direction, subgraph direction, sequence participants, class entities, etc.
- Always use flowchart TD (top-down) as the default direction, including inside subgraphs
- Only use LR (left-right) when the horizontal row has 2-3 nodes with short labels (under ~20 chars each)
- When labels are long (package names, descriptions), always stack vertically
- Sequence diagrams: use short aliases, keep combined alias text under ~60 chars across all participants
- CSS isolation: generic rules can bleed into Mermaid SVGs - reset backgrounds/padding as needed
- Node labels: no special chars (~/.#&) - they break parsing. Put paths/URLs in tables instead
- Node line breaks: use <br> tags, not \\n

You MUST use the following CSS/HTML template for diagrams.
Replace page height and margins in max-height calc() with actual values being used (A4 portrait: 297mm, A4 landscape: 210mm, Letter portrait: 279.4mm, A3 portrait: 420mm).

CSS:
.diagram-wrap { break-inside:avoid; margin:16px 0 }
.diagram-wrap .mermaid { display:block; width:100% }
.diagram-wrap .mermaid svg { display:block; margin:0 auto; max-width:100%; height:auto; max-height:calc(<page-height> - 2*<margins>) }

HTML per diagram:
<div class="diagram-wrap"><div class="mermaid">
DIAGRAM DEFINITION HERE
</div></div>
`
} as Record<string, string>;

// Dynamic topic: generate JSON Schema from Zod at call time
function getParametersTopic(): string {
  const jsonSchema = zodToJsonSchema(CreatePdfSchema, "CreatePdfInput");
  return `pdfcrowd_create_pdf input schema:
You MUST pass all required parameters when calling pdfcrowd_create_pdf. Never call it with empty or incomplete arguments.
Example: pdfcrowd_create_pdf({html: "<h1>Hello</h1>", output_path: "output.pdf"})
${JSON.stringify(jsonSchema, null, 2)}`;
}

const DYNAMIC_TOPICS: Record<string, () => string> = {
  parameters: getParametersTopic
};

const VALID_TOPICS = [...Object.keys(TOPICS), ...Object.keys(DYNAMIC_TOPICS)];

// Register the main tool
server.registerTool(
  "pdfcrowd_create_pdf",
  {
    title: "Create PDF",
      description: `Export any content (including charts) to PDF.
If input isn't HTML, create a well-designed layout first.
IMPORTANT: Call pdfcrowd_info(topic: "parameters") to get the full input schema.
IMPORTANT: Before creating HTML, first call pdfcrowd_info(topic: "html_layout") to get the layout guidelines.
Do NOT pass PDFCrowd API parameters - this tool has its own schema.

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
      viewportWidth: params.viewport_width,
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
        return { content: [{ type: "text", text: TOPICS[params.topic] }] };
      }
      if (params.topic in DYNAMIC_TOPICS) {
        return { content: [{ type: "text", text: DYNAMIC_TOPICS[params.topic]() }] };
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
