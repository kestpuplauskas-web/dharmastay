import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Phone, Menu, X } from "lucide-react";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { cn } from "@/lib/utils";
import rentivoLogo from "@/assets/rentivo-logo.png";

const PHONE_DISPLAY = "+370 692 49602";
const PHONE_HREF = "tel:+37069249602";

export function SiteHeader({ variant = "overlay" }: { variant?: "overlay" | "solid" }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { location } = useRouterState();
  const onHome = location.pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const propertiesHref = onHome ? "#properties" : "/#properties";

  // solid pages or overlay-after-scroll = light bar; overlay-at-top = transparent over hero
  const isLight = variant === "solid" || scrolled;

  const textCls = isLight ? "text-foreground" : "text-primary-foreground";
  const subTextCls = isLight
    ? "text-muted-foreground hover:text-foreground"
    : "text-primary-foreground/80 hover:text-primary-foreground";

  const wrapCls = cn(
    "fixed top-0 left-0 right-0 z-40 transition-all duration-300",
    isLight
      ? "bg-background/85 backdrop-blur-md border-b border-border/60 shadow-[0_4px_20px_-8px_rgba(15,30,80,0.18)]"
      : "bg-transparent",
  );

  const activeLink = { className: "text-primary font-semibold" } as const;

  return (
    <header className={wrapCls}>
      <div className="container mx-auto flex items-center justify-between gap-4 px-6 h-16 md:h-20">
        <Link to="/" className={cn("flex items-center", textCls)}>
          <span className="inline-flex items-center rounded-xl bg-white/95 px-3 py-1.5 shadow-sm ring-1 ring-white/40">
            <img src={rentivoLogo} alt="Rentivo" className="h-8 md:h-10 w-auto object-contain" />
          </span>
        </Link>

        <nav className={cn("hidden xl:flex items-center gap-7 text-sm font-medium", subTextCls)}>
          <a href={propertiesHref} className="transition">Objektai</a>
          <Link to="/offers" className="transition" activeProps={activeLink}>Pasiūlymai</Link>
          <Link to="/faq" className="transition" activeProps={activeLink}>{t("nav.faq")}</Link>
          <Link to="/about" className="transition" activeProps={activeLink}>{t("nav.about")}</Link>
          <Link to="/contact" className="transition" activeProps={activeLink}>{t("nav.contact")}</Link>
        </nav>

        <div className={cn("hidden xl:flex items-center gap-5", textCls)}>
          <a href={PHONE_HREF} className="flex items-center gap-1.5 text-sm font-semibold transition hover:opacity-80">
            <Phone className="h-4 w-4" />
            {PHONE_DISPLAY}
          </a>
          <LanguageSwitcher />
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn("xl:hidden inline-flex items-center justify-center rounded-lg p-2", textCls)}
          aria-label={t("nav.menu")}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="xl:hidden border-t bg-background shadow-lg">
          <div className="container mx-auto px-6 py-4 flex flex-col gap-3 text-foreground">
            <a href={propertiesHref} onClick={() => setOpen(false)} className="py-2 font-medium">Objektai</a>
            <Link to="/offers" onClick={() => setOpen(false)} className="py-2 font-medium" activeProps={activeLink}>Pasiūlymai</Link>
            <Link to="/faq" onClick={() => setOpen(false)} className="py-2 font-medium" activeProps={activeLink}>{t("nav.faq")}</Link>
            <Link to="/about" onClick={() => setOpen(false)} className="py-2 font-medium" activeProps={activeLink}>{t("nav.about")}</Link>
            <Link to="/contact" onClick={() => setOpen(false)} className="py-2 font-medium" activeProps={activeLink}>{t("nav.contact")}</Link>
            <div className="flex items-center justify-between border-t pt-3 mt-1">
              <a href={PHONE_HREF} className="flex items-center gap-1.5 text-sm font-medium">
                <Phone className="h-4 w-4" /> {PHONE_DISPLAY}
              </a>
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
