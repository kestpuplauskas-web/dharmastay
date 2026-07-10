import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useLanguageBootstrap } from "@/components/LanguageSwitcher";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title: "Naujienos — Rentivo" },
      { name: "description", content: "Naujausi Rentivo įvykiai, akcijos ir patarimai nuomininkams." },
      { property: "og:title", content: "Naujienos — Rentivo" },
      { property: "og:description", content: "Rentivo naujienos ir straipsniai." },
    ],
  }),
  component: NewsPage,
});

function NewsPage() {
  useLanguageBootstrap();
  const { t } = useTranslation();
  const items = t("news.items", { returnObjects: true }) as { date: string; title: string; excerpt: string }[];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground pt-16 md:pt-20">
      <SiteHeader variant="solid" />
      <main className="flex-1 container mx-auto px-6 py-16 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{t("news.title")}</h1>
        <p className="mt-4 text-xl text-muted-foreground">{t("news.subtitle")}</p>

        <div className="grid gap-5 mt-10">
          {items.map((it) => (
            <Card key={it.title} className="border-border/60">
              <CardContent className="p-6">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{it.date}</div>
                <h3 className="font-semibold text-lg mt-1">{it.title}</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{it.excerpt}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
