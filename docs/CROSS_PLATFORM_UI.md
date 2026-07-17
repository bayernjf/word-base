# 跨端 UI 统一方案

本项目通过 **三层 Primitive 组件架构**，在 Turborepo Monorepo 下实现 Next.js（Web）、Tauri（桌面）、Expo React Native（移动端）三端 UI 统一。

---

## 架构总览

```
shared/
├── tokens/index.ts            ← 第1层：Design Token（纯值，三端共用）
├── primitives/
│   ├── types.ts               ← 第2层：Primitive 接口定义（平台无关）
│   └── index.ts               ← 解析器 + ThemeProvider + Context
└── components/ThemeStyles.ts   ← 旧 Tailwind 系统保留，新增 getThemeTokens() 桥接

apps/web/src/primitives/index.tsx      ← 第3层：Web 实现（div/button + CSSProperties）
apps/mobile/src/primitives/index.tsx   ← 第3层：RN 实现（View/Pressable + StyleSheet）
```

### 核心矛盾与解决思路

| 端 | 渲染元素 | 样式系统 |
|----|---------|---------|
| Next.js / Tauri | HTML（`div`、`span`、`button`） | CSS / Tailwind class |
| Expo React Native | RN（`View`、`Text`、`Pressable`） | `StyleSheet` 对象 |

两端渲染模型完全不同，直接共享 HTML 组件给 RN 会报错。解决方案：

1. **Token 层**把颜色、间距、圆角抽成纯 JS 值，三端共用
2. **接口层**定义一套语义化 Props（`bgRole="card"`、`size="lg"`），不含任何平台 API
3. **实现层**各端独立实现，Web 映射到 HTML + CSS，RN 映射到原生组件 + StyleSheet

---

## 第 1 层：Design Token

**文件**：`shared/tokens/index.ts`

Token 是纯值对象，不包含任何 CSS 或 RN 语法，三端直接引用。

### 间距 Token

```ts
export const spacing = {
  xs: 4,    // 4px
  sm: 8,    // 8px
  md: 16,   // 16px
  lg: 24,   // 24px
  xl: 32,   // 32px
  xxl: 48,  // 48px
} as const;
```

### 圆角 Token

```ts
export const radius = {
  none: 0,
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;
```

### 字号 Token

```ts
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
```

### 字重 Token

```ts
export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const;
```

### 颜色 Token（按主题生成）

```ts
export function getColorTokens(theme: ThemeType): ColorTokens
```

支持 `glass`（深色玻璃态）和 `natural`（浅色自然态）两个主题，返回 24 个颜色值（背景、卡片、文字、按钮、边框、徽章等）。

---

## 第 2 层：Primitive 接口

**文件**：`shared/primitives/types.ts`

定义 9 个跨端基础组件的 Props 接口，使用语义枚举而非平台 API。

### 组件清单

| 组件 | Web 实现 | RN 实现 | 核心 Props |
|------|---------|---------|-----------|
| `View` | `<div>` / `<button>` | `<View>` / `<Pressable>` | `bgRole`, `padding`, `gap`, `radius`, `shadow`, `direction`, `justify`, `align` |
| `Text` | `<span>` | `<Text>` | `size`, `weight`, `colorRole`, `truncate`, `italic`, `align` |
| `Button` | `<button>` | `<Pressable>` + `<Text>` | `variant`(primary/secondary/ghost/danger), `size`, `fullWidth`, `disabled` |
| `Input` | `<input>` | `<TextInput>` | `type`, `placeholder`, `onChangeText`, `disabled` |
| `TextArea` | `<textarea>` | `<TextInput multiline>` | `rows`, `placeholder`, `onChangeText` |
| `Badge` | `<span>` | `<View>` + `<Text>` | `children` |
| `Divider` | `<hr>` | `<View>` | `orientation` |
| `ScrollView` | `<div overflow:auto>` | `<ScrollView>` | `horizontal`, `showsScrollIndicator` |
| `Image` | `<img>` | `<Image>` | `source`, `width`, `height`, `radius`, `resizeMode` |

### LayoutStyle 语义枚举

```ts
interface LayoutStyle {
  direction?: 'row' | 'column';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  align?: 'start' | 'center' | 'end' | 'stretch';
  flex?: number;
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  padding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'none';
  radius?: 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'none';
  width?: 'full' | 'auto' | number;
  height?: 'full' | 'auto' | number;
  overflow?: 'hidden' | 'visible' | 'scroll' | 'auto';
  position?: 'relative' | 'absolute' | 'fixed';
  // ...
}
```

### TextStyle 语义枚举

```ts
interface TextStyle {
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | 'h4' | 'h3' | 'h2';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold';
  colorRole?: 'primary' | 'secondary' | 'accent' | 'btnPrimary' | 'btnSecondary' | 'badge';
  italic?: boolean;
  truncate?: boolean;
  lineHeight?: 'tight' | 'normal' | 'relaxed';
  tracking?: 'tight' | 'normal' | 'wide' | 'wider' | 'widest';
  transform?: 'none' | 'uppercase' | 'capitalize' | 'lowercase';
  align?: 'left' | 'center' | 'right';
}
```

### Theme Context

```ts
interface ThemeContextValue {
  theme: ThemeType;       // 'glass' | 'natural'
  colors: ColorTokens;    // 完整颜色 token
}
```

通过 `PrimitiveThemeProvider` 注入，所有 primitive 组件内部通过 `usePrimitiveTheme()` 读取当前主题色。

---

## 第 3 层：各端实现

### Web 端（Next.js / Tauri）

**文件**：`apps/web/src/primitives/index.tsx`

- `View` → `<div>` 或 `<button>`（有 `onPress` 时）
- `Text` → `<span>`
- `Button` → `<button>`
- `Input` → `<input>`
- `TextArea` → `<textarea>`
- 样式通过 `React.CSSProperties` 内联样式
- Token 值直接映射到 CSS 属性（`padding: 16px`、`borderRadius: 24px`）
- 阴影映射到 `boxShadow`

### RN 端（Expo React Native）

**文件**：`apps/mobile/src/primitives/index.tsx`

- `View` → `<View>` 或 `<Pressable>`（有 `onPress` 时）
- `Text` → `<Text>`
- `Button` → `<Pressable>` + 内部 `<Text>`
- `Input` → `<TextInput>`
- `TextArea` → `<TextInput multiline>`
- 样式通过 `StyleSheet.flatten()`
- 阴影映射到 `shadowColor` / `shadowOffset` / `shadowOpacity` / `shadowRadius` / `elevation`
- 文字截断映射到 `numberOfLines` + `ellipsizeMode`

---

## 解析器与注册

**文件**：`shared/primitives/index.ts`

### 注册机制

各端在应用入口注册自己的 primitive 实现：

```ts
// Web 端入口（apps/web/src/app/app/page.tsx）
import { setPrimitives } from '@wordbase/shared/primitives';
import { webPrimitives } from '../../primitives';
setPrimitives(webPrimitives);
```

```ts
// RN 端入口（apps/mobile/App.tsx）
import { setPrimitives } from '@wordbase/shared/primitives';
import { rnPrimitives } from './src/primitives';
setPrimitives(rnPrimitives);
```

### 消费方式

业务组件通过 `usePrimitives()` 获取已注册的实现：

```tsx
import { usePrimitives } from '@wordbase/shared/primitives';

function MyCard() {
  const { View, Text, Button } = usePrimitives();
  return (
    <View bgRole="card" padding="lg" radius="xl" shadow="md" gap="sm">
      <Text size="h3" weight="bold" colorRole="primary">标题</Text>
      <Text size="sm" colorRole="secondary">副标题</Text>
      <Button variant="primary" onPress={handlePress}>操作</Button>
    </View>
  );
}
```

### ThemeProvider 包裹

```tsx
// Web
<PrimitiveThemeProvider theme="glass">
  <SupabaseProvider>
    <AppSupabase />
  </SupabaseProvider>
</PrimitiveThemeProvider>

// RN
<SafeAreaProvider>
  <PrimitiveThemeProvider theme="glass">
    <SupabaseProvider>
      <AppSupabase />
    </SupabaseProvider>
  </PrimitiveThemeProvider>
</SafeAreaProvider>
```

---

## 渐进迁移策略

旧组件继续用 `ThemeStyles` + Tailwind class，**不会破坏**。新组件用 primitive 系统。两者通过 `PrimitiveThemeProvider` 共享同一套主题色。

### 迁移步骤

1. **新组件**：直接使用 primitive 系统（`usePrimitives()`）
2. **旧组件迁移**：逐步将 `<div className="...">` 替换为 `<View bgRole="card" padding="lg">`
3. **桥接层**：`ThemeStyles.ts` 新增 `getThemeTokens()` 函数，返回与 `ColorTokens` 相同结构，旧组件可逐步引用 token 值

### 迁移对照表

| 旧写法（Tailwind） | 新写法（Primitive） |
|-----|-----|
| `<div className="bg-[#fffdf7] border border-[#bad8b7] rounded-2xl p-6 shadow-md">` | `<View bgRole="card" borderWidth={1} radius="lg" padding="lg" shadow="md">` |
| `<span className="text-[#1d3a2b] font-semibold text-xl">` | `<Text colorRole="primary" weight="semibold" size="xl">` |
| `<button className="bg-[#56a978] text-white rounded-full px-4 py-2">` | `<Button variant="primary" size="md">` |
| `<input className="border rounded-lg px-4 py-2">` | `<Input placeholder="..." />` |
| `<span className="bg-[#d9efd2] text-[#336f4e] px-2 py-0.5 rounded-full text-xs">` | `<Badge>标签</Badge>` |

---

## 文件索引

| 文件 | 职责 |
|------|------|
| `shared/tokens/index.ts` | Design Token 定义（颜色、间距、圆角、字号、字重） |
| `shared/primitives/types.ts` | 9 个 Primitive 组件的 Props 接口定义 |
| `shared/primitives/index.ts` | 解析器（`setPrimitives` / `usePrimitives`）+ ThemeProvider + Context |
| `shared/components/ThemeStyles.ts` | 旧 Tailwind 主题系统 + `getThemeTokens()` 桥接函数 |
| `shared/index.ts` | 统一导出 token 和 primitive API |
| `apps/web/src/primitives/index.tsx` | Web 端 primitive 实现（HTML + CSS） |
| `apps/mobile/src/primitives/index.tsx` | RN 端 primitive 实现（View + StyleSheet） |
| `apps/web/src/app/app/page.tsx` | Web 入口，注册 `webPrimitives` + `PrimitiveThemeProvider` |
| `apps/mobile/App.tsx` | RN 入口，注册 `rnPrimitives` + `PrimitiveThemeProvider` |

---

## 构建验证

| 端 | 构建命令 | 状态 |
|----|---------|------|
| Next.js Web | `turbo run build --filter=@wordbase/web` | 通过 |
| Hono API | `turbo run build --filter=@wordbase/api` | 通过 |
| Tauri 桌面 | 共享 Web 实现，零额外成本 | 同 Web |
| Expo RN | `npx expo start`（开发模式） | 依赖 native 模块，需模拟器/真机 |
