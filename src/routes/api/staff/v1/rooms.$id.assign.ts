import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/staff/v1/rooms/$id/assign")({
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
          if (existing?.assigned_to && existing.assigned_to !== userId) {
            return apiError(
              "already_assigned",
              "Kambarys jau priskirtas kitai tvarkytojai",
              409,
              headers,
            );
          }
          const { error } = await supabaseAdmin
            .from("room_status")
            .update({
              assigned_to: userId,
              assigned_at: new Date().toISOString(),
              updated_by: userId,
            } as never)
            .eq("property_id", params.id);
          if (error) throw new Error(error.message);
          return apiJson({ ok: true }, 200, headers);
        });
      },
    },
  },
});
