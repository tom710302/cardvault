import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail, getUserEmail, commentReplyEmail, checkEmailPref } from "@/lib/email";
import { notifyUser } from "@/lib/notify";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get("post_id");
  if (!postId) return NextResponse.json({ error: "缺少 post_id" }, { status: 400 });

  const { data, error } = await supabase
    .from("comments")
    .select(`*, profiles(id, username, display_name, avatar_url, reputation)`)
    .eq("post_id", postId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comments: data });
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const { post_id, content, parent_id } = await request.json();
  if (!post_id || !content) return NextResponse.json({ error: "缺少必填欄位" }, { status: 400 });

  const { data, error } = await supabase
    .from("comments")
    .insert({ post_id, content, author_id: user.id, parent_id: parent_id ?? null })
    .select(`*, profiles(id, username, display_name, avatar_url)`)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 更新發文者聲望
  await supabase.rpc("increment_reputation", { user_id: user.id, amount: 1 }).maybeSingle();

  // Email 通知（回覆對象：留言的父留言作者，或文章作者）
  const admin = createAdminClient();
  const recipientId = parent_id
    ? (await admin.from("comments").select("author_id").eq("id", parent_id).single()).data?.author_id
    : (await admin.from("posts").select("author_id").eq("id", post_id).single()).data?.author_id;

  if (recipientId && recipientId !== user.id) {
    const replierName = data.profiles?.display_name || data.profiles?.username || "有人";
    const excerpt = content.length > 60 ? `${content.slice(0, 60)}...` : content;
    const notifTitle = parent_id ? `${replierName} 回覆了你的留言` : `${replierName} 在你的貼文留言`;
    await Promise.all([
      notifyUser({ userId: recipientId, type: "comment_reply", title: notifTitle, body: excerpt, link: `/community/${post_id}` }),
      getUserEmail(admin, recipientId).then(async email => {
        if (!email) return;
        const canEmail = await checkEmailPref(admin, recipientId, "comment_reply");
        if (canEmail) return sendEmail({ to: email, subject: notifTitle, html: commentReplyEmail(replierName, excerpt, post_id) });
      }),
    ]);
  }

  return NextResponse.json({ comment: data }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const { id } = await request.json();
  const { data: comment } = await supabase.from("comments").select("author_id").eq("id", id).single();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (comment?.author_id !== user.id && !["admin", "moderator"].includes(profile?.role ?? "")) {
    return NextResponse.json({ error: "無權限" }, { status: 403 });
  }
  await supabase.from("comments").update({ is_deleted: true }).eq("id", id);
  return NextResponse.json({ success: true });
}
