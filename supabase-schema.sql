-- ===== CardSearch 資料庫 Schema =====

-- 用戶資料
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
  reputation INTEGER DEFAULT 0,
  is_banned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 卡牌資料
CREATE TABLE IF NOT EXISTS cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,
  game TEXT NOT NULL,
  card_type TEXT DEFAULT 'tcg' CHECK (card_type IN ('tcg', 'sports')),
  set_name TEXT,
  set_code TEXT,
  rarity TEXT,
  image_url TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 社群貼文
CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  board TEXT NOT NULL DEFAULT 'general',
  post_type TEXT DEFAULT 'discussion' CHECK (post_type IN ('discussion', 'showcase', 'price_check', 'news')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_urls TEXT[] DEFAULT '{}',
  upvotes INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 留言
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES comments(id),
  content TEXT NOT NULL,
  upvotes INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 投票記錄
CREATE TABLE IF NOT EXISTS votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  target_id UUID NOT NULL,
  target_type TEXT CHECK (target_type IN ('post', 'comment')),
  value INTEGER CHECK (value IN (1, -1)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, target_id, target_type)
);

-- 收藏庫
CREATE TABLE IF NOT EXISTS collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE NOT NULL,
  condition TEXT DEFAULT 'NM',
  quantity INTEGER DEFAULT 1,
  is_foil BOOLEAN DEFAULT FALSE,
  is_graded BOOLEAN DEFAULT FALSE,
  grade_value DECIMAL(4,1),
  grading_company TEXT,
  notes TEXT,
  acquired_date DATE,
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 價格紀錄
CREATE TABLE IF NOT EXISTS price_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE NOT NULL,
  reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  price INTEGER NOT NULL,
  currency TEXT DEFAULT 'TWD',
  condition TEXT DEFAULT 'NM',
  source_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== 自動建立用戶 Profile =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'user_name', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== RLS 安全規則 =====
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "公開讀取" ON profiles FOR SELECT USING (TRUE);
CREATE POLICY "本人可編輯" ON profiles FOR UPDATE USING (auth.uid() = id);

-- posts
CREATE POLICY "公開讀取未刪除" ON posts FOR SELECT USING (is_deleted = FALSE);
CREATE POLICY "登入可發文" ON posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "本人可編輯" ON posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "管理員可刪除" ON posts FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
);

-- comments
CREATE POLICY "公開讀取" ON comments FOR SELECT USING (is_deleted = FALSE);
CREATE POLICY "登入可留言" ON comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "本人可編輯" ON comments FOR UPDATE USING (auth.uid() = author_id);

-- collections
CREATE POLICY "公開可見" ON collections FOR SELECT USING (visibility = 'public' OR auth.uid() = user_id);
CREATE POLICY "本人可管理" ON collections FOR ALL USING (auth.uid() = user_id);

-- votes
CREATE POLICY "本人可投票" ON votes FOR ALL USING (auth.uid() = user_id);

-- cards
CREATE POLICY "公開讀取" ON cards FOR SELECT USING (is_active = TRUE);
CREATE POLICY "管理員可編輯" ON cards FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- price_reports
CREATE POLICY "公開讀取" ON price_reports FOR SELECT USING (TRUE);
CREATE POLICY "登入可回報" ON price_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- ===== 測試卡牌資料 =====
INSERT INTO cards (name, name_en, game, card_type, set_name, rarity, description) VALUES
('黑蓮花', 'Black Lotus', 'MTG', 'tcg', 'Alpha Edition', '特稀有', '魔法風雲會最稀有的卡牌之一'),
('超夢', 'Mewtwo', '寶可夢', 'tcg', '基礎版 第一彈', '全圖閃卡', '1996年第一彈基礎版全圖超夢'),
('青眼白龍', 'Blue-Eyes White Dragon', '遊戲王', 'tcg', '初期版', '超稀有', '初代遊戲王最具代表性的卡牌'),
('LeBron James RC', 'LeBron James Rookie Card', 'NBA', 'sports', '2003-04 Topps Chrome', 'Refractor', 'LeBron James 2003年新秀卡'),
('大谷翔平 RC', 'Shohei Ohtani Rookie', 'MLB', 'sports', '2018 Bowman Chrome', 'Prospect Auto', '大谷翔平新秀簽名卡')
ON CONFLICT DO NOTHING;
