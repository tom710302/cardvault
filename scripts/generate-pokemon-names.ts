/**
 * 從 PokeAPI 抓取所有寶可夢的繁體中文 → 英文對照表
 * 執行: npx tsx scripts/generate-pokemon-names.ts
 */

import fs from "fs";
import path from "path";

const TOTAL = 1025; // Gen 1–9
const BATCH = 20;

async function fetchSpecies(id: number): Promise<{ zh: string; en: string } | null> {
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
    if (!res.ok) return null;
    const data = await res.json();

    const zhName = data.names.find((n: any) => n.language.name === "zh-hant")?.name ?? null;
    const enName = data.names.find((n: any) => n.language.name === "en")?.name ?? null;

    if (!zhName || !enName) return null;
    return { zh: zhName, en: enName };
  } catch {
    return null;
  }
}

async function main() {
  const map: Record<string, string> = {};
  let done = 0;

  for (let start = 1; start <= TOTAL; start += BATCH) {
    const ids = Array.from({ length: Math.min(BATCH, TOTAL - start + 1) }, (_, i) => start + i);
    const results = await Promise.all(ids.map(fetchSpecies));

    for (const r of results) {
      if (r) map[r.zh] = r.en;
    }

    done += ids.length;
    process.stdout.write(`\r進度: ${done}/${TOTAL}`);
  }

  console.log("\n完成！共 " + Object.keys(map).length + " 筆");

  const outDir = path.join(process.cwd(), "src/data");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "pokemon-names-zh.json"),
    JSON.stringify(map, null, 2),
    "utf-8"
  );
  console.log("已寫入 src/data/pokemon-names-zh.json");
}

main();
