import { describe, it, expect } from 'vitest';
import { CreatePdfSchema } from '../../src/schemas/index.js';

describe('CreatePdfSchema', () => {
  it('accepts html + output_path with defaults', () => {
    const result = CreatePdfSchema.safeParse({
      html: '<h1>Hi</h1>',
      output_path: 'out.pdf',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.html).toBe('<h1>Hi</h1>');
    expect(result.data.output_path).toBe('out.pdf');
    expect(result.data.page_size).toBe('A4');
    expect(result.data.orientation).toBe('portrait');
    expect(result.data.margins).toBe('10mm');
  });

  it('accepts url + output_path', () => {
    const result = CreatePdfSchema.safeParse({
      url: 'https://example.com',
      output_path: 'out.pdf',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.url).toBe('https://example.com');
  });

  it('accepts file + output_path', () => {
    const result = CreatePdfSchema.safeParse({
      file: '/tmp/test.html',
      output_path: 'out.pdf',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.file).toBe('/tmp/test.html');
  });

  it('rejects when no source provided', () => {
    const result = CreatePdfSchema.safeParse({
      output_path: 'out.pdf',
    });
    expect(result.success).toBe(false);
  });

  it('rejects when two sources provided', () => {
    const result = CreatePdfSchema.safeParse({
      html: 'x',
      url: 'https://x.com',
      output_path: 'o.pdf',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid url', () => {
    const result = CreatePdfSchema.safeParse({
      url: 'not-a-url',
      output_path: 'o.pdf',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty output_path', () => {
    const result = CreatePdfSchema.safeParse({
      html: 'x',
      output_path: '',
    });
    expect(result.success).toBe(false);
  });

  it('accepts margin "10mm"', () => {
    const result = CreatePdfSchema.safeParse({
      html: 'x',
      output_path: 'o.pdf',
      margins: '10mm',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.margins).toBe('10mm');
  });

  it('accepts margin "1.5in"', () => {
    const result = CreatePdfSchema.safeParse({
      html: 'x',
      output_path: 'o.pdf',
      margins: '1.5in',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.margins).toBe('1.5in');
  });

  it('accepts margin "1,5cm" (European decimal)', () => {
    const result = CreatePdfSchema.safeParse({
      html: 'x',
      output_path: 'o.pdf',
      margins: '1,5cm',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.margins).toBe('1,5cm');
  });

  it('transforms margin literal 0 to "0mm"', () => {
    const result = CreatePdfSchema.safeParse({
      html: 'x',
      output_path: 'o.pdf',
      margins: 0,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.margins).toBe('0mm');
  });

  it('rejects margin "10" (no unit)', () => {
    const result = CreatePdfSchema.safeParse({
      html: 'x',
      output_path: 'o.pdf',
      margins: '10',
    });
    expect(result.success).toBe(false);
  });

  it('rejects margin "-5mm" (negative)', () => {
    const result = CreatePdfSchema.safeParse({
      html: 'x',
      output_path: 'o.pdf',
      margins: '-5mm',
    });
    expect(result.success).toBe(false);
  });

  it('accepts viewport_width at boundaries', () => {
    expect(
      CreatePdfSchema.safeParse({ html: 'x', output_path: 'o.pdf', viewport_width: 96 }).success,
    ).toBe(true);
    expect(
      CreatePdfSchema.safeParse({ html: 'x', output_path: 'o.pdf', viewport_width: 65000 }).success,
    ).toBe(true);
  });

  it('rejects viewport_width outside boundaries', () => {
    expect(
      CreatePdfSchema.safeParse({ html: 'x', output_path: 'o.pdf', viewport_width: 95 }).success,
    ).toBe(false);
    expect(
      CreatePdfSchema.safeParse({ html: 'x', output_path: 'o.pdf', viewport_width: 65001 }).success,
    ).toBe(false);
  });

  it('applies defaults for minimal input', () => {
    const result = CreatePdfSchema.safeParse({
      html: '<p>hi</p>',
      output_path: 'out.pdf',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.page_size).toBe('A4');
    expect(result.data.orientation).toBe('portrait');
    expect(result.data.margins).toBe('10mm');
    expect(result.data.viewport_width).toBeUndefined();
    expect(result.data.title).toBeUndefined();
  });

  it('rejects unknown fields (strict mode)', () => {
    const result = CreatePdfSchema.safeParse({
      html: 'x',
      output_path: 'o.pdf',
      foo: 'bar',
    });
    expect(result.success).toBe(false);
  });
});
