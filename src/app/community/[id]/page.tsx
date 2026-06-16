import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import PostDetailClient from "./PostDetailClient";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const admin = createAdminClient();
  const { data: post } = await admin
    .from("posts")
    .select("title, content, image_urls")
    .eq("id", params.id)
    .eq("is_deleted", false)
    .single();

  if (!post) return { title: "找不到文章" };

  const description = post.content.length > 120 ? `${post.content.slice(0, 120)}...` : post.content;
  const image = post.image_urls?.[0];

  return {
    title: post.title,
    description,
    openGraph: { title: post.title, description, images: image ? [image] : undefined },
    twitter: { card: "summary_large_image", title: post.title, description, images: image ? [image] : undefined },
  };
}

export default function PostDetailPage({ params }: { params: { id: string } }) {
  return <PostDetailClient id={params.id} />;
}
