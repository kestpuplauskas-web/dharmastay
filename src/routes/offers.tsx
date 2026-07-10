import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { listActiveProperties } from "@/lib/properties.functions";
import { PROPERTY_TYPES, propertyTypeLabel } from "@/lib/properties";

export const Route = createFileRoute("/offers")({
  head: () => ({
    meta: [
      { title: "Objektų sąrašas — būstas nuomai" },
      { name: "description", content: "Visi mūsų atostogų būsto pasiūlymai." },
    ],
  }),
  component: OffersPage,
});

function OffersPage() {
  const fetchProps = useServerFn(listActiveProperties);
  const { data: properties = [] } = useQuery({
    queryKey: ["active-properties"],
    queryFn: () => fetchProps(),
  });
  const [type, setType] = useState("");
  const [city, setCity] = useState("");

  const cities = useMemo(() => {
    const set = new Set(properties.map((p) => p.city).filter(Boolean));
    return Array.from(set).sort();
  }, [properties]);

  const filtered = properties.filter(
    (p) => (!type || p.propertyType === type) && (!city || p.city === city),
  );

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader variant="solid" />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-bold">Visi objektai</h1>
        <div className="mt-6 flex flex-wrap gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="">Visi tipai</option>
            {PROPERTY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="">Visi miestai</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Link
              key={p.id}
              to="/properties/$id"
              params={{ id: p.id }}
              className="overflow-hidden rounded-xl border bg-card"
            >
              <div className="aspect-[4/3] w-full bg-muted">
                {p.image && (
                  <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold">{p.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {propertyTypeLabel(p.propertyType)} — {p.city}
                </p>
                <p className="mt-2 font-semibold">{p.pricePerNight.toFixed(0)} € / naktis</p>
              </div>
            </Link>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full text-muted-foreground">Nerasta objektų.</p>
          )}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}