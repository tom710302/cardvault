"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Eye, Send, Trash2, ChevronDown, Edit2, X } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const typeColor: Record<string, string> = {
  discussion: "text-blue-400 bg-blue-900/30",
  showcase: "text-purple-400 bg-purple-900/30",
  price_check: "text-yellow-400 bg-yellow-900/30",
  news: "text-green-400 bg-green-900/30",
};
const typeLabel: Record<string, string> = {
  discussion: "🗣️ 討論", showcase: "📸 展示", price_check: "💰 價格詢問", news: "📰 資訊",
};

interface Comment {
  id: string; content: string; upvotes: number; created_at: string; parent_id: string | null;
  profiles: { id: string; username: string; avatar_url: string | null; reputation: number } | null;
}
interface Post {
  id: string; title: string; content: string; board: string; post_type: string;
  upvotes: number; view_count: number; created_at: string; author_id: string;
  image_urls: string[] | null;
  profiles: { id: string; username: string; avatar_url: string | null; reputation: number; role: string } | null;
}

export default function PostDetailPage({ params }: { params: { id: string } }) {
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userVote, setUserVote] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    fetchPost();
    fetchComments();
  }, [params.id]);

  async function fetchPost() {
    const res = await fetch(`/api/posts/${params.id}`);
    if (res.ok) { const { post } = await res.json(); setPost(post); }
    setLoading(false);
  }

  async function fetchComments() {
    const res = await fetch(`/api/comments?post_id=${params.id}`);
    if (res.ok) { const { comments } = await res.json(); setComments(comments ?? []); }
  }

  async function handleVote(value: 1 | -1) {
    if (!user) { window.location.href = "/auth/login"; return; }
    const res = await fetch("/api/votes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_id: params.id, target_type: "post", value }),
    });
    if (res.ok) {
      const { action } = await res.json();
      setUserVote(action === "removed" ? 0 : value);
      setPost(p => p ? { ...p, upvotes: p.upvotes + (action === "removed" ? -value : value) } : p);
    }
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/posts/${params.id}/edit`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle, content: editContent }),
    });
    if (res.ok) { setEditing(false); fetchPost(); }
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { window.location.href = "/auth/login"; return; }
    if (!newComment.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_id: params.id, content: newComment, parent_id: replyTo }),
    });
    if (res.ok) {
      setNewComment(""); setReplyTo(null);
      fetchComments();
    }
    setSubmitting(false);
  }

  async function deleteComment(id: string) {
    if (!confirm("確定刪除？")) return;
    await fetch("/api/comments", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    fetchComments();
  }

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
      {Array(3).fill(0).map((_, i) => <div key={i} className="glass rounded-xl h-24 shimmer" />)}
    </div>
  );

  if (!post) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-500">
      <p className="text-lg">找不到這篇文章</p>
      <Link href="/community" className="btn-primary mt-4 inline-flex">回到社群</Link>
    </div>
  );

  const topComments = comments.filter(c => !c.parent_id);
  const getReplies = (id: string) => comments.filter(c => c.parent_id === id);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <Link href="/community" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">
        <ArrowLeft className="w-4 h-4" /> 返回社群討論
      </Link>

      {/* Post */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex gap-4">
          {/* Vote */}
          <div className="flex flex-col items-center gap-1 shrink-0 pt-1">
            <button onClick={() => handleVote(1)}
              className={`text-2xl leading-none transition-colors ${userVote === 1 ? "text-brand-400" : "text-gray-600 hover:text-brand-400"}`}>▲</button>
            <span className="text-lg font-bold text-gray-200">{post.upvotes}</span>
            <button onClick={() => handleVote(-1)}
              className={`text-2xl leading-none transition-colors ${userVote === -1 ? "text-red-400" : "text-gray-600 hover:text-red-400"}`}>▼</button>
          </div>

          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`badge text-xs ${typeColor[post.post_type] ?? "text-gray-400 bg-gray-800"}`}>{typeLabel[post.post_type]}</span>
              <span className="badge text-xs bg-gray-800 text-gray-400">{post.board}</span>
            </div>
            {editing ? (
              <form onSubmit={saveEdit} className="space-y-3">
                <input value={editTitle} onChange={e => setEditTitle(e.target.value)} required
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-lg font-bold text-white outline-none focus:ring-2 focus:ring-brand-500" />
                <textarea value={editContent} onChange={e => setEditContent(e.target.value)} required rows={6}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary text-sm px-4 py-2">儲存</button>
                  <button type="button" onClick={() => setEditing(false)} className="btn-secondary text-sm px-4 py-2">取消</button>
                </div>
              </form>
            ) : (
              <h1 className="text-2xl font-bold text-white leading-snug">{post.title}</h1>
            )}
            <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
              {user?.id === post.author_id && !editing && (
                <button onClick={() => { setEditing(true); setEditTitle(post.title); setEditContent(post.content); }}
                  className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300">
                  <Edit2 className="w-3 h-3" /> 編輯文章
                </button>
              )}
              <Link href={`/users/${post.profiles?.id}`} className="flex items-center gap-2 hover:text-gray-300 transition-colors">
                <div className="w-7 h-7 rounded-full bg-brand-700 flex items-center justify-center text-white text-xs font-bold">
                  {post.profiles?.username?.[0]?.toUpperCase() ?? "?"}
                </div>
                <span>{post.profiles?.username}</span>
                <span className="text-gray-600">{post.profiles?.reputation} 聲望</span>
              </Link>
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {post.view_count}</span>
              <span>{timeAgo(new Date(post.created_at))}</span>
            </div>
            {!editing && (
              <div className="space-y-4">
                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                {post.image_urls && post.image_urls.length > 0 && (
                  <div className={`grid gap-2 ${post.image_urls.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                    {post.image_urls.map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer"
                        className="rounded-xl overflow-hidden block aspect-video hover:opacity-90 transition-opacity">
                        <img src={url} alt={`附圖 ${i + 1}`} className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comments */}
      <div className="space-y-4">
        <h2 className="font-semibold text-white flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-brand-400" /> {comments.length} 則留言
        </h2>

        {/* Comment Form */}
        <div className="glass rounded-xl p-4">
          {user ? (
            <form onSubmit={submitComment} className="space-y-3">
              {replyTo && (
                <div className="flex items-center gap-2 text-xs text-brand-400 bg-brand-900/20 px-3 py-1.5 rounded-lg">
                  <span>回覆留言</span>
                  <button type="button" onClick={() => setReplyTo(null)} className="ml-auto text-gray-500 hover:text-white"><ArrowLeft className="w-3 h-3" /></button>
                </div>
              )}
              <textarea value={newComment} onChange={e => setNewComment(e.target.value)}
                placeholder="留下你的想法..." rows={3} required
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
              <div className="flex justify-end">
                <button type="submit" disabled={submitting || !newComment.trim()}
                  className="btn-primary text-sm px-4 py-2 flex items-center gap-2 disabled:opacity-50">
                  <Send className="w-3.5 h-3.5" /> {submitting ? "送出中..." : "送出留言"}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-3">
              <Link href="/auth/login" className="btn-primary text-sm">登入後留言</Link>
            </div>
          )}
        </div>

        {/* Comment List */}
        {topComments.map(comment => (
          <div key={comment.id} className="space-y-2">
            <div className="glass rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-brand-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {comment.profiles?.username?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <span className="text-sm font-medium text-gray-300">{comment.profiles?.username}</span>
                  <span className="text-xs text-gray-600">{timeAgo(new Date(comment.created_at))}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setReplyTo(comment.id)}
                    className="text-xs text-gray-500 hover:text-brand-400 transition-colors flex items-center gap-1">
                    <ChevronDown className="w-3 h-3" /> 回覆
                  </button>
                  {(user?.id === comment.profiles?.id) && (
                    <button onClick={() => deleteComment(comment.id)}
                      className="text-xs text-gray-600 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap pl-9">{comment.content}</p>
            </div>

            {/* Replies */}
            {getReplies(comment.id).map(reply => (
              <div key={reply.id} className="glass rounded-xl p-3 ml-8 border-l-2 border-brand-700/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-brand-800 flex items-center justify-center text-white text-[10px] font-bold">
                      {reply.profiles?.username?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <span className="text-xs font-medium text-gray-400">{reply.profiles?.username}</span>
                    <span className="text-xs text-gray-600">{timeAgo(new Date(reply.created_at))}</span>
                  </div>
                  {user?.id === reply.profiles?.id && (
                    <button onClick={() => deleteComment(reply.id)} className="text-xs text-gray-600 hover:text-red-400">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-400 leading-relaxed pl-8">{reply.content}</p>
              </div>
            ))}

            {replyTo === comment.id && (
              <form onSubmit={submitComment} className="ml-8 glass rounded-xl p-3 space-y-2">
                <textarea value={newComment} onChange={e => setNewComment(e.target.value)}
                  placeholder={`回覆 ${comment.profiles?.username}...`} rows={2} required
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setReplyTo(null)} className="text-xs text-gray-500 hover:text-gray-300">取消</button>
                  <button type="submit" disabled={submitting} className="btn-primary text-xs px-3 py-1.5">送出</button>
                </div>
              </form>
            )}
          </div>
        ))}

        {comments.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">還沒有留言，來留下第一則吧！</div>
        )}
      </div>
    </div>
  );
}
