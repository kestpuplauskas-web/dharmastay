import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Apie mus — NT nuomos platforma" },
      { name: "description", content: "Trumpai apie mūsų nuomos paslaugas." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader variant="solid" />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold">Apie mus</h1>
        <p className="mt-4 text-muted-foreground">
          Mes siūlome trumpalaikę ir ilgalaikę atostogų būsto nuomą: apartamentus, vilas,
          atostogų namelius ir svečių namus. Rezervuokite tiesiogiai be tarpininkų.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}