import { createFileRoute, Link, Outlet, useRouterState, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Building2, Calendar, FileEdit, FileText, Globe, Home, LayoutDashboard, LogOut, Menu, Settings2, Sparkles, Wallet } from "lucide-react";
import { getMyRole } from "@/lib/properties.functions";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getPropertySettings } from "@/lib/property-settings.functions";
import { useDefaultLanguage } from "@/hooks/useDefaultLanguage";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { t } = useTranslation();
  useDefaultLanguage();
  const [navOpen, setNavOpen] = useState(false);
  const fetchRole = useServerFn(getMyRole);
  const { data: role, isLoading } = useQuery({
    queryKey: ["my-role"],
    queryFn: () => fetchRole(),
    refetchOnMount: "always",
  });
  const fetchSettings = useServerFn(getPropertySettings);
  const { data: settingsData } = useQuery({
    queryKey: ["property-settings"],
    queryFn: () => fetchSettings(),
  });
  const brandName = settingsData?.settings.displayName?.trim() || "Revoo";
  const { location } = useRouterState();

  if (isLoading) {
    return <div className="p-8 text-muted-foreground">{t("common.loading")}</div>;
  }
  if (!role?.isAdmin) {
    if (role?.roles.includes("housekeeper")) {
      return <Navigate to="/staff" replace />;
    }
    return (
      <div className="mx-auto max-w-md p-8">
        <h1 className="text-2xl font-semibold">{t("admin.noAdminTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("admin.noAdminText")}</p>
      </div>
    );
  }

  const links = [
    { to: "/admin", label: t("nav.dashboard"), icon: LayoutDashboard },
    { to: "/admin/bookings", label: t("nav.bookings"), icon: Calendar },
    { to: "/admin/properties", label: t("nav.properties"), icon: Home },
    { to: "/admin/housekeeping", label: t("nav.housekeeping"), icon: Sparkles },
    { to: "/admin/contracts", label: t("nav.contracts"), icon: FileText },
    { to: "/admin/expenses", label: t("nav.expenses"), icon: Wallet },
    { to: "/admin/settings", label: t("nav.settings"), icon: Settings2 },
    { to: "/admin/content", label: t("nav.content"), icon: FileEdit },
  ] as const;

  const navContent = (
    <>
      <div className="flex items-center gap-2 px-4 py-4 font-semibold">
        <Building2 className="h-5 w-5 text-primary" />
        <span>{brandName}</span>
      </div>
      <nav className="flex-1 space-y-1 px-2">
          {links.map((l) => {
            const Icon = l.icon;
            const active = location.pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setNavOpen(false)}
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
          <LanguageSwitcher />
          <a
            href="https://dharma.revoo.lt/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setNavOpen(false)}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Globe className="h-4 w-4" />
            {t("nav.website")}
          </a>
          <button
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={async () => {
              setNavOpen(false);
              await supabase.auth.signOut();
              window.location.href = "/";
            }}
          >
            <LogOut className="h-4 w-4" />
            {t("nav.signOut")}
          </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen w-full flex-col bg-background md:flex-row">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-card md:flex">
        {navContent}
      </aside>

      <header className="sticky top-0 z-40 flex items-center gap-2 border-b bg-card px-3 py-2 md:hidden">
        <Sheet open={navOpen} onOpenChange={setNavOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label={t("nav.dashboard")}
              className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="flex w-72 flex-col p-0">
            <SheetTitle className="sr-only">{brandName}</SheetTitle>
            {navContent}
          </SheetContent>
        </Sheet>
        <span className="min-w-0 flex-1 truncate font-semibold">{brandName}</span>
        <div className="shrink-0">
          <LanguageSwitcher />
        </div>
      </header>

      <main className="flex-1 overflow-x-hidden px-4 py-4 md:px-6 md:py-6">
        <Outlet />
      </main>
    </div>
  );
}