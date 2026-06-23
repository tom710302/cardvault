import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";

const FROM = process.env.EMAIL_FROM ?? "CardSearch <onboarding@resend.dev>";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cardvault-beta.vercel.app";

let resend: Resend | null = null;
function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const client = getResend();
  if (!client) { console.warn("[email] RESEND_API_KEY not set, skipping email:", subject); return; }
  try {
    await client.emails.send({ from: FROM, to, subject, html });
  } catch (err) {
    console.error("[email] send failed:", err);
  }
}

export async function getUserEmail(admin: SupabaseClient, userId: string): Promise<string | null> {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data?.user?.email) return null;
  return data.user.email;
}

export async function checkEmailPref(
  admin: SupabaseClient,
  userId: string,
  type: "trade_offer" | "comment_reply" | "trade_match"
): Promise<boolean> {
  const { data } = await admin
    .from("notification_preferences")
    .select(`email_${type}`)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return true;
  return (data as any)[`email_${type}`] ?? true;
}

function wrapper(bodyHtml: string, ctaLabel: string, ctaHref: string) {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1f2937;">
      <p style="font-size: 15px; line-height: 1.6;">${bodyHtml}</p>
      <a href="${siteUrl}${ctaHref}" style="display: inline-block; margin-top: 16px; padding: 10px 20px; background: #5c6aff; color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">${ctaLabel}</a>
      <p style="font-size: 12px; color: #9ca3af; margin-top: 32px;">Cardreasch — TCG 與球員卡收藏交流平台</p>
    </div>
  `;
}

export function tradeOfferEmail(fromName: string) {
  return wrapper(`<strong>${fromName}</strong> 向你提出了換卡邀請，快去看看吧！`, "查看換卡邀請", "/trade/offers");
}

export function commentReplyEmail(replierName: string, excerpt: string, postId: string) {
  return wrapper(`<strong>${replierName}</strong> 回覆了你：「${excerpt}」`, "查看留言", `/community/${postId}`);
}

export function matchFoundEmail(otherName: string, cardName: string) {
  return wrapper(`你和 <strong>${otherName}</strong> 在「${cardName}」上配對成功了！可能可以互相交換。`, "查看配對", "/trade/matches");
}
