import { z } from "zod";

export const PAGE_SIZES = ["A3", "A4", "A5", "Letter"] as const;
export const ORIENTATIONS = ["portrait", "landscape"] as const;

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
  no_margins: z.boolean()
    .default(false)
    .describe("Remove all margins"),
  title: z.string()
    .optional()
    .describe("PDF title metadata")
}).strict().refine(
  data => [data.html, data.url, data.file].filter(Boolean).length === 1,
  { message: "Provide exactly one of: html, url, or file" }
);

export type CreatePdfInput = z.infer<typeof CreatePdfSchema>;
