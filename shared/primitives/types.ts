import type React from 'react';
import type { ColorTokens } from '../tokens';
import type { ThemeType } from '../types';

/* ────────────────────────────── 共享样式 props ────────────────────────────── */

/** 布局样式 - 两端通用的子集，映射到 flexbox */
export interface LayoutStyle {
  /** flex 方向 */
  direction?: 'row' | 'column';
  /** 主轴对齐 */
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  /** 交叉轴对齐 */
  align?: 'start' | 'center' | 'end' | 'stretch';
  /** 是否 flex:1 */
  flex?: number;
  /** 是否 flex-shrink:0 */
  noShrink?: boolean;
  /** 是否换行 */
  wrap?: boolean;
  /** 子元素间距（映射到 gap） */
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** padding */
  padding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'none';
  /** margin bottom */
  marginBottom?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'none';
  /** margin top */
  marginTop?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'none';
  /** 圆角 */
  radius?: 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'none';
  /** 边框宽度 */
  borderWidth?: number;
  /** 宽度 */
  width?: 'full' | 'auto' | number;
  /** 高度 */
  height?: 'full' | 'auto' | number;
  /** 最大宽度 */
  maxWidth?: 'md' | 'xl' | 'none';
  /** 最大高度 */
  maxHeight?: number;
  /** overflow */
  overflow?: 'hidden' | 'visible' | 'scroll' | 'auto';
  /** 定位 */
  position?: 'relative' | 'absolute' | 'fixed';
  /** z-index */
  zIndex?: number;
}

/** 文字样式 */
export interface TextStyle {
  /** 字号 */
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | 'h4' | 'h3' | 'h2';
  /** 字重 */
  weight?: 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold';
  /** 文字颜色角色（从 theme token 解析） */
  colorRole?: 'primary' | 'secondary' | 'accent' | 'btnPrimary' | 'btnSecondary' | 'badge';
  /** 是否斜体 */
  italic?: boolean;
  /** 是否截断 */
  truncate?: boolean;
  /** 行高 */
  lineHeight?: 'tight' | 'normal' | 'relaxed';
  /** 字间距 */
  tracking?: 'tight' | 'normal' | 'wide' | 'wider' | 'widest';
  /** 文字变换 */
  transform?: 'none' | 'uppercase' | 'capitalize' | 'lowercase';
  /** 对齐 */
  align?: 'left' | 'center' | 'right';
}

/* ────────────────────────────── Primitive Props ────────────────────────────── */

export interface ViewProps extends LayoutStyle {
  children?: React.ReactNode;
  /** 主题色角色（决定背景色） */
  bgRole?: 'bg' | 'bgSecondary' | 'card' | 'sidebar' | 'nav' | 'accentBg' | 'transparent';
  /** 阴影 */
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  /** 点击事件 */
  onPress?: () => void;
  /** 自定义样式覆盖（Web=className, RN=style object） */
  style?: Record<string, any>;
  /** 无障碍标签 */
  accessibilityLabel?: string;
  /** testID */
  testID?: string;
}

export interface TextProps extends TextStyle {
  children?: React.ReactNode;
  /** 自定义颜色值（覆盖 colorRole） */
  color?: string;
  /** 自定义样式覆盖 */
  style?: Record<string, any>;
  /** 点击事件 */
  onPress?: () => void;
  /** 无障碍标签 */
  accessibilityLabel?: string;
  /** 是否可选择 */
  selectable?: boolean;
}

export interface ButtonProps {
  children: React.ReactNode;
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  onPress?: () => void;
  disabled?: boolean;
  /** 是否占满宽度 */
  fullWidth?: boolean;
  /** 自定义样式覆盖 */
  style?: Record<string, any>;
  accessibilityLabel?: string;
  testID?: string;
}

export interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  type?: 'text' | 'password' | 'email' | 'number';
  disabled?: boolean;
  autoFocus?: boolean;
  /** 自定义样式覆盖 */
  style?: Record<string, any>;
  accessibilityLabel?: string;
  testID?: string;
}

export interface TextAreaProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  style?: Record<string, any>;
  accessibilityLabel?: string;
  testID?: string;
}

export interface BadgeProps {
  children: React.ReactNode;
  /** 自定义样式覆盖 */
  style?: Record<string, any>;
}

export interface DividerProps {
  /** 垂直还是水平 */
  orientation?: 'horizontal' | 'vertical';
}

export interface ScrollViewProps extends LayoutStyle {
  children?: React.ReactNode;
  /** 水平滚动 */
  horizontal?: boolean;
  /** 是否显示滚动条 */
  showsScrollIndicator?: boolean;
  style?: Record<string, any>;
}

export interface ImageProps {
  source: string;
  width?: number;
  height?: number;
  radius?: 'sm' | 'md' | 'lg' | 'full' | 'none';
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  style?: Record<string, any>;
}

/* ────────────────────────────── Primitive 接口 ────────────────────────────── */

export interface PrimitiveComponents {
  View: React.ComponentType<ViewProps>;
  Text: React.ComponentType<TextProps>;
  Button: React.ComponentType<ButtonProps>;
  Input: React.ComponentType<InputProps>;
  TextArea: React.ComponentType<TextAreaProps>;
  Badge: React.ComponentType<BadgeProps>;
  Divider: React.ComponentType<DividerProps>;
  ScrollView: React.ComponentType<ScrollViewProps>;
  Image: React.ComponentType<ImageProps>;
}

/* ────────────────────────────── Theme Context ────────────────────────────── */

export interface ThemeContextValue {
  theme: ThemeType;
  colors: ColorTokens;
}

export interface ThemeProviderProps {
  theme: ThemeType;
  children: React.ReactNode;
}