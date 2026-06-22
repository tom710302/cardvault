-- 通知系統 Migration
-- 修正 schema 以支援新的通知類型和 body 欄位

-- 1. 移除舊的 type CHECK 限制（讓所有類型都可以寫入）
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

-- 2. 新增 body 欄位（舊程式用 message，新程式用 body）
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS body TEXT;

-- 3. 移除舊的 DB trigger（避免留言通知重複：trigger 一次 + API 一次）
DROP TRIGGER IF EXISTS on_new_comment ON comments;
DROP FUNCTION IF EXISTS notify_post_author();

-- 4. 確保 Realtime 可用（讓 Navbar 即時收到新通知）
ALTER TABLE notifications REPLICA IDENTITY FULL;

-- 5. 讓 RLS policy 支援 INSERT（admin client 需要能寫入）
DROP POLICY IF EXISTS "本人可讀寫" ON notifications;

CREATE POLICY "本人可讀" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "本人可更新" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Server 可寫入" ON notifications
  FOR INSERT WITH CHECK (true);
