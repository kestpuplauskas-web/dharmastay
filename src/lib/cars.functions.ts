import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Car, FeatureGroup, PriceTier, Booking } from "./cars";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type CarRow = Database["public"]["Tables"]["cars"]["Row"];
type BookingRow = Pick<Database["public"]["Tables"]["bookings"]["Row"], "car_id" | "date_from" | "date_to">;

function mapCar(row: CarRow, bookings: BookingRow[] = []): Car {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    year: row.year,
    transmission: row.transmission,
    seats: row.seats,
    fuel: row.fuel,
    consumption: row.consumption,
    mileagePolicy: row.mileage_policy,
    pricePerDay: Number(row.price_per_day),
    image: row.cover_image_url,
    images: (row.image_urls as unknown as string[]) ?? [],
    features: (row.features as unknown as FeatureGroup[]) ?? [],
    priceTiers: (row.price_tiers as unknown as PriceTier[]) ?? [],
    bookings: bookings.map<Booking>((b) => ({ from: b.date_from, to: b.date_to })),
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}

// PUBLIC: list active cars for homepage (incl. future bookings for client-side availability filtering)
export const listActiveCars = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabase
    .from("cars")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  const today = new Date().toISOString().slice(0, 10);
  const { data: bookings, error: bErr } = await supabaseAdmin
    .from("bookings")
    .select("car_id, date_from, date_to")
    .neq("status", "cancelled")
    .gte("date_to", today);
  if (bErr) throw new Error(bErr.message);

  const byCar = new Map<string, BookingRow[]>();
  for (const b of bookings ?? []) {
    const list = byCar.get(b.car_id) ?? [];
    list.push(b);
    byCar.set(b.car_id, list);
  }
  return (data ?? []).map((r) => mapCar(r, byCar.get(r.id) ?? []));
});

// PUBLIC: per-day availability counts for the next N months
export const getAvailabilityCounts = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ months: z.number().int().min(1).max(12).default(4) }).parse(d ?? { months: 4 }))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setMonth(end.getMonth() + data.months);
    const fromIso = today.toISOString().slice(0, 10);
    const toIso = end.toISOString().slice(0, 10);

    const [{ count: total, error: cErr }, { data: bookings, error: bErr }] = await Promise.all([
      supabase.from("cars").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabaseAdmin
        .from("bookings")
        .select("car_id, date_from, date_to")
        .neq("status", "cancelled")
        .gte("date_to", fromIso)
        .lte("date_from", toIso),
    ]);
    if (cErr) throw new Error(cErr.message);
    if (bErr) throw new Error(bErr.message);

    const totalCars = total ?? 0;
    const map = new Map<string, Set<string>>();
    const dayMs = 24 * 60 * 60 * 1000;
    for (const b of bookings ?? []) {
      const start = new Date(b.date_from + "T00:00:00");
      const stop = new Date(b.date_to + "T00:00:00");
      const s = start < today ? today : start;
      for (let t = s.getTime(); t <= stop.getTime() && t <= end.getTime(); t += dayMs) {
        const key = new Date(t).toISOString().slice(0, 10);
        let set = map.get(key);
        if (!set) {
          set = new Set();
          map.set(key, set);
        }
        set.add(b.car_id);
      }
    }
    const days: Record<string, { total: number; booked: number; free: number }> = {};
    for (let t = today.getTime(); t <= end.getTime(); t += dayMs) {
      const key = new Date(t).toISOString().slice(0, 10);
      const booked = map.get(key)?.size ?? 0;
      days[key] = { total: totalCars, booked, free: Math.max(0, totalCars - booked) };
    }
    return { total: totalCars, from: fromIso, to: toIso, days };
  });

// PUBLIC: get one car (active or not — admin previews use same fn) + bookings
export const getCarById = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: car, error: carErr }, { data: bookings, error: bErr }] = await Promise.all([
      supabase.from("cars").select("*").eq("id", data.id).maybeSingle(),
      supabaseAdmin.rpc("get_car_booked_dates", { _car_id: data.id }),
    ]);
    if (carErr) throw new Error(carErr.message);
    if (bErr) throw new Error(bErr.message);
    if (!car) return null;
    const rows = (bookings ?? []).map((b) => ({ car_id: data.id, date_from: b.date_from, date_to: b.date_to }));
    return mapCar(car, rows);
  });

// ADMIN: list all cars (incl. inactive)
export const listAllCars = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("cars")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => mapCar(r));
  });

const carInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(100),
  year: z.number().int().min(1980).max(2100),
  transmission: z.string().trim().min(1).max(50),
  seats: z.number().int().min(1).max(20),
  fuel: z.string().trim().min(1).max(50),
  consumption: z.string().trim().max(50),
  mileagePolicy: z.string().trim().max(100),
  pricePerDay: z.number().positive().max(10000),
  coverImageUrl: z.string().trim().max(2000),
  imageUrls: z.array(z.string().trim().min(1).max(2000)).max(30),
  features: z.array(
    z.object({
      title: z.string().trim().min(1).max(100),
      items: z.array(z.string().trim().min(1).max(300)).max(50),
    }),
  ).max(20),
  priceTiers: z.array(
    z.object({
      label: z.string().trim().min(1).max(100),
      minDays: z.number().int().min(1),
      maxDays: z.number().int().min(1),
      pricePerDay: z.number().min(0),
    }),
  ).max(20),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(100000),
});

function toRow(input: z.infer<typeof carInputSchema>) {
  return {
    name: input.name,
    category: input.category,
    year: input.year,
    transmission: input.transmission,
    seats: input.seats,
    fuel: input.fuel,
    consumption: input.consumption,
    mileage_policy: input.mileagePolicy,
    price_per_day: input.pricePerDay,
    cover_image_url: input.coverImageUrl,
    image_urls: input.imageUrls,
    features: input.features,
    price_tiers: input.priceTiers,
    is_active: input.isActive,
    sort_order: input.sortOrder,
  };
}

export const createCar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => carInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("cars")
      .insert(toRow(data))
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapCar(row);
  });

export const updateCar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), patch: carInputSchema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("cars")
      .update(toRow(data.patch))
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapCar(row);
  });

export const deleteCar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("cars").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Check if current user is admin
export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    const roles = (data ?? []).map((r) => r.role);
    return { userId, isAdmin: roles.includes("admin"), roles };
  });

// Claim first admin: only works when 0 admins exist.
// Uses admin client to bypass RLS (user_roles INSERT is admin-only).
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
    if ((count ?? 0) > 0) {
      throw new Error("Administratorius jau egzistuoja.");
    }
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// PUBLIC (auth admin only via requireSupabaseAuth): list all cars incl. inactive, for migration tool
export const listAllCarsForAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin, error: rErr } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (rErr) throw new Error(rErr.message);
    if (!isAdmin) throw new Error("Forbidden");
    const { data, error } = await supabase
      .from("cars")
      .select("id, name, cover_image_url, image_urls")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      cover: r.cover_image_url ?? "",
      images: ((r.image_urls as unknown as string[]) ?? []),
    }));
  });

// Replace car images (used by migration tool + can be reused elsewhere)
export const replaceCarImages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        cover: z.string().url(),
        images: z.array(z.string().url()).min(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin, error: rErr } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (rErr) throw new Error(rErr.message);
    if (!isAdmin) throw new Error("Forbidden");
    const { error } = await supabase
      .from("cars")
      .update({ cover_image_url: data.cover, image_urls: data.images })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

