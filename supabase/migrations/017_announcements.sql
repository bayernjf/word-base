-- ============================================================================
-- WordBase 公告系统 announcements 表 + RLS
-- 在 Supabase Dashboard SQL Editor 中执行
-- ============================================================================

-- 管理方式：Supabase Studio 手写记录（无需 admin 界面）
-- 读取：anon + 登录用户均只读（未登录用户也需要看到公告）
-- 写入：仅 service_role（管理员通过 Supabase Studio 操作）
--
-- 机器值与国际化显示约定（数据库只存英文机器值，UI 通过 i18n key 显示）
-- severity: info=通知(仅徽章), warning=警告(顶部 banner), critical=重要(启动弹窗)
-- target_platform: all=全平台, web=仅 Web, desktop=仅桌面端, mobile=移动端(ios+android), ios=仅 iOS, android=仅 Android
-- 双语：title_zh/title_en、content_zh/content_en 两列，缺失时互为 fallback
-- 对应前端单一来源：shared/lib/announcement/types.ts + shared/lib/announcement/config.ts
-- 修改枚举时必须同步前端 ANNOUNCEMENT_SEVERITIES / ANNOUNCEMENT_TARGETS

-- ============================================================================
-- 1. announcements 表
-- ============================================================================
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  title_zh text not null check (char_length(title_zh) >= 1 and char_length(title_zh) <= 200),
  title_en text check (title_en is null or (char_length(title_en) >= 1 and char_length(title_en) <= 200)),
  content_zh text not null,
  content_en text,
  severity text not null default 'info' check (severity in ('info', 'warning', 'critical')),
  target_platform text not null default 'all' check (target_platform in ('all', 'web', 'desktop', 'mobile', 'ios', 'android')),
  publish_at timestamptz not null default now(),
  expire_at timestamptz,
  is_pinned boolean not null default false,
  is_dismissible boolean not null default true,
  action_url text check (action_url is null or action_url ~ '^https?://'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 索引：渲染层固定按 publish_at <= now() 过滤 + is_pinned desc, publish_at desc 排序
create index if not exists idx_announcements_publish_at on announcements(publish_at);
create index if not exists idx_announcements_pinned_publish on announcements(is_pinned desc, publish_at desc);

-- updated_at 自动更新
create or replace function update_announcements_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_announcements_updated_at on announcements;
create trigger trg_announcements_updated_at
  before update on announcements
  for each row
  execute function update_announcements_updated_at();


-- ============================================================================
-- 2. RLS: 所有角色只读
-- ============================================================================
alter table announcements enable row level security;

-- 策略 1: anon + 登录用户均可读取（未登录用户也需要看到公告）
drop policy if exists "read announcements for all" on announcements;
create policy "read announcements for all"
  on announcements
  for select
  to anon, authenticated
  using (true);

-- 策略 2: 不开放 insert/update/delete
-- 写入由管理员通过 Supabase Studio（走 service_role，绕过 RLS）操作


-- ============================================================================
-- 3. 验证
-- ============================================================================
-- 执行完成后，在 Supabase Table Editor 中应看到：
--   - announcements (RLS 已开启)
--
-- 插入测试数据示例（在 SQL Editor 中执行）：
-- insert into announcements (title_zh, title_en, content_zh, content_en, severity, is_pinned, action_url)
-- values (
--   '欢迎使用 WordBase',
--   'Welcome to WordBase',
--   '这是公告系统的第一条测试消息。',
--   'This is the first test message of the announcement system.',
--   'critical',
--   true,
--   'https://word-base.pages.dev/'
-- );
-- ============================================================================
