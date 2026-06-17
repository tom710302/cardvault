import { NextRequest, NextResponse } from "next/server";

// 常見寶可夢中文→英文對照
const ZH_TO_EN: Record<string, string> = {
  // 御三家歷代
  妙蛙種子:"Bulbasaur",妙蛙草:"Ivysaur",妙蛙花:"Venusaur",
  小火龍:"Charmander",火恐龍:"Charmeleon",噴火龍:"Charizard",
  傑尼龜:"Squirtle",卡咪龜:"Wartortle",水箭龜:"Blastoise",
  菊草葉:"Chikorita",月桂葉:"Bayleef",大竺葵:"Meganium",
  火球鼠:"Cyndaquil",火岩鼠:"Quilava",火暴獸:"Typhlosion",
  鱷魚寶:"Totodile",藍鱷:"Croconaw",大力鱷:"Feraligatr",
  木守宮:"Treecko",常春藤:"Grovyle",蜥蜴王:"Sceptile",
  火稚雞:"Torchic",燃燒鳥:"Combusken",火焰雞:"Blaziken",
  水躍魚:"Mudkip",沼躍魚:"Marshtomp",沼王:"Swampert",
  樹靈:"Turtwig",草鉤頭龜:"Grotle",土台龜:"Torterra",
  小猴怪:"Chimchar",猿火猴:"Monferno",烈焰猴:"Infernape",
  波波球:"Piplup",波加曼:"Prinplup",帝王拿:"Empoleon",
  藤藤蛇:"Snivy",青藤蛇:"Servine",藤藤蛇王:"Serperior",
  暖暖豬:"Tepig",壯壯豬:"Pignite",炎武王:"Emboar",
  水水獺:"Oshawott",雙刃鞘:"Dewott",大劍鬼:"Samurott",
  哈力栗:"Chespin",刺球草:"Quilladin",钢铁刺猬:"Chesnaught",
  火狐狸:"Fennekin",妖火紅狐:"Braixen",烈焰狐:"Delphox",
  呱呱泡蛙:"Froakie",呱頭蛙:"Frogadier",大舌頭:"Greninja",
  毛辮草:"Rowlet",挺勝木:"Dartrix",決勝木箭鳥:"Decidueye",
  火斑喵:"Litten",熔岩喵:"Torracat",惡炎虎:"Incineroar",
  球球海獅:"Popplio",花漾海獅:"Brionne",司歌海獅:"Primarina",
  // 高人氣
  皮卡丘:"Pikachu",雷丘:"Raichu",
  伊布:"Eevee",水伊布:"Vaporeon",雷伊布:"Jolteon",火伊布:"Flareon",
  太陽伊布:"Espeon",月亮伊布:"Umbreon",葉伊布:"Leafeon",
  冰伊布:"Glaceon",仙子伊布:"Sylveon",
  超夢:"Mewtwo",夢幻:"Mew",
  快龍:"Dragonite",鯉魚王:"Magikarp",暴鯉龍:"Gyarados",
  胖丁:"Jigglypuff",皮皮:"Clefairy",皮可大師:"Blissey",幸福蛋:"Chansey",
  卡比獸:"Snorlax",喵喵:"Meowth",波斯喵:"Persian",
  小拳石:"Geodude",隆隆石:"Graveler",隆隆岩:"Golem",
  尼多朗:"Nidoran",尼多娜:"Nidorina",尼多后:"Nidoqueen",
  鐵甲蛹:"Kakuna",綠毛蟲:"Caterpie",巴大蝶:"Butterfree",
  烈雀:"Talonflame",閃焰鷹:"Fletchinder",
  路卡利歐:"Lucario",波加曼:"Riolu",
  耿鬼:"Gengar",鬼斯:"Gastly",鬼斯通:"Haunter",
  化石翼龍:"Aerodactyl",
  // 傳說
  洛奇亞:"Lugia",火焰鳥:"Ho-Oh",冰凍鳥:"Articuno",閃電鳥:"Zapdos",
  烈焰鳥:"Moltres",拉帝亞斯:"Latias",拉帝歐斯:"Latios",
  蓋歐卡:"Kyogre",固拉多:"Groudon",烈空坐:"Rayquaza",
  帕路奇亞:"Palkia",帝牙盧卡:"Dialga",騎拉帝納:"Giratina",
  賽爾雷姆:"Zekrom",萊西拉姆:"Reshiram",凱路迪歐:"Keldeo",
  基格爾德:"Zygarde",薩戮諾:"Xerneas",伊裂卡座:"Yveltal",
  夢夢:"Comfey",四季鹿:"Deerling",
};

function translateQuery(q: string): string {
  const lower = q.trim();
  // Check full match first
  for (const [zh, en] of Object.entries(ZH_TO_EN)) {
    if (lower === zh || lower.includes(zh)) return en;
  }
  return q;
}

interface NormalizedCard {
  id: string;
  name: string;
  game: string;
  image_url: string | null;
  set_name: string | null;
  rarity: string | null;
}

async function searchPokemon(q: string): Promise<NormalizedCard[]> {
  const res = await fetch(
    `https://api.pokemontcg.io/v2/cards?q=name:"${encodeURIComponent(q)}*"&pageSize=20&orderBy=name`,
    { headers: { "X-Api-Key": process.env.POKEMON_TCG_API_KEY ?? "" }, next: { revalidate: 60 } }
  );
  if (!res.ok) return [];
  const { data } = await res.json();
  return (data ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    game: "寶可夢",
    image_url: c.images?.small ?? c.images?.large ?? null,
    set_name: c.set?.name ?? null,
    rarity: c.rarity ?? null,
  }));
}

async function searchMTG(q: string): Promise<NormalizedCard[]> {
  const res = await fetch(
    `https://api.scryfall.com/cards/search?q=${encodeURIComponent(q)}&order=name&unique=cards`,
    { next: { revalidate: 60 } }
  );
  if (!res.ok) return [];
  const { data } = await res.json();
  return (data ?? []).slice(0, 20).map((c: any) => ({
    id: c.id,
    name: c.name,
    game: "MTG",
    image_url: c.image_uris?.normal ?? c.card_faces?.[0]?.image_uris?.normal ?? null,
    set_name: c.set_name ?? null,
    rarity: c.rarity ?? null,
  }));
}

async function searchYugioh(q: string): Promise<NormalizedCard[]> {
  const res = await fetch(
    `https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(q)}&num=20&offset=0`,
    { next: { revalidate: 60 } }
  );
  if (!res.ok) return [];
  const { data } = await res.json();
  return (data ?? []).map((c: any) => ({
    id: String(c.id),
    name: c.name,
    game: "遊戲王",
    image_url: c.card_images?.[0]?.image_url_small ?? null,
    set_name: null,
    rarity: c.type ?? null,
  }));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const game = searchParams.get("game") ?? "";

  if (!q || q.length < 1) return NextResponse.json({ cards: [] });

  try {
    let cards: NormalizedCard[] = [];
    if (game === "寶可夢") cards = await searchPokemon(translateQuery(q));
    else if (game === "MTG") cards = await searchMTG(q);
    else if (game === "遊戲王") cards = await searchYugioh(q);
    else cards = [];
    return NextResponse.json({ cards });
  } catch (e) {
    return NextResponse.json({ cards: [], error: "外部 API 查詢失敗" });
  }
}
