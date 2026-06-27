# Debug Session: sync-book-switch [OPEN]

## Problem
- 症状：用户在 `word-base` 中切换同步单词本后，界面显示没有切换成功，或同步状态跳到其他单词本。
- 期望：用户点击某个单词本设为同步单词本后，该单词本稳定保持同步状态，直到用户再次手动切换。

## Hypotheses
- H1: 前端点击事件触发了，但 `setSyncBook()` 执行失败并被吞掉。
- H2: `set_sync_book` RPC 在真实环境缺失或报错，fallback 逻辑也未成功写库。
- H3: 数据库返回了多本 `is_sync=true`，UI 在刷新后选中了另一条记录。
- H4: 其他 effect 或刷新链路在切换后再次覆盖同步单词本状态。

## Plan
1. 给前端切换入口与 `useVocabulary` 增加运行时调试日志。
2. 运行应用并复现“切换同步单词本失败”。
3. 根据日志确认失败点发生在点击、RPC/fallback、刷新返回、还是后续覆盖。
4. 基于证据实施最小修复并二次验证。

## Status
- 2026-06-10: 调试会话已创建，等待加入 instrumentation 并收集运行时证据。
