import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import * as path from "node:path";

export function loadCredentialFile(): { username?: string; apiKey?: string } {
  const filePath = path.join(homedir(), ".pdfcrowd-mcp");
  let content: string;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch {
    return {};
  }
  return parseCredentials(content);
}

export function parseCredentials(content: string): { username?: string; apiKey?: string } {
  const result: { username?: string; apiKey?: string } = {};
  for (const line of content.split("\n")) {
    const match = line.match(/^\s*([\w]+)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    const key = match[1];
    const value = match[2].replace(/^["']|["']$/g, "");
    if (key === "PDFCROWD_USERNAME" && value) result.username = value;
    if (key === "PDFCROWD_API_KEY" && value) result.apiKey = value;
  }
  return result;
}
