-- 開放所有登入用戶新增卡牌
DROP POLICY IF EXISTS "管理員可編輯" ON cards;

CREATE POLICY "登入可新增" ON cards FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "管理員可編輯" ON cards FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "管理員可刪除" ON cards FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
