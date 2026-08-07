// Server-only: el. laiškų siuntimo variklis (klientui ir administratoriui).
// Naudoja `content_templates` šablonus, `property_settings` jungiklius ir
// `booking_notifications` žurnalą, kad tas pats laiškas nebūtų siųstas du kartus.

import { DEFAULT_PROPERTY_SETTINGS, SETTINGS_COLUMN_MAP, type PropertySettings } from "./property-settings";

export type NotificationKind =
  | "booking_confirmation"
  | "booking_change"
  | "booking_cancellation"
  | "checkin_reminder"
  | "review_request";

const SETTINGS_FLAG: Partial<Record<NotificationKind, keyof PropertySettings>> = {
  booking_confirmation: "notifyBookingConfirmation",
  booking_change: "notifyBookingChange",
  booking_cancellation: "notifyCancellationConfirmation",
  checkin_reminder: "notifyCheckinReminder",
  review_request: "notifyReviewRequest",
};

const ADMIN_SUBJECTS: Record<NotificationKind, string> = {
  booking_confirmation: "Nauja rezervacija",
  booking_change: "Rezervacija pakeista",
  booking_cancellation: "Rezervacija atšaukta",
  checkin_reminder: "Artėja svečio atvykimas",
  review_request: "Svečias išvyko",
};

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

async function admin(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/* ------------------------------- siuntimas ------------------------------- */

export async function sendEmail(opts: { to: string; subject: string; html: string; replyTo?: string }) {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) throw new Error("RESEND_API_KEY nesukonfigūruotas.");
  const lovableKey = process.env["LOVABLE_API_KEY"];
  if (!lovableKey) throw new Error("LOVABLE_API_KEY nesukonfigūruotas.");
  const from = process.env["RESEND_FROM_EMAIL"] ?? "onboarding@resend.dev";

  const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend ${res.status}: ${text.slice(0, 300)}`);
  }
  return true;
}

/* -------------------------------- duomenys ------------------------------- */

export async function loadGlobalSettings(): Promise<PropertySettings> {
  const db = await admin();
  const { data: row } = await db
    .from("property_settings")
    .select("*")
    .eq("scope", "global")
    .maybeSingle();
  const out = { ...DEFAULT_PROPERTY_SETTINGS } as Record<string, unknown>;
  if (row) {
    for (const [key, column] of Object.entries(SETTINGS_COLUMN_MAP)) {
      const raw = (row as Record<string, unknown>)[column];
      if (raw === undefined || raw === null) continue;
      out[key] = raw;
    }
  }
  return out as PropertySettings;
}

async function loadTemplate(name: string) {
  const db = await admin();
  const { data } = await db
    .from("content_templates")
    .select("subject, content, is_enabled, fields")
    .eq("category", "email")
    .eq("template_name", name)
    .maybeSingle();
  return data as { subject: string; content: string; is_enabled: boolean; fields: Record<string, string> } | null;
}

async function loadGuestInfoFields(name: string): Promise<Record<string, string>> {
  const db = await admin();
  const { data } = await db
    .from("content_templates")
    .select("fields, is_enabled")
    .eq("category", "guest_info")
    .eq("template_name", name)
    .maybeSingle();
  const row = data as { fields: Record<string, string> | null; is_enabled: boolean } | null;
  if (!row || !row.is_enabled) return {};
  return row.fields ?? {};
}

/* ------------------------------- šablonai -------------------------------- */

function money(v: unknown) {
  const n = Number(v ?? 0);
  return n.toFixed(2).replace(".", ",");
}

export function renderTokens(text: string, tokens: Record<string, string>) {
  return Object.entries(tokens).reduce((acc, [token, value]) => acc.split(token).join(value), text ?? "");
}

async function buildTokens(booking: Record<string, any>, settings: PropertySettings) {
  const db = await admin();
  const { data: prop } = await db
    .from("properties")
    .select("name, door_code, location_note")
    .eq("id", booking["property_id"])
    .maybeSingle();
  const wifi = await loadGuestInfoFields("wifi");

  // Durų kodas svečiui atskleidžiamas tik po apmokėjimo/patvirtinimo.
  const status = String(booking["status"] ?? "");
  const paymentStatus = String(booking["payment_status"] ?? "");
  const isPaid =
    status === "confirmed" ||
    status === "completed" ||
    paymentStatus === "paid" ||
    paymentStatus === "partial";

  return {
    "{{guest_name}}": String(booking["customer_name"] ?? ""),
    "{{property_name}}": String((prop as any)?.name ?? settings.displayName ?? ""),
    "{{room_name}}": "",
    "{{booking_number}}": String(booking["booking_number"] ?? ""),
    "{{date_from}}": String(booking["date_from"] ?? ""),
    "{{date_to}}": String(booking["date_to"] ?? ""),
    "{{check_in}}": String(booking["check_in_time"] ?? settings.checkinFrom ?? ""),
    "{{check_out}}": String(booking["check_out_time"] ?? settings.checkoutUntil ?? ""),
    "{{door_code}}": isPaid ? String((prop as any)?.door_code ?? "") : "",
    "{{location}}": String((prop as any)?.location_note ?? ""),
    "{{wifi_name}}": wifi["wifiName"] ?? "",
    "{{wifi_password}}": wifi["wifiPassword"] ?? "",
    "{{total_amount}}": money(booking["total_amount"]),
    "{{currency}}": settings.currency || "EUR",
    "{{phone}}": settings.phone || "",
    "{{email}}": settings.email || "",
  } as Record<string, string>;
}

/* --------------------------------- žurnalas ------------------------------- */

async function alreadySent(bookingId: string, logKind: string) {
  const db = await admin();
  const { data } = await db
    .from("booking_notifications")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("kind", logKind)
    .maybeSingle();
  return Boolean(data);
}

async function logSend(bookingId: string, logKind: string, recipient: string, status: string, error = "") {
  const db = await admin();
  await db
    .from("booking_notifications")
    .upsert(
      { booking_id: bookingId, kind: logKind, recipient, status, error: error.slice(0, 500) } as never,
      { onConflict: "booking_id,kind" },
    );
}

/* ------------------------------ pagrindinis ------------------------------- */

const ONE_SHOT: NotificationKind[] = [
  "booking_confirmation",
  "booking_cancellation",
  "checkin_reminder",
  "review_request",
];

/**
 * Išsiunčia laišką svečiui pagal „Turinys“ šabloną ir informuoja administratorių.
 * Klaidos niekada nemeta – tik įrašo į žurnalą (rezervacija svarbiau nei laiškas).
 */
export async function notifyBookingEvent(bookingId: string, kind: NotificationKind) {
  try {
    const db = await admin();
    const { data: booking } = await db.from("bookings").select("*").eq("id", bookingId).maybeSingle();
    if (!booking) return;

    const settings = await loadGlobalSettings();
    const flag = SETTINGS_FLAG[kind];
    if (flag && !settings[flag]) return;

    const tokens = await buildTokens(booking as Record<string, any>, settings);
    const tpl = await loadTemplate(kind);

    // 1) Svečiui
    const guestEmail = String((booking as any).customer_email ?? "").trim();
    const guestLogKind = ONE_SHOT.includes(kind) ? kind : `${kind}:${Date.now()}`;
    if (tpl && tpl.is_enabled && guestEmail && !(ONE_SHOT.includes(kind) && (await alreadySent(bookingId, kind)))) {
      try {
        await sendEmail({
          to: guestEmail,
          subject: renderTokens(tpl.subject, tokens),
          html: renderTokens(tpl.content, tokens),
          ...(settings.email ? { replyTo: settings.email } : {}),
        });
        await logSend(bookingId, guestLogKind, guestEmail, "sent");
      } catch (e) {
        console.error("[notify:guest]", kind, e);
        await logSend(bookingId, guestLogKind, guestEmail, "failed", String(e));
      }
    }

    // 2) Administratoriui
    const adminEmail = (process.env["ADMIN_NOTIFY_EMAIL"] ?? settings.email ?? "").trim();
    const adminLogKind = ONE_SHOT.includes(kind) ? `${kind}:admin` : `${kind}:admin:${Date.now()}`;
    if (adminEmail && !(ONE_SHOT.includes(kind) && (await alreadySent(bookingId, `${kind}:admin`)))) {
      try {
        await sendEmail({
          to: adminEmail,
          subject: `[${ADMIN_SUBJECTS[kind]}] ${tokens["{{booking_number}}"]} — ${tokens["{{property_name}}"]}`,
          html: adminHtml(kind, booking as Record<string, any>, tokens),
          ...(guestEmail ? { replyTo: guestEmail } : {}),
        });
        await logSend(bookingId, adminLogKind, adminEmail, "sent");
      } catch (e) {
        console.error("[notify:admin]", kind, e);
        await logSend(bookingId, adminLogKind, adminEmail, "failed", String(e));
      }
    }
  } catch (e) {
    console.error("[notifyBookingEvent]", kind, e);
  }
}

function adminHtml(kind: NotificationKind, booking: Record<string, any>, t: Record<string, string>) {
  const rows: [string, string][] = [
    ["Rezervacija", t["{{booking_number}}"] ?? ""],
    ["Objektas", t["{{property_name}}"] ?? ""],
    ["Svečias", t["{{guest_name}}"] ?? ""],
    ["El. paštas", String(booking["customer_email"] ?? "")],
    ["Telefonas", String(booking["customer_phone"] ?? "")],
    ["Datos", `${t["{{date_from}}"]} → ${t["{{date_to}}"]}`],
    ["Svečių", String(booking["total_guests"] ?? booking["guests"] ?? "")],
    ["Suma", `${t["{{total_amount}}"]} ${t["{{currency}}"]}`],
    ["Statusas", String(booking["status"] ?? "")],
    ["Šaltinis", String(booking["source"] ?? "")],
  ];
  return `<div style="font-family:Arial,sans-serif;font-size:14px;color:#111">
    <h2 style="margin:0 0 12px">${ADMIN_SUBJECTS[kind]}</h2>
    <table cellpadding="6" style="border-collapse:collapse">
      ${rows
        .map(
          ([k, v]) =>
            `<tr><td style="color:#666;border-bottom:1px solid #eee">${k}</td><td style="border-bottom:1px solid #eee"><strong>${v || "—"}</strong></td></tr>`,
        )
        .join("")}
    </table>
  </div>`;
}

/** Fire-and-forget: nestabdo pagrindinio srauto. */
export function notifyBookingEventAsync(bookingId: string, kind: NotificationKind) {
  void notifyBookingEvent(bookingId, kind).catch((e) => console.error("[notifyAsync]", e));
}

/* --------------------------- suplanuoti laiškai --------------------------- */

function addHours(iso: string, hours: number) {
  return new Date(new Date(iso).getTime() + hours * 3600_000);
}

/**
 * Paleidžiama pagal tvarkaraštį: atvykimo priminimai ir atsiliepimo prašymai.
 */
export async function runScheduledNotifications() {
  const settings = await loadGlobalSettings();
  const db = await admin();
  const now = Date.now();
  const result = { checkin_reminder: 0, review_request: 0 };

  if (settings.notifyCheckinReminder) {
    const hours = Number(settings.checkinReminderHoursBefore ?? 24);
    const windowEnd = new Date(now + hours * 3600_000).toISOString().slice(0, 10);
    const today = new Date(now).toISOString().slice(0, 10);
    const { data: rows } = await db
      .from("bookings")
      .select("id, date_from, status")
      .in("status", ["confirmed", "pending", "completed"])
      .gte("date_from", today)
      .lte("date_from", windowEnd);
    for (const r of (rows ?? []) as Array<{ id: string; date_from: string }>) {
      const target = addHours(`${r.date_from}T${(settings.checkinFrom || "15:00").slice(0, 5)}:00`, -hours);
      if (target.getTime() > now) continue;
      if (await alreadySent(r.id, "checkin_reminder")) continue;
      await notifyBookingEvent(r.id, "checkin_reminder");
      result.checkin_reminder += 1;
    }
  }

  if (settings.notifyReviewRequest) {
    const hours = Number(settings.reviewRequestHoursAfter ?? 24);
    const from = new Date(now - (hours + 24 * 14) * 3600_000).toISOString().slice(0, 10);
    const today = new Date(now).toISOString().slice(0, 10);
    const { data: rows } = await db
      .from("bookings")
      .select("id, date_to, status")
      .in("status", ["confirmed", "completed"])
      .gte("date_to", from)
      .lte("date_to", today);
    for (const r of (rows ?? []) as Array<{ id: string; date_to: string }>) {
      const target = addHours(`${r.date_to}T${(settings.checkoutUntil || "11:00").slice(0, 5)}:00`, hours);
      if (target.getTime() > now) continue;
      if (await alreadySent(r.id, "review_request")) continue;
      await notifyBookingEvent(r.id, "review_request");
      result.review_request += 1;
    }
  }

  return result;
}
