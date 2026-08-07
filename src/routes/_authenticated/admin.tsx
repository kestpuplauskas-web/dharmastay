import { createFileRoute, Link, Outlet, useRouterState, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Home, Calendar, FileText, Wallet, LayoutDashboard, Globe, LogOut, Building2, Settings2, FileEdit } from "lucide-react";
import { getMyRole } from "@/lib/properties.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const fetchRole = useServerFn(getMyRole);
  const { data: role, isLoading } = useQuery({
    queryKey: ["my-role"],
    queryFn: () => fetchRole(),
    refetchOnMount: "always",
  });
  const { location } = useRouterState();

  if (isLoading) {
    return <div className="p-8 text-muted-foreground">Kraunama…</div>;
  }
  if (!role?.isAdmin) {
    if (role?.roles.includes("housekeeper")) {
      return <Navigate to="/staff" replace />;
    }
    return (
      <div className="mx-auto max-w-md p-8">
        <h1 className="text-2xl font-semibold">Neturite administratoriaus teisių</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Susisiekite su sistemos administratoriumi, kad jums būtų suteiktos teisės.
        </p>
      </div>
    );
  }

  const links = [
    { to: "/admin", label: "Skydelis", icon: LayoutDashboard },
    { to: "/admin/bookings", label: "Rezervacijos", icon: Calendar },
    { to: "/admin/properties", label: "Objektai", icon: Home },
    { to: "/admin/contracts", label: "Sutartys", icon: FileText },
    { to: "/admin/expenses", label: "Finansai", icon: Wallet },
    { to: "/admin/settings", label: "Bendrieji nustatymai", icon: Settings2 },
    { to: "/admin/content", label: "Turinys", icon: FileEdit },
  ] as const;

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="flex w-60 shrink-0 flex-col border-r bg-card">
        <div className="flex items-center gap-2 px-4 py-4 font-semibold">
          <Building2 className="h-5 w-5 text-primary" />
          <span>Rentivo Admin</span>
        </div>
        <nav className="flex-1 space-y-1 px-2">
          {links.map((l) => {
            const Icon = l.icon;
            const active = location.pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                  active
                    ? "bg-accent font-medium text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto space-y-1 border-t px-2 py-3">
          <Link
            to="/"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Globe className="h-4 w-4" />
            Svetainė
          </Link>
          <button
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/";
            }}
          >
            <LogOut className="h-4 w-4" />
            Atsijungti
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}