"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Eye, Send, Trash2, ChevronDown, Edit2, X, ImageIcon, Bookmark, Flag } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

function renderContent(text: string) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (!m) return <span key={i}>{part}</span>;
    const [, label, href] = m;
    return href.startsWith("/")
      ? <Link key={i} href={href} className="text-brand-400 hover:text-brand-300 underline underline-offset-2">{label}</Link>
      : <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300 underline underline-offset-2">{label}</a>;
  });
}

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
  tags: string[] | null;
  profiles: { id: string; username: string; avatar_url: string | null; reputation: number; role: string } | null;
}

export default function PostDetailClient({ id }: { id: string }) {
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
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reporting, setReporting] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const toast = useToast();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        fetch("/api/post-bookmarks")
          .then(r => r.json())
          .then(({ bookmarks }) => {
            setIsBookmarked((bookmarks ?? []).some((b: any) => b.post_id === id));
          })
          .catch(() => {});
      }
    });
    fetchPost();
    fetchComments();
  }, [id]);

  async function fetchPost() {
    const res = await fetch(`/api/posts/${id}`);
    if (res.ok) { const { post } = await res.json(); setPost(post); }
    setLoading(false);
  }

  async function fetchComments() {
    const res = await fetch(`/api/comments?post_id=${id}`);
    if (res.ok) { const { comments } = await res.json(); setComments(comments ?? []); }
  }

  async function handleVote(value: 1 | -1) {
    if (!user) { window.location.href = "/auth/login"; return; }
    const res = await fetch("/api/votes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_id: id, target_type: "post", value }),
    });
    if (res.ok) {
      const { action } = await res.json();
      setUserVote(action === "removed" ? 0 : value);
      setPost(p => p ? { ...p, upvotes: p.upvotes + (action === "removed" ? -value : value) } : p);
    }
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/posts/${id}/edit`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle, content: editContent, image_urls: editImages, tags: editTags }),
    });
    if (res.ok) { setEditing(false); fetchPost(); }
  }

  async function toggleBookmark() {
    if (!user) { router.push("/auth/login"); return; }
    setBookmarkLoading(true);
    if (isBookmarked) {
      await fetch("/api/post-bookmarks", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ post_id: id }) });
      setIsBookmarked(false);
      toast.info("已取消收藏");
    } else {
      await fetch("/api/post-bookmarks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ post_id: id }) });
      setIsBookmarked(true);
      toast.success("已收藏文章");
    }
    setBookmarkLoading(false);
  }

  async function submitReport(e: React.FormEvent) {
    e.preventDefault();
    if (!reportReason) { toast.error("請選擇檢舉原因"); return; }
    setReporting(true);
    const res = await fetch(`/api/posts/${id}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reportReason }),
    });
    const body = await res.json();
    if (res.ok) { toast.success("已送出檢舉，感謝回報"); setShowReport(false); setReportReason(""); }
    else if (res.status === 409) toast.info("你已檢舉過此貼文");
    else toast.error(body.error ?? "檢舉失敗");
    setReporting(false);
  }

  async function deletePost() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        window.location.replace("/community");
      } else {
        toast.error("刪除失敗：" + (body.error ?? `HTTP ${res.status}`));
        setDeleting(false);
        setConfirmDelete(false);
      }
    } catch (e) {
      toast.error("網路錯誤，請再試一次");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { window.location.href = "/auth/login"; return; }
    if (!newComment.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_id: id, content: newComment, parent_id: replyTo }),
    });
    if (res.ok) {
      setNewComment(""); setReplyTo(null);
      fetchComments();
    }
    setSubmitting(false);
  }

  async function deleteComment(commentId: string) {
    if (!confirm("確定刪除？")) return;
    await fetch("/api/comments", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: commentId }) });
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
  const getReplies = (parentId: string) => comments.filter(c => c.parent_id === parentId);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <Link href="/community" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">
        <ArrowLeft className="w-4 h-4" /> 返回社群討論
      </Link>

      {/* Report Modal */}
      {showReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="glass rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2"><Flag className="w-4 h-4 text-red-400" /> 檢舉貼文</h2>
              <button onClick={() => setShowReport(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={submitReport} className="space-y-3">
              <div className="space-y-2">
                {["垃圾廣告", "騷擾或仇恨言論", "詐騙或違法內容", "不實資訊", "其他"].map(reason => (
                  <label key={reason} className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${reportReason === reason ? "bg-brand-900/30 text-brand-300" : "hover:bg-white/5 text-gray-300"}`}>
                    <input type="radio" name="reason" value={reason} checked={reportReason === reason} onChange={() => setReportReason(reason)} className="accent-brand-500" />
                    <span className="text-sm">{reason}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-3 justify-end pt-1">
                <button type="button" onClick={() => setShowReport(false)} className="btn-secondary text-sm px-4 py-2">取消</button>
                <button type="submit" disabled={reporting || !reportReason} className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
                  {reporting ? "送出中..." : "送出檢舉"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              {post.tags?.map(tag => (
                <span key={tag} className="badge text-xs bg-brand-900/40 text-brand-400">#{tag}</span>
              ))}
            </div>
            {editing ? (
              <form onSubmit={saveEdit} className="space-y-3">
                <input value={editTitle} onChange={e => setEditTitle(e.target.value)} required
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-lg font-bold text-white outline-none focus:ring-2 focus:ring-brand-500" />
                <textarea value={editContent} onChange={e => setEditContent(e.target.value)} required rows={6}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
                {/* 標籤編輯 */}
                <div>
                  <p className="text-xs text-gray-400 mb-2">標籤（最多 3 個）</p>
                  <div className="flex flex-wrap gap-1.5">
                    {["求購", "出售", "心得", "開箱", "比賽", "教學", "詢問", "新手"].map(tag => (
                      <button key={tag} type="button"
                        onClick={() => setEditTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : prev.length < 3 ? [...prev, tag] : prev)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${editTags.includes(tag) ? "bg-brand-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}>
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
                {/* 圖片編輯 */}
                <div>
                  <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> 圖片（最多 4 張）
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {editImages.map((url, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-white/10">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setEditImages(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {editImages.length < 4 && (
                      <ImageUpload folder="posts" label="+" hint=""
                        className="aspect-square"
                        onUpload={url => setEditImages(prev => [...prev, url])} />
                    )}
                  </div>
                </div>
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
                <>
                  <button onClick={() => { setEditing(true); setEditTitle(post.title); setEditContent(post.content); setEditImages(post.image_urls ?? []); setEditTags(post.tags ?? []); }}
                    className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors">
                    <Edit2 className="w-3 h-3" /> 編輯
                  </button>
                  {!confirmDelete ? (
                    <button onClick={() => setConfirmDelete(true)}
                      className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors">
                      <Trash2 className="w-3 h-3" /> 刪除
                    </button>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs">
                      <span className="text-gray-400">確定刪除？</span>
                      <button onClick={deletePost} disabled={deleting}
                        className="text-red-400 hover:text-red-300 font-medium disabled:opacity-50">
                        {deleting ? "刪除中..." : "確定"}
                      </button>
                      <button onClick={() => setConfirmDelete(false)} className="text-gray-500 hover:text-gray-300">取消</button>
                    </span>
                  )}
                </>
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
              <button onClick={toggleBookmark} disabled={bookmarkLoading}
                className={`flex items-center gap-1 text-xs transition-colors disabled:opacity-50 ${isBookmarked ? "text-brand-400" : "text-gray-500 hover:text-gray-300"}`}>
                <Bookmark className={`w-3 h-3 ${isBookmarked ? "fill-current" : ""}`} />
                {isBookmarked ? "已收藏" : "收藏"}
              </button>
              {user && user.id !== post.author_id && (
                <button onClick={() => setShowReport(true)}
                  className="flex items-center gap-1 text-xs text-gray-600 hover:text-red-400 transition-colors">
                  <Flag className="w-3 h-3" /> 檢舉
                </button>
              )}
            </div>
            {!editing && (
              <div className="space-y-4">
                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{renderContent(post.content)}</p>
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
