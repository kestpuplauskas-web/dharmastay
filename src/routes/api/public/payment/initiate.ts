import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { initiatePayment, readSwedbankPiConfig } from "@/lib/swedbank-pi.server";
import { findBank } from "@/lib/swedbank-bic";

function originFromRequest(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
  const proto = request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "") || "https";
  return `${proto}://${host}`;
}

function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function errorHtml(msg: string, status = 500): Response {
  return new Response(
    `<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;padding:40px;max-width:640px;margin:auto"><h1>Nepavyko pradėti mokėjimo</h1><p>${esc(msg)}</p><p><a href="/">Grįžti į pradžią</a></p></body>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

async function handleInitiate(bookingId: string, bic: string, request: Request): Promise<Response> {
  const cfg = readSwedbankPiConfig();
  if (!cfg) {
    return errorHtml(
      "Mokėjimų sistema nesukonfigūruota (trūksta SWEDBANK_PI_MERCHANT_ID / SWEDBANK_PI_PRIVATE_KEY).",
      503,
    );
  }
  const bank = findBank(bic);
  if (!bank) return errorHtml("Nepasirinktas banko BIC arba jis nepalaikomas.", 400);

  const { data: booking, error } = await supabaseAdmin
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();
  if (error || !booking) return errorHtml("Rezervacija nerasta.", 404);
  if (booking.status !== "pending" || booking.payment_status === "paid") {
    return errorHtml("Rezervacijos mokėti nebegalima.", 400);
  }
  if (booking.expires_at && new Date(booking.expires_at as string) < new Date()) {
    return errorHtml("Rezervacija pasibaigė.", 400);
  }
  const amount = Number(booking.payment_amount || 0);
  if (!(amount > 0)) return errorHtml("Neteisinga mokėjimo suma.", 400);

  const origin = originFromRequest(request);
  const ref = booking.booking_number || bookingId.slice(0, 8);
  const description = `Rezervacija ${ref}`.slice(0, 140);

  try {
    const result = await initiatePayment(cfg, {
      bic,
      amount,
      description,
      redirectUrl: `${origin}/api/public/payment/return?bookingId=${encodeURIComponent(bookingId)}`,
      notificationUrl: `${origin}/api/public/payment/notify`,
      locale: "lt",
    });

    await supabaseAdmin.from("payment_transactions").insert({
      booking_id: bookingId,
      stamp: result.transactionId,
      provider_transaction_id: result.transactionId,
      bic,
      amount,
      currency: "EUR",
      service_code: "V3_INITIATE",
      status: "initiated",
      raw_request: { bic, amount, description },
    });

    await supabaseAdmin
      .from("bookings")
      .update({
        payment_reference: result.transactionId,
        payment_provider: "swedbank_pi_v3",
        payment_status: "pending",
        bic,
      })
      .eq("id", bookingId);

    return new Response(null, {
      status: 302,
      headers: { Location: result.redirectUrl, "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("[payment/initiate] Swedbank error", e);
    return errorHtml(e instanceof Error ? e.message : "Nežinoma klaida");
  }
}

export const Route = createFileRoute("/api/public/payment/initiate")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const bookingId = url.searchParams.get("bookingId") || "";
        const bic = url.searchParams.get("bic") || "";
        if (!bookingId) return new Response("Missing bookingId", { status: 400 });
        if (!bic) return errorHtml("Nepasirinktas bankas.", 400);
        return handleInitiate(bookingId, bic, request);
      },
      POST: async ({ request }) => {
        let body: { bookingId?: string; bic?: string } = {};
        try {
          body = await request.json();
        } catch {
          const fd = await request.formData().catch(() => null);
          if (fd) {
            body = {
              bookingId: (fd.get("bookingId") as string) || "",
              bic: (fd.get("bic") as string) || "",
            };
          }
        }
        if (!body.bookingId) return new Response("Missing bookingId", { status: 400 });
        if (!body.bic) return errorHtml("Nepasirinktas bankas.", 400);
        return handleInitiate(body.bookingId, body.bic, request);
      },
    },
  },
});
