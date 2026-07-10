import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, DoorOpen, CreditCard, Sparkles } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { KpiCard } from "@/components/admin/KpiCard";
import { PeriodFilter } from "@/components/admin/PeriodFilter";
import { BookingsTimeline } from "@/components/admin/BookingsTimeline";
import { getDashboardStats } from "@/lib/dashboard.functions";
import { resolvePeriod, type PeriodKey } from "@/lib/dashboard-period";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: "Apartamentai",
  hotel: "Viešbučiai",
  villa: "Vilos",
  cottage: "Atostogų nameliai",
  guesthouse: "Svečių namai",
};

function AdminDashboard() {
  const [period, setPeriod] = useState<{ period: PeriodKey; from: string | null; to: string | null }>(() => {
    const r = resolvePeriod("mtd");
    return { period: "mtd", from: r.from, to: r.to };
  });

  const fetchStats = useServerFn(getDashboardStats);
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats", period.from, period.to],
    queryFn: () => fetchStats({ data: { from: period.from, to: period.to } }),
  });

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Skydelis</h1>
          <p className="text-sm text-muted-foreground">Verslo valdymo centras — viskas vienoje vietoje.</p>
        </div>
        <PeriodFilter
          value={period}
          onChange={(v) => setPeriod({ period: v.period, from: v.from ?? null, to: v.to ?? null })}
        />
      </div>

      <Tabs defaultValue="ops" className="mt-6">
        <TabsList>
          <TabsTrigger value="ops">Operacijos</TabsTrigger>
          <TabsTrigger value="fleet">Objektai</TabsTrigger>
          <TabsTrigger value="biz">Verslas</TabsTrigger>
        </TabsList>

        <TabsContent value="ops" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <KpiCard
              label="Pajamos"
              value={`${(data?.operations.revenue ?? 0).toFixed(0)} €`}
              hint="Pasirinktas laikotarpis"
            />
            <KpiCard
              label="Užimtumas"
              value={`${Math.round((data?.operations.utilization ?? 0) * 100)}%`}
              hint="Parko užimtumas"
            />
            <KpiCard
              label="Laisvi šiandien"
              value={`${data?.operations.freeToday ?? 0} / ${data?.operations.totalActive ?? 0}`}
            />
            <KpiCard
              label="30d patvirtinta"
              value={data?.operations.confirmed30d ?? 0}
              hint="Ateinančios rezervacijos"
            />
            <KpiCard
              label="Laukia apmokėjimo"
              value={`${(data?.operations.awaitingPayment.total ?? 0).toFixed(0)} €`}
              hint={`${data?.operations.awaitingPayment.count ?? 0} rezervacijos`}
            />
            <KpiCard
              label="ABV"
              value={`${(data?.operations.avgBookingValue ?? 0).toFixed(0)} €`}
              hint="Vidutinė rezervacija"
            />
          </div>
        </TabsContent>

        <TabsContent value="fleet" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <KpiCard label="Viso objektų" value={data?.fleet.total ?? 0} hint={`${data?.fleet.active ?? 0} aktyvūs`} />
            <KpiCard label="Vid. paros kaina" value={`${(data?.fleet.avgPrice ?? 0).toFixed(0)} €`} />
            <KpiCard label="Be nuotraukų" value={data?.fleet.missingPhotos ?? 0} />
            <KpiCard label="Be aprašymo" value={data?.fleet.missingDescription ?? 0} />
          </div>
          <div className="mt-4 rounded-lg border bg-card p-4">
            <h3 className="text-sm font-medium">Objektai pagal tipą</h3>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              {Object.entries(data?.fleet.byType ?? {}).map(([k, v]) => (
                <span key={k} className="rounded-full border px-3 py-1">
                  {PROPERTY_TYPE_LABELS[k] ?? k}: <strong>{v as number}</strong>
                </span>
              ))}
              {Object.keys(data?.fleet.byType ?? {}).length === 0 ? (
                <span className="text-muted-foreground">Nėra objektų.</span>
              ) : null}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="biz" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Grynasis pelnas" value={`${(data?.business.netProfit ?? 0).toFixed(0)} €`} />
            <KpiCard label="Pajamos" value={`${(data?.business.revenue ?? 0).toFixed(0)} €`} />
            <KpiCard label="Išlaidos" value={`${(data?.business.expensesTotal ?? 0).toFixed(0)} €`} />
            <KpiCard
              label="Vid. viešnagė"
              value={`${(data?.business.avgStayNights ?? 0).toFixed(1)} d.`}
            />
          </div>
          <div className="mt-4 rounded-lg border bg-card p-4">
            <h3 className="text-sm font-medium">Išlaidos pagal kategoriją</h3>
            <div className="mt-3 space-y-2 text-sm">
              {Object.entries(data?.business.expensesByCategory ?? {}).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b pb-1 last:border-none">
                  <span>{k}</span>
                  <span className="font-medium">{(v as number).toFixed(0)} €</span>
                </div>
              ))}
              {Object.keys(data?.business.expensesByCategory ?? {}).length === 0 ? (
                <span className="text-muted-foreground">Nėra išlaidų.</span>
              ) : null}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <BookingsTimeline
          title="Atvykimai šiandien"
          icon={<KeyRound className="h-4 w-4 text-primary" />}
          bookings={data?.checkinsToday ?? []}
        />
        <BookingsTimeline
          title="Išvykimai šiandien"
          icon={<DoorOpen className="h-4 w-4 text-primary" />}
          bookings={data?.checkoutsToday ?? []}
        />
        <BookingsTimeline
          title="Laukia apmokėjimo"
          icon={<CreditCard className="h-4 w-4 text-primary" />}
          bookings={data?.awaitingPaymentList ?? []}
          showAmount
        />
      </div>

      <div className="mt-6 rounded-lg border bg-card p-4">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-primary" />
          Naujausios rezervacijos (24h)
        </h3>
        <div className="mt-3 space-y-2">
          {(data?.recent24h ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Kraunama…" : "Naujų rezervacijų nėra."}
            </p>
          ) : (
            (data?.recent24h ?? []).map((b: any) => (
              <Link
                key={b.id}
                to="/admin/bookings/$id"
                params={{ id: b.id }}
                className="flex items-center justify-between rounded-md border p-2 text-sm hover:bg-accent"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">
                    {b.properties?.name ?? "—"} · {b.customer_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {b.date_from} → {b.date_to}
                  </div>
                </div>
                <div className="ml-2 flex shrink-0 items-center gap-2 text-xs">
                  <span className="rounded-full border px-2 py-0.5">{b.status}</span>
                  <span>{Number(b.total_amount ?? 0).toFixed(0)} €</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}