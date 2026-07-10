import { createFileRoute, useNavigate, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { format } from "date-fns";
import { lt as ltLocale, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useLanguageBootstrap } from "@/components/LanguageSwitcher";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  MapPin,
  Users,
  Fuel,
  Settings2,
  Gauge,
  CalendarDays,
  Droplet,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { DateRangePicker } from "@/components/DateRangePicker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { LOCATIONS, daysBetween, priceForDays, type Car } from "@/lib/cars";
import { trDb } from "@/lib/db-translate";
import { getCarById } from "@/lib/cars.functions";
import { getActiveContractTemplatePublic } from "@/lib/contracts.functions";
import { useQuery } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import type { CountryCode } from "libphonenumber-js";
import { PhoneInput } from "@/components/PhoneInput";
import {
  validateName,
  validatePhone,
  validateAddress,
  validateCity,
  normalizePhoneE164,
} from "@/lib/booking-validation";
import { BANKS } from "@/lib/banks";
import { BankLogo } from "@/components/BankLogo";

const ADDONS: { id: string; i18nKey: string; label: string; price: number; unit: "fixed" | "perDay" | "perQty" }[] = [
  { id: "clean", i18nKey: "detail.addonItems.clean", label: "Automobilio valymas po nuomos", price: 19.99, unit: "fixed" },
  { id: "roadside", i18nKey: "detail.addonItems.roadside", label: "Pagalba kelyje", price: 2.5, unit: "perDay" },
  { id: "fullprotect", i18nKey: "detail.addonItems.fullprotect", label: "Pilnas apsaugos paketas, išskaita nėra taikoma", price: 10, unit: "perDay" },
  { id: "seat15-36", i18nKey: "detail.addonItems.seat15_36", label: "Kėdutė vaikams (15–36 kg)", price: 3, unit: "perQty" },
  { id: "seat9-25", i18nKey: "detail.addonItems.seat9_25", label: "Kėdutė vaikams (9–25 kg)", price: 3, unit: "perQty" },
  { id: "seat0-13", i18nKey: "detail.addonItems.seat0_13", label: "Kūdikio kėdutė (0–13 kg)", price: 3, unit: "perQty" },
];

const fmt = (n: number) => n.toFixed(2).replace(".", ",") + " €";

// Darbo valandos: 08:00–18:00 kas 30 min, kitu metu kas 1 val.
const TIME_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    const isWork = h >= 8 && h < 18;
    if (isWork) {
      out.push(`${String(h).padStart(2, "0")}:00`);
      out.push(`${String(h).padStart(2, "0")}:30`);
    } else {
      out.push(`${String(h).padStart(2, "0")}:00`);
    }
  }
  return out;
})();


const searchSchema = z.object({
  location: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const Route = createFileRoute("/cars/$carId")({
  validateSearch: searchSchema,
  loader: async ({ params }) => {
    const car = await getCarById({ data: { id: params.carId } });
    if (!car) throw notFound();
    return { car };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.car.name} — nuoma | Rentivo` },
          { name: "description", content: `Išsinuomokite ${loaderData.car.name} (${loaderData.car.year}). ${loaderData.car.transmission}, ${loaderData.car.fuel}, ${loaderData.car.seats} vietos. Nuo ${loaderData.car.pricePerDay}€/d.` },
        ]
      : [{ title: "Automobilis | Rentivo" }],
  }),
  component: CarDetail,
  notFoundComponent: () => (
    <div className="container mx-auto px-6 py-20 text-center">
      <h1 className="text-2xl font-bold">Automobilis nerastas</h1>
      <Link to="/" className="text-primary underline mt-4 inline-block">Grįžti į pagrindinį</Link>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="container mx-auto px-6 py-20 text-center">
      <h1 className="text-2xl font-bold">Įvyko klaida</h1>
      <p className="text-muted-foreground mt-2">{error.message}</p>
    </div>
  ),
});

function CarDetail() {
  useLanguageBootstrap();
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith("en") ? enUS : ltLocale;
  const { car } = Route.useLoaderData() as { car: Car };
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/cars/$carId" });

  const [activeImage, setActiveImage] = useState(0);
  const [location, setLocation] = useState<string>(search.location ?? "");
  const [returnLocation, setReturnLocation] = useState<string>(search.location ?? "");
  const [from, setFrom] = useState<Date | undefined>(search.from ? new Date(search.from) : undefined);
  const [to, setTo] = useState<Date | undefined>(search.to ? new Date(search.to) : undefined);
  const [fromTime, setFromTime] = useState<string>("10:00");
  const [toTime, setToTime] = useState<string>("10:00");
  const [addonSel, setAddonSel] = useState<Record<string, boolean>>({});
  const [addonQty, setAddonQty] = useState<Record<string, number>>({});

  const [bookingOpen, setBookingOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [agree, setAgree] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const termsLanguage: "lt" | "en" = i18n.language?.startsWith("en") ? "en" : "lt";
  const { data: termsTemplate, isLoading: termsLoading } = useQuery({
    queryKey: ["active-contract-template", termsLanguage, "rental"],
    queryFn: () => getActiveContractTemplatePublic({ data: { language: termsLanguage, kind: "rental" } }),
    enabled: termsOpen,
    staleTime: 5 * 60_000,
  });
  const { data: privacyTemplate, isLoading: privacyLoading } = useQuery({
    queryKey: ["active-contract-template", termsLanguage, "privacy"],
    queryFn: () => getActiveContractTemplatePublic({ data: { language: termsLanguage, kind: "privacy" } }),
    enabled: privacyOpen,
    staleTime: 5 * 60_000,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [paymentOption, setPaymentOption] = useState<"full" | "deposit">("full");
  const DEPOSIT_PCT = 10;
  const [selectedBic, setSelectedBic] = useState<string>("HABALT22");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    country: "Lietuva",
    address: "",
    city: "",
    message: "",
  });
  const [phoneCountry, setPhoneCountry] = useState<CountryCode>("LT");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  function runValidate(name: string, value: string): string | null {
    switch (name) {
      case "firstName": return validateName(value, t("booking.firstName"));
      case "lastName": return validateName(value, t("booking.lastName"));
      case "phone": return validatePhone(value, phoneCountry);
      case "email": {
        const v = value.trim();
        if (!v) return t("booking.emailRequired");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return t("booking.emailInvalid");
        return null;
      }
      case "address": return validateAddress(value);
      case "city": return validateCity(value);
      default: return null;
    }
  }

  function setField(name: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [name]: value }));
    if (touched[name]) {
      setFieldErrors((e) => ({ ...e, [name]: runValidate(name, value) }));
    }
  }

  function blurField(name: string) {
    setTouched((t) => ({ ...t, [name]: true }));
    setFieldErrors((e) => ({ ...e, [name]: runValidate(name, (form as Record<string, string>)[name] ?? "") }));
  }

  function validateAll(): boolean {
    const fields = ["firstName", "lastName", "phone", "email", "address", "city"] as const;
    const next: Record<string, string | null> = {};
    let ok = true;
    for (const f of fields) {
      const err = runValidate(f, (form as Record<string, string>)[f] ?? "");
      next[f] = err;
      if (err) ok = false;
    }
    setFieldErrors(next);
    setTouched(Object.fromEntries(fields.map((f) => [f, true])));
    if (!ok) {
      const first = fields.find((f) => next[f]);
      if (first) {
        const el = document.getElementById(first);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        (el as HTMLInputElement | null)?.focus?.();
      }
    }
    return ok;
  }

  const formValid =
    !!form.firstName.trim() &&
    !!form.lastName.trim() &&
    !!form.phone.trim() &&
    !!form.email.trim() &&
    !!form.country.trim() &&
    !!form.address.trim() &&
    !!form.city.trim() &&
    agree;


  const hasDates = !!(from && to && to >= from);
  const days = hasDates ? daysBetween(from!, to!) : 0;
  const pricing = hasDates ? priceForDays(car, days) : null;

  // Užimtos datos iš jau egzistuojančių rezervacijų
  const busyDates = useMemo(() => {
    const out: Date[] = [];
    for (const b of car.bookings ?? []) {
      const start = new Date(b.from + "T00:00:00");
      const end = new Date(b.to + "T00:00:00");
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        out.push(new Date(d));
      }
    }
    return out;
  }, [car.bookings]);

  const rangeSummary = hasDates && pricing
    ? `${days} ${days === 1 ? t("common.day") : days < 10 ? t("common.days_few") : t("common.days_many")} · ${pricing.total.toFixed(0)} €`
    : undefined;

  const addonsTotal = useMemo(() => {
    return ADDONS.reduce((sum, a) => {
      if (a.unit === "perQty") {
        const q = addonQty[a.id] ?? 0;
        return sum + a.price * q * Math.max(days, 1);
      }
      if (!addonSel[a.id]) return sum;
      if (a.unit === "perDay") return sum + a.price * Math.max(days, 1);
      return sum + a.price;
    }, 0);
  }, [addonSel, addonQty, days]);

  const locationFee = useMemo(
    () => LOCATIONS.find((l) => l.name === location)?.fee ?? 0,
    [location]
  );
  const returnFee = useMemo(
    () => LOCATIONS.find((l) => l.name === returnLocation)?.fee ?? 0,
    [returnLocation]
  );

  const grandTotal = (pricing?.total ?? 0) + addonsTotal + locationFee + returnFee;


  const tierIndex = useMemo(() => {
    if (!pricing) return -1;
    return car.priceTiers.findIndex((t) => t === pricing.tier);
  }, [pricing, car.priceTiers]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader variant="solid" />

      <div className="container mx-auto px-6 py-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-1" /> {t("common.back")}
          </Link>
        </Button>
      </div>

      <div className="container mx-auto px-6 py-8 lg:py-12">
        <div className="grid lg:grid-cols-[1.4fr,1fr] gap-10">
          {/* Left column: gallery + features */}
          <div>
            <Badge variant="secondary" className="mb-3 rounded-full">{trDb(car.category, i18n.language)}</Badge>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{car.name}</h1>
            <p className="text-muted-foreground mt-1">{car.year}{i18n.language?.startsWith("en") ? "" : " m."} · {trDb(car.transmission, i18n.language)} · {trDb(car.fuel, i18n.language)}</p>

            {/* Gallery */}
            <div className="mt-6">
              <div className="aspect-[16/10] rounded-2xl overflow-hidden bg-muted shadow-[var(--shadow-card)]">
                <img
                  src={car.images[activeImage]}
                  alt={`${car.name} – ${activeImage + 1} nuotrauka`}
                  width={1200}
                  height={750}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="grid grid-cols-4 gap-3 mt-3">
                {car.images.map((src, i) => (
                  <button
                    key={src + i}
                    onClick={() => setActiveImage(i)}
                    className={cn(
                      "aspect-[16/10] rounded-lg overflow-hidden bg-muted ring-2 transition",
                      i === activeImage ? "ring-primary" : "ring-transparent hover:ring-border"
                    )}
                  >
                    <img
                      src={src}
                      alt=""
                      width={300}
                      height={188}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Specs */}
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">{t("detail.mainSpecs")}</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <SpecCard icon={<CalendarDays className="h-4 w-4" />} label={t("detail.year")} value={String(car.year)} />
                <SpecCard icon={<Settings2 className="h-4 w-4" />} label={t("detail.transmission")} value={trDb(car.transmission, i18n.language)} />
                <SpecCard icon={<Fuel className="h-4 w-4" />} label={t("detail.fuel")} value={trDb(car.fuel, i18n.language)} />
                <SpecCard icon={<Droplet className="h-4 w-4" />} label={t("detail.consumption")} value={car.consumption} />
                <SpecCard icon={<Gauge className="h-4 w-4" />} label={t("detail.mileage")} value={trDb(car.mileagePolicy, i18n.language)} />
                <SpecCard icon={<Users className="h-4 w-4" />} label={t("detail.seats")} value={`${car.seats}`} />
              </div>
            </div>

            {/* Features accordion */}
            <div className="mt-10">
              <h2 className="text-xl font-semibold mb-4">{t("detail.equipment")}</h2>
              <Accordion type="multiple" className="border rounded-xl divide-y">
                {car.features.map((g) => (
                  <AccordionItem key={g.title} value={g.title} className="border-0 px-4">
                    <AccordionTrigger className="text-base font-medium">{trDb(g.title, i18n.language)}</AccordionTrigger>
                    <AccordionContent>
                      <ul className="grid sm:grid-cols-2 gap-2 pb-2">
                        {g.items.map((it) => (
                          <li key={it} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                            <span>{trDb(it, i18n.language)}</span>
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>

          {/* Right column: booking */}
          <aside className="lg:sticky lg:top-24 self-start space-y-6">
            <Card className="border shadow-[var(--shadow-elegant)]">
              <CardContent className="p-5 space-y-4">
                {hasDates && (
                  <div className="flex items-end justify-end">
                    <Badge variant="secondary" className="rounded-full">
                      {days} {days === 1 ? t("common.day") : days < 10 ? t("common.days_few") : t("common.days_many")}
                    </Badge>
                  </div>
                )}


                <Field label={t("detail.pickup")} icon={<MapPin className="h-4 w-4" />}>
                  <Select value={location} onValueChange={setLocation}>
                    <SelectTrigger className="border-0 bg-transparent px-0 text-base font-medium shadow-none focus:ring-0 h-auto">
                      <SelectValue placeholder={t("common.selectCity")} />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCATIONS.map((l) => (
                        <SelectItem key={l.name} value={l.name}>{l.name} ({l.fee} Eur)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label={t("detail.return")} icon={<MapPin className="h-4 w-4" />}>
                  <Select value={returnLocation} onValueChange={setReturnLocation}>
                    <SelectTrigger className="border-0 bg-transparent px-0 text-base font-medium shadow-none focus:ring-0 h-auto">
                      <SelectValue placeholder={t("common.selectCity")} />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCATIONS.map((l) => (
                        <SelectItem key={l.name} value={l.name}>{l.name} ({l.fee} Eur)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <div className="space-y-3">
                  <DateRangePicker
                    value={{ from, to }}
                    onChange={(r) => {
                      setFrom(r.from);
                      setTo(r.to);
                    }}
                    disabledDates={busyDates}
                    summary={rangeSummary}
                    placeholder={t("detail.selectLocationDates")}
                    dateLocale={dateLocale}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={t("detail.from")} icon={<CalendarIcon className="h-4 w-4" />}>
                      <TimeSelect value={fromTime} onChange={setFromTime} />
                    </Field>
                    <Field label={t("detail.to")} icon={<CalendarIcon className="h-4 w-4" />}>
                      <TimeSelect value={toTime} onChange={setToTime} />
                    </Field>
                  </div>
                </div>

              </CardContent>
            </Card>

            {/* Additional services */}
            <Card className="border">
              <CardContent className="p-5">
                <h3 className="font-semibold text-lg">{t("detail.addons")}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("detail.addonsSubtitle")}
                </p>
                <ul className="mt-4 divide-y">
                  {ADDONS.map((a) => {
                    const isQty = a.unit === "perQty";
                    const checked = !!addonSel[a.id];
                    const qty = addonQty[a.id] ?? 0;
                    const lineTotal =
                      a.unit === "perQty"
                        ? a.price * qty * Math.max(days, 1)
                        : checked
                        ? a.unit === "perDay"
                          ? a.price * Math.max(days, 1)
                          : a.price
                        : 0;
                    return (
                      <li key={a.id} className="py-3 flex items-center gap-3">
                        {isQty ? (
                          <div className="w-5 h-5 shrink-0" />
                        ) : (
                          <Checkbox
                            id={`addon-${a.id}`}
                            checked={checked}
                            onCheckedChange={(v) =>
                              setAddonSel((s) => ({ ...s, [a.id]: !!v }))
                            }
                          />
                        )}
                        <label
                          htmlFor={isQty ? undefined : `addon-${a.id}`}
                          className="flex-1 text-sm leading-tight cursor-pointer"
                        >
                          <div className="font-medium">{t(a.i18nKey)}</div>
                          <div className="text-xs text-muted-foreground">
                            {fmt(a.price)}
                            {a.unit === "perDay" && t("detail.perDayShort")}
                            {a.unit === "perQty" && t("detail.perDayQty")}
                          </div>
                        </label>
                        {isQty ? (
                          <Input
                            type="number"
                            min={0}
                            max={9}
                            value={qty || ""}
                            placeholder="0"
                            onChange={(e) => {
                              const n = Math.max(0, Math.min(9, parseInt(e.target.value) || 0));
                              setAddonQty((s) => ({ ...s, [a.id]: n }));
                            }}
                            className="w-16 h-9 text-center"
                          />
                        ) : (
                          <div className="text-sm font-semibold tabular-nums w-20 text-right">
                            {lineTotal > 0 ? fmt(lineTotal) : "—"}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {addonsTotal > 0 && (
                  <div className="mt-4 pt-4 border-t flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t("detail.addonsTotal")}</span>
                    <span className="font-bold text-lg">{fmt(addonsTotal)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Booking summary */}
            <Card className="border shadow-[var(--shadow-elegant)]">
              <CardContent className="p-5 space-y-4">
                {hasDates && pricing && (
                  <div className="rounded-xl bg-secondary/50 p-4 space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("detail.rateLine", { label: trDb(pricing.tier.label, i18n.language) })}</span>
                      <span className="font-medium">{pricing.tier.pricePerDay}€ / d.</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{days} × {pricing.tier.pricePerDay}€</span>
                      <span className="font-medium">{pricing.total}€</span>
                    </div>
                    {addonsTotal > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("detail.addons")}</span>
                        <span className="font-medium">{fmt(addonsTotal)}</span>
                      </div>
                    )}
                    {locationFee > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("detail.pickupFee", { name: location })}</span>
                        <span className="font-medium">{fmt(locationFee)}</span>
                      </div>
                    )}
                    {returnFee > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("detail.returnFee", { name: returnLocation })}</span>
                        <span className="font-medium">{fmt(returnFee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 mt-2 border-t">
                      <span className="font-semibold">{t("common.total")}</span>
                      <span className="font-bold text-xl text-primary">{fmt(grandTotal)}</span>
                    </div>
                  </div>
                )}

                <Button
                  className="w-full h-12 rounded-xl"
                  disabled={!hasDates || !location}
                  onClick={() => setBookingOpen(true)}
                >
                  {!location ? t("detail.selectLocation") : !hasDates ? t("detail.selectDates") : t("detail.reserveBtn")}
                </Button>


              </CardContent>
            </Card>


            {/* Price tier table */}
            <Card className="border">
              <CardContent className="p-5">
                <h3 className="font-semibold text-lg">{t("detail.priceList")}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("detail.priceListHint")}
                </p>
                <div className="mt-4 divide-y">
                  {car.priceTiers.map((tier, i) => {
                    const active = i === tierIndex;
                    return (
                      <div
                        key={tier.label}
                        className={cn(
                          "flex items-center justify-between py-2.5 px-3 rounded-lg transition",
                          active && "bg-primary/10"
                        )}
                      >
                        <span className={cn("text-sm", active && "font-semibold text-primary")}>
                          {trDb(tier.label, i18n.language)}
                        </span>
                        <span className={cn("text-sm tabular-nums", active ? "font-bold text-primary" : "font-medium")}>
                          {tier.pricePerDay},00 €
                        </span>
                      </div>
                    );
                  })}
                </div>
                {hasDates && pricing && (
                  <div className="mt-4 pt-4 border-t flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t("detail.yourChoice", { days })}
                    </span>
                    <span className="font-bold text-lg">{pricing.total}€</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("booking.title")}</DialogTitle>
            <DialogDescription>{t("booking.subtitle")}</DialogDescription>
          </DialogHeader>
          <div className="grid lg:grid-cols-[1fr,1.15fr] gap-6">
            {/* Left: summary of selections */}
            <aside className="space-y-4">
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="flex gap-3 p-3">
                  <div className="w-28 h-20 rounded-lg overflow-hidden bg-muted shrink-0">
                    <img src={car.images[0]} alt={car.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold leading-tight">{car.name}</div>
                    <div className="text-xs text-muted-foreground">{trDb(car.category, i18n.language)}</div>
                    {location && (
                      <div className="mt-1 flex items-start gap-1 text-xs text-primary">
                        <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <span>{t("detail.pickup")}: {location}</span>
                      </div>
                    )}
                    {returnLocation && (
                      <div className="mt-1 flex items-start gap-1 text-xs text-primary">
                        <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <span>{t("detail.return")}: {returnLocation}</span>
                      </div>
                    )}
                  </div>
                </div>
                {hasDates && pricing && (
                  <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
                    <div className="text-sm font-semibold leading-tight">
                      {t("detail.rateLine", { label: `${days} ${days === 1 ? t("common.day") : t("common.days_many")}` })}
                    </div>
                    <div className="font-bold text-lg whitespace-nowrap">{fmt(pricing.total)}</div>
                  </div>
                )}
                <div className="p-4 space-y-2 text-sm">
                  {(() => {
                    const lines: { label: string; value: string }[] = [];
                    for (const a of ADDONS) {
                      const aLabel = t(a.i18nKey);
                      if (a.unit === "perQty") {
                        const q = addonQty[a.id] ?? 0;
                        if (q > 0) lines.push({ label: `${aLabel} × ${q}`, value: fmt(a.price * q * Math.max(days, 1)) });
                      } else if (addonSel[a.id]) {
                        const v = a.unit === "perDay" ? a.price * Math.max(days, 1) : a.price;
                        lines.push({ label: aLabel, value: fmt(v) });
                      }
                    }
                    if (locationFee > 0) lines.push({ label: t("detail.pickupFee", { name: location }), value: fmt(locationFee) });
                    if (returnFee > 0) lines.push({ label: t("detail.returnFee", { name: returnLocation }), value: fmt(returnFee) });
                    return lines.length === 0 ? (
                      <div className="text-xs text-muted-foreground">—</div>
                    ) : (
                      lines.map((l, i) => (
                        <div key={i} className="flex justify-between gap-2">
                          <span className="text-muted-foreground">{l.label}</span>
                          <span className="font-medium tabular-nums whitespace-nowrap">{l.value}</span>
                        </div>
                      ))
                    );
                  })()}
                  <div className="pt-3 mt-2 border-t flex items-center justify-between">
                    <span className="font-semibold">{t("common.total")}</span>
                    <span className="font-bold text-xl text-primary">{fmt(grandTotal)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-secondary/40 p-4 text-sm space-y-1">
                <div className="font-medium">
                  {location || "—"}
                  {returnLocation && returnLocation !== location ? ` → ${returnLocation}` : ""}
                </div>
                <div className="text-muted-foreground text-xs">
                  {from ? format(from, "yyyy-MM-dd") : "—"} {fromTime} — {to ? format(to, "yyyy-MM-dd") : "—"} {toTime}
                </div>
              </div>
            </aside>

            {/* Right: form */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (submitting) return;
                if (!agree) {
                  setSubmitError(t("booking.confirmAgree"));
                  return;
                }
                if (!validateAll()) {
                  setSubmitError(t("booking.checkFields"));
                  return;
                }
                setSubmitError(null);
                setSubmitting(true);
                try {
                  const selectedAddons: string[] = [];
                  for (const a of ADDONS) {
                    if (a.unit === "perQty") {
                      const q = addonQty[a.id] ?? 0;
                      if (q > 0) selectedAddons.push(`${a.label} × ${q}`);
                    } else if (addonSel[a.id]) {
                      selectedAddons.push(a.label);
                    }
                  }
                  const phoneE164 = normalizePhoneE164(form.phone, phoneCountry) ?? form.phone.trim();
                  const res = await fetch("/api/public/booking-submit", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      carId: car.id,
                      carName: car.name,
                      location,
                      returnLocation,
                      dateFrom: from ? format(from, "yyyy-MM-dd") : "",
                      dateTo: to ? format(to, "yyyy-MM-dd") : "",
                      timeFrom: fromTime,
                      timeTo: toTime,
                      days,
                      total: grandTotal,
                      addons: selectedAddons,
                      firstName: form.firstName.trim(),
                      lastName: form.lastName.trim(),
                      email: form.email.trim(),
                      phone: phoneE164,
                      phoneCountry,
                      country: form.country.trim(),
                      address: form.address.trim(),
                      city: form.city.trim(),
                      message: form.message.trim(),
                      agree: true,
                      paymentOption,
                      bic: selectedBic,
                    }),
                  });
                  if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    const code = data?.code as string | undefined;
                    if (code === "invalid_email_domain" || code === "disposable_email") {
                      setFieldErrors((errs) => ({
                        ...errs,
                        email: t("booking.invalidEmail"),
                      }));
                      setTouched((t) => ({ ...t, email: true }));
                    }
                    throw new Error(data?.error ?? t("booking.submitFailed"));
                  }
                  await res.json().catch(() => ({}));
                  setBookingOpen(false);
                  setSuccessOpen(true);
                  setAgree(false);
                } catch (err) {
                  setSubmitError(err instanceof Error ? err.message : t("booking.error"));
                } finally {
                  setSubmitting(false);
                }
              }}
              className="grid md:grid-cols-2 gap-4"
            >
              <div className="space-y-2">
                <Label htmlFor="firstName">{t("booking.firstName")} <span className="text-destructive">*</span></Label>
                <Input
                  id="firstName"
                  required
                  value={form.firstName}
                  onChange={(e) => setField("firstName", e.target.value)}
                  onBlur={() => blurField("firstName")}
                  className={cn(fieldErrors.firstName && "border-destructive focus-visible:ring-destructive")}
                />
                {fieldErrors.firstName && <p className="text-xs text-destructive">{fieldErrors.firstName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">{t("booking.lastName")} <span className="text-destructive">*</span></Label>
                <Input
                  id="lastName"
                  required
                  value={form.lastName}
                  onChange={(e) => setField("lastName", e.target.value)}
                  onBlur={() => blurField("lastName")}
                  className={cn(fieldErrors.lastName && "border-destructive focus-visible:ring-destructive")}
                />
                {fieldErrors.lastName && <p className="text-xs text-destructive">{fieldErrors.lastName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t("booking.phone")} <span className="text-destructive">*</span></Label>
                <PhoneInput
                  id="phone"
                  value={form.phone}
                  country={phoneCountry}
                  onChange={(v) => setField("phone", v)}
                  onCountryChange={(c) => {
                    setPhoneCountry(c);
                    if (touched.phone) setFieldErrors((e) => ({ ...e, phone: validatePhone(form.phone, c) }));
                  }}
                  onBlur={() => blurField("phone")}
                  invalid={!!fieldErrors.phone}
                />
                {fieldErrors.phone && <p className="text-xs text-destructive">{fieldErrors.phone}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t("booking.email")} <span className="text-destructive">*</span></Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  onBlur={() => blurField("email")}
                  className={cn(fieldErrors.email && "border-destructive focus-visible:ring-destructive")}
                />
                {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="country">{t("booking.country")} <span className="text-destructive">*</span></Label>
                <Input id="country" required value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">{t("booking.address")} <span className="text-destructive">*</span></Label>
                <Input
                  id="address"
                  required
                  value={form.address}
                  onChange={(e) => setField("address", e.target.value)}
                  onBlur={() => blurField("address")}
                  placeholder={t("booking.addressPlaceholder")}
                  className={cn(fieldErrors.address && "border-destructive focus-visible:ring-destructive")}
                />
                {fieldErrors.address && <p className="text-xs text-destructive">{fieldErrors.address}</p>}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="city">{t("booking.city")} <span className="text-destructive">*</span></Label>
                <Input
                  id="city"
                  required
                  value={form.city}
                  onChange={(e) => setField("city", e.target.value)}
                  onBlur={() => blurField("city")}
                  className={cn(fieldErrors.city && "border-destructive focus-visible:ring-destructive")}
                />
                {fieldErrors.city && <p className="text-xs text-destructive">{fieldErrors.city}</p>}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="message">{t("booking.message")}</Label>
                <Textarea
                  id="message"
                  rows={4}
                  placeholder={t("booking.messagePlaceholder")}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
              </div>
              <div className="md:col-span-2 space-y-2 pt-2 border-t">
                <div className="text-sm font-medium">{t("booking.paymentMethod")}</div>
                <div className="grid sm:grid-cols-2 gap-2">
                  <label
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition",
                      paymentOption === "full" ? "border-primary bg-primary/5" : "hover:bg-accent",
                    )}
                  >
                    <input
                      type="radio"
                      name="payment_option"
                      className="mt-1"
                      checked={paymentOption === "full"}
                      onChange={() => setPaymentOption("full")}
                    />
                    <div className="text-sm">
                      <div className="font-medium">{t("booking.payFull")}</div>
                      <div className="text-muted-foreground">{fmt(grandTotal)}</div>
                    </div>
                  </label>
                  <label
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition",
                      paymentOption === "deposit" ? "border-primary bg-primary/5" : "hover:bg-accent",
                    )}
                  >
                    <input
                      type="radio"
                      name="payment_option"
                      className="mt-1"
                      checked={paymentOption === "deposit"}
                      onChange={() => setPaymentOption("deposit")}
                    />
                    <div className="text-sm">
                      <div className="font-medium">{t("booking.deposit", { pct: DEPOSIT_PCT })}</div>
                      <div className="text-muted-foreground">
                        {t("booking.depositNote", { amount: fmt((grandTotal * DEPOSIT_PCT) / 100) })}
                      </div>
                    </div>
                  </label>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">{t("booking.selectBank")}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {BANKS.filter((b) => b.country === "LT").map((b) => (
                      <label
                        key={b.bic}
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-md border p-2 text-sm cursor-pointer transition",
                          selectedBic === b.bic ? "border-primary bg-primary/5" : "hover:bg-accent",
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="bic"
                            checked={selectedBic === b.bic}
                            onChange={() => setSelectedBic(b.bic)}
                          />
                          <span className="font-medium">{b.name}</span>
                        </span>
                        <BankLogo bic={b.bic} />
                      </label>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("booking.paymentInfo")}
                </p>
              </div>
              {submitError && (
                <div className="md:col-span-2 text-sm text-destructive">{submitError}</div>
              )}
              <div className="md:col-span-2 flex items-start gap-2 pt-2 border-t">
                <Checkbox id="agree" checked={agree} onCheckedChange={(v) => setAgree(!!v)} />
                <label htmlFor="agree" className="text-sm leading-tight cursor-pointer">
                  {t("booking.agreePrefix")}{" "}
                  <button
                    type="button"
                    className="underline text-primary hover:text-primary/80"
                    onClick={(e) => {
                      e.preventDefault();
                      setTermsOpen(true);
                    }}
                  >
                    {t("booking.agreeLink")}
                  </button>{" "}
                  {t("booking.agreeAnd")}{" "}
                  <button
                    type="button"
                    className="underline text-primary hover:text-primary/80"
                    onClick={(e) => {
                      e.preventDefault();
                      setPrivacyOpen(true);
                    }}
                  >
                    {t("booking.agreeLinkPrivacy")}
                  </button>{" "}
                  <span className="text-destructive">*</span>
                </label>
              </div>
              <DialogFooter className="md:col-span-2">
                <Button type="submit" disabled={!formValid || submitting} className="w-full md:w-auto">
                  {submitting
                    ? t("booking.redirecting")
                    : t("booking.submitPay", {
                        amount: fmt(paymentOption === "deposit" ? (grandTotal * DEPOSIT_PCT) / 100 : grandTotal),
                      })}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{termsTemplate?.name ?? t("booking.agreeLink")}</DialogTitle>
          </DialogHeader>
          {termsLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">{t("common.loading")}</div>
          ) : termsTemplate?.content ? (
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(termsTemplate.content) }}
            />
          ) : (
            <div className="py-6 text-sm text-muted-foreground">{t("booking.termsNotPublished")}</div>
          )}
          <DialogFooter>
            <Button onClick={() => setTermsOpen(false)}>{t("common.close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={privacyOpen} onOpenChange={setPrivacyOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{privacyTemplate?.name ?? t("booking.agreeLinkPrivacy")}</DialogTitle>
          </DialogHeader>
          {privacyLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">{t("common.loading")}</div>
          ) : privacyTemplate?.content ? (
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(privacyTemplate.content) }}
            />
          ) : (
            <div className="py-6 text-sm text-muted-foreground">{t("booking.privacyNotPublished")}</div>
          )}
          <DialogFooter>
            <Button onClick={() => setPrivacyOpen(false)}>{t("common.close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="max-w-md text-center">
          <DialogHeader>
            <DialogTitle className="text-center">{t("booking.successTitle")}</DialogTitle>
            <DialogDescription className="text-center pt-2">
              {t("booking.successText")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button onClick={() => setSuccessOpen(false)}>{t("common.close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


function SpecCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide">
        {icon} {label}
      </div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-secondary/50 px-4 py-3 border border-transparent hover:border-border transition">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {icon} {label}
      </div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-[88px] border bg-background text-sm font-medium px-2">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {TIME_OPTIONS.map((t) => (
          <SelectItem key={t} value={t}>{t}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function DatePicker({
  date,
  onSelect,
  placeholder,
  minDate,
  dateLocale = ltLocale,
}: {
  date?: Date;
  onSelect: (d: Date | undefined) => void;
  placeholder: string;
  minDate?: Date;
  dateLocale?: typeof ltLocale;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "w-full text-left text-base font-medium",
            !date && "text-muted-foreground font-normal"
          )}
        >
          {date ? format(date, "yyyy-MM-dd") : placeholder}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onSelect}
          disabled={(d) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (d < today) return true;
            if (minDate && d < minDate) return true;
            return false;
          }}
          initialFocus
          locale={dateLocale}
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}

