-- =============================================
-- 配对码表：用于浏览器扩展与 Web/Mobile 端配对
-- 每个用户同一时间只有一个有效配对码，10 分钟过期
-- =============================================

CREATE TABLE IF NOT EXISTS pairing_codes (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS：用户只能访问自己的配对码
ALTER TABLE pairing_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own pairing codes"
  ON pairing_codes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pairing codes"
  ON pairing_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pairing codes"
  ON pairing_codes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pairing codes"
  ON pairing_codes FOR DELETE
  USING (auth.uid() = user_id);
