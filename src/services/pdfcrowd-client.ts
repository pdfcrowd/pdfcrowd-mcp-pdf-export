import axios, { AxiosError } from "axios";
import FormData from "form-data";
import * as fs from "fs";
import * as path from "path";

const API_HOST = "api.pdfcrowd.com";
const API_VERSION = "24.04";
const API_BASE_URL = `https://${API_HOST}/convert/${API_VERSION}`;

export interface ConversionMetadata {
  jobId: string;
  remainingCredits: number;
  consumedCredits: number;
  pageCount?: number;
  outputSize: number;
}

export interface ConversionResult {
  success: true;
  outputPath: string;
  metadata: ConversionMetadata;
  isDemo: boolean;
}

export interface ErrorResult {
  success: false;
  error: string;
  httpCode?: number;
}

interface Credentials {
  username: string;
  apiKey: string;
}

function getCredentials(): Credentials {
  const username = process.env.PDFCROWD_USERNAME;
  const apiKey = process.env.PDFCROWD_API_KEY;

  if (!username || !apiKey) {
    throw new Error(
      "Missing credentials. Set PDFCROWD_USERNAME and PDFCROWD_API_KEY."
    );
  }

  return { username, apiKey };
}

function isDemo(username: string): boolean {
  return username === "demo";
}

function parseMetadata(headers: Record<string, unknown>): ConversionMetadata {
  return {
    jobId: String(headers["x-pdfcrowd-job-id"] || ""),
    remainingCredits: Number(headers["x-pdfcrowd-remaining-credits"] || 0),
    consumedCredits: Number(headers["x-pdfcrowd-consumed-credits"] || 0),
    pageCount: headers["x-pdfcrowd-pages"]
      ? Number(headers["x-pdfcrowd-pages"])
      : undefined,
    outputSize: Number(headers["x-pdfcrowd-output-size"] || 0)
  };
}

interface ApiErrorResponse {
  status_code: number;
  reason_code: number;
  message: string;
}

function parseJsonError(data: Buffer | string): ApiErrorResponse | null {
  try {
    const str = Buffer.isBuffer(data) ? data.toString("utf-8") : data;
    const parsed = JSON.parse(str);
    if (
      typeof parsed.status_code === "number" &&
      typeof parsed.reason_code === "number" &&
      typeof parsed.message === "string"
    ) {
      return parsed as ApiErrorResponse;
    }
  } catch {
    // JSON parsing failed
  }
  return null;
}

function handleApiError(error: unknown): ErrorResult {
  if (error instanceof AxiosError) {
    if (error.response) {
      const status = error.response.status;
      const jsonError = parseJsonError(error.response.data);

      if (jsonError) {
        const msg = `PDFCrowd error ${jsonError.status_code} (reason ${jsonError.reason_code}): ${jsonError.message}`;
        return { success: false, error: msg, httpCode: status };
      }

      // Fallback to string-based handling
      const message = error.response.data?.toString() || error.message;
      return { success: false, error: `PDFCrowd API error (${status}): ${message}`, httpCode: status };
    } else if (error.code === "ECONNABORTED") {
      return { success: false, error: "PDFCrowd request timed out." };
    } else if (error.code === "ENOTFOUND") {
      return { success: false, error: "PDFCrowd API unreachable. Check internet connection." };
    }
  }

  return {
    success: false,
    error: `PDFCrowd unexpected error: ${error instanceof Error ? error.message : String(error)}`
  };
}

export interface CreatePdfOptions {
  html?: string;
  url?: string;
  file?: string;
  outputPath: string;
  pageSize?: string;
  orientation?: string;
  noMargins?: boolean;
  title?: string;
}

export async function createPdf(options: CreatePdfOptions): Promise<ConversionResult | ErrorResult> {
  try {
    const { username, apiKey } = getCredentials();
    const form = new FormData();

    // Set input source
    if (options.html) {
      form.append("text", options.html);
    } else if (options.url) {
      form.append("url", options.url);
    } else if (options.file) {
      if (!fs.existsSync(options.file)) {
        return { success: false, error: `File not found: ${options.file}` };
      }
      form.append("file", fs.createReadStream(options.file));
    }

    // Set options
    if (options.pageSize) {
      form.append("page_size", options.pageSize);
    }
    if (options.orientation) {
      form.append("orientation", options.orientation);
    }
    if (options.noMargins) {
      form.append("no_margins", "true");
    }
    if (options.title) {
      form.append("title", options.title);
    }

    const response = await axios.post(`${API_BASE_URL}/?errfmt=json`, form, {
      auth: { username, password: apiKey },
      headers: form.getHeaders(),
      responseType: "arraybuffer",
      timeout: 120000
    });

    // Ensure output directory exists
    const dir = path.dirname(options.outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(options.outputPath, response.data);

    return {
      success: true,
      outputPath: path.resolve(options.outputPath),
      metadata: parseMetadata(response.headers),
      isDemo: isDemo(username)
    };
  } catch (error) {
    return handleApiError(error);
  }
}
