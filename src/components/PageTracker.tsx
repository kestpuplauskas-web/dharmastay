import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    const KEY = "rentivo_sid";
    let sid = sessionStorage.getItem(KEY);
    if (!sid) {
      sid =
        (crypto?.randomUUID?.() as string) ??
        Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(KEY, sid);
    }
    return sid;
  } catch {
    return "anon";
  }
}

export function PageTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname.startsWith("/admin")) return;
    const sid = getSessionId();
    const referrer = document.referrer || "";
    fetch("/api/public/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname, session_id: sid, referrer }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
