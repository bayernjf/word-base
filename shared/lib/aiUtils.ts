/**
 * 统一的 AI 响应解析工具函数
 * 从 AI 返回的文本中提取 JSON 并解析为结构化数据
 */

/** 从 AI 响应中提取 JSON 文本（支持 fenced code block 和普通 JSON） */
export function extractJsonText(raw: string): string {
  const text = String(raw || '').trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return text.slice(start, end + 1);
  }

  return text;
}

/** 安全读取字符串值 */
export function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** 安全读取字符串数组 */
export function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(readString).filter(Boolean);
}
