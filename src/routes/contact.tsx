import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Kontaktai — NT nuomos platforma" },
      { name: "description", content: "Susisiekite su mumis dėl nuomos." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader variant="solid" />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold">Kontaktai</h1>
        <p className="mt-4 text-muted-foreground">
          Susisiekite dėl rezervacijų, apžiūrų ar bendradarbiavimo.
        </p>
        <ul className="mt-4 space-y-1 text-sm">
          <li>Tel.: <a className="text-primary underline" href="tel:+37069249602">+370 692 49602</a></li>
          <li>El. paštas: <a className="text-primary underline" href="mailto:info@example.com">info@example.com</a></li>
        </ul>
      </main>
      <SiteFooter />
    </div>
  );
}