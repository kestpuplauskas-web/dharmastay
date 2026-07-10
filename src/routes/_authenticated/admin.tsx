import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyRole, claimFirstAdmin } from "@/lib/properties.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const fetchRole = useServerFn(getMyRole);
  const claim = useServerFn(claimFirstAdmin);
  const { data: role, isLoading, refetch } = useQuery({
    queryKey: ["my-role"],
    queryFn: () => fetchRole(),
  });
  const { location } = useRouterState();

  if (isLoading) {
    return <div className="p-8 text-muted-foreground">Kraunama…</div>;
  }
  if (!role?.isAdmin) {
    return (
      <div className="mx-auto max-w-md p-8">
        <h1 className="text-2xl font-semibold">Neturite administratoriaus teisių</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Jei projektas naujas — galite tapti pirmuoju administratoriumi.
        </p>
        <button
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
          onClick={async () => {
            try {
              await claim();
              await refetch();
            } catch (e) {
              alert(e instanceof Error ? e.message : "Klaida");
            }
          }}
        >
          Tapti pirmuoju administratoriumi
        </button>
      </div>
    );
  }

  const links: Array<{ to: string; label: string }> = [
    { to: "/admin", label: "Skydas" },
    { to: "/admin/properties", label: "Objektai" },
    { to: "/admin/bookings", label: "Rezervacijos" },
    { to: "/admin/expenses", label: "Išlaidos" },
    { to: "/admin/contracts", label: "Sutartys" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/admin" className="font-semibold">
            NT Admin
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={
                  location.pathname === l.to
                    ? "font-medium text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }
              >
                {l.label}
              </Link>
            ))}
            <button
              className="text-muted-foreground hover:text-foreground"
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/";
              }}
            >
              Atsijungti
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}