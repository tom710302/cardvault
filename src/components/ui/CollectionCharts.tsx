"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";

interface CollectionItem {
  quantity: number;
  condition: string;
  cards: { game: string; rarity: string | null } | null;
}

interface Props {
  items: CollectionItem[];
}

const GAME_COLORS = ["#5c6aff", "#22c55e", "#f59e0b", "#ec4899", "#06b6d4", "#a78bfa", "#f97316"];
const CONDITION_COLORS: Record<string, string> = {
  NM: "#22c55e", LP: "#84cc16", MP: "#f59e0b", HP: "#f97316", DMG: "#ef4444",
};

function getRarityTier(rarity: string | null): string {
  if (!rarity) return "未標示";
  const r = rarity.toLowerCase();
  if (["hyper", "rainbow", "starlight", "prismatic", "gold star"].some(k => r.includes(k))) return "極稀有";
  if (["special art", "special illustration", "secret", "ultra", "mythic", "amazing"].some(k => r.includes(k))) return "高稀有";
  if (["super", "holo", "full art", "illustration rare", "rare"].some(k => r.includes(k))) return "稀有";
  if (["uncommon"].some(k => r.includes(k))) return "非普通";
  if (["common"].some(k => r.includes(k))) return "普通";
  return "其他";
}

const RARITY_ORDER = ["極稀有", "高稀有", "稀有", "非普通", "普通", "其他", "未標示"];
const RARITY_COLORS: Record<string, string> = {
  極稀有: "#fde047", 高稀有: "#c084fc", 稀有: "#60a5fa",
  非普通: "#4ade80", 普通: "#9ca3af", 其他: "#6b7280", 未標示: "#374151",
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm">
      <p className="text-gray-300 font-medium">{label}</p>
      <p className="text-white">{payload[0].value} 張</p>
    </div>
  );
};

export function CollectionCharts({ items }: Props) {
  // Game distribution
  const gameMap: Record<string, number> = {};
  for (const item of items) {
    const game = item.cards?.game || "其他";
    gameMap[game] = (gameMap[game] || 0) + item.quantity;
  }
  const gameData = Object.entries(gameMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  // Condition distribution
  const condMap: Record<string, number> = {};
  for (const item of items) {
    condMap[item.condition] = (condMap[item.condition] || 0) + item.quantity;
  }
  const condData = ["NM", "LP", "MP", "HP", "DMG"]
    .filter(c => condMap[c])
    .map(c => ({ name: c, count: condMap[c] }));

  // Rarity distribution
  const rarityMap: Record<string, number> = {};
  for (const item of items) {
    const tier = getRarityTier(item.cards?.rarity ?? null);
    rarityMap[tier] = (rarityMap[tier] || 0) + item.quantity;
  }
  const rarityData = RARITY_ORDER
    .filter(r => rarityMap[r])
    .map(r => ({ name: r, value: rarityMap[r] }));

  return (
    <div className="glass rounded-xl p-5 space-y-6">
      <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
        <span className="text-brand-400">📊</span> 收藏分析
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 遊戲分佈 */}
        <div>
          <p className="text-xs text-gray-400 mb-3 text-center">遊戲分佈</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={gameData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {gameData.map((_, i) => (
                  <Cell key={i} fill={GAME_COLORS[i % GAME_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 品況分佈 */}
        <div>
          <p className="text-xs text-gray-400 mb-3 text-center">品況分佈</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={condData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {condData.map((d) => (
                  <Cell key={d.name} fill={CONDITION_COLORS[d.name] ?? "#5c6aff"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 稀有度分佈 */}
        <div>
          <p className="text-xs text-gray-400 mb-3 text-center">稀有度分佈</p>
          {rarityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={rarityData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  innerRadius={35} outerRadius={60} paddingAngle={2}>
                  {rarityData.map((d) => (
                    <Cell key={d.name} fill={RARITY_COLORS[d.name] ?? "#6b7280"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: "8px", color: "#f3f4f6", fontSize: "12px" }}
                  formatter={(v: number, name: string) => [`${v} 張`, name]} />
                <Legend iconType="circle" iconSize={8}
                  formatter={(v) => <span style={{ color: "#9ca3af", fontSize: "11px" }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-xs text-gray-600">
              需要連結卡牌資料庫才能顯示
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
