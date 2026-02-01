import axios, { AxiosError } from "axios";
import FormData from "form-data";
import * as fs from "fs";
import * as path from "path";
import { VERSION } from "../version.js";

const API_HOST = "api.pdfcrowd.com";
const API_VERSION = "24.04";
const API_BASE_URL = `https://${API_HOST}/convert/${API_VERSION}`;
const USER_AGENT = `pdfcrowd-mcp-server/${VERSION} (Node.js)`;

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;
// PDFCrowd API times out after 60s; we use 120s to allow for retries and network latency
const REQUEST_TIMEOUT_MS = 120000;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function is5xxError(error: unknown): boolean {
  return error instanceof AxiosError &&
    error.response !== undefined &&
    error.response.status >= 500 &&
    error.response.status < 600;
}

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

function getErrorGuidance(status: number, reasonCode: number): string {
  // User configuration issues - tell user, don't retry with other tools
  if (status === 401) {
    if (reasonCode === 103) {
      return "Tell the user their PDFCrowd license has expired. Do not retry with other PDF tools.";
    }
    if (reasonCode === 106) {
      return "Tell the user to check PDFCROWD_USERNAME and PDFCROWD_API_KEY in ~/.mcp.json. Do not retry with other PDF tools.";
    }
    return "Tell the user to check their PDFCrowd credentials in ~/.mcp.json. Do not retry with other PDF tools.";
  }

  if (status === 403 || reasonCode === 105) {
    return "Tell the user they have no PDFCrowd credits remaining. Upgrade at pdfcrowd.com/pricing. Do not retry with other PDF tools.";
  }

  if (status === 413) {
    return "The input is too large (max 300MB). Try with smaller content.";
  }

  if (status === 429 || reasonCode === 120) {
    return "Rate limit exceeded. Tell the user to wait or upgrade their PDFCrowd plan. Do not retry with other PDF tools.";
  }

  if (status === 430 || reasonCode === 121) {
    return "Too many concurrent requests. Wait and retry, or tell user to upgrade their plan.";
  }

  if (reasonCode === 122) {
    return "Demo credits exhausted. Tell the user to get a PDFCrowd license at pdfcrowd.com/pricing. Do not retry with other PDF tools.";
  }

  // Request issues - Claude might fix by adjusting parameters
  if (reasonCode === 320) {
    return "The URL is invalid. Check the URL format and try again.";
  }

  if (reasonCode === 305 || reasonCode === 325) {
    return "The HTML input is missing or invalid. Check your HTML content.";
  }

  if (reasonCode === 337) {
    return "Invalid parameter value. Check the parameter format.";
  }

  if (reasonCode === 357) {
    return "The input file is password-protected. Tell the user to provide an unprotected file.";
  }

  // Transient issues
  if (reasonCode === 306) {
    return "Input too complex or large. Try simplifying the HTML content.";
  }

  if (reasonCode === 323) {
    return "Conversion timed out. Possible causes: complex layout, large content, or slow-loading resources (images, fonts). Simplify the HTML or use inline/smaller images.";
  }

  return "";
}

function handleApiError(error: unknown, attempts?: number): ErrorResult {
  const suffix = attempts && attempts > 1 ? ` (after ${attempts} attempts)` : "";

  if (error instanceof AxiosError) {
    if (error.response) {
      const status = error.response.status;
      const jsonError = parseJsonError(error.response.data);

      if (jsonError) {
        const guidance = getErrorGuidance(jsonError.status_code, jsonError.reason_code);
        const guidanceSuffix = guidance ? ` ${guidance}` : "";
        const msg = `PDFCrowd error ${jsonError.status_code} (reason ${jsonError.reason_code}): ${jsonError.message}${suffix}.${guidanceSuffix}`;
        return { success: false, error: msg, httpCode: status };
      }

      // Fallback to string-based handling
      const message = error.response.data?.toString() || error.message;
      return { success: false, error: `PDFCrowd API error (${status}): ${message}${suffix}`, httpCode: status };
    } else if (error.code === "ECONNABORTED") {
      return { success: false, error: `PDFCrowd request timed out.${suffix}` };
    } else if (error.code === "ENOTFOUND") {
      return { success: false, error: `PDFCrowd API unreachable. Tell the user to check their internet connection.${suffix}` };
    }
  }

  return {
    success: false,
    error: `PDFCrowd unexpected error: ${error instanceof Error ? error.message : String(error)}${suffix}`
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

function buildForm(options: CreatePdfOptions): FormData {
  const form = new FormData();

  // Set input source
  if (options.html) {
    form.append("text", options.html);
  } else if (options.url) {
    form.append("url", options.url);
  } else if (options.file) {
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

  return form;
}

export async function createPdf(options: CreatePdfOptions): Promise<ConversionResult | ErrorResult> {
  // Validate file exists before attempting
  if (options.file && !fs.existsSync(options.file)) {
    return { success: false, error: `File not found: ${options.file}` };
  }

  const { username, apiKey } = getCredentials();
  let lastError: unknown;
  let attempts = 0;

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    attempts = attempt;
    try {
      const form = buildForm(options);

      const response = await axios.post(`${API_BASE_URL}/?errfmt=json`, form, {
        auth: { username, password: apiKey },
        headers: {
          ...form.getHeaders(),
          "User-Agent": USER_AGENT
        },
        responseType: "arraybuffer",
        timeout: REQUEST_TIMEOUT_MS
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
      lastError = error;

      // Retry on 5xx errors (except on last attempt)
      if (is5xxError(error) && attempt <= MAX_RETRIES) {
        if (attempt > 1) {
          await sleep(RETRY_DELAY_MS);
        }
        continue;
      }

      // Non-retryable error or last attempt
      break;
    }
  }

  return handleApiError(lastError, attempts);
}
