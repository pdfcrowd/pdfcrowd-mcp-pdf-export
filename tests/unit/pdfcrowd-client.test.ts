import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AxiosError } from 'axios';
import FormData from 'form-data';

// Mock axios — keep AxiosError real, replace post with a mock
vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  return {
    ...actual,
    default: {
      ...actual.default,
      post: vi.fn(),
    },
  };
});

// Mock asset-bundler so createPdf never touches real files for bundling
vi.mock('../../src/services/asset-bundler.js', () => ({
  bundleAssets: vi.fn().mockResolvedValue(null),
}));

import axios from 'axios';
import { createPdf } from '../../src/services/pdfcrowd-client.js';

const mockedPost = vi.mocked(axios.post);

function makeSuccessResponse(overrides: Record<string, string> = {}) {
  return {
    data: Buffer.from('%PDF-1.4 mock'),
    status: 200,
    statusText: 'OK',
    headers: {
      'x-pdfcrowd-job-id': 'job-123',
      'x-pdfcrowd-remaining-credits': '99',
      'x-pdfcrowd-consumed-credits': '1',
      'x-pdfcrowd-pages': '2',
      'x-pdfcrowd-output-size': '1234',
      ...overrides,
    },
    config: {},
  };
}

function make5xxError(status: number): AxiosError {
  return new AxiosError(
    `Request failed with status ${status}`,
    'ERR_BAD_RESPONSE',
    undefined as any,
    undefined,
    {
      status,
      statusText: `${status}`,
      headers: {},
      config: undefined as any,
      data: '',
    },
  );
}

function makeApiError(status: number, reasonCode: number, message: string): AxiosError {
  const body = JSON.stringify({ status_code: status, reason_code: reasonCode, message });
  return new AxiosError(
    'Request failed',
    'ERR_BAD_RESPONSE',
    undefined as any,
    undefined,
    {
      status,
      statusText: '',
      headers: {},
      config: undefined as any,
      data: Buffer.from(body),
    },
  );
}

function makeNetworkError(code: string): AxiosError {
  const error = new AxiosError(`${code} error`, code);
  return error;
}

describe('createPdf', () => {
  let tmpDir: string;
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'client-test-'));
    savedEnv = {
      PDFCROWD_USERNAME: process.env.PDFCROWD_USERNAME,
      PDFCROWD_API_KEY: process.env.PDFCROWD_API_KEY,
    };
    process.env.PDFCROWD_USERNAME = 'demo';
    process.env.PDFCROWD_API_KEY = 'demo';
    mockedPost.mockReset();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value !== undefined) process.env[key] = value;
      else delete process.env[key];
    }
  });

  it('writes PDF and returns metadata on success', async () => {
    mockedPost.mockResolvedValueOnce(makeSuccessResponse());
    const outPath = path.join(tmpDir, 'out.pdf');

    const result = await createPdf({ html: '<h1>Hi</h1>', outputPath: outPath });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.isDemo).toBe(true);
    expect(result.outputPath).toBe(path.resolve(outPath));
    expect(result.metadata.jobId).toBe('job-123');
    expect(result.metadata.remainingCredits).toBe(99);
    expect(result.metadata.consumedCredits).toBe(1);
    expect(result.metadata.pageCount).toBe(2);
    expect(result.metadata.outputSize).toBe(1234);

    const written = fs.readFileSync(outPath, 'utf-8');
    expect(written).toContain('%PDF');
  });

  it('retries on 503 then succeeds', async () => {
    mockedPost
      .mockRejectedValueOnce(make5xxError(503))
      .mockResolvedValueOnce(makeSuccessResponse());

    const result = await createPdf({
      html: '<h1>Test</h1>',
      outputPath: path.join(tmpDir, 'out.pdf'),
    });

    expect(result.success).toBe(true);
    expect(mockedPost).toHaveBeenCalledTimes(2);
  });

  it('returns error after retries exhausted on 5xx', async () => {
    mockedPost
      .mockRejectedValueOnce(make5xxError(500))
      .mockRejectedValueOnce(make5xxError(500))
      .mockRejectedValueOnce(make5xxError(500));

    const result = await createPdf({
      html: '<h1>Test</h1>',
      outputPath: path.join(tmpDir, 'out.pdf'),
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain('after 3 attempts');
    expect(mockedPost).toHaveBeenCalledTimes(3);
  });

  it('does not retry on 4xx', async () => {
    mockedPost.mockRejectedValueOnce(makeApiError(401, 106, 'Invalid credentials'));

    const result = await createPdf({
      html: '<h1>Test</h1>',
      outputPath: path.join(tmpDir, 'out.pdf'),
    });

    expect(result.success).toBe(false);
    expect(mockedPost).toHaveBeenCalledTimes(1);
  });

  it('includes credential guidance on 401/reason 106', async () => {
    mockedPost.mockRejectedValueOnce(makeApiError(401, 106, 'Invalid credentials'));

    const result = await createPdf({
      html: '<h1>Test</h1>',
      outputPath: path.join(tmpDir, 'out.pdf'),
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain('PDFCROWD_USERNAME');
  });

  it('includes credits guidance on 403/reason 105', async () => {
    mockedPost.mockRejectedValueOnce(makeApiError(403, 105, 'No credits'));

    const result = await createPdf({
      html: '<h1>Test</h1>',
      outputPath: path.join(tmpDir, 'out.pdf'),
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain('no PDFCrowd credits');
  });

  it('includes rate limit guidance on 429/reason 120', async () => {
    mockedPost.mockRejectedValueOnce(makeApiError(429, 120, 'Rate limited'));

    const result = await createPdf({
      html: '<h1>Test</h1>',
      outputPath: path.join(tmpDir, 'out.pdf'),
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain('Rate limit');
  });

  it('reports timeout on ECONNABORTED', async () => {
    mockedPost.mockRejectedValueOnce(makeNetworkError('ECONNABORTED'));

    const result = await createPdf({
      html: '<h1>Test</h1>',
      outputPath: path.join(tmpDir, 'out.pdf'),
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain('timed out');
  });

  it('reports unreachable on ENOTFOUND', async () => {
    mockedPost.mockRejectedValueOnce(makeNetworkError('ENOTFOUND'));

    const result = await createPdf({
      html: '<h1>Test</h1>',
      outputPath: path.join(tmpDir, 'out.pdf'),
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain('unreachable');
  });

  it('returns error for non-existent file', async () => {
    const result = await createPdf({
      file: '/nonexistent/file.html',
      outputPath: path.join(tmpDir, 'out.pdf'),
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain('File not found');
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it('throws on missing credentials', async () => {
    delete process.env.PDFCROWD_USERNAME;
    delete process.env.PDFCROWD_API_KEY;

    await expect(
      createPdf({ html: '<h1>Test</h1>', outputPath: path.join(tmpDir, 'out.pdf') }),
    ).rejects.toThrow('Missing credentials');
  });

  it('sends correct form fields to API', async () => {
    const appendSpy = vi.spyOn(FormData.prototype, 'append');
    mockedPost.mockResolvedValueOnce(makeSuccessResponse());

    await createPdf({
      html: '<h1>Test</h1>',
      outputPath: path.join(tmpDir, 'out.pdf'),
      pageSize: 'A3',
      orientation: 'landscape',
      margins: '1,5in',
      viewportWidth: 800,
      title: 'My PDF',
    });

    const calls = appendSpy.mock.calls;
    const getField = (name: string) => calls.find(([k]) => k === name)?.[1];

    expect(getField('text')).toBe('<h1>Test</h1>');
    expect(getField('page_size')).toBe('A3');
    expect(getField('orientation')).toBe('landscape');
    // Comma decimal should be normalized to period
    expect(getField('margin_top')).toBe('1.5in');
    expect(getField('margin_bottom')).toBe('1.5in');
    expect(getField('margin_left')).toBe('1.5in');
    expect(getField('margin_right')).toBe('1.5in');
    expect(getField('title')).toBe('My PDF');
    expect(getField('content_viewport_width')).toBe('800px');
    expect(getField('content_fit_mode')).toBe('content-width');

    appendSpy.mockRestore();
  });
});
