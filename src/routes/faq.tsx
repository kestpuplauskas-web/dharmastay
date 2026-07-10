import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useLanguageBootstrap } from "@/components/LanguageSwitcher";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "Sąlygos ir D.U.K. — Rentivo" },
      { name: "description", content: "Dažniausiai užduodami klausimai apie automobilių nuomą Rentivo: dokumentai, depozitas, draudimas, atšaukimo sąlygos." },
      { property: "og:title", content: "Sąlygos ir D.U.K. — Rentivo" },
      { property: "og:description", content: "Atsakymai į pagrindinius automobilių nuomos klausimus." },
    ],
  }),
  component: FaqPage,
});

function FaqPage() {
  useLanguageBootstrap();
  const { t } = useTranslation();
  const items = t("faq.items", { returnObjects: true }) as { q: string; a: string }[];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground pt-16 md:pt-20">
      <SiteHeader variant="solid" />
      <main className="flex-1 container mx-auto px-6 py-16 max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{t("faq.title")}</h1>
        <p className="mt-3 text-muted-foreground text-lg">{t("faq.subtitle")}</p>
        <Accordion type="single" collapsible className="mt-10 border rounded-2xl divide-y">
          {items.map((item, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border-0 px-5">
              <AccordionTrigger className="text-base font-medium text-left">{item.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-3">
                {item.a.split("\n\n").map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </main>
      <SiteFooter />
    </div>
  );
}
