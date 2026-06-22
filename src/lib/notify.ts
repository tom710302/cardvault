import { createAdminClient } from "@/lib/supabase/server";
import webpush from "web-push";

const vapidConfigured =
  process.env.VAPID_PRIVATE_KEY &&
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
  process.env.VAPID_EMAIL;

if (vapidConfigured) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
}

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

    // Insert in-app notification
    await admin.from("notifications").insert({
      user_id: userId,
      type,
      title,
      body: body ?? null,
      link: link ?? null,
    });

    // Send Web Push to all user's subscriptions
    if (vapidConfigured) {
      const { data: subs } = await admin
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", userId);

      if (subs?.length) {
        const payload = JSON.stringify({ title, body: body ?? "", link: link ?? "/" });
        const expired: string[] = [];

        await Promise.allSettled(
          subs.map(async (sub) => {
            try {
              await webpush.sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                payload
              );
            } catch (err: any) {
              // 410 Gone = subscription expired, remove it
              if (err?.statusCode === 410) expired.push(sub.endpoint);
            }
          })
        );

        if (expired.length) {
          await admin.from("push_subscriptions").delete().in("endpoint", expired);
        }
      }
    }
  } catch {
    // Notifications are non-critical — never let them break the main flow
  }
}
