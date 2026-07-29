import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Property, PriceTier, Rooms, Booking } from "./properties";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type PropertyRow = Database["public"]["Tables"]["properties"]["Row"];
type BookingRow = Pick<
  Database["public"]["Tables"]["bookings"]["Row"],
  "property_id" | "date_from" | "date_to"
>;

function mapProperty(row: PropertyRow, bookings: BookingRow[] = []): Property {
  return {
    id: row.id,
    name: row.name,
    propertyType: row.property_type,
    description: row.description ?? "",
    address: row.address ?? "",
    city: row.city ?? "",
    country: row.country ?? "LT",
    lat: row.lat != null ? Number(row.lat) : null,
    lng: row.lng != null ? Number(row.lng) : null,
    areaM2: row.area_m2 ?? null,
    maxGuests: row.max_guests,
    beds: row.beds,
    rooms: (row.rooms as unknown as Rooms) ?? {},
    amenities: (row.amenities as unknown as string[]) ?? [],
    pricePerNight: Number(row.price_per_night),
    priceTiers: (row.price_tiers as unknown as PriceTier[]) ?? [],
    image: row.cover_image_url,
    images: (row.image_urls as unknown as string[]) ?? [],
    bookings: bookings.map<Booking>((b) => ({ from: b.date_from, to: b.date_to })),
    isActive: row.is_active,
    sortOrder: row.sort_order,
    status: row.status,
    year: row.year,
    category: row.category ?? "",
  };
}

export const listActiveProperties = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  const today = new Date().toISOString().slice(0, 10);
  const ids = (data ?? []).map((r) => r.id);
  let bookings: BookingRow[] = [];
  if (ids.length) {
    const { data: b, error: bErr } = await supabase
      .from("bookings")
      .select("property_id, date_from, date_to")
      .in("property_id", ids)
      .neq("status", "cancelled")
      .gte("date_to", today);
    if (bErr) throw new Error(bErr.message);
    bookings = b ?? [];
  }
  const byProp = new Map<string, BookingRow[]>();
  for (const b of bookings) {
    const list = byProp.get(b.property_id) ?? [];
    list.push(b);
    byProp.set(b.property_id, list);
  }
  return (data ?? []).map((r) => mapProperty(r, byProp.get(r.id) ?? []));
});

export const getPropertyById = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: prop, error } = await supabase
      .from("properties")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!prop) return null;
    const { data: bookings, error: bErr } = await supabase.rpc("get_property_booked_dates", {
      _property_id: data.id,
    });
    if (bErr) throw new Error(bErr.message);
    const rows =
      (bookings ?? []).map((b) => ({
        property_id: data.id,
        date_from: b.date_from,
        date_to: b.date_to,
      })) ?? [];
    return mapProperty(prop, rows);
  });

export const listAllProperties = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => mapProperty(r));
  });

const propertyInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  propertyType: z.string().trim().min(1).max(50),
  description: z.string().max(5000).default(""),
  address: z.string().trim().max(300).default(""),
  city: z.string().trim().max(100).default(""),
  country: z.string().trim().max(3).default("LT"),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  areaM2: z.number().int().min(0).max(100000).nullable().optional(),
  maxGuests: z.number().int().min(1).max(50),
  beds: z.number().int().min(1).max(50),
  rooms: z
    .object({
      bedrooms: z.number().int().min(0).max(50).optional(),
      living_rooms: z.number().int().min(0).max(20).optional(),
      bathrooms: z.number().int().min(0).max(20).optional(),
      kitchenette: z.boolean().optional(),
      parking_spot: z.boolean().optional(),
      notes: z.string().max(500).optional(),
    })
    .default({}),
  amenities: z.array(z.string().min(1).max(50)).max(50).default([]),
  pricePerNight: z.number().positive().max(100000),
  priceTiers: z
    .array(
      z.object({
        label: z.string().trim().max(100).default(""),
        minNights: z.number().int().min(1),
        maxNights: z.number().int().min(1),
        pricePerNight: z.number().min(0),
      }),
    )
    .max(20)
    .default([]),
  coverImageUrl: z.string().trim().max(2000).default(""),
  imageUrls: z.array(z.string().trim().min(1).max(2000)).max(50).default([]),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(100000).default(0),
  status: z.enum(["active", "maintenance", "blocked"]).default("active"),
  year: z.number().int().min(1800).max(2100).default(new Date().getFullYear()),
  category: z.string().max(100).default(""),
});

function toRow(input: z.infer<typeof propertyInputSchema>) {
  return {
    name: input.name,
    property_type: input.propertyType,
    description: input.description,
    address: input.address,
    city: input.city,
    country: input.country,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    area_m2: input.areaM2 ?? null,
    max_guests: input.maxGuests,
    beds: input.beds,
    rooms: input.rooms,
    amenities: input.amenities,
    price_per_night: input.pricePerNight,
    price_tiers: input.priceTiers,
    cover_image_url: input.coverImageUrl,
    image_urls: input.imageUrls,
    is_active: input.isActive,
    sort_order: input.sortOrder,
    status: input.status,
    year: input.year,
    category: input.category || input.propertyType,
  };
}

export const createProperty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => propertyInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("properties")
      .insert(toRow(data))
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapProperty(row);
  });

export const updateProperty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), patch: propertyInputSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("properties")
      .update(toRow(data.patch))
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapProperty(row);
  });

export const deleteProperty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("properties").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    if (error) throw new Error(error.message);
    const roles = (data ?? []).map((r) => r.role);
    return { userId, isAdmin: roles.includes("admin"), roles };
  });

export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error: cErr } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if (cErr) throw new Error(cErr.message);
    if ((count ?? 0) > 0) throw new Error("Administratorius jau egzistuoja.");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });