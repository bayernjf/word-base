import { AppLanguage } from '../types';
import { en } from './en';
import { zh } from './zh';

export type LocaleDict = typeof en;

const dictionaries: Record<AppLanguage, LocaleDict> = { en, zh };

type TranslateParams = Record<string, string | number>;

type NestedKeyOf<T> = {
  [K in keyof T & string]: T[K] extends Record<string, unknown>
    ? `${K}.${NestedKeyOf<T[K]>}`
    : K;
}[keyof T & string];

export type TranslateKey = NestedKeyOf<LocaleDict>;

export type Translator = (key: TranslateKey, params?: TranslateParams) => string;

function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
  );
}

function resolve(dict: LocaleDict, key: string): string | undefined {
  const value = key.split('.').reduce<unknown>(
    (acc, part) => (acc != null ? (acc as Record<string, unknown>)[part] : undefined),
    dict
  );
  return typeof value === 'string' ? value : undefined;
}

export function createTranslator(language: AppLanguage): Translator {
  const dict = dictionaries[language] ?? dictionaries.en;
  return (key, params) => {
    const raw = resolve(dict, key) ?? resolve(dictionaries.en, key);
    return raw != null ? interpolate(raw, params) : key;
  };
}
