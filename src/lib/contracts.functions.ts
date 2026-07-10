import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getActiveContractTemplatePublic = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      language: z.enum(["lt", "en"]),
      kind: z.enum(["rental", "privacy"]).default("rental"),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("contract_templates")
      .select("id, name, language, content, kind")
      .eq("language", data.language)
      .eq("kind", data.kind)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

const ensureAdmin = async (ctx: { supabase: any; userId: string }) => {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
};

const templateInput = z.object({
  name: z.string().trim().min(1).max(200),
  language: z.enum(["lt", "en"]),
  kind: z.enum(["rental", "privacy"]).default("rental"),
  content: z.string().default(""),
  is_active: z.boolean().default(false),
});

export const listContractTemplates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data, error } = await context.supabase
      .from("contract_templates")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getContractTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { data: row, error } = await context.supabase
      .from("contract_templates")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const createContractTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => templateInput.parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { data: row, error } = await context.supabase
      .from("contract_templates")
      .insert(data)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateContractTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => templateInput.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { id, ...rest } = data;
    const { data: row, error } = await context.supabase
      .from("contract_templates")
      .update(rest)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteContractTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase
      .from("contract_templates")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Signed contracts (read for admin booking list)
export const listSignedContractsByBookings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ bookingIds: z.array(z.string().uuid()) }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    if (data.bookingIds.length === 0) return [];
    const { data: rows, error } = await context.supabase
      .from("signed_contracts")
      .select("id, booking_id, customer_name, signed_at, pdf_url, contract_content")
      .in("booking_id", data.bookingIds);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getSignedContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { data: row, error } = await context.supabase
      .from("signed_contracts")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });
