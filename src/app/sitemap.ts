import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/server";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cardvault-beta.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const admin = createAdminClient();

  const [cardsRes, storesRes, postsRes] = await Promise.all([
    admin.from("cards").select("id, created_at").eq("is_active", true).order("created_at", { ascending: false }).limit(1000),
    admin.from("stores").select("id, created_at").order("created_at", { ascending: false }).limit(500),
    admin.from("posts").select("id, created_at").eq("is_deleted", false).order("created_at", { ascending: false }).limit(500),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/cards`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/community`, changeFrequency: "daily", priority: 0.8 },
    { url: `${siteUrl}/search`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${siteUrl}/trade`, changeFrequency: "daily", priority: 0.7 },
  ];

  const cardRoutes: MetadataRoute.Sitemap = (cardsRes.data ?? []).map(c => ({
    url: `${siteUrl}/cards/${c.id}`,
    lastModified: c.created_at,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const storeRoutes: MetadataRoute.Sitemap = (storesRes.data ?? []).map(s => ({
    url: `${siteUrl}/stores/${s.id}`,
    lastModified: s.created_at,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const postRoutes: MetadataRoute.Sitemap = (postsRes.data ?? []).map(p => ({
    url: `${siteUrl}/community/${p.id}`,
    lastModified: p.created_at,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...staticRoutes, ...cardRoutes, ...storeRoutes, ...postRoutes];
}
