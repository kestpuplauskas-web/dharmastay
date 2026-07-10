import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  validateName,
  validatePhone,
  validateAddress,
  validateCity,
  emailDomain,
} from "@/lib/booking-validation";
import { isDisposableDomain } from "@/lib/disposable-domains";
import { hasMxRecord } from "@/lib/email-domain.server";
import type { CountryCode } from "libphonenumber-js";

const schema = z.object({
  carId: z.string().uuid(),
  carName: z.string().trim().min(1).max(200).optional(),
  location: z.string().trim().max(200).optional().default(""),
  returnLocation: z.string().trim().max(200).optional().default(""),
  dateFrom: z.string().trim().min(1).max(40),
  dateTo: z.string().trim().min(1).max(40),
  timeFrom: z.string().trim().max(10).optional().default(""),
  timeTo: z.string().trim().max(10).optional().default(""),
  days: z.number().int().min(0).max(365).optional(),
  total: z.number().min(0).max(1000000).optional(),
  addons: z.array(z.string().trim().max(200)).max(30).optional().default([]),
  firstName: z.string().trim().min(1).max(100)
    .refine((v) => !validateName(v, "Vardas"), { message: "Neteisingas vardas" }),
  lastName: z.string().trim().min(1).max(100)
    .refine((v) => !validateName(v, "Pavardė"), { message: "Neteisinga pavardė" }),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(3).max(50),
  phoneCountry: z.string().trim().length(2).optional().default("LT"),
  country: z.string().trim().min(1).max(100),
  address: z.string().trim().min(1).max(255)
    .refine((v) => !validateAddress(v), { message: "Neteisingas adresas" }),
  city: z.string().trim().min(1).max(100)
    .refine((v) => !validateCity(v), { message: "Neteisingas miestas" }),
  message: z.string().trim().max(2000).optional().default(""),
  paymentOption: z.enum(["full", "deposit"]).optional().default("full"),
  bic: z.string().trim().min(6).max(20),
  agree: z.literal(true),
});

function depositPercent(): number {
  // Fiksuotas 10% avansas — suvienodinta su UI (DEPOSIT_PCT klientinėje pusėje).
  return 10;
}

function paymentWindowMinutes(): number {
  const raw = Number(process.env.PAYMENT_WINDOW_MINUTES);
  if (Number.isFinite(raw) && raw >= 5 && raw <= 240) return raw;
  return 30;
}

export const Route = createFileRoute("/api/public/booking-submit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }
        const parsed = schema.safeParse(payload);
        if (!parsed.success) {
          return Response.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
        }
        const d = parsed.data;

        const phoneErr = validatePhone(d.phone, d.phoneCountry as CountryCode);
        if (phoneErr) {
          return Response.json({ error: phoneErr, code: "invalid_phone" }, { status: 400 });
        }

        const domain = emailDomain(d.email);
        if (!domain) {
          return Response.json({ error: "Neteisingas el. paštas", code: "invalid_email" }, { status: 400 });
        }
        if (isDisposableDomain(domain)) {
          return Response.json(
            { error: "Šio el. pašto negalime patvirtinti, įveskite kitą", code: "disposable_email" },
            { status: 400 },
          );
        }
        const mxOk = await hasMxRecord(domain);
        if (!mxOk) {
          return Response.json(
            { error: "Šio el. pašto domeno negalime patvirtinti, įveskite kitą", code: "invalid_email_domain" },
            { status: 400 },
          );
        }

        const total = Number(d.total ?? 0);
        const paymentOption = d.paymentOption;
        const paymentAmount =
          paymentOption === "deposit"
            ? Math.round(((total * depositPercent()) / 100) * 100) / 100
            : total;
        const expiresAt = new Date(Date.now() + paymentWindowMinutes() * 60_000).toISOString();

        const addonsText = d.addons.length ? d.addons.join("; ") : "";
        const note = [
          d.message?.trim() ? d.message.trim() : "",
          addonsText ? `Papildomos paslaugos: ${addonsText}` : "",
        ]
          .filter(Boolean)
          .join("\n\n");

        const { data: inserted, error: insertErr } = await supabaseAdmin
          .from("bookings")
          .insert({
            booking_number: "",
            car_id: d.carId,
            date_from: d.dateFrom,
            date_to: d.dateTo,
            pickup_time: d.timeFrom || "",
            return_time: d.timeTo || "",
            pickup_location: d.location || "",
            return_location: d.returnLocation || d.location || "",
            customer_name: `${d.firstName} ${d.lastName}`.trim(),
            customer_phone: d.phone,
            customer_email: d.email,
            customer_address: [d.address, d.city, d.country].filter(Boolean).join(", "),
            customer_id_code: "",
            source: "rentivo.lt",
            status: "pending",
            total_amount: total,
            note,
            payment_option: paymentOption,
            payment_status: "unpaid",
            payment_amount: paymentAmount,
            payment_provider: "manual_transfer",
            bic: d.bic,
            expires_at: expiresAt,
          })
          .select("id, booking_number, payment_amount, expires_at")
          .single();

        if (insertErr || !inserted) {
          console.error("[booking-submit] DB insert failed", insertErr);
          return Response.json({ error: "Nepavyko sukurti rezervacijos" }, { status: 500 });
        }

        return Response.json({
          ok: true,
          bookingId: inserted.id,
          bookingNumber: inserted.booking_number,
          paymentAmount: Number(inserted.payment_amount ?? paymentAmount),
          paymentOption,
          expiresAt: inserted.expires_at,
        });
      },
    },
  },
});
