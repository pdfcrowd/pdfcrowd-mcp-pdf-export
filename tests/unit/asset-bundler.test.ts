import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { bundleAssets } from '../../src/services/asset-bundler.js';

// 1x1 white PNG
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
  'base64',
);

describe('bundleAssets', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'asset-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns null when only remote refs', async () => {
    const html = '<img src="https://example.com/img.png"><script src="https://cdn.js"></script>';
    const result = await bundleAssets(html, tmpDir, 'index.html');
    expect(result).toBeNull();
  });

  it('returns null when no refs at all', async () => {
    const html = '<h1>Hello</h1><p>World</p>';
    const result = await bundleAssets(html, tmpDir, 'index.html');
    expect(result).toBeNull();
  });

  it('bundles a local image', async () => {
    fs.writeFileSync(path.join(tmpDir, 'img.png'), TINY_PNG);
    const html = '<h1>Test</h1><img src="img.png">';

    const result = await bundleAssets(html, tmpDir, 'index.html');
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.mainFilename).toBe('index.html');
    expect(fs.existsSync(result.zipPath)).toBe(true);
    expect(fs.statSync(result.zipPath).size).toBeGreaterThan(0);

    // Verify the zip contains the image filename
    const zipBytes = fs.readFileSync(result.zipPath);
    expect(zipBytes.toString('binary')).toContain('img.png');

    result.cleanup();
  });

  it('bundles CSS with url() refs', async () => {
    fs.writeFileSync(path.join(tmpDir, 'bg.png'), TINY_PNG);
    fs.writeFileSync(
      path.join(tmpDir, 'style.css'),
      'body { background: url(bg.png) no-repeat; }',
    );
    const html = '<link href="style.css" rel="stylesheet"><h1>Styled</h1>';

    const result = await bundleAssets(html, tmpDir, 'index.html');
    expect(result).not.toBeNull();
    if (!result) return;

    const zipBytes = fs.readFileSync(result.zipPath);
    const zipStr = zipBytes.toString('binary');
    expect(zipStr).toContain('style.css');
    expect(zipStr).toContain('bg.png');

    result.cleanup();
  });

  it('returns null when referenced files do not exist', async () => {
    const html = '<img src="missing.png">';
    const result = await bundleAssets(html, tmpDir, 'index.html');
    expect(result).toBeNull();
  });

  it('places external paths under _ext/', async () => {
    const externalDir = fs.mkdtempSync(path.join(os.tmpdir(), 'external-'));
    try {
      const extImgPath = path.join(externalDir, 'photo.png');
      fs.writeFileSync(extImgPath, TINY_PNG);

      const html = `<img src="${extImgPath}">`;
      const result = await bundleAssets(html, tmpDir, 'index.html');
      expect(result).not.toBeNull();
      if (!result) return;

      const zipBytes = fs.readFileSync(result.zipPath);
      expect(zipBytes.toString('binary')).toContain('_ext/photo.png');

      result.cleanup();
    } finally {
      fs.rmSync(externalDir, { recursive: true, force: true });
    }
  });

  it('cleanup removes temp dir and zip', async () => {
    fs.writeFileSync(path.join(tmpDir, 'img.png'), TINY_PNG);
    const html = '<img src="img.png">';

    const result = await bundleAssets(html, tmpDir, 'index.html');
    expect(result).not.toBeNull();
    if (!result) return;

    const zipDir = path.dirname(result.zipPath);
    expect(fs.existsSync(result.zipPath)).toBe(true);

    result.cleanup();

    expect(fs.existsSync(zipDir)).toBe(false);
  });
});
