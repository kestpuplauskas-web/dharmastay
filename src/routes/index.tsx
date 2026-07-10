import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Users, Fuel, Sparkles, ShieldCheck, Headphones, Car as CarIcon, Tags, Truck, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { isCarAvailable, type Car } from "@/lib/cars";
import { trDb } from "@/lib/db-translate";
import { listActiveCars, getAvailabilityCounts } from "@/lib/cars.functions";
import { AvailabilityDatePicker } from "@/components/AvailabilityDatePicker";
import type { AvailabilityMap } from "@/components/AvailabilityCalendar";
import heroCar from "@/assets/hero-car.jpg";
import gearboxIcon from "@/assets/gearbox-icon.png.asset.json";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useLanguageBootstrap } from "@/components/LanguageSwitcher";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rentivo — automobilių nuoma Lietuvoje" },
      { name: "description", content: "Išsinuomokite automobilį Lietuvoje su Rentivo. Pasirinkite paėmimo vietą, datas ir raskite laisvą automobilį per kelias sekundes." },
      { property: "og:title", content: "Rentivo — automobilių nuoma" },
      { property: "og:description", content: "Patogi automobilių nuoma visoje Lietuvoje." },
    ],
  }),
  component: Index,
});

function Index() {
  useLanguageBootstrap();
  const { t, i18n } = useTranslation();
  const fetchCars = useServerFn(listActiveCars);
  const fetchAvailability = useServerFn(getAvailabilityCounts);
  const { data: cars = [] } = useQuery({ queryKey: ["cars"], queryFn: () => fetchCars() });
  const { data: availabilityData } = useQuery({
    queryKey: ["availability", 4],
    queryFn: () => fetchAvailability({ data: { months: 4 } }),
  });
  const availability: AvailabilityMap = availabilityData?.days ?? {};

  const [range, setRange] = useState<{ from?: Date; to?: Date }>({});
  const hasRange = !!(range.from && range.to);

  const filteredCars = useMemo(() => {
    if (!hasRange || !range.from || !range.to) return cars;
    return cars.filter((c) => isCarAvailable(c, range.from!, range.to!));
  }, [cars, range, hasRange]);

  const suggestNextFreeRange = (): { from: Date; to: Date } | null => {
    if (!range.from || !range.to || cars.length === 0) return null;
    const ms = 86400000;
    const days = Math.max(1, Math.round((range.to.getTime() - range.from.getTime()) / ms) + 1);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    for (let i = 0; i < 180; i++) {
      const from = new Date(start.getTime() + i * ms);
      const to = new Date(from.getTime() + (days - 1) * ms);
      if (cars.some((c) => isCarAvailable(c, from, to))) return { from, to };
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader variant="overlay" />

      {/* Hero */}
      <section
        className="relative pt-32 pb-20 overflow-hidden"
        style={{ background: "var(--gradient-hero)" }}
      >
        <img
          src={heroCar}
          alt=""
          width={1920}
          height={1080}
          className="absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/95" />

        <div className="container relative mx-auto px-6">
          <div className="max-w-3xl text-primary-foreground">
            <Badge className="bg-primary-foreground/15 text-primary-foreground border-0 backdrop-blur mb-6">
              <Sparkles className="h-3 w-3 mr-1" /> {t("hero.badge")}
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.05]">
              {t("hero.title1")}
            </h1>
            <p className="mt-3 text-xl text-primary-foreground/90 font-medium">
              {t("hero.title2")}
            </p>
            <div className="mt-8">
              <Button
                size="lg"
                className="h-12 px-7 text-base rounded-xl"
                onClick={() => {
                  const el = document.getElementById("cars");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                {t("cars.ourTitle")}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Availability calendar */}
      <section className="container mx-auto px-6 pt-16">
        <div className="max-w-3xl mx-auto text-center mb-6">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{t("home.availability.title")}</h2>
          <p className="text-sm text-muted-foreground mt-2">
            {t("home.availability.subtitle")}
          </p>

        </div>
        <div className="max-w-3xl mx-auto">
          <AvailabilityDatePicker value={range} onChange={setRange} availability={availability} />
          {hasRange && (
            <div className="mt-3 flex items-center justify-center gap-3 text-sm">
              <span className="text-muted-foreground">
                {t("home.availability.selected")} <strong className="text-foreground">{format(range.from!, "yyyy-MM-dd")}</strong> →{" "}
                <strong className="text-foreground">{format(range.to!, "yyyy-MM-dd")}</strong>
              </span>
              <Button variant="ghost" size="sm" onClick={() => setRange({})}>
                <X className="h-3.5 w-3.5 mr-1" /> {t("home.availability.clear")}
              </Button>

            </div>
          )}
        </div>
      </section>

      {/* Cars */}
      <section id="cars" className="container mx-auto px-6 py-20">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              {hasRange
                ? t("home.cars.availableForRange", { count: filteredCars.length })
                : t("cars.ourTitle")}
            </h2>
          </div>
        </div>

        {hasRange && filteredCars.length === 0 ? (
          <div className="rounded-2xl border border-border/60 bg-muted/30 p-8 text-center max-w-2xl mx-auto">
            <p className="text-lg font-semibold">{t("home.cars.noneTitle")}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {t("home.cars.noneHint")}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button variant="outline" onClick={() => setRange({})}>
                {t("home.cars.changeDates")}
              </Button>
              <Button
                onClick={() => {
                  const next = suggestNextFreeRange();
                  if (next) setRange(next);
                }}
              >
                {t("home.cars.showNextFree")}
              </Button>
            </div>

          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCars.map((car: Car, idx: number) => {
              const tier2230 = car.priceTiers.find((t) => t.minDays <= 22 && t.maxDays >= 30);
              const minPrice = tier2230?.pricePerDay ?? car.pricePerDay;
              const carLink = hasRange
                ? { to: "/cars/$carId" as const, params: { carId: car.id }, search: { from: format(range.from!, "yyyy-MM-dd"), to: format(range.to!, "yyyy-MM-dd") } }
                : { to: "/cars/$carId" as const, params: { carId: car.id } };
              const eager = idx < 4;

              return (
                <Card key={car.id} className="group overflow-hidden border border-border/60 hover:shadow-[var(--shadow-card)] transition-all hover:-translate-y-1 py-0 gap-0">
                  <Link {...carLink} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-[inherit]">
                    <div className="aspect-[16/10] overflow-hidden bg-muted">
                      <img
                        src={car.image}
                        alt={car.name}
                        width={800}
                        height={500}
                        loading={eager ? "eager" : "lazy"}
                        fetchPriority={eager ? "high" : "auto"}
                        decoding="async"
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Badge variant="secondary" className="mb-2 rounded-full">{trDb(car.category, i18n.language)}</Badge>
                          <h3 className="font-semibold text-lg leading-tight">{car.name}</h3>
                        </div>
                        <div className="text-right whitespace-nowrap flex items-baseline gap-1 justify-end">
                          <span className="text-xs font-normal text-muted-foreground">{t("common.from")}</span>
                          <span className="text-2xl font-bold text-primary">{minPrice}€{t("common.perDay").replace(/\s+/g, "")}</span>
                        </div>
                      </div>



                      <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                        <Spec icon={<img src={gearboxIcon.url} alt="" className="h-3.5 w-3.5 dark:invert" />} label={car.transmission === "Automatinė" ? t("cars.auto") : t("cars.manual")} />
                        <Spec icon={<Users className="h-3.5 w-3.5" />} label={`${car.seats} ${t("cars.seats_short")}`} />
                        <Spec icon={<Fuel className="h-3.5 w-3.5" />} label={trDb(car.fuel, i18n.language)} />
                      </div>

                      <Button asChild className="w-full mt-4 rounded-xl pointer-events-none" variant="secondary" tabIndex={-1}>
                        <span>{t("cars.view")}</span>
                      </Button>
                    </CardContent>
                  </Link>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Why */}
      <section
        id="why"
        className="relative overflow-hidden border-y border-border/60"
        style={{
          background:
            "radial-gradient(1200px 500px at 50% -10%, color-mix(in oklab, var(--primary) 18%, transparent), transparent 60%), linear-gradient(180deg, color-mix(in oklab, var(--primary) 6%, var(--background)) 0%, var(--background) 100%)",
        }}
      >
        <div className="container mx-auto px-6 py-20">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-center">{t("why.title")}</h2>

          <div className="grid md:grid-cols-2 md:grid-rows-2 gap-6 mt-14">
            <GlassFeature
              className="md:row-span-2 md:min-h-[360px]"
              icon={<ShieldCheck className="h-6 w-6" />}
              title={t("why.insurance.title")}
              text={t("why.insurance.text")}
              decoration={
                <CarIcon
                  className="absolute right-6 bottom-6 h-32 w-32 text-primary/15"
                  strokeWidth={1.25}
                />
              }
              titleClass="text-2xl md:text-3xl"
            />
            <GlassFeature
              icon={<Sparkles className="h-6 w-6" />}
              title={t("why.prices.title")}
              text={t("why.prices.text")}
              decoration={
                <Tags
                  className="absolute right-5 top-1/2 -translate-y-1/2 h-24 w-24 text-primary/15"
                  strokeWidth={1.25}
                />
              }
            />
            <GlassFeature
              icon={<Headphones className="h-6 w-6" />}
              title={t("why.support.title")}
              text={t("why.support.text")}
              decoration={
                <Truck
                  className="absolute right-5 top-1/2 -translate-y-1/2 h-24 w-24 text-primary/15"
                  strokeWidth={1.25}
                />
              }
            />
          </div>
        </div>
      </section>



      {/* SEO text */}
      <section className="border-t border-border/40 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 py-12 md:py-16">
          <div className="max-w-4xl mx-auto">
            <article className="rounded-2xl border border-border/50 bg-background/60 backdrop-blur-sm shadow-sm p-6 sm:p-8 md:p-10">
              <h2 className="text-xl font-bold text-foreground mb-4">{t("home.seo.h1")}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground/90">{t("home.seo.p1")}</p>

              <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">{t("home.seo.plq.title")}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground/90">{t("home.seo.plq.intro")}</p>
              <ul className="mt-3 space-y-2">
                {(t("home.seo.plq.items", { returnObjects: true }) as Array<{ title: string; text: string }>).map((it, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground/90">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span><strong>{it.title}:</strong> {it.text}</span>
                  </li>
                ))}
              </ul>

              <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">{t("home.seo.replacement.title")}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground/90">{t("home.seo.replacement.intro")}</p>
              <ul className="mt-3 space-y-2">
                {(t("home.seo.replacement.items", { returnObjects: true }) as Array<{ title: string; text: string }>).map((it, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground/90">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span><strong>{it.title}:</strong> {it.text}</span>
                  </li>
                ))}
              </ul>

              <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">{t("home.seo.why.title")}</h2>
              <ul className="mt-3 space-y-2">
                {(t("home.seo.why.items", { returnObjects: true }) as Array<{ title: string; text: string }>).map((it, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground/90">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span><strong>{it.title}:</strong> {it.text}</span>
                  </li>
                ))}
              </ul>
            </article>

          </div>
        </div>
      </section>

      {/* Legal links */}
      <section className="border-t bg-background">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <Link
              to="/privatumo-politika"
              className="hover:text-foreground underline underline-offset-4 transition-colors"
            >
              {t("footer.privacyPolicy")}
            </Link>
            <span className="hidden sm:inline text-border">|</span>
            <Link
              to="/paslaugu-taisykles"
              className="hover:text-foreground underline underline-offset-4 transition-colors"
            >
              {t("footer.termsOfService")}

            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Spec({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <span>{label}</span>
    </div>
  );
}

function GlassFeature({
  icon,
  title,
  text,
  decoration,
  className,
  titleClass,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  decoration?: React.ReactNode;
  className?: string;
  titleClass?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/60 bg-white/55 backdrop-blur-xl shadow-[0_20px_60px_-30px_rgba(60,90,180,0.35)] ring-1 ring-primary/5 p-7 md:p-8 ${className ?? ""}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-16 h-64 w-64 rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--primary) 25%, transparent), transparent)" }}
      />
      {decoration}
      <div className="relative">
        <div
          className="h-14 w-14 rounded-2xl grid place-items-center text-primary shadow-inner ring-1 ring-primary/15"
          style={{ background: "linear-gradient(135deg, color-mix(in oklab, var(--primary) 18%, white), white)" }}
        >
          {icon}
        </div>
        <h3 className={`font-bold mt-5 tracking-tight ${titleClass ?? "text-xl"}`}>{title}</h3>
        <p className="text-muted-foreground mt-3 text-sm md:text-base leading-relaxed max-w-md">{text}</p>
      </div>
    </div>
  );
}

