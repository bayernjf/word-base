-- 跨设备主题偏好：在 profiles 表存储用户选择的页面主题
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'glass';
