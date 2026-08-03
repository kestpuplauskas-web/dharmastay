import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/v1/properties")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        const { preflight } = await import("@/lib/api-auth.server");
        return preflight(request);
      },
      GET: async ({ request }) => {
        const { withApiAuth, apiJson } = await import("@/lib/api-auth.server");
        return withApiAuth(request, "/v1/properties", async ({ headers }) => {
          const { publicApiClient, publicProperty, PROPERTY_PUBLIC_COLUMNS } = await import(
            "@/lib/api-public.server"
          );
          const supabase = publicApiClient();
          const { data, error } = await supabase
            .from("properties")
            .select(PROPERTY_PUBLIC_COLUMNS)
            .eq("is_active", true)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true });
          if (error) throw new Error(error.message);
          return apiJson(
            { data: (data ?? []).map((r) => publicProperty(r as never)) },
            200,
            headers,
          );
        });
      },
    },
  },
});