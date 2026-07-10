import { createFileRoute, Outlet, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMyRole, claimFirstAdmin } from "@/lib/cars.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  LogOut, Car as CarIcon, Globe, CalendarDays, LayoutDashboard, Wallet, FileText,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin | Rentivo" }] }),
  component: AdminLayout,
});

const MAIN_NAV = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/bookings", label: "Rezervacijos", icon: CalendarDays },
  { to: "/admin/cars", label: "Automobiliai", icon: CarIcon },
  { to: "/admin/contracts", label: "Sutartys", icon: FileText },
  { to: "/admin/expenses", label: "Finansai", icon: Wallet },
] as const;

function AdminSidebar({ onLogout }: { onLogout: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string) => pathname === to || pathname.startsWith(to + "/");

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="border-b">
        <Link to="/admin" className="flex items-center gap-2 px-2 py-2 font-semibold">
          <CarIcon className="h-5 w-5 text-primary" />
          <span>Rentivo Admin</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {MAIN_NAV.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={isActive(item.to)}>
                    <Link to={item.to}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/">
                <Globe className="h-4 w-4" />
                <span>Svetainė</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onLogout}>
              <LogOut className="h-4 w-4" />
              <span>Atsijungti</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function AdminLayout() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const fetchRole = useServerFn(getMyRole);
  const claim = useServerFn(claimFirstAdmin);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
      if (!session) navigate({ to: "/login" });
    });
    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) {
        navigate({ to: "/login" });
        return;
      }
      setUserId(data.user.id);
      setReady(true);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const roleQ = useQuery({
    queryKey: ["my-role", userId],
    queryFn: () => fetchRole(),
    enabled: ready && !!userId,
  });

  const [claiming, setClaiming] = useState(false);
  const onClaim = async () => {
    setClaiming(true);
    try {
      await claim();
      toast.success("Tu esi administratorius!");
      await qc.invalidateQueries({ queryKey: ["my-role"] });
    } catch (e) {
      console.error("claimFirstAdmin error:", e);
      toast.error(e instanceof Error ? e.message : "Klaida");
    } finally {
      setClaiming(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  if (!ready || roleQ.isLoading) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Kraunama...</div>;
  }

  if (!roleQ.data?.isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 space-y-4">
            <h1 className="text-xl font-bold">Reikalingos administratoriaus teisės</h1>
            <p className="text-sm text-muted-foreground">
              Tavo paskyra neturi administratoriaus teisių. Jei tu esi pirmasis vartotojas — paspausk
              mygtuką žemiau, kad taptum administratoriumi. Tai veiks tik kol nėra nė vieno admin.
            </p>
            <div className="flex gap-2">
              <Button onClick={onClaim} disabled={claiming}>{claiming ? "Vykdoma..." : "Tapk administratoriumi"}</Button>
              <Button variant="outline" onClick={logout}>Atsijungti</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "220px" } as React.CSSProperties}
    >
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar onLogout={logout} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="md:hidden h-12 flex items-center border-b bg-card sticky top-0 z-30 px-3">
            <SidebarTrigger />
            <Link to="/admin" className="ml-2 flex items-center gap-2 font-semibold">
              <CarIcon className="h-5 w-5 text-primary" />
              Rentivo Admin
            </Link>
          </header>
          <main className="flex-1 px-4 md:px-6 py-6 md:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
