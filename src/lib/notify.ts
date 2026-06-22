import { createAdminClient } from "@/lib/supabase/server";

export async function notifyUser({
  userId,
  type,
  title,
  body,
  link,
}: {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
}) {
  try {
    const admin = createAdminClient();
    await admin.from("notifications").insert({
      user_id: userId,
      type,
      title,
      body: body ?? null,
      link: link ?? null,
    });
  } catch {
    // Notifications are non-critical — never let them break the main flow
  }
}
