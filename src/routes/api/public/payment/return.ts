import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  getTransactionStatus,
  isFinalFailure,
  isSuccessStatus,
  readSwedbankPiConfig,
  type TransactionStatus,
} from "@/lib/swedbank-pi.server";

const esc = (s: string) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

const ADMIN_EMAIL = "info@rentivo.lt";
const FROM = "Rentivo <info@rentivo.lt>";

async function sendEmail(payload: { to: string; subject: string; html: string; replyTo?: string }) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  if (!lovableKey || !resendKey) return;
  try {
    await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": resendKey,
      },
      body: JSON.stringify({
        from: FROM,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        ...(payload.replyTo ? { reply_to: payload.replyTo } : {}),
      }),
    });
  } catch (e) {
    console.error("[payment/return] email failed", e);
  }
}

async function sendPaidEmails(bookingId: string) {
  const { data: b } = await supabaseAdmin
    .from("bookings")
    .select("*, cars(name)")
    .eq("id", bookingId)
    .maybeSingle();
  if (!b) return;
  const carName = (b as unknown as { cars?: { name?: string } }).cars?.name ?? "Automobilis";
  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 12px;color:#666;border-bottom:1px solid #eee;">${esc(label)}</td><td style="padding:6px 12px;font-weight:500;border-bottom:1px solid #eee;">${esc(value)}</td></tr>`;
  const summary = `
${row("Rezervacijos Nr.", String(b.booking_number || bookingId.slice(0, 8)))}
${row("Automobilis", carName)}
${row("Paėmimo vieta", b.pickup_location || "—")}
${row("Grąžinimo vieta", b.return_location || "—")}
${row("Nuo", `${b.date_from} ${b.pickup_time || ""}`.trim())}
${row("Iki", `${b.date_to} ${b.return_time || ""}`.trim())}
${row("Bendra suma", `${Number(b.total_amount || 0).toFixed(2)} €`)}
${row("Sumokėta", `${Number(b.payment_amount || 0).toFixed(2)} €`)}
${row("Likusi mokėtina suma (sumokama atsiimant automobilį)", `${Math.max(0, Number(b.total_amount || 0) - Number(b.payment_amount || 0)).toFixed(2)} €`)}
${row("Mokėjimo tipas", b.payment_option === "deposit" ? "Avansas" : "Visa suma")}
`;
  const adminHtml = `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#111;"><h2>Naujas apmokėtas užsakymas — ${esc(carName)}</h2><table style="border-collapse:collapse;width:100%;max-width:640px;">${summary}${row("Vardas, Pavardė", b.customer_name || "")}${row("El. paštas", b.customer_email || "")}${row("Telefonas", b.customer_phone || "")}${row("Adresas", b.customer_address || "")}</table></body></html>`;
  const clientHtml = `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#111;max-width:640px;margin:0 auto;padding:20px;"><h2>Ačiū už mokėjimą, ${esc(String(b.customer_name || "").split(" ")[0])}!</h2><p>Gavome jūsų mokėjimą ir rezervacija patvirtinta.</p><table style="border-collapse:collapse;width:100%;">${summary}</table></body></html>`;
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `Apmokėta rezervacija — ${carName} (${b.date_from}–${b.date_to})`,
    html: adminHtml,
    replyTo: b.customer_email || undefined,
  });
  if (b.customer_email) {
    await sendEmail({
      to: b.customer_email,
      subject: `Rezervacija patvirtinta — ${carName}`,
      html: clientHtml,
      replyTo: ADMIN_EMAIL,
    });
  }
}

/**
 * Idempotentiškai atnaujina rezervaciją pagal Swedbank statusą.
 * Jei jau `paid` — nedaro nieko.
 */
export async function reconcileBookingStatus(bookingId: string, status: TransactionStatus, raw: unknown) {
  const { data: b } = await supabaseAdmin
    .from("bookings")
    .select("id, payment_status")
    .eq("id", bookingId)
    .maybeSingle();
  if (!b) return;

  await supabaseAdmin.from("payment_transactions").insert({
    booking_id: bookingId,
    stamp: `status-${Date.now()}`,
    amount: 0,
    currency: "EUR",
    service_code: `V3_STATUS_${status}`,
    status: isSuccessStatus(status) ? "success" : isFinalFailure(status) ? "failed" : "pending",
    raw_response: raw as never,
    mac_valid: true,
  });

  if (b.payment_status === "paid") return;

  if (isSuccessStatus(status)) {
    await supabaseAdmin
      .from("bookings")
      .update({
        payment_status: "paid",
        payment_paid_at: new Date().toISOString(),
        status: "confirmed",
      })
      .eq("id", bookingId);
    await sendPaidEmails(bookingId);
  } else if (isFinalFailure(status)) {
    await supabaseAdmin
      .from("bookings")
      .update({ payment_status: "failed", status: "cancelled" })
      .eq("id", bookingId);
  }
}

function htmlResult(kind: "success" | "failed" | "pending" | "error", title: string, message: string, extra = ""): Response {
  const color =
    kind === "success" ? "#16a34a" : kind === "failed" ? "#dc2626" : kind === "pending" ? "#3b82f6" : "#eab308";
  const glyph = kind === "success" ? "✓" : kind === "failed" ? "✕" : kind === "pending" ? "…" : "!";
  return new Response(
    `<!doctype html><html lang="lt"><head><meta charset="utf-8"/>
<title>${esc(title)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>body{font-family:system-ui,sans-serif;margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#fafafa;color:#111}.card{background:#fff;border:1px solid #eee;border-radius:12px;padding:32px;max-width:480px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.04)}.dot{width:56px;height:56px;border-radius:50%;background:${color};margin:0 auto 16px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px;font-weight:700}a.btn{display:inline-block;margin-top:20px;padding:10px 20px;background:#111;color:#fff;border-radius:8px;text-decoration:none}</style>
</head><body><div class="card">
<div class="dot">${glyph}</div>
<h1 style="margin:0 0 8px;font-size:22px;">${esc(title)}</h1>
<p style="color:#555;margin:0 0 4px;">${esc(message)}</p>
${extra ? `<p style="color:#999;font-size:13px;margin:8px 0 0;">${esc(extra)}</p>` : ""}
<a class="btn" href="/">Grįžti į pradžią</a>
</div></body></html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
}

async function handle(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const bookingId = url.searchParams.get("bookingId") || "";
  if (!bookingId) return htmlResult("error", "Įvyko klaida", "Trūksta rezervacijos identifikatoriaus.");

  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("id, booking_number, payment_reference, payment_status")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return htmlResult("error", "Įvyko klaida", "Rezervacija nerasta.");

  const ref = booking.booking_number || bookingId.slice(0, 8);

  if (booking.payment_status === "paid") {
    return htmlResult("success", "Ačiū! Mokėjimas gautas", "Rezervacija patvirtinta. Netrukus išsiųsime el. laišką.", `Rezervacijos Nr. ${ref}`);
  }

  const transactionId = booking.payment_reference;
  const cfg = readSwedbankPiConfig();
  if (!transactionId || !cfg) {
    return htmlResult("error", "Įvyko klaida", "Nepavyko patikrinti mokėjimo būsenos.");
  }

  try {
    const { status, raw } = await getTransactionStatus(cfg, transactionId);
    await reconcileBookingStatus(bookingId, status, raw);
    if (isSuccessStatus(status)) {
      return htmlResult("success", "Ačiū! Mokėjimas gautas", "Rezervacija patvirtinta. Netrukus išsiųsime el. laišką.", `Rezervacijos Nr. ${ref}`);
    }
    if (isFinalFailure(status)) {
      return htmlResult("failed", "Mokėjimas nepavyko", "Mokėjimas atšauktas arba nepavyko. Galite pabandyti dar kartą.", `Rezervacijos Nr. ${ref}`);
    }
    return htmlResult("pending", "Mokėjimas apdorojamas", "Bankas dar tvirtina mokėjimą. Šis puslapis atsinaujins netrukus.", `Rezervacijos Nr. ${ref}`);
  } catch (e) {
    console.error("[payment/return] status check failed", e);
    return htmlResult("error", "Įvyko klaida", "Nepavyko patikrinti mokėjimo būsenos. Susisiekite su administracija.");
  }
}

export const Route = createFileRoute("/api/public/payment/return")({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});
