import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/staff/v1/rooms/$id/status")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        const { preflight } = await import("@/lib/api-auth.server");
        return preflight(request);
      },
      POST: async ({ request, params }) => {
        const { withStaffAuth, apiJson, apiError } = await import("@/lib/staff-api-auth.server");
        return withStaffAuth(request, async ({ userId, headers }) => {
          const { z } = await import("zod");
          const schema = z.object({
            status: z.enum(["svaru", "reikia_tvarkyti", "tvarkoma", "problema"]),
            note: z.string().max(500).optional(),
          });
          let body: unknown;
          try {
            body = await request.json();
          } catch {
            return apiError("bad_request", "Invalid JSON", 400, headers);
          }
          const parsed = schema.safeParse(body);
          if (!parsed.success) return apiError("bad_request", "Invalid input", 400, headers);

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const patch: Record<string, unknown> = {
            status: parsed.data.status,
            updated_by: userId,
          };
          if (parsed.data.note !== undefined) patch.note = parsed.data.note;

          const { error } = await supabaseAdmin
            .from("room_status")
            .update(patch as never)
            .eq("property_id", params.id);
          if (error) throw new Error(error.message);

          return apiJson({ ok: true }, 200, headers);
        });
      },
    },
  },
});
