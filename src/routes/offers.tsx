import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Tag, Percent, CalendarDays } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useLanguageBootstrap } from "@/components/LanguageSwitcher";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/offers")({
  head: () => ({
    meta: [
      { title: "Specialūs pasiūlymai — Rentivo" },
      { name: "description", content: "Sezoniniai pasiūlymai ir nuolaidos automobilių nuomai Rentivo." },
      { property: "og:title", content: "Specialūs pasiūlymai — Rentivo" },
      { property: "og:description", content: "Akcijos, nuolaidos ilgesnei nuomai ir sezoniniai pasiūlymai." },
    ],
  }),
  component: OffersPage,
});

const ICONS = [<Percent key="p" />, <CalendarDays key="c" />, <Tag key="t" />];

function OffersPage() {
  useLanguageBootstrap();
  const { t } = useTranslation();
  const items = t("offers.items", { returnObjects: true }) as { title: string; text: string; badge: string }[];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground pt-16 md:pt-20">
      <SiteHeader variant="solid" />
      <main className="flex-1 container mx-auto px-6 py-16 max-w-5xl">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{t("offers.title")}</h1>
        <p className="mt-4 text-xl text-muted-foreground">{t("offers.subtitle")}</p>

        <div className="grid md:grid-cols-3 gap-5 mt-10">
          {items.map((it, i) => (
            <Card key={it.title} className="border-border/60">
              <CardContent className="p-6">
                <div className="h-11 w-11 rounded-xl grid place-items-center bg-primary/10 text-primary mb-4">
                  {ICONS[i % ICONS.length]}
                </div>
                <span className="inline-block text-xs font-semibold uppercase tracking-wide text-primary mb-2">
                  {it.badge}
                </span>
                <h3 className="font-semibold text-lg">{it.title}</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{it.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="mt-12 text-sm text-muted-foreground">{t("offers.footnote")}</p>
      </main>
      <SiteFooter />
    </div>
  );
}
