import type { Metadata } from 'next';
import type React from 'react';

export const metadata: Metadata = {
  title: 'WordBase - 浏览即学习的 AI 词汇工作台',
  description: 'WordBase - 浏览即学习，让每个生词都不流失。浏览器划词收藏 + AI语境学习，全平台词汇积累。',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}