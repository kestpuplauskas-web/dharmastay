import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ShieldCheck, Sparkles, Headphones } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useLanguageBootstrap } from "@/components/LanguageSwitcher";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Apie mus — Rentivo" },
      { name: "description", content: "Apie Rentivo: skaidri automobilių nuoma Lietuvoje, patogu, be paslėptų mokesčių." },
      { property: "og:title", content: "Apie mus — Rentivo" },
      { property: "og:description", content: "Mūsų istorija, vertybės ir automobilių parkas." },
    ],
  }),
  component: AboutPage,
});

const ICONS = [<ShieldCheck key="i" />, <Sparkles key="s" />, <Headphones key="h" />];

function AboutPage() {
  useLanguageBootstrap();
  const { t } = useTranslation();
  const values = t("about.valuesList", { returnObjects: true }) as { title: string; text: string }[];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground pt-16 md:pt-20">
      <SiteHeader variant="solid" />
      <main className="flex-1 container mx-auto px-6 py-16 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{t("about.title")}</h1>
        <p className="mt-4 text-xl text-muted-foreground">{t("about.lead")}</p>
        <p className="mt-6 text-base leading-relaxed text-muted-foreground">{t("about.story")}</p>

        <h2 className="text-2xl md:text-3xl font-bold tracking-tight mt-14">{t("about.values")}</h2>
        <div className="grid md:grid-cols-3 gap-5 mt-6">
          {values.map((v, i) => (
            <Card key={v.title} className="border-border/60">
              <CardContent className="p-6">
                <div className="h-11 w-11 rounded-xl grid place-items-center bg-primary/10 text-primary mb-4">
                  {ICONS[i % ICONS.length]}
                </div>
                <h3 className="font-semibold text-lg">{v.title}</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{v.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="mt-12 text-base leading-relaxed text-muted-foreground">{t("about.fleet")}</p>
      </main>
      <SiteFooter />
    </div>
  );
}
