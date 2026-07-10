import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getPropertyById } from "@/lib/properties.functions";
import {
  propertyTypeLabel,
  isPropertyAvailable,
  nightsBetween,
  priceForNights,
  AMENITY_LABELS,
} from "@/lib/properties";
import { BANKS } from "@/lib/banks";
import { MapPin, Users, BedDouble, Square, Check } from "lucide-react";

export const Route = createFileRoute("/properties/$id")({
  component: PropertyPage,
});

function PropertyPage() {
  const { id } = useParams({ from: "/properties/$id" });
  const fetchOne = useServerFn(getPropertyById);
  const { data: property, isLoading } = useQuery({
    queryKey: ["property", id],
    queryFn: () => fetchOne({ data: { id } }),
  });

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [guests, setGuests] = useState(2);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [bic, setBic] = useState<string>("");
  const [submitState, setSubmitState] = useState<
    | { status: "idle" }
    | { status: "success"; bookingNumber: string; total: number; bank: string | undefined }
    | { status: "error"; message: string }
  >({ status: "idle" });

  const nights = useMemo(() => {
    if (!from || !to) return 0;
    const f = new Date(from);
    const t = new Date(to);
    if (Number.isNaN(f.getTime()) || Number.isNaN(t.getTime()) || t <= f) return 0;
    return nightsBetween(f, t);
  }, [from, to]);

  const priceInfo = useMemo(() => {
    if (!property || nights <= 0) return null;
    return priceForNights(property, nights);
  }, [property, nights]);

  const available = useMemo(() => {
    if (!property || !from || !to || nights <= 0) return true;
    return isPropertyAvailable(property, new Date(from), new Date(to));
  }, [property, from, to, nights]);

  const submit = useMutation({
    mutationFn: async () => {
      if (!property) throw new Error("Objektas neprieinamas");
      if (nights <= 0) throw new Error("Pasirinkite datas");
      if (!available) throw new Error("Pasirinktos datos užimtos");
      if (!name.trim()) throw new Error("Nurodykite vardą");
      const res = await fetch("/api/public/booking-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: property.id,
          date_from: from,
          date_to: to,
          guests,
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          customer_email: email.trim(),
          bic: bic || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Nepavyko pateikti");
      return json as {
        booking_number: string;
        payment_amount: number;
        bic?: string;
      };
    },
    onSuccess: (r) => {
      setSubmitState({
        status: "success",
        bookingNumber: r.booking_number,
        total: r.payment_amount,
        bank: r.bic ? BANKS.find((b) => b.bic === r.bic)?.name : undefined,
      });
    },
    onError: (e: unknown) => {
      setSubmitState({
        status: "error",
        message: e instanceof Error ? e.message : "Klaida",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader variant="solid" />
        <div className="mx-auto max-w-3xl p-8 text-muted-foreground">Kraunama…</div>
      </div>
    );
  }
  if (!property) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader variant="solid" />
        <div className="mx-auto max-w-3xl p-8">
          <h1 className="text-2xl font-semibold">Objektas nerastas</h1>
          <Link to="/" className="mt-4 inline-block text-primary underline">
            Grįžti į pradžią
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader variant="solid" />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            {property.image && (
              <img
                src={property.image}
                alt={property.name}
                className="w-full rounded-xl object-cover aspect-video"
              />
            )}
            {property.images.length > 1 && (
              <div className="grid grid-cols-3 gap-2">
                {property.images.slice(1, 7).map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt={`${property.name} ${i + 2}`}
                    className="aspect-square w-full rounded-lg object-cover"
                    loading="lazy"
                  />
                ))}
              </div>
            )}
            <div>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {propertyTypeLabel(property.propertyType)}
              </span>
              <h1 className="mt-1 text-3xl font-bold">{property.name}</h1>
              {(property.city || property.address) && (
                <p className="mt-2 flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {[property.address, property.city, property.country]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" /> iki {property.maxGuests} svečių
                </span>
                <span className="flex items-center gap-1">
                  <BedDouble className="h-4 w-4" /> {property.beds} lovos
                </span>
                {property.areaM2 ? (
                  <span className="flex items-center gap-1">
                    <Square className="h-4 w-4" /> {property.areaM2} m²
                  </span>
                ) : null}
              </div>
            </div>
            {property.description && (
              <div className="prose max-w-none whitespace-pre-line text-sm text-foreground">
                {property.description}
              </div>
            )}
            {property.amenities.length > 0 && (
              <div>
                <h2 className="mb-2 text-xl font-semibold">Patogumai</h2>
                <ul className="grid grid-cols-2 gap-y-1 text-sm md:grid-cols-3">
                  {property.amenities.map((a) => (
                    <li key={a} className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-primary" /> {AMENITY_LABELS[a] ?? a}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {property.lat != null && property.lng != null && (
              <div>
                <h2 className="mb-2 text-xl font-semibold">Vieta</h2>
                <iframe
                  title="Žemėlapis"
                  className="h-64 w-full rounded-lg border"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${property.lng - 0.005},${property.lat - 0.003},${property.lng + 0.005},${property.lat + 0.003}&layer=mapnik&marker=${property.lat},${property.lng}`}
                />
              </div>
            )}
          </div>

          <aside className="md:col-span-1">
            <div className="sticky top-24 rounded-xl border bg-card p-4 shadow-sm">
              <div className="text-2xl font-bold">
                {property.pricePerNight.toFixed(0)} €{" "}
                <span className="text-sm font-normal text-muted-foreground">/ naktis</span>
              </div>
              {submitState.status === "success" ? (
                <div className="mt-4 space-y-2 rounded-md bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                  <p className="font-semibold">Rezervacija pateikta!</p>
                  <p>Rezervacijos numeris: {submitState.bookingNumber}</p>
                  <p>Suma: {submitState.total.toFixed(2)} €</p>
                  {submitState.bank && <p>Pasirinktas bankas: {submitState.bank}</p>}
                  <p>Susisieksime dėl mokėjimo detalių.</p>
                </div>
              ) : (
                <form
                  className="mt-4 space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    submit.mutate();
                  }}
                >
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs">
                      Atvykimas
                      <input
                        type="date"
                        required
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                        className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                      />
                    </label>
                    <label className="text-xs">
                      Išvykimas
                      <input
                        type="date"
                        required
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                      />
                    </label>
                  </div>
                  <label className="block text-xs">
                    Svečių
                    <input
                      type="number"
                      min={1}
                      max={property.maxGuests}
                      value={guests}
                      onChange={(e) => setGuests(Number(e.target.value))}
                      className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                    />
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Vardas Pavardė"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-md border px-2 py-2 text-sm"
                  />
                  <input
                    type="tel"
                    placeholder="Telefonas"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-md border px-2 py-2 text-sm"
                  />
                  <input
                    type="email"
                    placeholder="El. paštas"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-md border px-2 py-2 text-sm"
                  />
                  <label className="block text-xs">
                    Bankas mokėjimui (pasirinktinai)
                    <select
                      value={bic}
                      onChange={(e) => setBic(e.target.value)}
                      className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
                    >
                      <option value="">— Pasirinkite —</option>
                      {BANKS.map((b) => (
                        <option key={b.bic} value={b.bic}>
                          {b.name} ({b.country})
                        </option>
                      ))}
                    </select>
                  </label>
                  {nights > 0 && priceInfo && (
                    <div className="rounded-md bg-muted p-2 text-sm">
                      {nights} naktys × {priceInfo.pricePerNight.toFixed(0)} € ={" "}
                      <strong>{priceInfo.total.toFixed(0)} €</strong>
                    </div>
                  )}
                  {!available && nights > 0 && (
                    <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                      Pasirinktos datos užimtos.
                    </div>
                  )}
                  {submitState.status === "error" && (
                    <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                      {submitState.message}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={submit.isPending || !available || nights <= 0}
                    className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                  >
                    {submit.isPending ? "Siunčiama…" : "Rezervuoti"}
                  </button>
                  <p className="text-xs text-muted-foreground">
                    Mokėjimas atliekamas rankiniu bankiniu pervedimu. Administratorius patvirtins.
                  </p>
                </form>
              )}
            </div>
          </aside>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}