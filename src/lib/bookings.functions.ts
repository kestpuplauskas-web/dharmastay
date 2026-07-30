import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const BOOKING_SOURCES = ["phone", "whatsapp", "direct", "website", "other"] as const;
export const BOOKING_STATUSES = ["confirmed", "pending", "completed", "cancelled"] as const;

const bookingInput = z.object({
  property_id: z.string().uuid(),
  date_from: z.string().min(1),
  date_to: z.string().min(1),
  check_in_time: z.string().trim().max(10).default(""),
  check_out_time: z.string().trim().max(10).default(""),
  location: z.string().trim().max(300).default(""),
  guests: z.number().int().min(1).max(50).default(1),
  customer_name: z.string().trim().max(200).default(""),
  customer_phone: z.string().trim().max(50).default(""),
  customer_email: z
    .string()
    .trim()
    .max(255)
    .default("")
    .refine(
      (v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      "Neteisingas el. paštas",
    ),
  customer_address: z.string().trim().max(300).default(""),
  customer_id_code: z.string().trim().max(50).default(""),
  client_type: z.enum(["person", "company"]).default("person"),
  birth_date: z
    .string()
    .trim()
    .default("")
    .transform((v) => (v === "" ? null : v))
    .nullable(),
  company_name: z.string().trim().max(200).default(""),
  company_code: z.string().trim().max(50).default(""),
  is_vat_payer: z.boolean().default(false),
  vat_number: z.string().trim().max(50).default(""),
  source: z.enum(BOOKING_SOURCES).default("phone"),
  status: z.enum(BOOKING_STATUSES).default("confirmed"),
  total_amount: z.number().min(0).max(1000000).default(0),
  note: z.string().max(2000).default(""),
}).superRefine((v, ctx) => {
  if (v.client_type === "company") {
    if (!v.company_name) ctx.addIssue({ code: "custom", path: ["company_name"], message: "Įmonės pavadinimas privalomas" });
    if (!v.company_code) ctx.addIssue({ code: "custom", path: ["company_code"], message: "Įmonės kodas privalomas" });
    if (v.is_vat_payer && !v.vat_number) ctx.addIssue({ code: "custom", path: ["vat_number"], message: "PVM kodas privalomas" });
  } else if (!v.customer_name) {
    ctx.addIssue({ code: "custom", path: ["customer_name"], message: "Vardas Pavardė privalomas" });
  }
  if (!v.customer_email) ctx.addIssue({ code: "custom", path: ["customer_email"], message: "El. paštas privalomas" });
});

export type BookingInput = z.infer<typeof bookingInput>;

const ensureAdmin = async (ctx: { supabase: any; userId: string }) => {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
};

export const listBookings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        propertyId: z.string().uuid().optional(),
        status: z.enum(BOOKING_STATUSES).optional(),
        from: z.string().optional(),
        to: z.string().optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    let q = context.supabase
      .from("bookings")
      .select("*, properties(id, name)")
      .order("date_from", { ascending: false });
    if (data.propertyId) q = q.eq("property_id", data.propertyId);
    if (data.status) q = q.eq("status", data.status);
    if (data.from) q = q.gte("date_to", data.from);
    if (data.to) q = q.lte("date_from", data.to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { data: row, error } = await context.supabase
      .from("bookings")
      .select("*, properties(id, name)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const checkBookingConflicts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        property_id: z.string().uuid(),
        date_from: z.string().min(1),
        date_to: z.string().min(1),
        excludeId: z.string().uuid().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    let q = context.supabase
      .from("bookings")
      .select("id, date_from, date_to, customer_name, status")
      .eq("property_id", data.property_id)
      .neq("status", "cancelled")
      .lte("date_from", data.date_to)
      .gte("date_to", data.date_from);
    if (data.excludeId) q = q.neq("id", data.excludeId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => bookingInput.parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { data: row, error } = await context.supabase
      .from("bookings")
      .insert({ ...data, booking_number: "" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => bookingInput.and(z.object({ id: z.string().uuid() })).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { id, ...rest } = data;
    const { data: row, error } = await context.supabase
      .from("bookings")
      .update(rest)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase.from("bookings").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });