-- 通知系統
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('comment', 'reply', 'vote', 'system')),
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "本人可讀寫" ON notifications FOR ALL USING (auth.uid() = user_id);

-- 收藏 Wishlist
CREATE TABLE IF NOT EXISTS wishlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE NOT NULL,
  max_price INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, card_id)
);

ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "公開讀取" ON wishlists FOR SELECT USING (TRUE);
CREATE POLICY "本人可管理" ON wishlists FOR ALL USING (auth.uid() = user_id);

-- 通知觸發：有人留言時通知發文者
CREATE OR REPLACE FUNCTION notify_post_author()
RETURNS TRIGGER AS $$
DECLARE
  post_author UUID;
  commenter_name TEXT;
  post_title TEXT;
BEGIN
  SELECT author_id, title INTO post_author, post_title FROM posts WHERE id = NEW.post_id;
  SELECT username INTO commenter_name FROM profiles WHERE id = NEW.author_id;

  IF post_author != NEW.author_id THEN
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      post_author,
      'comment',
      commenter_name || ' 回覆了你的文章',
      post_title,
      '/community/' || NEW.post_id::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_new_comment
  AFTER INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION notify_post_author();
