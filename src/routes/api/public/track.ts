import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const bodySchema = z.object({
  path: z.string().max(500),
  session_id: z.string().max(120),
  referrer: z.string().max(500).default(""),
});

export const Route = createFileRoute("/api/public/track")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const json = await request.json();
          const parsed = bodySchema.safeParse(json);
          if (!parsed.success) return new Response("Invalid", { status: 400 });
          if (parsed.data.path.startsWith("/admin")) {
            return new Response("ok");
          }
          const supabase = createClient<Database>(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_PUBLISHABLE_KEY!,
            { auth: { persistSession: false, autoRefreshToken: false } },
          );
          const ua = request.headers.get("user-agent") ?? "";
          await supabase.from("page_views").insert({
            path: parsed.data.path,
            session_id: parsed.data.session_id,
            referrer: parsed.data.referrer,
            user_agent: ua.slice(0, 300),
          });
          return new Response("ok");
        } catch {
          return new Response("ok");
        }
      },
    },
  },
});
