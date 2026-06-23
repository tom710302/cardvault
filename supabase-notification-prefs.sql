-- Email 通知偏好設定
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  email_trade_offer  BOOLEAN DEFAULT TRUE,
  email_comment_reply BOOLEAN DEFAULT TRUE,
  email_trade_match  BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "本人可讀寫" ON notification_preferences FOR ALL USING (auth.uid() = user_id);
