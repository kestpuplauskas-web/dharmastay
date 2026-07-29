import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { listActiveProperties } from "@/lib/properties.functions";
import { propertyTypeLabel } from "@/lib/properties";
import { MapPin, Users, BedDouble, Bed, Square } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nuomos platforma — būstas nuomai Lietuvoje" },
      {
        name: "description",
        content:
          "Atostogų būsto nuoma: apartamentai, vilos, atostogų nameliai, svečių namai ir viešbučiai. Rezervuokite tiesiogiai.",
      },
      { property: "og:title", content: "Nuomos platforma — būstas nuomai" },
      {
        property: "og:description",
        content: "Apartamentų, vilų ir atostogų namelių nuoma.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const fetchProps = useServerFn(listActiveProperties);
  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["active-properties"],
    queryFn: () => fetchProps(),
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader variant="overlay" />
      <section className="relative isolate flex min-h-[72vh] items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 px-4 text-white">
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Atostogų būstas visoje Lietuvoje
          </h1>
          <p className="mt-4 text-lg text-slate-200">
            Apartamentai, vilos, atostogų nameliai ir svečių namai. Užsakykite tiesiogiai — be
            tarpininkų.
          </p>
          <a
            href="#properties"
            className="mt-8 inline-flex items-center rounded-full bg-white px-6 py-3 font-medium text-slate-900 transition hover:bg-slate-100"
          >
            Peržiūrėti objektus
          </a>
        </div>
      </section>

      <section id="properties" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-8 text-3xl font-bold tracking-tight">Mūsų objektai</h2>
        {isLoading ? (
          <div className="text-muted-foreground">Kraunama…</div>
        ) : properties.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            Kol kas nėra paskelbtų objektų.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((p) => (
              <Link
                key={p.id}
                to="/properties/$id"
                params={{ id: p.id }}
                className="group overflow-hidden rounded-xl border bg-card shadow-sm transition hover:shadow-md"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={p.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      Nėra nuotraukos
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold">{p.name}</h3>
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      {propertyTypeLabel(p.propertyType)}
                    </span>
                  </div>
                  {(p.city || p.address) && (
                    <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {[p.city, p.country].filter(Boolean).join(", ")}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> {p.maxGuests}
                    </span>
                    <span className="flex items-center gap-1">
                      {hasOnlySingleBeds(p.rooms) ? (
                        <Bed className="h-3 w-3" />
                      ) : (
                        <BedDouble className="h-3 w-3" />
                      )}{" "}
                      {p.beds}
                    </span>
                    {p.areaM2 ? (
                      <span className="flex items-center gap-1">
                        <Square className="h-3 w-3" /> {p.areaM2} m²
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-4 text-lg font-semibold">
                    {p.pricePerNight.toFixed(0)} € <span className="text-sm font-normal text-muted-foreground">/ naktis</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}