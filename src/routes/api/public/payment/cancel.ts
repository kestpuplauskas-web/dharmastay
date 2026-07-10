import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { readSwedbankConfig, verifyMac } from "@/lib/swedbank-banklink.server";

async function parseIncoming(request: Request): Promise<Record<string, string>> {
  const ct = request.headers.get("content-type") || "";
  if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
    const fd = await request.formData();
    const out: Record<string, string> = {};
    fd.forEach((v, k) => {
      out[k] = typeof v === "string" ? v : "";
    });
    return out;
  }
  const url = new URL(request.url);
  const out: Record<string, string> = {};
  url.searchParams.forEach((v, k) => (out[k] = v));
  return out;
}

async function handle(request: Request): Promise<Response> {
  const fields = await parseIncoming(request);
  const cfg = readSwedbankConfig();
  const macOk = cfg ? verifyMac(fields, cfg.publicKey, cfg.algorithm) : false;

  const ref = fields.VK_REF || "";
  const stamp = fields.VK_STAMP || "";
  let bookingId: string | null = null;

  if (ref) {
    const { data } = await supabaseAdmin.from("bookings").select("id").eq("booking_number", ref).maybeSingle();
    if (data) bookingId = data.id;
  }
  if (!bookingId && stamp) {
    const { data } = await supabaseAdmin
      .from("bookings")
      .select("id")
      .eq("payment_reference", stamp)
      .maybeSingle();
    if (data) bookingId = data.id;
  }

  if (bookingId) {
    await supabaseAdmin.from("payment_transactions").insert({
      booking_id: bookingId,
      stamp: stamp || "unknown",
      amount: Number(fields.VK_AMOUNT || 0),
      currency: fields.VK_CURR || "EUR",
      service_code: fields.VK_SERVICE || "1902",
      status: "cancelled",
      raw_response: fields,
      mac_valid: macOk,
    });
    if (macOk) {
      await supabaseAdmin
        .from("bookings")
        .update({ payment_status: "cancelled", status: "cancelled" })
        .eq("id", bookingId);
    }
  }

  const html = `<!doctype html><html lang="lt"><head><meta charset="utf-8"/>
<title>Mokėjimas atšauktas</title>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>body{font-family:system-ui,sans-serif;margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#fafafa;color:#111}.card{background:#fff;border:1px solid #eee;border-radius:12px;padding:32px;max-width:480px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.04)}.dot{width:56px;height:56px;border-radius:50%;background:#eab308;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px;font-weight:700}a.btn{display:inline-block;margin-top:20px;padding:10px 20px;background:#111;color:#fff;border-radius:8px;text-decoration:none}</style>
</head><body><div class="card"><div class="dot">!</div>
<h1 style="margin:0 0 8px;font-size:22px;">Mokėjimas atšauktas</h1>
<p style="color:#555;margin:0 0 4px;">Rezervacija neišsaugota. Galite pabandyti dar kartą.</p>
<a class="btn" href="/">Grįžti į pradžią</a>
</div></body></html>`;
  return new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

export const Route = createFileRoute("/api/public/payment/cancel")({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});
