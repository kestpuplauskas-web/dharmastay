import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  getBankPublicKey,
  getTransactionStatus,
  readSwedbankPiConfig,
  verifyJwsDetached,
} from "@/lib/swedbank-pi.server";
import { reconcileBookingStatus } from "./return";

/**
 * Swedbank notification endpoint. Bankas siunčia signed pranešimą, kai
 * mokėjimo statusas tampa EXECUTED / SETTLED / FAILED. Būtina verifikuoti
 * `x-jws-signature` prieš darant bet kokius pakeitimus.
 */
async function handle(request: Request): Promise<Response> {
  const cfg = readSwedbankPiConfig();
  if (!cfg) return new Response("Not configured", { status: 503 });

  const rawBody = await request.text();
  const jws = request.headers.get("x-jws-signature") || "";
  if (!jws) return new Response("Missing signature", { status: 400 });

  let bankKey;
  try {
    bankKey = await getBankPublicKey(cfg.baseUrl);
  } catch (e) {
    console.error("[payment/notify] bank key fetch failed", e);
    return new Response("Bank key unavailable", { status: 502 });
  }

  const verified = verifyJwsDetached({ jws, body: rawBody, bankPublicKey: bankKey });
  if (!verified.ok) {
    console.error("[payment/notify] invalid signature");
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: { id?: string; status?: string } = {};
  try {
    payload = JSON.parse(rawBody || "{}");
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  const transactionId = payload.id;
  if (!transactionId) return new Response("Missing id", { status: 400 });

  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("id")
    .eq("payment_reference", transactionId)
    .maybeSingle();
  if (!booking) {
    // Nezinom apie tokią transaction — vis tiek 200, kad bankas netrukdytų retry-us.
    console.warn("[payment/notify] unknown transactionId", transactionId);
    return new Response("ok", { status: 200 });
  }

  // Pilnas status polling — nepasitikime tik notify payload'u.
  try {
    const { status, raw } = await getTransactionStatus(cfg, transactionId);
    await reconcileBookingStatus(booking.id, status, raw);
  } catch (e) {
    console.error("[payment/notify] reconcile failed", e);
    return new Response("Reconcile failed", { status: 500 });
  }

  return new Response("ok", { status: 200 });
}

export const Route = createFileRoute("/api/public/payment/notify")({
  server: {
    handlers: {
      POST: async ({ request }) => handle(request),
      GET: async () => new Response("Method not allowed", { status: 405 }),
    },
  },
});
