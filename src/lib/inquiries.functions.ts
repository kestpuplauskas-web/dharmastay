import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/users.server";
import type { Database } from "@/integrations/supabase/types";

const COLUMNS =
  "id, created_at, name, email, phone, message, lang, source, read_at, archived_at";

export type InquiryRow = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  lang: string;
  source: string | null;
  read_at: string | null;
  archived_at: string | null;
};

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null));

const submitSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  phone: optionalText(50),
  message: z.string().trim().min(5).max(2000),
  lang: z.string().trim().max(8).default("lt"),
  // Honeypot — tikri lankytojai šio lauko nepildo.
  company_website: z.string().max(200).optional(),
});

/** Publishable-key klientas anoniminiam įrašui iš svetainės formos. */
function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

export const submitInquiry = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => submitSchema.parse(input))
  .handler(async ({ data }) => {
    if (data.company_website && data.company_website.length > 0) {
      return { ok: true as const };
    }

    const { error } = await publicClient()
      .from("inquiries" as never)
      .insert({
        name: data.name,
        email: data.email,
        phone: data.phone,
        message: data.message,
        lang: data.lang,
        source: "svetainės kontaktų forma",
      } as never);

    if (error) {
      console.error("submitInquiry failed", error.message);
      throw new Error("Nepavyko išsaugoti užklausos");
    }
    return { ok: true as const };
  });

const listSchema = z.object({
  filter: z.enum(["all", "unread", "archived"]).default("all"),
  search: z.string().trim().max(120).default(""),
});

export const listInquiries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    let query = context.supabase
      .from("inquiries" as never)
      .select(COLUMNS)
      .order("created_at", { ascending: false })
      .limit(500);

    if (data.filter === "archived") {
      query = query.not("archived_at", "is", null);
    } else {
      query = query.is("archived_at", null);
      if (data.filter === "unread") query = query.is("read_at", null);
    }

    if (data.search) {
      const term = data.search.replace(/[%,]/g, "");
      query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%,message.ilike.%${term}%`);
    }

    const { data: rows, error } = await query.returns<InquiryRow[]>();
    if (error) {
      console.error("listInquiries failed", error.message);
      throw new Error(error.message);
    }
    return { inquiries: rows ?? [] };
  });

export const getUnreadInquiryCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { count, error } = await context.supabase
      .from("inquiries" as never)
      .select("id", { count: "exact", head: true })
      .is("archived_at", null)
      .is("read_at", null);
    if (error) return { count: 0 };
    return { count: count ?? 0 };
  });

const updateSchema = z.object({
  id: z.string().uuid(),
  read: z.boolean().optional(),
  archived: z.boolean().optional(),
});

export const updateInquiry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const patch: { read_at?: string | null; archived_at?: string | null } = {};
    const now = new Date().toISOString();
    if (data.read !== undefined) patch.read_at = data.read ? now : null;
    if (data.archived !== undefined) patch.archived_at = data.archived ? now : null;

    const { error } = await context.supabase
      .from("inquiries" as never)
      .update(patch as never)
      .eq("id", data.id);
    if (error) {
      console.error("updateInquiry failed", error.message);
      throw new Error(error.message);
    }
    return { ok: true as const };
  });
