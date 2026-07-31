import { createFileRoute } from "@tanstack/react-router";

function unauthorized() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

async function run(request: Request) {
  const secret = process.env.ICAL_SYNC_SECRET;
  if (!secret) {
    return new Response(JSON.stringify({ error: "Not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  const provided =
    request.headers.get("x-ical-sync-secret") ??
    new URL(request.url).searchParams.get("secret") ??
    "";
  if (provided !== secret) return unauthorized();

  try {
    const { syncAllCalendars } = await import("@/lib/ical.server");
    const results = await syncAllCalendars();
    const totals = results.reduce(
      (acc, r) => ({
        created: acc.created + r.created,
        updated: acc.updated + r.updated,
        removed: acc.removed + r.removed,
        failed: acc.failed + (r.error ? 1 : 0),
      }),
      { created: 0, updated: 0, removed: 0, failed: 0 },
    );
    return new Response(JSON.stringify({ ok: true, totals, results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[ical-sync:endpoint]", e);
    return new Response(JSON.stringify({ error: "Sync failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const Route = createFileRoute("/api/public/ical-sync")({
  server: {
    handlers: {
      GET: ({ request }) => run(request),
      POST: ({ request }) => run(request),
    },
  },
});
