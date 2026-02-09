import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import archiver from "archiver";

export interface BundleResult {
  zipPath: string;
  mainFilename: string;
  cleanup: () => void;
}

interface AssetEntry {
  originalRef: string;
  diskPath: string;
  zipPath: string;
}

const REMOTE_PATTERN = /^(https?:|data:|javascript:|mailto:|#|\/\/)/i;
const CSS_URL_PATTERN = /url\s*\(\s*["']?([^"'\)\s]+)["']?\s*\)/gi;

function isLocalRef(ref: string): boolean {
  return !REMOTE_PATTERN.test(ref.trim());
}

function extractUrlRefs(content: string): string[] {
  const refs = new Set<string>();
  let match;
  while ((match = CSS_URL_PATTERN.exec(content)) !== null) {
    const ref = match[1].trim();
    if (ref && isLocalRef(ref)) refs.add(ref);
  }
  CSS_URL_PATTERN.lastIndex = 0;
  return [...refs];
}

function extractHtmlRefs(html: string): string[] {
  const refs = new Set<string>();

  const tagPatterns = [
    /<(?:img|script|video|audio|source|embed|input)\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/gi,
    /<link\b[^>]*?\bhref\s*=\s*["']([^"']+)["']/gi,
    /<object\b[^>]*?\bdata\s*=\s*["']([^"']+)["']/gi,
  ];

  for (const pattern of tagPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const ref = match[1].trim();
      if (ref && isLocalRef(ref)) refs.add(ref);
    }
  }

  for (const ref of extractUrlRefs(html)) {
    refs.add(ref);
  }

  return [...refs];
}

function resolveAssets(
  refs: string[],
  baseDir: string,
  knownDiskPaths: Set<string>
): AssetEntry[] {
  const assets: AssetEntry[] = [];
  let extCounter = 0;

  for (const ref of refs) {
    const diskPath = path.resolve(baseDir, ref);

    if (!fs.existsSync(diskPath)) continue;
    try { if (!fs.statSync(diskPath).isFile()) continue; } catch { continue; }
    if (knownDiskPaths.has(diskPath)) continue;

    knownDiskPaths.add(diskPath);
    const relPath = path.relative(baseDir, diskPath);

    if (!relPath.startsWith("..") && !path.isAbsolute(relPath)) {
      assets.push({
        originalRef: ref,
        diskPath,
        zipPath: relPath.split(path.sep).join("/")
      });
    } else {
      const filename = path.basename(diskPath);
      let zipPath = `_ext/${filename}`;
      while (assets.some(a => a.zipPath === zipPath)) {
        extCounter++;
        const ext = path.extname(filename);
        const base = path.basename(filename, ext);
        zipPath = `_ext/${base}_${extCounter}${ext}`;
      }
      assets.push({ originalRef: ref, diskPath, zipPath });
    }
  }

  return assets;
}

/**
 * Rewrite asset references that were remapped to different zip paths.
 * Sorted longest-first to prevent partial substring matches.
 */
function rewriteRefs(
  content: string,
  assets: AssetEntry[],
  contentZipDir: string
): string {
  const sorted = [...assets].sort((a, b) => b.originalRef.length - a.originalRef.length);
  let result = content;
  for (const asset of sorted) {
    const newRef = path.relative(contentZipDir, asset.zipPath).split(path.sep).join("/");
    if (newRef !== asset.originalRef) {
      result = result.split(asset.originalRef).join(newRef);
    }
  }
  return result;
}

/**
 * Detect local assets referenced in HTML, bundle HTML + assets into a zip.
 * Returns null if no local assets are detected.
 */
export async function bundleAssets(
  html: string,
  baseDir: string,
  mainFilename: string
): Promise<BundleResult | null> {
  const htmlRefs = extractHtmlRefs(html);
  if (htmlRefs.length === 0) return null;

  const knownDiskPaths = new Set<string>();
  const htmlAssets = resolveAssets(htmlRefs, baseDir, knownDiskPaths);

  if (htmlAssets.length === 0) return null;

  // Parse CSS files for sub-asset references and prepare rewrites in a single pass
  const cssAssets = htmlAssets.filter(a => a.diskPath.endsWith(".css"));
  const cssSubAssets: AssetEntry[] = [];
  const cssRewrites = new Map<string, string>();

  for (const cssAsset of cssAssets) {
    try {
      const cssContent = fs.readFileSync(cssAsset.diskPath, "utf-8");
      const cssRefs = extractUrlRefs(cssContent);
      if (cssRefs.length === 0) continue;

      const cssDir = path.dirname(cssAsset.diskPath);
      const resolved = resolveAssets(cssRefs, cssDir, knownDiskPaths);

      for (const sub of resolved) {
        const relFromBase = path.relative(baseDir, sub.diskPath);
        if (!relFromBase.startsWith("..") && !path.isAbsolute(relFromBase)) {
          sub.zipPath = relFromBase.split(path.sep).join("/");
        }
      }

      cssSubAssets.push(...resolved);

      // Rewrite CSS if any sub-assets were remapped
      const cssZipDir = path.dirname(cssAsset.zipPath);
      const rewritten = rewriteRefs(cssContent, resolved, cssZipDir);
      if (rewritten !== cssContent) {
        cssRewrites.set(cssAsset.diskPath, rewritten);
      }
    } catch {
      // Skip unreadable CSS files
    }
  }

  const allAssets = [...htmlAssets, ...cssSubAssets];

  const mainZipDir = path.dirname(mainFilename);
  const rewrittenHtml = rewriteRefs(html, allAssets, mainZipDir);

  // Create zip
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pdfcrowd-"));
  const zipPath = path.join(tmpDir, "bundle.zip");

  await new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 5 } });

    output.on("close", resolve);
    output.on("error", reject);
    archive.on("error", reject);

    archive.pipe(output);

    archive.append(rewrittenHtml, { name: mainFilename });

    for (const asset of allAssets) {
      const rewrittenCss = cssRewrites.get(asset.diskPath);
      if (rewrittenCss !== undefined) {
        archive.append(rewrittenCss, { name: asset.zipPath });
      } else {
        archive.file(asset.diskPath, { name: asset.zipPath });
      }
    }

    archive.finalize();
  });

  return {
    zipPath,
    mainFilename,
    cleanup: () => {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    }
  };
}
