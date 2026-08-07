import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LogOut, Sparkles } from "lucide-react";
import { getMyRole } from "@/lib/properties.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/staff")({
  component: StaffLayout,
});

async function signOut() {
  await supabase.auth.signOut();
  window.location.href = "/auth";
}

function StaffLayout() {
  const fetchRole = useServerFn(getMyRole);
  const { data: role, isLoading } = useQuery({
    queryKey: ["my-role"],
    queryFn: () => fetchRole(),
    refetchOnMount: "always",
  });

  if (isLoading) {
    return <div className="p-8 text-muted-foreground">Kraunama…</div>;
  }

  const authorized = role?.isAdmin || role?.roles.includes("housekeeper");
  if (!authorized) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-8">
        <h1 className="text-2xl font-semibold">Prieiga negalima</h1>
        <p className="text-sm text-muted-foreground">
          Susisiekite su administratoriumi, kad jums būtų suteikta tvarkytojos rolė.
        </p>
        <Button variant="outline" onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" /> Atsijungti
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-4 py-3">
        <div className="flex items-center gap-2 font-semibold">
          <Sparkles className="h-5 w-5 text-primary" />
          <span>Kambarių tvarkymas</span>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" /> Atsijungti
        </Button>
      </header>
      <main className="mx-auto max-w-2xl p-4">
        <Outlet />
      </main>
    </div>
  );
}