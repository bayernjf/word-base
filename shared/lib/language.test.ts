import { describe, it, expect } from 'vitest';
import { getLanguageLabel, getLanguageFlag, getLanguageDisplay, SUPPORTED_LANGUAGES } from './language';

describe('language utility', () => {
  describe('getLanguageLabel', () => {
    it('returns native name for known codes', () => {
      expect(getLanguageLabel('en')).toBe('English');
      expect(getLanguageLabel('ja')).toBe('日本語');
      expect(getLanguageLabel('de')).toBe('Deutsch');
      expect(getLanguageLabel('ko')).toBe('한국어');
      expect(getLanguageLabel('zh')).toBe('中文');
    });

    it('returns raw code for unknown languages', () => {
      expect(getLanguageLabel('xx')).toBe('xx');
      expect(getLanguageLabel('')).toBe('');
    });
  });

  describe('getLanguageFlag', () => {
    it('returns flag emoji for known codes', () => {
      expect(getLanguageFlag('en')).toBe('🇬🇧');
      expect(getLanguageFlag('ja')).toBe('🇯🇵');
      expect(getLanguageFlag('de')).toBe('🇩🇪');
      expect(getLanguageFlag('fr')).toBe('🇫🇷');
    });

    it('returns globe emoji for unknown codes', () => {
      expect(getLanguageFlag('xx')).toBe('🌐');
    });
  });

  describe('getLanguageDisplay', () => {
    it('combines flag and label', () => {
      expect(getLanguageDisplay('en')).toBe('🇬🇧 English');
      expect(getLanguageDisplay('ja')).toBe('🇯🇵 日本語');
    });

    it('returns globe + code for unknown', () => {
      expect(getLanguageDisplay('xx')).toBe('🌐 xx');
    });
  });

  describe('SUPPORTED_LANGUAGES', () => {
    it('includes common languages', () => {
      expect(SUPPORTED_LANGUAGES).toContain('en');
      expect(SUPPORTED_LANGUAGES).toContain('ja');
      expect(SUPPORTED_LANGUAGES).toContain('de');
      expect(SUPPORTED_LANGUAGES).toContain('ko');
      expect(SUPPORTED_LANGUAGES).toContain('zh');
    });
  });
});
