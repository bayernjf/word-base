import type { ThemeType } from '../types';

/** 颜色 token - 纯值，不含任何 CSS/Tailwind 语法 */
export interface ColorTokens {
  bg: string;
  bgSecondary: string;
  card: string;
  cardHover: string;
  sidebar: string;
  nav: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  accentBg: string;
  accentText: string;
  accentBorder: string;
  border: string;
  btnPrimaryBg: string;
  btnPrimaryBgHover: string;
  btnPrimaryText: string;
  btnSecondaryBg: string;
  btnSecondaryBgHover: string;
  btnSecondaryText: string;
  btnSecondaryBorder: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

/** 间距 token（单位: number，Web 端映射为 px，RN 端也映射为 px） */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/** 圆角 token（单位: number → px） */
export const radius = {
  none: 0,
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

/** 字号 token（单位: number → px） */
export const fontSize = {
  xs: 11,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  h4: 24,
  h3: 30,
  h2: 36,
} as const;

/** 字重 token */
export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const;

/** 间距/圆角/字号等非颜色 token 三端完全一致，直接复用 */
export const layoutTokens = {
  spacing,
  radius,
  fontSize,
  fontWeight,
} as const;

/** 按主题生成颜色 token */
export function getColorTokens(theme: ThemeType): ColorTokens {
  switch (theme) {
    case 'natural':
      return {
        bg: '#edf6e7',
        bgSecondary: '#dfeeda',
        card: '#fffdf7',
        cardHover: '#fffdf7',
        sidebar: '#e3f0dd',
        nav: '#f8fbf5',
        textPrimary: '#1d3a2b',
        textSecondary: '#556a5b',
        accent: '#56a978',
        accentBg: '#fff4d8',
        accentText: '#2f805d',
        accentBorder: '#f2d8aa',
        border: '#bad8b7',
        btnPrimaryBg: '#56a978',
        btnPrimaryBgHover: '#4a9669',
        btnPrimaryText: '#ffffff',
        btnSecondaryBg: '#fffdf7',
        btnSecondaryBgHover: '#e1f0db',
        btnSecondaryText: '#2a4d3a',
        btnSecondaryBorder: '#adcfa9',
        badgeBg: '#d9efd2',
        badgeText: '#336f4e',
        badgeBorder: '#9fcea8',
      };

    case 'glass':
    default:
      return {
        bg: '#0f172a',
        bgSecondary: 'rgba(255,255,255,0.1)',
        card: 'rgba(255,255,255,0.05)',
        cardHover: 'rgba(255,255,255,0.08)',
        sidebar: 'rgba(255,255,255,0.05)',
        nav: 'rgba(255,255,255,0.05)',
        textPrimary: '#ffffff',
        textSecondary: 'rgba(255,255,255,0.65)',
        accent: '#818cf8',
        accentBg: 'rgba(129,140,248,0.15)',
        accentText: '#818cf8',
        accentBorder: 'rgba(255,255,255,0.1)',
        border: 'rgba(255,255,255,0.1)',
        btnPrimaryBg: '#ffffff',
        btnPrimaryBgHover: 'rgba(255,255,255,0.9)',
        btnPrimaryText: '#0f172a',
        btnSecondaryBg: 'rgba(255,255,255,0.1)',
        btnSecondaryBgHover: 'rgba(255,255,255,0.2)',
        btnSecondaryText: '#ffffff',
        btnSecondaryBorder: 'rgba(255,255,255,0.1)',
        badgeBg: 'rgba(255,255,255,0.1)',
        badgeText: 'rgba(255,255,255,0.7)',
        badgeBorder: 'rgba(255,255,255,0.1)',
      };
  }
}