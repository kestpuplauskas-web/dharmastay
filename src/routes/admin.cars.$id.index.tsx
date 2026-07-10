import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Pencil,
  Plus,
  Wrench,
  CalendarPlus,
  CalendarRange,
  Banknote,
  Receipt,
  FileText,
  Trash2,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  ComposedChart, Area, AreaChart, Cell,
} from "recharts";

import { KpiCard } from "@/components/admin/KpiCard";
import {
  AddExpenseDialog,
  AddInvestmentDialog,
  StartServiceDialog,
  EndServiceDialog,
  UploadDocumentDialog,
} from "@/components/admin/VehicleActions";
import {
  getVehicleOverview,
  deleteCarDocument,
} from "@/lib/vehicle.functions";
import { deleteExpense, deleteInvestment } from "@/lib/operations.functions";

export const Route = createFileRoute("/admin/cars/$id/")({
  component: VehicleOverview,
});

const eur = (n: number | null | undefined) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("lt-LT", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      }).format(n);

const pct = (n: number | null | undefined) =>
  n == null || !isFinite(n) ? "—" : `${Math.round(n)}%`;

const num = (n: number | null | undefined, suffix = "") =>
  n == null || !isFinite(n) ? "—" : `${Math.round(n)}${suffix}`;

const km = (n: number | null | undefined) =>
  n == null ? "—" : `${new Intl.NumberFormat("lt-LT").format(n)} km`;

const CAT_LABEL: Record<string, string> = {
  fuel: "Kuras", maintenance: "Autoremontas", insurance: "Draudimas",
  marketing: "Marketingas", office: "Biuras", transport: "Transportavimas",
  telecom: "Ryšys", inspection: "Techninė apžiūra", parts: "Autodalys", other: "Kita",
};
const INV_CAT_LABEL: Record<string, string> = {
  purchase: "Įsigijimas", registration: "Registracija", other: "Kita",
};
const DOC_KIND_LABEL: Record<string, string> = {
  registration: "Registracija", insurance: "Draudimas",
  inspection: "TA", purchase: "Pirkimas", other: "Kita",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "Laukiama", confirmed: "Patvirtinta", completed: "Užbaigta", cancelled: "Atšaukta",
};
const MAINT_LABEL: Record<string, string> = {
  ta: "Techninė apžiūra", insurance: "Draudimas",
  service: "Pavarų dėžės alyva", oil: "Variklio alyva", belt: "Diržas / grandinė",
};

function daysUntil(date: string | null) {
  if (!date) return null;
  const ms = new Date(date + "T00:00:00Z").getTime() - new Date(new Date().toISOString().slice(0,10) + "T00:00:00Z").getTime();
  return Math.round(ms / 86400000);
}

function VehicleOverview() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchOverview = useServerFn(getVehicleOverview);
  const delExpense = useServerFn(deleteExpense);
  const delInvestment = useServerFn(deleteInvestment);
  const delDoc = useServerFn(deleteCarDocument);

  const q = useQuery({
    queryKey: ["vehicle-overview", id],
    queryFn: () => fetchOverview({ data: { carId: id } }),
  });

  const [addExpense, setAddExpense] = useState(false);
  const [addInvestment, setAddInvestment] = useState(false);
  const [startSvc, setStartSvc] = useState(false);
  const [endSvc, setEndSvc] = useState(false);
  const [uploadDoc, setUploadDoc] = useState(false);

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["vehicle-overview", id] });

  const delExpenseM = useMutation({
    mutationFn: (eid: string) => delExpense({ data: { id: eid } }),
    onSuccess: () => invalidate(),
  });
  const delInvestmentM = useMutation({
    mutationFn: (eid: string) => delInvestment({ data: { id: eid } }),
    onSuccess: () => invalidate(),
  });
  const delDocM = useMutation({
    mutationFn: (eid: string) => delDoc({ data: { id: eid } }),
    onSuccess: () => invalidate(),
  });

  if (q.isLoading) return <div className="text-muted-foreground">Kraunama...</div>;
  if (q.error) return <div className="text-destructive">{(q.error as Error).message}</div>;
  if (!q.data) return <div>Nerastas.</div>;

  const d = q.data;
  const { car, status, today, upcoming, kpis, bookings, bookingStats, investments, expenses, maintenance, serviceEvents, documents, monthly } = d;

  const statusBadge =
    status === "free"
      ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">Laisvas</Badge>
      : status === "busy"
      ? <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">Užimtas</Badge>
      : <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">Servise</Badge>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/cars"><ArrowLeft className="h-4 w-4 mr-1" /> Visi automobiliai</Link>
        </Button>
      </div>

      {/* HERO */}
      <Card className="overflow-hidden">
        <div className="flex flex-col lg:flex-row">
          <div className="lg:w-72 h-48 lg:h-auto bg-muted flex-shrink-0">
            {car.cover ? (
              <img src={car.cover} alt={car.name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full grid place-items-center text-muted-foreground">Be nuotraukos</div>
            )}
          </div>
          <CardContent className="flex-1 p-5 space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold leading-tight">{car.name}</h1>
                  {statusBadge}
                  {!car.isActive && <Badge variant="secondary">Paslėpta</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {car.category} · {car.year} · {km(car.currentMileage)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link to="/admin/bookings/new" search={{ carId: id } as any}>
                    <CalendarPlus className="h-4 w-4 mr-1" /> Nauja rezervacija
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to="/admin/cars/$id/edit" params={{ id }}>
                    <Pencil className="h-4 w-4 mr-1" /> Redaguoti
                  </Link>
                </Button>
                <Button size="sm" variant="outline" onClick={() => setAddExpense(true)}>
                  <Receipt className="h-4 w-4 mr-1" /> Pridėti išlaidą
                </Button>
                <Button size="sm" variant="outline" onClick={() => setAddInvestment(true)}>
                  <Banknote className="h-4 w-4 mr-1" /> Pridėti investiciją
                </Button>
                {car.serviceStatus === "in_service" ? (
                  <Button size="sm" variant="outline" onClick={() => setEndSvc(true)}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Baigti remontą
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setStartSvc(true)}>
                    <Wrench className="h-4 w-4 mr-1" /> Siųsti į servisą
                  </Button>
                )}
                <Button asChild size="sm" variant="ghost">
                  <Link to="/admin/bookings"><CalendarRange className="h-4 w-4 mr-1" /> Kalendorius</Link>
                </Button>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              <div className="rounded-md border bg-muted/30 p-3">
                <div className="text-xs uppercase text-muted-foreground">Šiandien</div>
                <div className="mt-1 font-medium">
                  {today.pickup && <>Paėmimas {today.pickup.time || ""} — {today.pickup.customer}</>}
                  {today.return && <>{today.pickup ? <br/> : null}Grąžinimas {today.return.time || ""} — {today.return.customer}</>}
                  {!today.pickup && !today.return && <span className="text-muted-foreground">Nieko nesuplanuota</span>}
                </div>
              </div>
              <div className="rounded-md border bg-muted/30 p-3">
                <div className="text-xs uppercase text-muted-foreground">Sekanti rezervacija</div>
                <div className="mt-1 font-medium">
                  {upcoming
                    ? <>{upcoming.date_from} → {upcoming.date_to} · {upcoming.customer}</>
                    : <span className="text-muted-foreground">Nėra</span>}
                </div>
              </div>
              <div className="rounded-md border bg-muted/30 p-3">
                <div className="text-xs uppercase text-muted-foreground">Dabartinė rida</div>
                <div className="mt-1 font-medium">{km(car.currentMileage)}</div>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard label="Investuota" value={eur(kpis.totalInvestment)} info={{ what: "Visos į automobilį investuotos lėšos: įsigijimas, registracija ir kitos investicijos.", formula: "SUM(car_investments.amount)", source: "car_investments lentelė", period: "Nuo įsigijimo datos" }} />
        <KpiCard label="Pajamos" value={eur(kpis.totalRevenue)} tone="success" info={{ what: "Visos rezervacijų pajamos iš šio automobilio.", formula: "SUM(bookings.total_amount)", source: "bookings lentelė (status: pending, confirmed, completed)", period: "Nuo pirmos rezervacijos" }} />
        <KpiCard label="Išlaidos" value={eur(kpis.totalExpenses)} tone="warning" info={{ what: "Visos eksploatacinės išlaidos: kuras, remontas, draudimas, techninė apžiūra ir kt.", formula: "SUM(expenses.amount)", source: "expenses lentelė", period: "Nuo pirmos išlaidos" }} />
        <KpiCard label="Grynas pelnas" value={eur(kpis.profit)} tone={kpis.profit >= 0 ? "success" : "danger"} info={{ what: "Pajamos minus išlaidos. Rodo realų automobilio uždarbį.", formula: "Pajamos − Išlaidos", source: "Paskaičiuota iš bookings ir expenses", period: "Nuo pirmos rezervacijos / išlaidos" }} />
        <KpiCard label="ROI" value={pct(kpis.roi)} info={{ what: "Investicijos grąžos rodiklis: kiek procentų pelno generuoja investicija.", formula: "(Grynas pelnas / Investuota) × 100", source: "Paskaičiuota iš KPI", period: "Nuo įsigijimo datos" }} />
        <KpiCard label="Užimtumas" value={pct(kpis.utilization)} sub={`${kpis.occupiedDays} iš ${kpis.daysOwned} parų`} info={{ what: "Kiek procentų laiko automobilis buvo išnuomotas nuo įsigijimo.", formula: "(Užimtos dienos / Visos dienos) × 100", source: "bookings (date_from, date_to)", period: "Nuo įsigijimo / pirmos rezervacijos" }} />
        <KpiCard label="ADR" value={eur(kpis.adr)} sub="Vidut. para" info={{ what: "Vidutinė dienos kaina – pajamos padalintos iš užimtų dienų.", formula: "Pajamos / Užimtos dienos", source: "Paskaičiuota iš bookings", period: "Nuo pirmos rezervacijos" }} />
        <KpiCard label="Pajamos / užimta para" value={eur(kpis.revPerOccDay)} info={{ what: "Pajamos tenkančios vienai užimtai dienai. Toks pat rodiklis kaip ADR.", formula: "Pajamos / Užimtos dienos", source: "Paskaičiuota iš bookings", period: "Nuo pirmos rezervacijos" }} />
        <KpiCard label="Vidut. trukmė" value={num(kpis.avgDuration, " d.")} info={{ what: "Vidutinė vienos rezervacijos trukmė dienomis.", formula: "Užimtos dienos / Rezervacijų skaičius", source: "bookings (date_from, date_to)", period: "Nuo pirmos rezervacijos" }} />
        <KpiCard label="Atsipirkimas" value={num(kpis.payback, " mėn.")} info={{ what: "Kiek mėnesių užtruktų atsiimti investicijas esant dabartiniam pelnui.", formula: "Investuota / (Grynas pelnas / Mėnesių nuo įsigijimo)", source: "Paskaičiuota iš KPI", period: "Nuo įsigijimo datos" }} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="finance">Finansai</TabsTrigger>
          <TabsTrigger value="bookings">Rezervacijos</TabsTrigger>
          <TabsTrigger value="maintenance">Priežiūra</TabsTrigger>
          <TabsTrigger value="analytics">Analitika</TabsTrigger>
          <TabsTrigger value="documents">Dokumentai</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="mt-6 space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Mėnesio finansiniai rezultatai</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Paskutinių 12 mėn. pajamos, išlaidos ir grynas pelnas</p>
              </CardHeader>
              <CardContent className="h-72">
                {monthly.every((m: any) => !m.revenue && !m.expenses) ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={monthly} margin={{ top: 10, right: 12, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#e5e7eb" }} />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v} €`} width={64} />
                      <Tooltip content={<FinanceTooltip />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                      <Bar dataKey="revenue" name="Pajamos" fill={CHART.revenue} radius={[4,4,0,0]} maxBarSize={28} isAnimationActive />
                      <Bar dataKey="expenses" name="Išlaidos" fill={CHART.expenses} radius={[4,4,0,0]} maxBarSize={28} isAnimationActive />
                      <Line type="monotone" dataKey="profit" name="Grynas pelnas" stroke={CHART.profit} strokeWidth={2.5} dot={<ProfitDot />} activeDot={{ r: 5 }} isAnimationActive />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Artimiausi priežiūros įspėjimai</CardTitle></CardHeader>
              <CardContent>
                <MaintenanceWarnings items={maintenance} currentMileage={car.currentMileage} />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Paskutinės rezervacijos</CardTitle></CardHeader>
            <CardContent>
              <BookingsTable rows={bookings.slice(0, 5)} compact />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="finance" className="mt-6 space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Investicijos</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setAddInvestment(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Pridėti
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Data</TableHead><TableHead>Kategorija</TableHead>
                    <TableHead className="text-right">Suma</TableHead><TableHead/>
                  </TableRow></TableHeader>
                  <TableBody>
                    {investments.map((i: any) => (
                      <TableRow key={i.id}>
                        <TableCell className="tabular-nums">{i.purchase_date}</TableCell>
                        <TableCell>{INV_CAT_LABEL[i.category] ?? i.category}</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">{eur(Number(i.amount))}</TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" onClick={() => delInvestmentM.mutate(i.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {investments.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">Nėra investicijų.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Išlaidos</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setAddExpense(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Pridėti
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Data</TableHead><TableHead>Kategorija</TableHead>
                    <TableHead className="text-right">Suma</TableHead><TableHead/>
                  </TableRow></TableHeader>
                  <TableBody>
                    {expenses.map((e: any) => (
                      <TableRow key={e.id}>
                        <TableCell className="tabular-nums">{e.expense_date}</TableCell>
                        <TableCell>{CAT_LABEL[e.category] ?? e.category}</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">{eur(Number(e.amount))}</TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" onClick={() => delExpenseM.mutate(e.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {expenses.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">Nėra išlaidų.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* BOOKINGS */}
        <TabsContent value="bookings" className="mt-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Bendra suma" value={eur(bookingStats.sum)} info={{ what: "Visų rezervacijų suma bendrai.", formula: "SUM(bookings.total_amount)", source: "bookings lentelė", period: "Nuo pirmos rezervacijos" }} />
            <KpiCard label="Vidutinė suma" value={eur(bookingStats.avg)} info={{ what: "Vidutinė vienos rezervacijos vertė.", formula: "Bendra suma / Rezervacijų skaičius", source: "bookings lentelė", period: "Nuo pirmos rezervacijos" }} />
            <KpiCard label="Ilgiausia trukmė" value={num(bookingStats.longest, " d.")} info={{ what: "Ilgiausios rezervacijos trukmė dienomis.", formula: "MAX(nights(date_from, date_to))", source: "bookings lentelė", period: "Nuo pirmos rezervacijos" }} />
            <KpiCard label="Trumpiausia trukmė" value={num(bookingStats.shortest, " d.")} info={{ what: "Trumpiausios rezervacijos trukmė dienomis.", formula: "MIN(nights(date_from, date_to))", source: "bookings lentelė", period: "Nuo pirmos rezervacijos" }} />
          </div>
          <Card>
            <CardContent className="pt-6">
              <BookingsTable rows={bookings} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* MAINTENANCE */}
        <TabsContent value="maintenance" className="mt-6 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Priežiūros datos / rida</CardTitle></CardHeader>
            <CardContent>
              <MaintenanceList items={maintenance} currentMileage={car.currentMileage} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Serviso istorija</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Pradėta</TableHead><TableHead>Baigta</TableHead>
                  <TableHead>Priežastis</TableHead><TableHead className="text-right">Rida</TableHead>
                  <TableHead className="text-right">Kaina</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {serviceEvents.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="tabular-nums">{e.started_at?.slice(0,10)}</TableCell>
                      <TableCell className="tabular-nums">{e.ended_at?.slice(0,10) ?? <Badge variant="outline">Vyksta</Badge>}</TableCell>
                      <TableCell>{e.reason || "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{km(e.mileage_km)}</TableCell>
                      <TableCell className="text-right tabular-nums">{eur(e.cost ?? null)}</TableCell>
                    </TableRow>
                  ))}
                  {serviceEvents.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-4">Nėra serviso įrašų.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ANALYTICS */}
        <TabsContent value="analytics" className="mt-6 grid lg:grid-cols-2 gap-4">
          <AnalyticsCard
            title="Užimtumas (%)"
            subtitle="Kiek procentų mėnesio automobilis buvo išnuomotas"
            data={monthly}
            empty={monthly.every((m: any) => !m.utilization)}
          >
            <AreaChart data={monthly} margin={{ top: 10, right: 12, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="utilFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.utilization} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={CHART.utilization} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#e5e7eb" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} width={44} />
              <Tooltip content={<UtilTooltip />} cursor={{ stroke: CHART.utilization, strokeWidth: 1, strokeDasharray: "3 3" }} />
              <Area type="monotone" dataKey="utilization" name="Užimtumas" stroke={CHART.utilization} strokeWidth={2} fill="url(#utilFill)" isAnimationActive />
            </AreaChart>
          </AnalyticsCard>

          <AnalyticsCard
            title="ROI (%)"
            subtitle="Mėnesio grynasis pelnas padalintas iš investicijos"
            data={monthly}
            empty={monthly.every((m: any) => !m.roi)}
          >
            <LineChart data={monthly} margin={{ top: 10, right: 12, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#e5e7eb" }} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} width={44} />
              <Tooltip content={<SimpleTooltip suffix="%" metric="ROI" color={CHART.roi} />} cursor={{ stroke: CHART.roi, strokeDasharray: "3 3" }} />
              <Line type="monotone" dataKey="roi" name="ROI" stroke={CHART.roi} strokeWidth={2.5} dot={{ r: 3, fill: CHART.roi }} activeDot={{ r: 5 }} isAnimationActive />
            </LineChart>
          </AnalyticsCard>

          <AnalyticsCard
            title="Rezervacijų sk. / mėn."
            subtitle="Kiek rezervacijų prasidėjo tą mėnesį"
            data={monthly}
            empty={monthly.every((m: any) => !m.bookings)}
          >
            <BarChart data={monthly} margin={{ top: 10, right: 12, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#e5e7eb" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={32} />
              <Tooltip content={<SimpleTooltip suffix=" vnt." metric="Rezervacijos" color={CHART.revenue} />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
              <Bar dataKey="bookings" name="Rezervacijos" fill={CHART.revenue} radius={[4,4,0,0]} maxBarSize={32} isAnimationActive />
            </BarChart>
          </AnalyticsCard>

          <AnalyticsCard
            title="Nuvažiuoti kilometrai per mėnesį"
            subtitle="Skaičiuojama pagal rezervacijų ridą (grąžinimo mėn.)"
            data={monthly}
            empty={monthly.every((m: any) => !m.km)}
          >
            <BarChart data={monthly} margin={{ top: 10, right: 12, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#e5e7eb" }} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}`} width={56} />
              <Tooltip content={<SimpleTooltip suffix=" km" metric="Nuvažiuota" color={CHART.km} />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
              <Bar dataKey="km" name="Kilometrai" fill={CHART.km} radius={[4,4,0,0]} maxBarSize={32} isAnimationActive />
            </BarChart>
          </AnalyticsCard>
        </TabsContent>

        {/* DOCUMENTS */}
        <TabsContent value="documents" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setUploadDoc(true)}>
              <Plus className="h-4 w-4 mr-1" /> Įkelti dokumentą
            </Button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(["registration","insurance","inspection","purchase","other"] as const).map((kind) => {
              const items = documents.filter((d: any) => d.kind === kind);
              return (
                <Card key={kind}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4" /> {DOC_KIND_LABEL[kind]}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    {items.length === 0 && <p className="text-xs text-muted-foreground">Nėra dokumentų.</p>}
                    {items.map((doc: any) => {
                      const du = daysUntil(doc.expires_at);
                      return (
                        <div key={doc.id} className="flex items-center justify-between gap-2 border rounded-md p-2">
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{doc.title || "Dokumentas"}</div>
                            {doc.expires_at && (
                              <div className="text-xs">
                                <span className="text-muted-foreground">Galioja iki {doc.expires_at}</span>
                                {du != null && du < 0 && <Badge variant="destructive" className="ml-2">Pasibaigęs</Badge>}
                                {du != null && du >= 0 && du <= 30 && <Badge className="ml-2 bg-amber-100 text-amber-800 border-amber-200">Liko {du} d.</Badge>}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {doc.url && (
                              <Button asChild size="icon" variant="ghost">
                                <a href={doc.url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                              </Button>
                            )}
                            <Button size="icon" variant="ghost" onClick={() => delDocM.mutate(doc.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <AddExpenseDialog carId={id} open={addExpense} onOpenChange={setAddExpense} />
      <AddInvestmentDialog carId={id} open={addInvestment} onOpenChange={setAddInvestment} />
      <StartServiceDialog carId={id} open={startSvc} onOpenChange={setStartSvc} />
      <EndServiceDialog carId={id} open={endSvc} onOpenChange={setEndSvc} />
      <UploadDocumentDialog carId={id} open={uploadDoc} onOpenChange={setUploadDoc} />
    </div>
  );
}

const CHART = {
  revenue: "#3B82F6",
  expenses: "#F97316",
  profit: "#10B981",
  loss: "#EF4444",
  utilization: "#8B5CF6",
  roi: "#6366F1",
  km: "#94A3B8",
} as const;

const eurFmt = new Intl.NumberFormat("lt-LT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const numFmt = new Intl.NumberFormat("lt-LT");

function EmptyChart() {
  return (
    <div className="h-full w-full grid place-items-center text-sm text-muted-foreground">
      Duomenų nėra
    </div>
  );
}

function ProfitDot(props: any) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  const color = (payload?.profit ?? 0) >= 0 ? CHART.profit : CHART.loss;
  return <circle cx={cx} cy={cy} r={3.5} fill={color} stroke="#fff" strokeWidth={1.5} />;
}

function TooltipShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-background/95 shadow-md px-3 py-2 text-xs">
      <div className="font-medium text-foreground mb-1">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function TooltipRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
      <span className="text-muted-foreground">{label}:</span>
      <span className="ml-auto tabular-nums font-medium text-foreground">{value}</span>
    </div>
  );
}

function FinanceTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const rev = payload.find((p: any) => p.dataKey === "revenue")?.value ?? 0;
  const exp = payload.find((p: any) => p.dataKey === "expenses")?.value ?? 0;
  const profit = payload.find((p: any) => p.dataKey === "profit")?.value ?? rev - exp;
  return (
    <TooltipShell title={label}>
      <TooltipRow color={CHART.revenue} label="Pajamos" value={eurFmt.format(rev)} />
      <TooltipRow color={CHART.expenses} label="Išlaidos" value={eurFmt.format(exp)} />
      <TooltipRow color={profit >= 0 ? CHART.profit : CHART.loss} label="Pelnas" value={eurFmt.format(profit)} />
    </TooltipShell>
  );
}

function UtilTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  return (
    <TooltipShell title={label}>
      <TooltipRow
        color={CHART.utilization}
        label="Užimtumas"
        value={`${p.utilization}% (${p.occupiedDays} iš ${p.daysInMonth} d.)`}
      />
    </TooltipShell>
  );
}

function SimpleTooltip({ active, payload, label, metric, color, suffix }: any) {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value ?? 0;
  const formatted = suffix.trim() === "km" ? `${numFmt.format(v)} km` : `${numFmt.format(v)}${suffix}`;
  return (
    <TooltipShell title={label}>
      <TooltipRow color={color} label={metric} value={formatted} />
    </TooltipShell>
  );
}

function AnalyticsCard({
  title, subtitle, children, empty,
}: {
  title: string;
  subtitle?: string;
  data: any[];
  empty: boolean;
  children: React.ReactElement;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent className="h-64">
        {empty ? <EmptyChart /> : (
          <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}


function BookingsTable({ rows, compact }: { rows: any[]; compact?: boolean }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">Rezervacijų nėra.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {!compact && <TableHead>Nr.</TableHead>}
          <TableHead>Klientas</TableHead>
          <TableHead>Laikotarpis</TableHead>
          <TableHead className="text-right">Paros</TableHead>
          <TableHead className="text-right">Suma</TableHead>
          <TableHead>Statusas</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((b) => (
          <TableRow key={b.id}>
            {!compact && <TableCell className="font-mono text-xs">{b.number}</TableCell>}
            <TableCell>
              <Link to="/admin/bookings/$id" params={{ id: b.id }} className="hover:underline">
                {b.customer}
              </Link>
            </TableCell>
            <TableCell className="tabular-nums">{b.date_from} → {b.date_to}</TableCell>
            <TableCell className="text-right tabular-nums">{b.nights}</TableCell>
            <TableCell className="text-right tabular-nums font-semibold">{eur(b.total_amount)}</TableCell>
            <TableCell>
              <Badge variant="outline">{STATUS_LABEL[b.status] ?? b.status}</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function MaintenanceList({ items, currentMileage }: { items: any[]; currentMileage: number }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">Nėra įrašų.</p>;
  return (
    <div className="grid md:grid-cols-2 gap-3">
      {items.map((m) => {
        const label = MAINT_LABEL[m.type] ?? m.type;
        const warn = isMaintWarn(m, currentMileage);
        return (
          <div key={m.type} className="border rounded-md p-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">{label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {m.dueDate && <>Iki {m.dueDate}</>}
                {m.dueMileageKm != null && <>{m.dueDate ? " · " : ""}{km(m.dueMileageKm)}</>}
                {!m.dueDate && m.dueMileageKm == null && "Nenustatyta"}
              </div>
            </div>
            {warn && <Badge className="bg-amber-100 text-amber-800 border-amber-200"><AlertTriangle className="h-3 w-3 mr-1" />Artėja</Badge>}
          </div>
        );
      })}
    </div>
  );
}

function MaintenanceWarnings({ items, currentMileage }: { items: any[]; currentMileage: number }) {
  const warns = items.filter((m) => isMaintWarn(m, currentMileage));
  if (warns.length === 0) return <p className="text-sm text-muted-foreground">Įspėjimų nėra.</p>;
  return (
    <ul className="space-y-2">
      {warns.map((m) => (
        <li key={m.type} className="flex items-start gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
          <div>
            <div className="font-medium">{MAINT_LABEL[m.type] ?? m.type}</div>
            <div className="text-xs text-muted-foreground">
              {m.dueDate && <>iki {m.dueDate}</>}
              {m.dueMileageKm != null && <>{m.dueDate ? " · " : ""}{km(m.dueMileageKm)} (dabar {km(currentMileage)})</>}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function isMaintWarn(m: any, currentMileage: number): boolean {
  if (m.dueDate) {
    const du = daysUntil(m.dueDate);
    if (du != null && du <= 30) return true;
  }
  if (m.dueMileageKm != null && currentMileage > 0) {
    if (m.dueMileageKm - currentMileage <= 2000) return true;
  }
  return false;
}
