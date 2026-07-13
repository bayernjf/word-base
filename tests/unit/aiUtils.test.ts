import { describe, it, expect } from 'vitest';

function extractJsonText(raw: string): string {
  const text = String(raw || '').trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text;
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(readString).filter(Boolean);
}

describe('extractJsonText', () => {
  it('should extract fenced JSON', () => {
    expect(extractJsonText('```json\n{"key":"value"}\n```')).toBe('{"key":"value"}');
  });

  it('should extract inline JSON', () => {
    expect(extractJsonText('Some text {"name":"test"} more text')).toBe('{"name":"test"}');
  });

  it('should return raw text if no JSON found', () => {
    expect(extractJsonText('just plain text')).toBe('just plain text');
  });
});

describe('readString', () => {
  it('should trim string values', () => {
    expect(readString('  hello  ')).toBe('hello');
  });

  it('should return empty for non-string values', () => {
    expect(readString(123)).toBe('');
    expect(readString(null)).toBe('');
    expect(readString(undefined)).toBe('');
  });
});

describe('readStringArray', () => {
  it('should filter and trim strings', () => {
    expect(readStringArray(['  hello  ', '', 'world'])).toEqual(['hello', 'world']);
  });

  it('should return empty for non-array', () => {
    expect(readStringArray(null)).toEqual([]);
    expect(readStringArray('not-array')).toEqual([]);
  });
});
