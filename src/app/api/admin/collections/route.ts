import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未授權" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "無權限" }, { status: 403 });

  const { data: rows } = await admin
    .from("collections")
    .select(`
      id, condition, quantity, notes, visibility, created_at,
      custom_name,
      profiles(username, display_name),
      cards(name, name_en, game, set_name, rarity)
    `)
    .order("created_at", { ascending: false });

  if (!rows) return NextResponse.json({ error: "查詢失敗" }, { status: 500 });

  const ESC = (v: string | null | undefined) => {
    if (v == null) return "";
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const headers = ["用戶名稱", "顯示名稱", "卡牌名稱", "英文名稱", "遊戲", "系列", "稀有度", "品相", "數量", "備註", "可見度", "新增日期"];
  const lines = [
    headers.join(","),
    ...rows.map((r: any) => [
      ESC(r.profiles?.username),
      ESC(r.profiles?.display_name),
      ESC(r.cards?.name ?? r.custom_name),
      ESC(r.cards?.name_en),
      ESC(r.cards?.game),
      ESC(r.cards?.set_name),
      ESC(r.cards?.rarity),
      ESC(r.condition),
      ESC(String(r.quantity)),
      ESC(r.notes),
      ESC(r.visibility === "public" ? "公開" : "私人"),
      ESC(new Date(r.created_at).toLocaleDateString("zh-TW")),
    ].join(",")),
  ];

  const csv = "﻿" + lines.join("\r\n"); // BOM for Excel UTF-8
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cardreasch-collections-${date}.csv"`,
    },
  });
}
