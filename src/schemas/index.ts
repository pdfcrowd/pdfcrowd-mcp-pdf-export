import { z } from "zod";

export const PAGE_SIZES = ["A3", "A4", "A5", "Letter"] as const;
export const ORIENTATIONS = ["portrait", "landscape"] as const;

// Matches values like "1in", "10mm", "0.5cm", "1,5cm", "100px", "12pt"
const MARGIN_REGEX = /^\d+([.,]\d+)?(in|mm|cm|px|pt)$/;

// Accepts string with unit OR literal 0, transforms 0 to "0mm"
const marginSchema = z.union([
  z.string().regex(MARGIN_REGEX, "Must be a number with unit: in, mm, cm, px, or pt (e.g., 1in, 10mm, 0.5cm)"),
  z.literal(0).transform(() => "0mm")
]);

export const CreatePdfSchema = z.object({
  html: z.string()
    .optional()
    .describe("HTML content to convert"),
  url: z.string()
    .url()
    .optional()
    .describe("URL to convert"),
  file: z.string()
    .optional()
    .describe("Path to local HTML file"),
  output_path: z.string()
    .min(1)
    .describe("File path where the PDF will be saved"),
  page_size: z.enum(PAGE_SIZES)
    .default("A4")
    .describe("Page size"),
  orientation: z.enum(ORIENTATIONS)
    .default("portrait")
    .describe("Page orientation"),
  margins: marginSchema
    .optional()
    .describe("Page margins (e.g., 10mm, 1in, 0.5cm, or 0 for no margins)."),
  title: z.string()
    .optional()
    .describe("PDF title metadata")
}).strict().refine(
  data => [data.html, data.url, data.file].filter(Boolean).length === 1,
  { message: "Provide exactly one of: html, url, or file" }
);

export type CreatePdfInput = z.infer<typeof CreatePdfSchema>;
