import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const inputSchema = z.object({
  property_id: z.string().uuid(),
  date_from: z.string().min(1),
  date_to: z.string().min(1),
  guests: z.number().int().min(1).max(50).default(1),
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
          .select("id, name, price_per_night, price_tiers, is_active, max_guests")
          .eq("id", data.property_id)
          .maybeSingle();
        if (pErr) return Response.json({ error: pErr.message }, { status: 500 });
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
          .lte("date_from", data.date_to)
          .gte("date_to", data.date_from);
        if (cErr) return Response.json({ error: cErr.message }, { status: 500 });
        if (conflicts && conflicts.length > 0) {
          return Response.json({ error: "Pasirinktos datos užimtos" }, { status: 409 });
        }

        const nights = nightsBetween(data.date_from, data.date_to);
        const total = priceFor(
          Number(prop.price_per_night),
          (prop.price_tiers as unknown as Array<{
            minNights: number;
            maxNights: number;
            pricePerNight: number;
          }>) ?? [],
          nights,
        );

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        const { data: booking, error: bErr } = await supabaseAdmin
          .from("bookings")
          .insert({
            property_id: data.property_id,
            date_from: data.date_from,
            date_to: data.date_to,
            guests: data.guests,
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
          })
          .select("booking_number, payment_amount, bic")
          .single();
        if (bErr) return Response.json({ error: bErr.message }, { status: 500 });

        return Response.json({
          booking_number: booking.booking_number,
          payment_amount: Number(booking.payment_amount),
          bic: booking.bic,
        });
      },
    },
  },
});