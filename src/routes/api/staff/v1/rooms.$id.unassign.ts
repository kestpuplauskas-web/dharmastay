import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/staff/v1/rooms/$id/unassign")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        const { preflight } = await import("@/lib/api-auth.server");
        return preflight(request);
      },
      POST: async ({ request, params }) => {
        const { withStaffAuth, apiJson, apiError } = await import("@/lib/staff-api-auth.server");
        return withStaffAuth(request, async ({ userId, headers }) => {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: existing } = await supabaseAdmin
            .from("room_status")
            .select("assigned_to")
            .eq("property_id", params.id)
            .maybeSingle();
          if (existing?.assigned_to !== userId) {
            return apiError("not_yours", "Kambarys priskirtas ne jums", 403, headers);
          }
          const { error } = await supabaseAdmin
            .from("room_status")
            .update({ assigned_to: null, assigned_at: null, updated_by: userId } as never)
            .eq("property_id", params.id);
          if (error) throw new Error(error.message);
          return apiJson({ ok: true }, 200, headers);
        });
      },
    },
  },
});
