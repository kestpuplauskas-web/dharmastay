import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  contentTemplateSchema,
  renderPreview,
  type ContentTemplateRecord,
} from "./content-templates";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) {
    console.error("[content-templates:has_role]", error.message);
    throw new Error("Nepavyko patikrinti teisių.");
  }
  if (!data) throw new Error("Neturite teisių valdyti turinio.");
}

function rowToRecord(row: Record<string, unknown>): ContentTemplateRecord {
  return {
    category: row["category"] as ContentTemplateRecord["category"],
    templateName: String(row["template_name"] ?? ""),
    subject: String(row["subject"] ?? ""),
    content: String(row["content"] ?? ""),
    fields:
      row["fields"] && typeof row["fields"] === "object"
        ? (row["fields"] as Record<string, string>)
        : {},
    isEnabled: Boolean(row["is_enabled"]),
    updatedAt: (row["updated_at"] as string | undefined) ?? null,
  };
}

export const listContentTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: rows, error } = await context.supabase
      .from("content_templates")
      .select("*");
    if (error) {
      console.error("[listContentTemplates]", error.message);
      throw new Error("Nepavyko įkelti turinio šablonų.");
    }
    return (rows ?? []).map((r) => rowToRecord(r as Record<string, unknown>));
  });

export const saveContentTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => contentTemplateSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin({ supabase: context.supabase, userId: context.userId });

    const { data: row, error } = await context.supabase
      .from("content_templates")
      .upsert(
        {
          category: data.category,
          template_name: data.templateName,
          subject: data.subject,
          content: data.content,
          fields: data.fields,
          is_enabled: data.isEnabled,
          updated_by: context.userId,
          updated_at: new Date().toISOString(),
        } as never,
        { onConflict: "category,template_name" },
      )
      .select("*")
      .single();

    if (error) {
      console.error("[saveContentTemplate]", error.message);
      throw new Error("Nepavyko išsaugoti šablono.");
    }
    return rowToRecord(row as Record<string, unknown>);
  });

export const sendTestContentEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        to: z.string().trim().email("Neteisingas el. pašto adresas."),
        subject: z.string().trim().min(1).max(300),
        html: z.string().trim().min(1).max(20000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin({ supabase: context.supabase, userId: context.userId });

    const apiKey = process.env["RESEND_API_KEY"];
    if (!apiKey) {
      throw new Error(
        "El. laiškų siuntėjas dar nesukonfigūruotas — prijunkite el. pašto integraciją.",
      );
    }
    const from = process.env["RESEND_FROM_EMAIL"] ?? "onboarding@resend.dev";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [data.to],
        subject: `[TESTAS] ${renderPreview(data.subject)}`,
        html: renderPreview(data.html),
      }),
    });

    if (!res.ok) {
      console.error("[sendTestContentEmail]", res.status, await res.text());
      throw new Error("Nepavyko išsiųsti testinio laiško.");
    }
    return { ok: true };
  });