// Feature 1: Notifications
// Uses the browser's built-in Notification API. When a tweet contains the
// keyword "cricket" or "science", we pop up a notification with the full
// tweet content — but only if the user has notifications enabled in their
// profile AND has granted the browser permission.

const KEYWORDS = ["cricket", "science"];

export function tweetMatchesNotificationKeywords(content: string): boolean {
  const lower = (content || "").toLowerCase();
  return KEYWORDS.some((keyword) => lower.includes(keyword));
}

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!notificationsSupported()) return "unsupported";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  return Notification.requestPermission();
}

export function showTweetNotification(tweet: any) {
  if (!notificationsSupported()) return;
  if (Notification.permission !== "granted") return;
  const authorName = tweet?.author?.displayName || tweet?.author?.username || "Someone";
  try {
    new Notification(`${authorName} tweeted`, {
      body: tweet?.content || "",
    });
  } catch (err) {
    console.log("Could not show notification:", err);
  }
}
