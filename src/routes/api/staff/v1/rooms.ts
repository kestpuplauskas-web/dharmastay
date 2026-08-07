import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/staff/v1/rooms")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        const { preflight } = await import("@/lib/api-auth.server");
        return preflight(request);
      },
      GET: async ({ request }) => {
        const { withStaffAuth, apiJson } = await import("@/lib/staff-api-auth.server");
        return withStaffAuth(request, async ({ headers }) => {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const today = new Date().toISOString().slice(0, 10);

          const { data: properties } = await supabaseAdmin
            .from("properties")
            .select("id, name, sort_order")
            .eq("is_active", true)
            .order("sort_order", { ascending: true });

          const { data: bookings } = await supabaseAdmin
            .from("bookings")
            .select("property_id, date_from, date_to")
            .in("status", ["confirmed", "blocked_external"])
            .gte("date_to", today);

          const { data: statuses } = await supabaseAdmin.from("room_status").select("*");
          const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
          const emailOf = new Map((authUsers?.users ?? []).map((u) => [u.id, u.email ?? ""]));

          const byProperty = new Map<string, { date_from: string; date_to: string }[]>();
          for (const b of bookings ?? []) {
            const list = byProperty.get(b.property_id as string) ?? [];
            list.push({ date_from: b.date_from as string, date_to: b.date_to as string });
            byProperty.set(b.property_id as string, list);
          }
          const statusByProperty = new Map(
            (statuses ?? []).map((s) => [s.property_id as string, s]),
          );

          const rooms = (properties ?? []).map((p) => {
            const ranges = byProperty.get(p.id) ?? [];
            const checkinToday = ranges.some((r) => r.date_from === today);
            const checkoutToday = ranges.some((r) => r.date_to === today);
            const occupiedToday = ranges.some((r) => r.date_from <= today && r.date_to > today);
            const nextCheckin =
              ranges
                .filter((r) => r.date_from > today)
                .map((r) => r.date_from)
                .sort()[0] ?? null;
            const nextCheckout =
              ranges
                .filter((r) => r.date_to > today)
                .map((r) => r.date_to)
                .sort()[0] ?? null;
            const st = statusByProperty.get(p.id);
            return {
              id: p.id,
              name: p.name,
              checkin_today: checkinToday,
              checkout_today: checkoutToday,
              occupied_today: occupiedToday,
              next_checkin: nextCheckin,
              next_checkout: nextCheckout,
              status: st?.status ?? "reikia_tvarkyti",
              note: st?.note ?? "",
              assigned_to: st?.assigned_to ?? null,
              assigned_to_email: st?.assigned_to
                ? emailOf.get(st.assigned_to as string) ?? null
                : null,
              updated_at: st?.updated_at ?? null,
            };
          });

          return apiJson({ data: rooms }, 200, headers);
        });
      },
    },
  },
});
