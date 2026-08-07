import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const assertAdmin = async (ctx: { supabase: any; userId: string }) => {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Neturite administratoriaus teisių.");
};

export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        email: z.string().trim().email(),
        role: z.enum(["admin", "housekeeper"]),
        redirectTo: z.string().url().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const opts = data.redirectTo ? { redirectTo: data.redirectTo } : undefined;
    let link = await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email: data.email,
      options: opts,
    });
    // Jei vartotojas jau egzistuoja — siunčiame slaptažodžio susikūrimo nuorodą.
    if (link.error && /registered|exists/i.test(link.error.message)) {
      link = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: data.email,
        options: opts,
      });
    }
    if (link.error) throw new Error(link.error.message);

    const newUserId = link.data.user?.id;
    const actionLink = link.data.properties?.action_link;
    if (!newUserId) throw new Error("Nepavyko sukurti vartotojo.");

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: newUserId, role: data.role } as never, {
        onConflict: "user_id,role",
      });
    if (roleErr) throw new Error(roleErr.message);

    if (actionLink) {
      const { sendEmail } = await import("@/lib/notifications.server");
      const roleLabel =
        data.role === "admin" ? "administratoriaus" : "kambarių tvarkytojos";
      await sendEmail({
        to: data.email,
        subject: "Kvietimas prisijungti prie Dharma Stay sistemos",
        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#111;line-height:1.6">
            <p>Sveiki,</p>
            <p>Jums sukurta ${roleLabel} paskyra Dharma Stay valdymo sistemoje.</p>
            <p>Paspauskite nuorodą ir susikurkite slaptažodį:</p>
            <p><a href="${actionLink}" style="display:inline-block;padding:10px 18px;background:#111;color:#fff;text-decoration:none;border-radius:6px">Susikurti slaptažodį</a></p>
            <p style="font-size:13px;color:#666">Jei mygtukas neveikia, nukopijuokite šią nuorodą:<br>${actionLink}</p>
          </div>
        `,
      });
    }

    return { ok: true, userId: newUserId, emailed: Boolean(actionLink) };
  });

export const listUsersWithRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role, created_at")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as Array<{ user_id: string; role: string; created_at: string }>;
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    const emails = new Map((authUsers?.users ?? []).map((u) => [u.id, u.email ?? ""]));

    return rows.map((r) => ({
      userId: r.user_id,
      role: r.role,
      createdAt: r.created_at,
      email: emails.get(r.user_id) ?? "",
    }));
  });