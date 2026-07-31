import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const syncPropertyIcal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ propertyId: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ data }) => {
    const { syncAllCalendars } = await import("./ical.server");
    const results = await syncAllCalendars(data.propertyId);
    return { results };
  });
