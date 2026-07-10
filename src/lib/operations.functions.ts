import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const MAINTENANCE_TYPES = ["ta", "insurance", "service", "oil", "belt"] as const;
export const EXPENSE_CATEGORIES = [
  "fuel",
  "maintenance",
  "insurance",
  "marketing",
  "office",
  "transport",
  "telecom",
  "inspection",
  "parts",
  "other",
] as const;
export const INVESTMENT_CATEGORIES = ["purchase", "registration", "other"] as const;

const ensureAdmin = async (ctx: { supabase: any; userId: string }) => {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
};

// ===== Maintenance =====
export const upsertMaintenance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        car_id: z.string().uuid(),
        type: z.enum(MAINTENANCE_TYPES),
        due_date: z.string().nullable().optional(),
        due_mileage_km: z.number().int().min(0).nullable().optional(),
        last_done_at: z.string().nullable().optional(),
        note: z.string().max(500).default(""),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase
      .from("car_maintenance")
      .upsert(data, { onConflict: "car_id,type" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Investments =====
export const listInvestments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data, error } = await context.supabase
      .from("car_investments")
      .select("*, cars(name)")
      .order("purchase_date", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createInvestment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        car_id: z.string().uuid(),
        category: z.enum(INVESTMENT_CATEGORIES).default("purchase"),
        amount: z.number().min(0).max(10000000),
        purchase_date: z.string(),
        mileage_km: z.number().int().min(0).nullable().optional(),
        note: z.string().max(500).default(""),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase.from("car_investments").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteInvestment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase
      .from("car_investments")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Expenses =====
export const listExpenses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data, error } = await context.supabase
      .from("expenses")
      .select("*, cars(name)")
      .order("expense_date", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        category: z.enum(EXPENSE_CATEGORIES),
        amount: z.number().min(0).max(10000000),
        expense_date: z.string(),
        car_id: z.string().uuid().nullable().optional(),
        mileage_km: z.number().int().min(0).nullable().optional(),
        note: z.string().max(500).default(""),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase.from("expenses").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase.from("expenses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
