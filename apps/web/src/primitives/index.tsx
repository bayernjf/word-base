import React from 'react';
import type {
  ViewProps,
  TextProps,
  ButtonProps,
  InputProps,
  TextAreaProps,
  BadgeProps,
  DividerProps,
  ScrollViewProps,
  ImageProps,
  PrimitiveComponents,
} from '@wordbase/shared/primitives';
import { usePrimitiveTheme } from '@wordbase/shared/primitives';
import { spacing, radius, fontSize, fontWeight } from '@wordbase/shared/tokens';

/* ────────────────────────────── helpers ────────────────────────────── */

const spacingMap = {
  xs: spacing.xs,
  sm: spacing.sm,
  md: spacing.md,
  lg: spacing.lg,
  xl: spacing.xl,
  none: 0,
} as const;

const radiusMap = {
  sm: radius.sm,
  md: radius.md,
  lg: radius.lg,
  xl: radius.xl,
  full: radius.full,
  none: 0,
} as const;

const fontSizeMap = {
  xs: fontSize.xs,
  sm: fontSize.sm,
  base: fontSize.base,
  lg: fontSize.lg,
  xl: fontSize.xl,
  h4: fontSize.h4,
  h3: fontSize.h3,
  h2: fontSize.h2,
} as const;

const fontWeightMap = {
  normal: fontWeight.normal,
  medium: fontWeight.medium,
  semibold: fontWeight.semibold,
  bold: fontWeight.bold,
  extrabold: fontWeight.extrabold,
} as const;

function resolveColor(role: string, colors: any): string {
  switch (role) {
    case 'bg': return colors.bg;
    case 'bgSecondary': return colors.bgSecondary;
    case 'card': return colors.card;
    case 'sidebar': return colors.sidebar;
    case 'nav': return colors.nav;
    case 'accentBg': return colors.accentBg;
    case 'transparent': return 'transparent';
    default: return colors.bg;
  }
}

function resolveTextColor(role: string, colors: any): string {
  switch (role) {
    case 'primary': return colors.textPrimary;
    case 'secondary': return colors.textSecondary;
    case 'accent': return colors.accentText;
    case 'btnPrimary': return colors.btnPrimaryText;
    case 'btnSecondary': return colors.btnSecondaryText;
    case 'badge': return colors.badgeText;
    default: return colors.textPrimary;
  }
}

function layoutToCss(props: ViewProps, colors: any): React.CSSProperties {
  const style: React.CSSProperties = {};

  if (props.direction) { style.display = 'flex'; style.flexDirection = props.direction; }
  else if (props.flex !== undefined || props.gap || props.justify || props.align) style.display = 'flex';

  if (props.justify) {
    const map = { start: 'flex-start', center: 'center', end: 'flex-end', between: 'space-between', around: 'space-around' };
    style.justifyContent = map[props.justify];
  }
  if (props.align) {
    const map = { start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'stretch' };
    style.alignItems = map[props.align];
  }
  if (props.flex !== undefined) style.flex = props.flex;
  if (props.noShrink) style.flexShrink = 0;
  if (props.wrap) style.flexWrap = 'wrap';
  if (props.gap) style.gap = spacingMap[props.gap];
  if (props.padding) style.padding = spacingMap[props.padding];
  if (props.marginBottom) style.marginBottom = spacingMap[props.marginBottom];
  if (props.marginTop) style.marginTop = spacingMap[props.marginTop];
  if (props.radius) style.borderRadius = radiusMap[props.radius];
  if (props.borderWidth) style.borderWidth = props.borderWidth;
  if (props.width === 'full') style.width = '100%';
  else if (typeof props.width === 'number') style.width = props.width;
  if (props.height === 'full') style.height = '100%';
  else if (typeof props.height === 'number') style.height = props.height;
  if (props.maxWidth === 'md') style.maxWidth = '28rem';
  else if (props.maxWidth === 'xl') style.maxWidth = '36rem';
  if (props.maxHeight) style.maxHeight = props.maxHeight;
  if (props.overflow === 'hidden') style.overflow = 'hidden';
  else if (props.overflow === 'scroll') style.overflow = 'auto';
  if (props.position) style.position = props.position;
  if (props.zIndex) style.zIndex = props.zIndex;

  if (props.bgRole) style.backgroundColor = resolveColor(props.bgRole, colors);
  if (props.borderWidth) style.borderColor = colors.border;

  const shadowMap = {
    none: 'none',
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    md: '0 4px 6px rgba(0,0,0,0.1)',
    lg: '0 10px 15px rgba(0,0,0,0.1)',
    xl: '0 20px 25px rgba(0,0,0,0.15)',
  };
  if (props.shadow && props.shadow !== 'none') style.boxShadow = shadowMap[props.shadow];

  return style;
}

function textToCss(props: TextProps, colors: any): React.CSSProperties {
  const style: React.CSSProperties = {};
  if (props.size) style.fontSize = fontSizeMap[props.size];
  if (props.weight) style.fontWeight = fontWeightMap[props.weight];
  if (props.color) style.color = props.color;
  else if (props.colorRole) style.color = resolveTextColor(props.colorRole, colors);
  if (props.italic) style.fontStyle = 'italic';
  if (props.truncate) {
    style.overflow = 'hidden';
    style.textOverflow = 'ellipsis';
    style.whiteSpace = 'nowrap';
  }
  if (props.lineHeight === 'tight') style.lineHeight = 1.25;
  else if (props.lineHeight === 'relaxed') style.lineHeight = 1.75;
  if (props.tracking === 'tight') style.letterSpacing = '-0.025em';
  else if (props.tracking === 'wide') style.letterSpacing = '0.025em';
  else if (props.tracking === 'wider') style.letterSpacing = '0.05em';
  else if (props.tracking === 'widest') style.letterSpacing = '0.1em';
  if (props.transform && props.transform !== 'none') style.textTransform = props.transform;
  if (props.align) style.textAlign = props.align;
  return style;
}

/* ────────────────────────────── View ────────────────────────────── */

export const WebView: React.FC<ViewProps> = ({ children, onPress, style, accessibilityLabel, testID, ...rest }) => {
  const { colors } = usePrimitiveTheme();
  const css = layoutToCss(rest, colors);
  const combined = { ...css, ...style };

  if (onPress) {
    return (
      <button
        type="button"
        onClick={onPress}
        style={{ ...combined, cursor: 'pointer', border: 'none', background: 'transparent', textAlign: 'left', font: 'inherit' }}
        aria-label={accessibilityLabel}
        data-testid={testID}
      >
        {children}
      </button>
    );
  }

  return (
    <div style={combined} aria-label={accessibilityLabel} data-testid={testID}>
      {children}
    </div>
  );
};

/* ────────────────────────────── Text ────────────────────────────── */

export const WebText: React.FC<TextProps> = ({ children, onPress, style, accessibilityLabel, selectable, ...rest }) => {
  const { colors } = usePrimitiveTheme();
  const css = textToCss(rest, colors);
  const combined = { ...css, ...style };

  if (onPress) {
    return (
      <span
        onClick={onPress}
        style={{ ...combined, cursor: 'pointer', userSelect: selectable ? 'text' : 'none' }}
        role="button"
        aria-label={accessibilityLabel}
      >
        {children}
      </span>
    );
  }

  return (
    <span style={{ ...combined, userSelect: selectable ? 'text' : 'none' }} aria-label={accessibilityLabel}>
      {children}
    </span>
  );
};

/* ────────────────────────────── Button ────────────────────────────── */

export const WebButton: React.FC<ButtonProps> = ({ children, variant, size = 'md', onPress, disabled, fullWidth, style, accessibilityLabel, testID }) => {
  const { colors } = usePrimitiveTheme();

  const sizeMap = {
    sm: { padding: `${spacing.xs}px ${spacing.sm}px`, fontSize: fontSize.sm },
    md: { padding: `${spacing.sm}px ${spacing.md}px`, fontSize: fontSize.base },
    lg: { padding: `${spacing.md}px ${spacing.lg}px`, fontSize: fontSize.lg },
  };

  const variantStyle: React.CSSProperties = (() => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: colors.btnPrimaryBg,
          color: colors.btnPrimaryText,
          border: 'none',
          borderRadius: radius.full,
          fontWeight: fontWeight.semibold,
        };
      case 'secondary':
        return {
          backgroundColor: colors.btnSecondaryBg,
          color: colors.btnSecondaryText,
          border: `1px solid ${colors.btnSecondaryBorder}`,
          borderRadius: radius.md,
          fontWeight: fontWeight.medium,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: colors.textPrimary,
          border: 'none',
          borderRadius: radius.md,
          fontWeight: fontWeight.medium,
        };
      case 'danger':
        return {
          backgroundColor: '#ef4444',
          color: '#ffffff',
          border: 'none',
          borderRadius: radius.md,
          fontWeight: fontWeight.semibold,
        };
    }
  })();

  const combined: React.CSSProperties = {
    ...sizeMap[size],
    ...variantStyle,
    width: fullWidth ? '100%' : 'auto',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.15s ease',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    ...style,
  };

  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      style={combined}
      aria-label={accessibilityLabel}
      data-testid={testID}
    >
      {children}
    </button>
  );
};

/* ────────────────────────────── Input ────────────────────────────── */

export const WebInput: React.FC<InputProps> = ({ value, onChangeText, placeholder, type = 'text', disabled, autoFocus, style, accessibilityLabel, testID }) => {
  const { colors } = usePrimitiveTheme();

  const combined: React.CSSProperties = {
    width: '100%',
    padding: `${spacing.sm}px ${spacing.md}px`,
    fontSize: fontSize.base,
    backgroundColor: colors.card,
    color: colors.textPrimary,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.md,
    outline: 'none',
    cursor: disabled ? 'not-allowed' : 'text',
    opacity: disabled ? 0.5 : 1,
    ...style,
  };

  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChangeText(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      autoFocus={autoFocus}
      style={combined}
      aria-label={accessibilityLabel}
      data-testid={testID}
    />
  );
};

/* ────────────────────────────── TextArea ────────────────────────────── */

export const WebTextArea: React.FC<TextAreaProps> = ({ value, onChangeText, placeholder, rows = 4, disabled, style, accessibilityLabel, testID }) => {
  const { colors } = usePrimitiveTheme();

  const combined: React.CSSProperties = {
    width: '100%',
    padding: `${spacing.sm}px ${spacing.md}px`,
    fontSize: fontSize.base,
    backgroundColor: colors.card,
    color: colors.textPrimary,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.md,
    outline: 'none',
    resize: 'vertical',
    cursor: disabled ? 'not-allowed' : 'text',
    opacity: disabled ? 0.5 : 1,
    ...style,
  };

  return (
    <textarea
      value={value}
      onChange={(e) => onChangeText(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      style={combined}
      aria-label={accessibilityLabel}
      data-testid={testID}
    />
  );
};

/* ────────────────────────────── Badge ────────────────────────────── */

export const WebBadge: React.FC<BadgeProps> = ({ children, style }) => {
  const { colors } = usePrimitiveTheme();

  const combined: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: colors.badgeBg,
    color: colors.badgeText,
    border: `1px solid ${colors.badgeBorder}`,
    borderRadius: radius.full,
    padding: `${spacing.xs / 2}px ${spacing.sm}px`,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    ...style,
  };

  return <span style={combined}>{children}</span>;
};

/* ────────────────────────────── Divider ────────────────────────────── */

export const WebDivider: React.FC<DividerProps> = ({ orientation = 'horizontal' }) => {
  const { colors } = usePrimitiveTheme();

  const style: React.CSSProperties = orientation === 'horizontal'
    ? { width: '100%', height: 1, backgroundColor: colors.border, border: 'none' }
    : { width: 1, height: '100%', backgroundColor: colors.border, border: 'none', alignSelf: 'stretch' };

  return <hr style={style} />;
};

/* ────────────────────────────── ScrollView ────────────────────────────── */

export const WebScrollView: React.FC<ScrollViewProps> = ({ children, horizontal, showsScrollIndicator = true, style, ...rest }) => {
  const { colors } = usePrimitiveTheme();
  const css = layoutToCss(rest, colors);

  const combined: React.CSSProperties = {
    ...css,
    overflow: horizontal ? 'auto' : 'auto',
    overflowX: horizontal ? 'auto' : 'hidden',
    overflowY: horizontal ? 'hidden' : 'auto',
    scrollbarWidth: showsScrollIndicator ? 'auto' : 'none',
    ...style,
  };

  return <div style={combined}>{children}</div>;
};

/* ────────────────────────────── Image ────────────────────────────── */

export const WebImage: React.FC<ImageProps> = ({ source, width, height, radius: r = 'md', resizeMode, style }) => {
  const combined: React.CSSProperties = {
    width: width ?? 'auto',
    height: height ?? 'auto',
    borderRadius: radiusMap[r],
    objectFit: resizeMode === 'cover' ? 'cover' : resizeMode === 'contain' ? 'contain' : resizeMode === 'stretch' ? 'fill' : 'cover',
    ...style,
  };

  return <img src={source} style={combined} />;
};

/* ────────────────────────────── Export ────────────────────────────── */

export const webPrimitives: PrimitiveComponents = {
  View: WebView,
  Text: WebText,
  Button: WebButton,
  Input: WebInput,
  TextArea: WebTextArea,
  Badge: WebBadge,
  Divider: WebDivider,
  ScrollView: WebScrollView,
  Image: WebImage,
};