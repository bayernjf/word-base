import React from 'react';
import type {
  PrimitiveComponents,
  ThemeContextValue,
  ThemeProviderProps,
} from './types';
import { getColorTokens } from '../tokens';

/* ────────────────────────────── Theme Context ────────────────────────────── */

const defaultColors = getColorTokens('glass');

const ThemeContext = React.createContext<ThemeContextValue>({
  theme: 'glass',
  colors: defaultColors,
});

export function usePrimitiveTheme(): ThemeContextValue {
  return React.useContext(ThemeContext);
}

export function PrimitiveThemeProvider({ theme, children }: ThemeProviderProps) {
  const value = React.useMemo<ThemeContextValue>(() => ({
    theme,
    colors: getColorTokens(theme),
  }), [theme]);

  return React.createElement(ThemeContext.Provider, { value }, children);
}

/* ────────────────────────────── Platform Resolver ────────────────────────────── */

let _primitives: PrimitiveComponents | null = null;

export function setPrimitives(p: PrimitiveComponents): void {
  _primitives = p;
}

function getPrimitives(): PrimitiveComponents {
  if (!_primitives) {
    throw new Error(
      'Primitives not registered. Call setPrimitives() at app entry before rendering.'
    );
  }
  return _primitives;
}

/* ────────────────────────────── Hook API ────────────────────────────── */

export function usePrimitives(): PrimitiveComponents {
  return getPrimitives();
}

/* ────────────────────────────── Export types ────────────────────────────── */

export type {
  PrimitiveComponents,
  ViewProps,
  TextProps,
  ButtonProps,
  InputProps,
  TextAreaProps,
  BadgeProps,
  DividerProps,
  ScrollViewProps,
  ImageProps,
  LayoutStyle,
  TextStyle,
  ThemeContextValue,
  ThemeProviderProps,
} from './types';