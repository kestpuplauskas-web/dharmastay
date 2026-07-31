import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type ExtraCalcT = "per_person" | "per_child" | "flat_per_day";

const inputSchema = z.object({
  property_id: z.string().uuid(),
  date_from: z.string().min(1),
  date_to: z.string().min(1),
  guests: z.number().int().min(1).max(50).default(1),
  adults: z.number().int().min(1).max(50).optional(),
  children: z.number().int().min(0).max(50).default(0),
  children_under_3: z.number().int().min(0).max(50).default(0),
  adults_count: z.number().int().min(1).max(50).optional(),
  children_count: z.number().int().min(0).max(50).optional(),
  infants_count: z.number().int().min(0).max(50).optional(),
  extras: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(100),
        calc: z.enum(["per_person", "per_child", "flat_per_day"]),
        pricePerDay: z.number().min(0).max(100000),
      }),
    )
    .max(20)
    .default([]),
  customer_name: z.string().trim().min(1).max(200),
  customer_phone: z.string().trim().max(50).default(""),
  customer_email: z.string().trim().max(255).default(""),
  bic: z.string().trim().max(20).optional(),
});

function nightsBetween(from: string, to: string): number {
  const f = new Date(from);
  const t = new Date(to);
  const ms = t.getTime() - f.getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

function priceFor(
  pricePerNight: number,
  tiers: Array<{ minNights: number; maxNights: number; pricePerNight: number }>,
  nights: number,
): number {
  const tier = tiers.find((t) => nights >= t.minNights && nights <= t.maxNights);
  return (tier?.pricePerNight ?? pricePerNight) * nights;
}

function extraLineTotal(
  calc: ExtraCalcT,
  pricePerDay: number,
  ctx: { adults: number; children: number; childrenUnder3: number; days: number },
): number {
  const days = Math.max(0, ctx.days);
  const price = Math.max(0, pricePerDay);
  if (days === 0 || price === 0) return 0;
  const paidChildren = Math.max(0, ctx.children - ctx.childrenUnder3);
  if (calc === "per_person") return (ctx.adults + paidChildren) * days * price;
  if (calc === "per_child") return ctx.children * days * price;
  return days * price;
}

export const Route = createFileRoute("/api/public/booking-submit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json();
        const parsed = inputSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { error: parsed.error.issues[0]?.message ?? "Invalid input" },
            { status: 400 },
          );
        }
        const data = parsed.data;

        const supabase = createClient<Database>(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );

        const { data: prop, error: pErr } = await supabase
          .from("properties")
          .select("id, name, price_per_night, price_tiers, extra_services, is_active, max_guests")
          .eq("id", data.property_id)
          .maybeSingle();
        if (pErr) {
          console.error("[booking-submit:property]", pErr.message);
          return Response.json({ error: "Nepavyko apdoroti užklausos" }, { status: 500 });
        }
        if (!prop || !prop.is_active) {
          return Response.json({ error: "Objektas neprieinamas" }, { status: 404 });
        }
        if (data.guests > prop.max_guests) {
          return Response.json(
            { error: `Šis objektas priima ne daugiau kaip ${prop.max_guests} svečių.` },
            { status: 400 },
          );
        }

        const { data: conflicts, error: cErr } = await supabase
          .from("bookings")
          .select("id")
          .eq("property_id", data.property_id)
          .neq("status", "cancelled")
          .lt("date_from", data.date_to)
          .gt("date_to", data.date_from);
        if (cErr) {
          console.error("[booking-submit:conflicts]", cErr.message);
          return Response.json({ error: "Nepavyko apdoroti užklausos" }, { status: 500 });
        }
        if (conflicts && conflicts.length > 0) {
          return Response.json({ error: "Pasirinktos datos užimtos" }, { status: 409 });
        }

        const nights = nightsBetween(data.date_from, data.date_to);
        const stayTotal = priceFor(
          Number(prop.price_per_night),
          (prop.price_tiers as unknown as Array<{
            minNights: number;
            maxNights: number;
            pricePerNight: number;
          }>) ?? [],
          nights,
        );

        const defined = (prop.extra_services as unknown as Array<{
          name: string;
          calc: ExtraCalcT;
          pricePerDay: number;
        }>) ?? [];
        const adults = data.adults ?? Math.max(1, data.guests - data.children);
        const validatedExtras: Array<{ name: string; calc: ExtraCalcT; pricePerDay: number; amount: number }> = [];
        for (const req of data.extras) {
          const match = defined.find((d) => d.name === req.name);
          if (!match) continue;
          const amount = extraLineTotal(match.calc, Number(match.pricePerDay), {
            adults,
            children: data.children,
            childrenUnder3: data.children_under_3,
            days: nights,
          });
          validatedExtras.push({
            name: match.name,
            calc: match.calc,
            pricePerDay: Number(match.pricePerDay),
            amount,
          });
        }
        const extrasTotal = validatedExtras.reduce((s, e) => s + e.amount, 0);
        const total = stayTotal + extrasTotal;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        const { data: booking, error: bErr } = await supabaseAdmin
          .from("bookings")
          .insert({
            property_id: data.property_id,
            date_from: data.date_from,
            date_to: data.date_to,
            guests: data.guests,
            adults_count: data.adults_count ?? adults,
            children_count: data.children_count ?? Math.max(0, data.children - data.children_under_3),
            infants_count: data.infants_count ?? data.children_under_3,
            total_guests: data.guests,
            customer_name: data.customer_name,
            customer_phone: data.customer_phone,
            customer_email: data.customer_email,
            source: "website",
            status: "pending",
            total_amount: total,
            payment_amount: total,
            payment_option: "full",
            payment_status: "unpaid",
            payment_provider: "manual_transfer",
            bic: data.bic ?? null,
            expires_at: expiresAt,
            booking_number: "",
            extras: validatedExtras,
            extras_total: extrasTotal,
          })
          .select("booking_number, payment_amount, bic")
          .single();
        if (bErr) {
          console.error("[booking-submit:insert]", bErr.message);
          return Response.json({ error: "Nepavyko apdoroti užklausos" }, { status: 500 });
        }

        return Response.json({
          booking_number: booking.booking_number,
          payment_amount: Number(booking.payment_amount),
          bic: booking.bic,
        });
      },
    },
  },
});