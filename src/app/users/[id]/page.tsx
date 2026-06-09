"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Package, MessageSquare, Star, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice, timeAgo } from "@/lib/utils";

interface Profile {
  id: string; username: string; display_name: string; avatar_url: string | null;
  bio: string | null; role: string; reputation: number; created_at: string;
}

export default function UserProfilePage({ params }: { params: { id: string } }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [tab, setTab] = useState<"posts" | "collection">("posts");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: p } = await supabase.from("profiles").select("*").eq("id", params.id).single();
      setProfile(p);

      const { data: po } = await supabase.from("posts").select("id, title, board, post_type, upvotes, view_count, created_at")
        .eq("author_id", params.id).eq("is_deleted", false).order("created_at", { ascending: false }).limit(20);
      setPosts(po ?? []);

      const { data: co } = await supabase.from("collections")
        .select("*, cards(name, game, rarity)").eq("user_id", params.id)
        .eq("visibility", "public").limit(20);
      setCollections(co ?? []);

      setLoading(false);
    }
    load();
  }, [params.id]);

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
      {Array(3).fill(0).map((_, i) => <div key={i} className="glass rounded-xl h-20 shimmer" />)}
    </div>
  );

  if (!profile) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-500">
      <p>找不到此用戶</p>
      <Link href="/" className="btn-secondary mt-4 inline-flex text-sm">回首頁</Link>
    </div>
  );

  const typeColor: Record<string, string> = {
    discussion: "text-blue-400 bg-blue-900/30", showcase: "text-purple-400 bg-purple-900/30",
    price_check: "text-yellow-400 bg-yellow-900/30", news: "text-green-400 bg-green-900/30",
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <Link href="/community" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200">
        <ArrowLeft className="w-4 h-4" /> 返回
      </Link>

      {/* Profile Header */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-2xl bg-brand-700 flex items-center justify-center text-white text-3xl font-bold shrink-0">
            {profile.username?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-white">{profile.display_name || profile.username}</h1>
              <span className="text-gray-400 text-sm">@{profile.username}</span>
              {profile.role !== "user" && (
                <span className={`badge text-xs ${profile.role === "admin" ? "text-red-400 bg-red-900/30" : "text-yellow-400 bg-yellow-900/30"}`}>
                  {profile.role}
                </span>
              )}
            </div>
            {profile.bio && <p className="text-gray-400 text-sm">{profile.bio}</p>}
            <div className="flex gap-4 text-sm text-gray-500 flex-wrap">
              <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-yellow-400" /> {profile.reputation.toLocaleString()} 聲望</span>
              <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5 text-brand-400" /> {collections.length} 張公開收藏</span>
              <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5 text-green-400" /> {posts.length} 篇文章</span>
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(profile.created_at).toLocaleDateString("zh-TW")} 加入</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/10">
        {([["posts", `📝 文章（${posts.length}）`], ["collection", `📦 收藏（${collections.length}）`]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === id ? "border-brand-500 text-brand-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "posts" && (
        <div className="space-y-3">
          {posts.length === 0 ? (
            <div className="text-center py-10 text-gray-500 text-sm">還沒有發過文章</div>
          ) : posts.map(post => (
            <Link key={post.id} href={`/community/${post.id}`}
              className="glass rounded-xl p-4 flex gap-3 card-hover group block">
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className={`badge text-xs ${typeColor[post.post_type] ?? "text-gray-400 bg-gray-800"}`}>{post.post_type}</span>
                  <span className="badge text-xs bg-gray-800 text-gray-400">{post.board}</span>
                </div>
                <h3 className="font-medium text-gray-200 group-hover:text-white transition-colors">{post.title}</h3>
                <div className="flex gap-3 text-xs text-gray-500">
                  <span>▲ {post.upvotes}</span>
                  <span>👁 {post.view_count}</span>
                  <span>{timeAgo(new Date(post.created_at))}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {tab === "collection" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {collections.length === 0 ? (
            <div className="col-span-full text-center py-10 text-gray-500 text-sm">沒有公開的收藏</div>
          ) : collections.map(item => (
            <div key={item.id} className="glass rounded-xl p-3 space-y-1.5">
              <div className="w-full aspect-square bg-gray-800 rounded-lg flex items-center justify-center text-4xl">🃏</div>
              <div className="text-xs font-medium text-gray-200 truncate">{item.cards?.name}</div>
              <div className="text-[10px] text-gray-500">{item.cards?.game} · {item.condition}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
