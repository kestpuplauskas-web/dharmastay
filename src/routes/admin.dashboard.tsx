import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import {
  Banknote,
  TrendingUp,
  Car as CarIcon,
  CalendarClock,
  Hourglass,
  AlertTriangle,
  ArrowRight,
  Phone,
  Wrench,
  ShieldCheck,
  Droplet,
  CircleCheck,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KpiCard } from "@/components/admin/KpiCard";
import { PeriodFilter } from "@/components/admin/PeriodFilter";
import {
  PERIOD_KEYS,
  type PeriodKey,
  resolvePeriod,
  formatPeriodLabel,
  PERIOD_LABELS,
} from "@/lib/dashboard-period";
import {
  getDashboardOverview,
  getFleetStats,
  getBusinessAnalytics,
} from "@/lib/dashboard.functions";

const searchSchema = z.object({
  tab: z.enum(["operations", "fleet", "business"]).default("operations"),
  period: z.enum(PERIOD_KEYS).default("mtd"),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const Route = createFileRoute("/admin/dashboard")({
  validateSearch: zodValidator(searchSchema),
  component: DashboardPage,
});

const eur = (n: number) =>
  new Intl.NumberFormat("lt-LT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

const LS_KEY = "dashboard.period.v1";

function DashboardPage() {
  const { tab, period, from, to } = Route.useSearch();
  const navigate = useNavigate();

  const restoredRef = React.useRef(false);
  React.useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.has("period")) return;
    try {
      const raw = window.localStorage.getItem(LS_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { period: PeriodKey; from?: string; to?: string };
      if (!saved.period) return;
      navigate({
        to: "/admin/dashboard",
        search: (prev: any) => ({ ...prev, period: saved.period, from: saved.from, to: saved.to }),
        replace: true,
      });
    } catch {}
  }, [navigate]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify({ period, from, to }));
    } catch {}
  }, [period, from, to]);

  const range = React.useMemo(() => resolvePeriod(period, from, to), [period, from, to]);
  const periodLabel = formatPeriodLabel(period, range);
  const shortLabel = PERIOD_LABELS[period as PeriodKey];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Verslo valdymo centras — viskas vienoje vietoje.
          </p>
        </div>
        <PeriodFilter
          period={period}
          from={from}
          to={to}
          onChange={(next) =>
            navigate({
              to: "/admin/dashboard",
              search: (prev: any) => ({

                ...prev,
                period: next.period,
                from: next.from,
                to: next.to,
              }),
            })
          }
        />
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) =>
          navigate({
            to: "/admin/dashboard",
            search: (prev: any) => ({ ...prev, tab: v as "operations" | "fleet" | "business" }),
          })
        }
      >
        <TabsList>
          <TabsTrigger value="operations">Operacijos</TabsTrigger>
          <TabsTrigger value="fleet">Parkas</TabsTrigger>
          <TabsTrigger value="business">Verslas</TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="mt-6">
          <OperationsTab range={range} shortLabel={shortLabel} />
        </TabsContent>
        <TabsContent value="fleet" className="mt-6">
          <FleetTab range={range} periodLabel={periodLabel} />
        </TabsContent>
        <TabsContent value="business" className="mt-6">
          <BusinessTab range={range} shortLabel={shortLabel} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type RangeProp = { from: string | null; to: string | null };

// ===================== OPERATIONS =====================
function OperationsTab({ range, shortLabel }: { range: RangeProp; shortLabel: string }) {
  const fetchOverview = useServerFn(getDashboardOverview);
  const q = useQuery({
    queryKey: ["dash-overview", range.from, range.to],
    queryFn: () => fetchOverview({ data: { from: range.from, to: range.to } }),
  });

  if (q.isLoading) return <div className="text-muted-foreground">Kraunama...</div>;
  if (q.error) return <div className="text-destructive">{(q.error as Error).message}</div>;
  if (!q.data) return null;

  const { kpis, today, newest } = q.data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard
          label="Pajamos"
          value={eur(kpis.revenueMTD)}
          icon={Banknote}
          sub={shortLabel}
          info={{
            what: "Bendra rezervacijų suma už pasirinktą laikotarpį.",
            formula: "Σ total_amount",
            source: "bookings (status: pending / confirmed / completed), filtruojama pagal date_from",
            period: `Pasirinktas filtras · ${shortLabel}`,
          }}
        />
        <KpiCard
          label="Utilization"
          value={`${kpis.utilizationMTD}%`}
          icon={TrendingUp}
            sub={`Parko užimtumas · ${shortLabel}`}
          info={{
            what: "Kiek procentų laiko visas aktyvus parkas buvo užimtas pasirinktą laikotarpį.",
            formula: "užimtos paros / (aktyvūs auto × laikotarpio dienos) × 100",
            source: "bookings (ne cancelled), cars (is_active = true)",
            period: `Pasirinktas filtras · ${shortLabel}`,
          }}
        />
        <KpiCard
          label="Laisvi šiandien"
          value={`${kpis.freeToday} / ${kpis.totalCars}`}
          icon={CarIcon}
          info={{
            what: "Kiek aktyvių automobilių šiuo metu nėra išnuomoti.",
            formula: "aktyvūs auto − šiandien užimti auto",
            source: "cars (is_active) ir bookings, kurių date_from ≤ šiandien < date_to",
            period: "Šiandien",
          }}
        />
        <KpiCard
          label="30d patvirtinta"
          value={eur(kpis.upcomingRevenue30)}
          icon={CalendarClock}
          sub="Ateinančios pajamos"
          info={{
            what: "Patvirtintų ir laukiančių rezervacijų suma artimiausioms 30 d.",
            formula: "Σ total_amount, kai šiandien ≤ date_from ≤ šiandien + 30 d.",
            source: "bookings (status: pending / confirmed)",
            period: "Ateinančios 30 dienų nuo šiandien",
          }}
        />
        <KpiCard
          label="Laukia apmokėjimo"
          value={eur(kpis.pendingAmount)}
          icon={Hourglass}
          tone={kpis.pendingCount > 0 ? "warning" : "default"}
          sub={`${kpis.pendingCount} rezervacijos`}
          info={{
            what: "Rezervacijų, kurių statusas dar „pending“, bendra suma.",
            formula: "Σ total_amount, kur status = pending",
            source: "bookings, filtruojama pagal date_from",
            period: `Pasirinktas filtras · ${shortLabel}`,
          }}
        />
        <KpiCard
          label="ABV"
          value={eur(kpis.abv)}
          icon={Banknote}
          sub={`Vid. rezervacija · ${shortLabel}`}
          info={{
            what: "Average Booking Value — vidutinė vienos rezervacijos suma.",
            formula: "pajamos / rezervacijų skaičius",
            source: "bookings (pending / confirmed / completed)",
            period: `Pasirinktas filtras · ${shortLabel}`,
          }}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <OpColumn
          title="📤 Paimimai šiandien"
          count={today.pickups.length}
          rows={today.pickups.map((b: any) => ({
            id: b.id,
            line1: b.cars?.name ?? "—",
            line2: b.customer_name,
            meta: b.pickup_time || "",
            phone: b.customer_phone,
          }))}
        />
        <OpColumn
          title="🔑 Grąžinimai šiandien"
          count={today.returns.length}
          rows={today.returns.map((b: any) => ({
            id: b.id,
            line1: b.cars?.name ?? "—",
            line2: b.customer_name,
            meta: b.return_time || "",
            phone: b.customer_phone,
          }))}
        />
        <OpColumn
          title="💳 Laukia apmokėjimo"
          count={today.pending.length}
          rows={today.pending.map((b: any) => ({
            id: b.id,
            line1: b.cars?.name ?? "—",
            line2: b.customer_name,
            meta: eur(Number(b.total_amount || 0)),
            phone: b.customer_phone,
          }))}
          tone="warning"
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">📥 Naujausios rezervacijos (24h)</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {newest.length === 0 ? (
            <p className="text-sm text-muted-foreground">Naujų nėra.</p>
          ) : (
            <div className="divide-y">
              {newest.map((b: any) => (
                <Link
                  key={b.id}
                  to="/admin/bookings/$id"
                  params={{ id: b.id }}
                  className="flex items-center justify-between gap-4 py-3 hover:bg-muted/30 px-2 -mx-2 rounded"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{b.cars?.name} · {b.customer_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {b.date_from} → {b.date_to}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold tabular-nums">{eur(Number(b.total_amount || 0))}</span>
                    <Badge variant="outline">{b.status}</Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function OpColumn({
  title,
  count,
  rows,
  tone,
}: {
  title: string;
  count: number;
  rows: { id: string; line1: string; line2: string; meta: string; phone?: string }[];
  tone?: "warning";
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span>{title}</span>
          <Badge variant={tone === "warning" ? "secondary" : "outline"} className="tabular-nums">
            {count}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Nieko nėra.</p>
        ) : (
          <div className="divide-y">
            {rows.map((r) => (
              <Link
                key={r.id}
                to="/admin/bookings/$id"
                params={{ id: r.id }}
                className="flex items-center justify-between gap-3 py-2.5 hover:bg-muted/30 -mx-2 px-2 rounded"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{r.line1}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {r.line2}
                    {r.phone ? (
                      <span className="inline-flex items-center gap-1 ml-2">
                        <Phone className="h-3 w-3" /> {r.phone}
                      </span>
                    ) : null}
                  </div>
                </div>
                <span className="text-xs font-semibold shrink-0 tabular-nums">{r.meta}</span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ===================== FLEET =====================
function FleetTab({ range, periodLabel }: { range: RangeProp; periodLabel: string }) {
  const fetchFleet = useServerFn(getFleetStats);
  const q = useQuery({
    queryKey: ["dash-fleet", range.from, range.to],
    queryFn: () => fetchFleet({ data: { from: range.from, to: range.to } }),
  });

  if (q.isLoading) return <div className="text-muted-foreground">Kraunama...</div>;
  if (q.error) return <div className="text-destructive">{(q.error as Error).message}</div>;
  if (!q.data) return null;

  const { fleet } = q.data;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Parko KPI · {periodLabel}</CardTitle>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Automobilis</TableHead>
                  <TableHead className="text-right">Utilization</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">ADR</TableHead>
                  <TableHead className="text-right">Rezerv.</TableHead>
                  <TableHead>Statusas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fleet.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link
                        to="/admin/cars/$id"
                        params={{ id: c.id }}
                        className="font-medium hover:underline"
                      >
                        {c.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">{c.category}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-sm font-semibold tabular-nums w-10">{c.utilization}%</span>
                        <Progress value={c.utilization} className="w-20 h-2" />
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{eur(c.revenue)}</TableCell>
                    <TableCell className="text-right tabular-nums">{eur(c.adr)}/d</TableCell>
                    <TableCell className="text-right tabular-nums">{c.bookingsCount}</TableCell>
                    <TableCell>
                      {c.isBusyToday ? (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600">Vykdoma</Badge>
                      ) : c.isActive ? (
                        <Badge variant="outline">Laisvas</Badge>
                      ) : (
                        <Badge variant="secondary">Paslėptas</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <FleetHealth fleet={fleet} />
    </div>
  );
}

const MAINT_META: Record<string, { label: string; icon: any }> = {
  ta: { label: "Techninė apžiūra", icon: CircleCheck },
  insurance: { label: "Draudimas", icon: ShieldCheck },
  service: { label: "Gr. dėžės tepalai", icon: Wrench },
  oil: { label: "Variklio tepalai", icon: Wrench },
  belt: { label: "Diržas/grandinė", icon: Wrench },
};

function maintTone(dueDate?: string | null): "success" | "warning" | "danger" | "default" {
  if (!dueDate) return "default";
  const days = Math.round((new Date(dueDate).getTime() - Date.now()) / 86400000);
  if (days < 0) return "danger";
  if (days <= 30) return "warning";
  return "success";
}

function FleetHealth({ fleet }: { fleet: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Parko būklė</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {fleet.map((c) => (
          <div key={c.id} className="border-t pt-3 first:border-t-0 first:pt-0">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium">{c.name}</div>
              <Link to="/admin/cars/$id" params={{ id: c.id }} className="text-xs text-primary hover:underline">
                Tvarkyti →
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {(["ta", "insurance", "service", "oil", "belt"] as const).map((type) => {
                const m = c.maintenance.find((x: any) => x.type === type);
                const meta = MAINT_META[type];
                const Icon = meta.icon;
                const isMileage = type === "oil" || type === "service" || type === "belt";
                const tone = isMileage ? "default" : maintTone(m?.dueDate);
                const dueLabel = isMileage
                  ? (m?.dueMileageKm != null ? `${Number(m.dueMileageKm).toLocaleString("lt-LT")} km` : "—")
                  : (m?.dueDate ? new Date(m.dueDate).toLocaleDateString("lt-LT") : "—");
                return (
                  <div
                    key={type}
                    className={`rounded-md border p-2.5 text-xs ${
                      tone === "danger"
                        ? "border-rose-300 bg-rose-50"
                        : tone === "warning"
                          ? "border-amber-300 bg-amber-50"
                          : tone === "success"
                            ? "border-emerald-200 bg-emerald-50/60"
                            : "border-border"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Icon className="h-3.5 w-3.5" /> {meta.label}
                    </div>
                    <div className="mt-1 font-semibold tabular-nums">{dueLabel}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ===================== BUSINESS =====================
function BusinessTab({ range, shortLabel: _shortLabel }: { range: RangeProp; shortLabel: string }) {
  const fetchBiz = useServerFn(getBusinessAnalytics);
  const q = useQuery({
    queryKey: ["dash-business", range.from, range.to],
    queryFn: () => fetchBiz({ data: { from: range.from, to: range.to } }),
  });


  if (q.isLoading) return <div className="text-muted-foreground">Kraunama...</div>;
  if (q.error) return <div className="text-destructive">{(q.error as Error).message}</div>;
  if (!q.data) return null;

  const { funnel, averages, upcoming, topCars, topCustomers, sources, money } = q.data;

  const sourceColors = ["#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b"];

  return (
    <div className="space-y-6">
      {/* Money Machine */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">💰 Money Machine</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard
              label="Investicija"
              value={eur(money.totalInvestment)}
              info={{
                what: "Bendra suma, investuota į parko automobilius (įsigijimas + pradinės išlaidos).",
                formula: "Σ amount",
                source: "car_investments lentelė",
                period: "Visa istorija (nepriklauso nuo filtro)",
              }}
            />
            <KpiCard
              label={`Pajamos · ${_shortLabel}`}
              value={eur(money.monthRevenue)}
              tone="success"
              info={{
                what: "Rezervacijų pajamos pasirinktą laikotarpį.",
                formula: "Σ total_amount",
                source: "bookings (pending / confirmed / completed), pagal date_from",
                period: `Pasirinktas filtras · ${_shortLabel}`,
              }}
            />
            <KpiCard
              label={`Išlaidos · ${_shortLabel}`}
              value={eur(money.monthExpenses)}
              tone="warning"
              info={{
                what: "Bendros veiklos išlaidos pasirinktą laikotarpį.",
                formula: "Σ amount",
                source: "expenses lentelė, pagal expense_date",
                period: `Pasirinktas filtras · ${_shortLabel}`,
              }}
            />
            <KpiCard
              label="Grynasis pelnas"
              value={eur(money.monthProfit)}
              tone={money.monthProfit >= 0 ? "success" : "danger"}
              info={{
                what: "Pajamų ir išlaidų skirtumas pasirinktą laikotarpį.",
                formula: "pajamos − išlaidos",
                source: "bookings + expenses",
                period: `Pasirinktas filtras · ${_shortLabel}`,
              }}
            />
            <KpiCard
              label="Metinis ROI"
              value={`${money.annualROI.toFixed(1)}%`}
              tone={money.annualROI >= 0 ? "success" : "danger"}
              info={{
                what: "Investicijos grąža per metus, ekstrapoliuota iš pasirinkto laikotarpio pelno.",
                formula: "(pelnas / laikotarpio dienos × 365) / investicija × 100",
                source: "bookings, expenses, car_investments",
                period: `Pelnas iš pasirinkto filtro (${_shortLabel}), perskaičiuotas į metinę išraišką`,
              }}
            />
            <KpiCard
              label="Cashflow (12 mėn.)"
              value={eur(money.cashflow.reduce((s: number, m: any) => s + m.profit, 0))}
              info={{
                what: "Suminis grynasis pinigų srautas per paskutinius 12 mėnesių.",
                formula: "Σ (mėnesio pajamos − mėnesio išlaidos)",
                source: "bookings (pagal date_from) + expenses (pagal expense_date)",
                period: "Paskutiniai 12 mėn. (nepriklauso nuo filtro)",
              }}
            />
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={money.cashflow}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => eur(Number(v))} />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={false} name="Pajamos" />
                <Line type="monotone" dataKey="expenses" stroke="#f59e0b" strokeWidth={2} dot={false} name="Išlaidos" />
                <Line type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={2} dot={false} name="Pelnas" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming revenue */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">📅 Patvirtintos pajamos — ateinantys 3 mėn.</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            {upcoming.map((m: any) => (
              <div key={m.month} className="rounded-md border p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground capitalize">{m.label}</div>
                <div className="mt-1 text-2xl font-bold tabular-nums">{eur(m.amount)}</div>
                <div className="text-xs text-muted-foreground">{m.count} rezervacijos</div>
              </div>
            ))}
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={upcoming}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => eur(Number(v))} />
                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Funnel + averages */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Konversija · {_shortLabel}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <FunnelStep label="Lankytojai" value={funnel.visitors} icon="👥" />
            <FunnelStep label="Rezervacijos" value={funnel.bookings} icon="📥" />
            <FunnelStep label="Patvirtintos" value={funnel.confirmed} icon="✅" />
            <div className="pt-2 mt-2 border-t flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Konversija</span>
              <span className="text-xl font-bold tabular-nums">
                {funnel.conversion.toFixed(2)}%
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vidurkiai</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <Avg label="Nuomos trukmė" value={`${averages.duration.toFixed(1)} d.`} />
            <Avg label="Rezervacijos suma" value={eur(averages.amount)} />
          </CardContent>
        </Card>
      </div>

      {/* Top cars / customers / sources */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top automobiliai</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {topCars.length === 0 && <p className="text-sm text-muted-foreground">Nėra duomenų.</p>}
            {topCars.map((c: any) => (
              <div key={c.name} className="flex items-center justify-between text-sm">
                <span className="truncate">{c.name}</span>
                <span className="font-semibold tabular-nums">{eur(c.amount)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top klientai</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {topCustomers.length === 0 && <p className="text-sm text-muted-foreground">Nėra duomenų.</p>}
            {topCustomers.map((c: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="min-w-0">
                  <div className="truncate">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.count} rezervacijos</div>
                </div>
                <span className="font-semibold tabular-nums">{eur(c.amount)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Šaltiniai</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {sources.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nėra duomenų.</p>
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sources}
                      dataKey="count"
                      nameKey="source"
                      innerRadius={40}
                      outerRadius={70}
                    >
                      {sources.map((_: any, i: number) => (
                        <Cell key={i} fill={sourceColors[i % sourceColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 justify-center -mt-2">
                  {sources.map((s: any, i: number) => (
                    <span key={s.source} className="text-xs flex items-center gap-1">
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ background: sourceColors[i % sourceColors.length] }}
                      />
                      {s.source} ({s.count})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FunnelStep({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2.5">
      <div className="flex items-center gap-2 text-sm">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <span className="text-lg font-bold tabular-nums">{value}</span>
    </div>
  );
}

function Avg({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b pb-2 last:border-b-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}
