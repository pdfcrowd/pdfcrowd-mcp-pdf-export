import { describe, it, expect } from 'vitest';
import { parseCredentials } from '../../src/credentials.js';

describe('parseCredentials', () => {
  it('parses both keys', () => {
    const result = parseCredentials('PDFCROWD_USERNAME=foo\nPDFCROWD_API_KEY=bar');
    expect(result).toEqual({ username: 'foo', apiKey: 'bar' });
  });

  it('handles spaces around =', () => {
    const result = parseCredentials('PDFCROWD_USERNAME = foo\nPDFCROWD_API_KEY = bar');
    expect(result).toEqual({ username: 'foo', apiKey: 'bar' });
  });

  it('strips double quotes', () => {
    const result = parseCredentials('PDFCROWD_USERNAME="foo"\nPDFCROWD_API_KEY="bar"');
    expect(result).toEqual({ username: 'foo', apiKey: 'bar' });
  });

  it('strips single quotes', () => {
    const result = parseCredentials("PDFCROWD_USERNAME='foo'\nPDFCROWD_API_KEY='bar'");
    expect(result).toEqual({ username: 'foo', apiKey: 'bar' });
  });

  it('skips empty values', () => {
    const result = parseCredentials('PDFCROWD_USERNAME=\nPDFCROWD_API_KEY=bar');
    expect(result).toEqual({ apiKey: 'bar' });
  });

  it('skips comments and blank lines', () => {
    const result = parseCredentials('# comment\n\nPDFCROWD_API_KEY=bar');
    expect(result).toEqual({ apiKey: 'bar' });
  });

  it('ignores unknown keys', () => {
    const result = parseCredentials('OTHER_KEY=val\nPDFCROWD_USERNAME=foo');
    expect(result).toEqual({ username: 'foo' });
  });

  it('returns only one key when only one is present', () => {
    const result = parseCredentials('PDFCROWD_USERNAME=foo');
    expect(result).toEqual({ username: 'foo' });
  });

  it('returns empty object for empty content', () => {
    const result = parseCredentials('');
    expect(result).toEqual({});
  });
});
