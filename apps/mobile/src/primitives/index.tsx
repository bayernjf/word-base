import React, { useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Image as RNImage,
  StyleSheet,
} from 'react-native';
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
  normal: fontWeight.normal as any,
  medium: fontWeight.medium as any,
  semibold: fontWeight.semibold as any,
  bold: fontWeight.bold as any,
  extrabold: fontWeight.extrabold as any,
} as const;

const justifyMap = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
} as const;

const alignMap = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
} as const;

function resolveBgColor(role: string, colors: any): string | undefined {
  switch (role) {
    case 'bg': return colors.bg;
    case 'bgSecondary': return colors.bgSecondary;
    case 'card': return colors.card;
    case 'sidebar': return colors.sidebar;
    case 'nav': return colors.nav;
    case 'accentBg': return colors.accentBg;
    case 'transparent': return undefined;
    default: return undefined;
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

function layoutToStyle(props: ViewProps, colors: any): any {
  const style: any = {};

  style.display = 'flex';
  style.flexDirection = props.direction === 'row' ? 'row' : 'column';

  if (props.justify) style.justifyContent = justifyMap[props.justify];
  if (props.align) style.alignItems = alignMap[props.align];
  if (props.flex !== undefined) style.flex = props.flex;
  if (props.noShrink) style.flexShrink = 0;
  if (props.wrap) style.flexWrap = 'wrap';
  if (props.gap) style.gap = spacingMap[props.gap];
  if (props.padding) style.padding = spacingMap[props.padding];
  if (props.marginBottom) style.marginBottom = spacingMap[props.marginBottom];
  if (props.marginTop) style.marginTop = spacingMap[props.marginTop];
  if (props.radius) style.borderRadius = radiusMap[props.radius];
  if (props.borderWidth) style.borderWidth = props.borderWidth;
  if (props.borderWidth) style.borderColor = colors.border;
  if (props.width === 'full') style.width = '100%';
  else if (typeof props.width === 'number') style.width = props.width;
  if (props.height === 'full') style.height = '100%';
  else if (typeof props.height === 'number') style.height = props.height;
  if (props.maxWidth === 'md') style.maxWidth = 448;
  else if (props.maxWidth === 'xl') style.maxWidth = 576;
  if (props.maxHeight) style.maxHeight = props.maxHeight;
  if (props.overflow === 'hidden') style.overflow = 'hidden';
  if (props.position) style.position = props.position;
  if (props.zIndex) style.zIndex = props.zIndex;

  if (props.bgRole) {
    const bg = resolveBgColor(props.bgRole, colors);
    if (bg) style.backgroundColor = bg;
  }

  if (props.shadow === 'sm') {
    style.shadowColor = '#000';
    style.shadowOffset = { width: 0, height: 1 };
    style.shadowOpacity = 0.05;
    style.shadowRadius = 2;
    style.elevation = 1;
  } else if (props.shadow === 'md') {
    style.shadowColor = '#000';
    style.shadowOffset = { width: 0, height: 4 };
    style.shadowOpacity = 0.1;
    style.shadowRadius = 6;
    style.elevation = 3;
  } else if (props.shadow === 'lg') {
    style.shadowColor = '#000';
    style.shadowOffset = { width: 0, height: 10 };
    style.shadowOpacity = 0.1;
    style.shadowRadius = 15;
    style.elevation = 5;
  } else if (props.shadow === 'xl') {
    style.shadowColor = '#000';
    style.shadowOffset = { width: 0, height: 20 };
    style.shadowOpacity = 0.15;
    style.shadowRadius = 25;
    style.elevation = 8;
  }

  return style;
}

function textToStyle(props: TextProps, colors: any): any {
  const style: any = {};
  if (props.size) style.fontSize = fontSizeMap[props.size];
  if (props.weight) style.fontWeight = fontWeightMap[props.weight];
  if (props.color) style.color = props.color;
  else if (props.colorRole) style.color = resolveTextColor(props.colorRole, colors);
  if (props.italic) style.fontStyle = 'italic';
  if (props.truncate) {
    style.numberOfLines = 1;
    style.ellipsizeMode = 'tail';
  }
  if (props.lineHeight === 'tight') style.lineHeight = fontSizeMap[props.size || 'base'] * 1.25;
  else if (props.lineHeight === 'relaxed') style.lineHeight = fontSizeMap[props.size || 'base'] * 1.75;
  if (props.tracking === 'tight') style.letterSpacing = -0.5;
  else if (props.tracking === 'wide') style.letterSpacing = 0.5;
  else if (props.tracking === 'wider') style.letterSpacing = 1;
  else if (props.tracking === 'widest') style.letterSpacing = 2;
  if (props.transform === 'uppercase') style.textTransform = 'uppercase';
  else if (props.transform === 'capitalize') style.textTransform = 'capitalize';
  else if (props.transform === 'lowercase') style.textTransform = 'lowercase';
  if (props.align) style.textAlign = props.align;
  return style;
}

/* ────────────────────────────── View ────────────────────────────── */

export const RNView: React.FC<ViewProps> = ({ children, onPress, style, accessibilityLabel, testID, ...rest }) => {
  const { colors } = usePrimitiveTheme();
  const baseStyle = layoutToStyle(rest, colors);
  const combined = StyleSheet.flatten([baseStyle, style]);

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={combined} accessibilityLabel={accessibilityLabel} testID={testID}>
        {children as React.ReactNode}
      </Pressable>
    );
  }

  return (
    <View style={combined} accessibilityLabel={accessibilityLabel} testID={testID}>
      {children as React.ReactNode}
    </View>
  );
};

/* ────────────────────────────── Text ────────────────────────────── */

export const RNText: React.FC<TextProps> = ({ children, onPress, style, accessibilityLabel, selectable, ...rest }) => {
  const { colors } = usePrimitiveTheme();
  const baseStyle = textToStyle(rest, colors);
  const combined = StyleSheet.flatten([baseStyle, style]);

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityLabel={accessibilityLabel}>
        <Text style={combined} selectable={selectable}>{children as React.ReactNode}</Text>
      </Pressable>
    );
  }

  return (
    <Text style={combined} selectable={selectable} accessibilityLabel={accessibilityLabel}>
      {children as React.ReactNode}
    </Text>
  );
};

/* ────────────────────────────── Button ────────────────────────────── */

export const RNButton: React.FC<ButtonProps> = ({ children, variant, size = 'md', onPress, disabled, fullWidth, style, accessibilityLabel, testID }) => {
  const { colors } = usePrimitiveTheme();

  const sizeStyles = {
    sm: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, fontSize: fontSize.sm },
    md: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, fontSize: fontSize.base },
    lg: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, fontSize: fontSize.lg },
  };

  const variantStyle: any = (() => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: colors.btnPrimaryBg,
          borderRadius: radius.full,
        };
      case 'secondary':
        return {
          backgroundColor: colors.btnSecondaryBg,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.btnSecondaryBorder,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderRadius: radius.md,
        };
      case 'danger':
        return {
          backgroundColor: '#ef4444',
          borderRadius: radius.md,
        };
    }
  })();

  const textStyle: any = {
    fontSize: sizeStyles[size].fontSize,
    fontWeight: variant === 'primary' || variant === 'danger' ? fontWeight.semibold : fontWeight.medium,
    color: variant === 'primary' ? colors.btnPrimaryText
      : variant === 'secondary' ? colors.btnSecondaryText
      : variant === 'danger' ? '#ffffff'
      : colors.textPrimary,
    textAlign: 'center',
  };

  const containerStyle = StyleSheet.flatten([
    {
      paddingVertical: sizeStyles[size].paddingVertical,
      paddingHorizontal: sizeStyles[size].paddingHorizontal,
      ...variantStyle,
      opacity: disabled ? 0.5 : 1,
      width: fullWidth ? '100%' : 'auto',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
    },
    style,
  ]);

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={containerStyle}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      accessibilityRole="button"
    >
      {React.Children.map(children as React.ReactNode, (child) => {
        if (typeof child === 'string' || typeof child === 'number') {
          return <Text style={textStyle}>{child}</Text>;
        }
        return child as React.ReactNode;
      })}
    </Pressable>
  );
};

/* ────────────────────────────── Input ────────────────────────────── */

export const RNInput: React.FC<InputProps> = ({ value, onChangeText, placeholder, type = 'text', disabled, autoFocus, style, accessibilityLabel, testID }) => {
  const { colors } = usePrimitiveTheme();

  const combined = StyleSheet.flatten([
    {
      width: '100%',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      fontSize: fontSize.base,
      backgroundColor: colors.card,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      opacity: disabled ? 0.5 : 1,
    },
    style,
  ]);

  const isPassword = type === 'password';
  const keyboardType = type === 'email' ? 'email-address' : type === 'number' ? 'numeric' : 'default';

  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textSecondary}
      secureTextEntry={isPassword}
      keyboardType={keyboardType}
      editable={!disabled}
      autoFocus={autoFocus}
      style={combined}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    />
  );
};

/* ────────────────────────────── TextArea ────────────────────────────── */

export const RNTextArea: React.FC<TextAreaProps> = ({ value, onChangeText, placeholder, rows = 4, disabled, style, accessibilityLabel, testID }) => {
  const { colors } = usePrimitiveTheme();

  const combined = StyleSheet.flatten([
    {
      width: '100%',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      fontSize: fontSize.base,
      backgroundColor: colors.card,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      minHeight: rows * 24,
      textAlignVertical: 'top',
      opacity: disabled ? 0.5 : 1,
    },
    style,
  ]);

  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textSecondary}
      multiline
      numberOfLines={rows}
      editable={!disabled}
      style={combined}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    />
  );
};

/* ────────────────────────────── Badge ────────────────────────────── */

export const RNBadge: React.FC<BadgeProps> = ({ children, style }) => {
  const { colors } = usePrimitiveTheme();

  const combined = StyleSheet.flatten([
    {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.badgeBg,
      borderRadius: radius.full,
      paddingVertical: spacing.xs / 2,
      paddingHorizontal: spacing.sm,
    },
    style,
  ]);

  const textStyle = {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold as any,
    color: colors.badgeText,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  };

  return (
    <View style={combined}>
      {React.Children.map(children as React.ReactNode, (child) => {
        if (typeof child === 'string' || typeof child === 'number') {
          return <Text style={textStyle}>{child}</Text>;
        }
        return child as React.ReactNode;
      })}
    </View>
  );
};

/* ────────────────────────────── Divider ────────────────────────────── */

export const RNDivider: React.FC<DividerProps> = ({ orientation = 'horizontal' }) => {
  const { colors } = usePrimitiveTheme();

  const style = orientation === 'horizontal'
    ? { width: '100%' as const, height: 1, backgroundColor: colors.border }
    : { width: 1, alignSelf: 'stretch' as const, backgroundColor: colors.border };

  return <View style={style} />;
};

/* ────────────────────────────── ScrollView ────────────────────────────── */

export const RNScrollView: React.FC<ScrollViewProps> = ({ children, horizontal, showsScrollIndicator = true, style, ...rest }) => {
  const { colors } = usePrimitiveTheme();
  const baseStyle = layoutToStyle(rest, colors);
  const combined = StyleSheet.flatten([baseStyle, style]);

  return (
    <ScrollView
      horizontal={horizontal}
      showsVerticalScrollIndicator={showsScrollIndicator}
      showsHorizontalScrollIndicator={showsScrollIndicator}
      style={combined}
    >
      {children as React.ReactNode}
    </ScrollView>
  );
};

/* ────────────────────────────── Image ────────────────────────────── */

export const RNImageComp: React.FC<ImageProps> = ({ source, width, height, radius: r = 'md', resizeMode = 'cover', style }) => {
  const combined = StyleSheet.flatten([
    {
      width: width,
      height: height,
      borderRadius: radiusMap[r],
    },
    style,
  ]);

  const resizeModeMap = {
    cover: 'cover' as const,
    contain: 'contain' as const,
    stretch: 'stretch' as const,
    center: 'center' as const,
  };

  return (
    <RNImage
      source={{ uri: source }}
      style={combined}
      resizeMode={resizeModeMap[resizeMode]}
    />
  );
};

/* ────────────────────────────── Export ────────────────────────────── */

export const rnPrimitives: PrimitiveComponents = {
  View: RNView,
  Text: RNText,
  Button: RNButton,
  Input: RNInput,
  TextArea: RNTextArea,
  Badge: RNBadge,
  Divider: RNDivider,
  ScrollView: RNScrollView,
  Image: RNImageComp,
};