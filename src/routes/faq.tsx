import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [{ title: "D.U.K. — NT nuoma" }],
  }),
  component: FaqPage,
});

const items = [
  { q: "Kaip užsakyti būstą?", a: "Pasirinkite objektą, datas ir svečių skaičių, užpildykite formą — administratorius patvirtins ir atsiųs mokėjimo detales." },
  { q: "Kaip mokėti?", a: "Mokėjimas atliekamas bankiniu pervedimu į mūsų sąskaitą. Rezervacija patvirtinama gavus mokėjimą." },
  { q: "Ar galiu atšaukti rezervaciją?", a: "Susisiekite su mumis kuo greičiau — atšaukimo sąlygos priklauso nuo datų." },
];

function FaqPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader variant="solid" />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold">Dažniausiai užduodami klausimai</h1>
        <div className="mt-6 space-y-4">
          {items.map((it) => (
            <div key={it.q} className="rounded-lg border p-4">
              <h2 className="font-semibold">{it.q}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{it.a}</p>
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}