const LANGUAGE_MAP: Record<string, { label: string; flag: string }> = {
  en: { label: 'English', flag: '🇬🇧' },
  ja: { label: '日本語', flag: '🇯🇵' },
  de: { label: 'Deutsch', flag: '🇩🇪' },
  fr: { label: 'Français', flag: '🇫🇷' },
  ko: { label: '한국어', flag: '🇰🇷' },
  es: { label: 'Español', flag: '🇪🇸' },
  it: { label: 'Italiano', flag: '🇮🇹' },
  pt: { label: 'Português', flag: '🇵🇹' },
  ru: { label: 'Русский', flag: '🇷🇺' },
  zh: { label: '中文', flag: '🇨🇳' },
  ar: { label: 'العربية', flag: '🇸🇦' },
  th: { label: 'ไทย', flag: '🇹🇭' },
  vi: { label: 'Tiếng Việt', flag: '🇻🇳' },
}

export function getLanguageLabel(code: string): string {
  return LANGUAGE_MAP[code]?.label || code
}

export function getLanguageFlag(code: string): string {
  return LANGUAGE_MAP[code]?.flag || '🌐'
}

export function getLanguageDisplay(code: string): string {
  const entry = LANGUAGE_MAP[code]
  if (!entry) return `🌐 ${code}`
  return `${entry.flag} ${entry.label}`
}

export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGE_MAP)
