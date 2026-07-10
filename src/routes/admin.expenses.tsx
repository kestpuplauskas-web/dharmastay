import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Plus, Wrench } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { listAllCars } from "@/lib/cars.functions";
import {
  EXPENSE_CATEGORIES,
  INVESTMENT_CATEGORIES,
  MAINTENANCE_TYPES,
  createExpense,
  createInvestment,
  deleteExpense,
  deleteInvestment,
  listExpenses,
  listInvestments,
  upsertMaintenance,
} from "@/lib/operations.functions";
import { getFleetStats } from "@/lib/dashboard.functions";

export const Route = createFileRoute("/admin/expenses")({
  component: ExpensesPage,
});

const eur = (n: number) =>
  new Intl.NumberFormat("lt-LT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

const km = (n: number | null | undefined) =>
  n == null ? "—" : `${new Intl.NumberFormat("lt-LT").format(n)} km`;

const CAT_LABEL: Record<string, string> = {
  fuel: "Kuras",
  maintenance: "Autoremontas",
  insurance: "Draudimas",
  marketing: "Marketingas",
  office: "Biuras",
  transport: "Automobilio transportavimas",
  telecom: "Ryšio operatoriai",
  inspection: "Techninė apžiūra",
  parts: "Autodalys",
  other: "Kita",
};

const MAINT_LABEL: Record<string, string> = {
  ta: "Techninė apžiūra galioja iki",
  insurance: "Draudimas galioja iki",
  service: "Sekantis gr. dėžės tepalų keitimas",
  oil: "Sekantis variklio tepalų keitimas",
  belt: "Sekantis diržo/grandinės keitimas",
};

const INV_CAT_LABEL: Record<string, string> = {
  purchase: "Automobilio įsigyjimas",
  registration: "Registracijos mokestis",
  other: "Kita",
};

function ExpensesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Finansai ir priežiūra</h1>
        <p className="text-sm text-muted-foreground">
          Investicijos, išlaidos ir parko techninės datos.
        </p>
      </div>

      <Tabs defaultValue="expenses">
        <TabsList>
          <TabsTrigger value="expenses">Išlaidos</TabsTrigger>
          <TabsTrigger value="investments">Investicijos</TabsTrigger>
          <TabsTrigger value="maintenance">Priežiūra</TabsTrigger>
        </TabsList>
        <TabsContent value="expenses" className="mt-6">
          <ExpensesTab />
        </TabsContent>
        <TabsContent value="investments" className="mt-6">
          <InvestmentsTab />
        </TabsContent>
        <TabsContent value="maintenance" className="mt-6">
          <MaintenanceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function useCars() {
  const fn = useServerFn(listAllCars);
  return useQuery({ queryKey: ["admin-cars-light"], queryFn: () => fn() });
}

// ===== Expenses =====
function ExpensesTab() {
  const list = useServerFn(listExpenses);
  const create = useServerFn(createExpense);
  const del = useServerFn(deleteExpense);
  const qc = useQueryClient();
  const cars = useCars();
  const q = useQuery({ queryKey: ["expenses"], queryFn: () => list() });

  const [form, setForm] = useState({
    category: "fuel",
    amount: "",
    expense_date: new Date().toISOString().slice(0, 10),
    car_id: "",
    note: "",
    mileage_km: "",
  });

  const createM = useMutation({
    mutationFn: (input: any) => create({ data: input }),
    onSuccess: () => {
      toast.success("Pridėta");
      setForm({ ...form, amount: "", note: "", mileage_km: "" });
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const delM = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pridėti išlaidą</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Kategorija</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{CAT_LABEL[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Suma (€)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>
          <div>
            <Label>Data</Label>
            <DateInput
              value={form.expense_date}
              onChange={(v) => setForm({ ...form, expense_date: v })}
            />
          </div>
          <div>
            <Label>Automobilis (nebūtina)</Label>
            <Select
              value={form.car_id || "none"}
              onValueChange={(v) => setForm({ ...form, car_id: v === "none" ? "" : v })}
            >
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Be automobilio —</SelectItem>
                {cars.data?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Aprašymas</Label>
            <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          <div>
            <Label>Rida (km)</Label>
            <Input
              type="number"
              inputMode="numeric"
              value={form.mileage_km}
              onChange={(e) => setForm({ ...form, mileage_km: e.target.value })}
              placeholder="pvz. 124500"
            />
          </div>
          <Button
            className="w-full"
            disabled={!form.amount || createM.isPending}
            onClick={() =>
              createM.mutate({
                category: form.category,
                amount: Number(form.amount),
                expense_date: form.expense_date,
                car_id: form.car_id || null,
                mileage_km: form.mileage_km ? Number(form.mileage_km) : null,
                note: form.note,
              })
            }
          >
            <Plus className="h-4 w-4 mr-1" /> Pridėti
          </Button>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Paskutinės išlaidos</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Kategorija</TableHead>
                <TableHead>Automobilis</TableHead>
                <TableHead>Aprašymas</TableHead>
                <TableHead className="text-right">Rida</TableHead>
                <TableHead className="text-right">Suma</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(q.data ?? []).map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell className="tabular-nums">{e.expense_date}</TableCell>
                  <TableCell>{CAT_LABEL[e.category] ?? e.category}</TableCell>
                  <TableCell className="text-muted-foreground">{e.cars?.name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{e.note || "—"}</TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">{km(e.mileage_km)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{eur(Number(e.amount))}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => delM.mutate(e.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!q.data || q.data.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                    Nėra išlaidų.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ===== Investments =====
function InvestmentsTab() {
  const list = useServerFn(listInvestments);
  const create = useServerFn(createInvestment);
  const del = useServerFn(deleteInvestment);
  const qc = useQueryClient();
  const cars = useCars();
  const q = useQuery({ queryKey: ["investments"], queryFn: () => list() });

  const [form, setForm] = useState({
    car_id: "",
    category: "purchase",
    amount: "",
    purchase_date: new Date().toISOString().slice(0, 10),
    note: "",
    mileage_km: "",
  });

  const createM = useMutation({
    mutationFn: (input: any) => create({ data: input }),
    onSuccess: () => {
      toast.success("Pridėta");
      setForm({ ...form, amount: "", note: "", mileage_km: "" });
      qc.invalidateQueries({ queryKey: ["investments"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const delM = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["investments"] }),
  });

  const total = (q.data ?? []).reduce((s: number, i: any) => s + Number(i.amount), 0);

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pridėti investiciją</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Automobilis</Label>
            <Select value={form.car_id} onValueChange={(v) => setForm({ ...form, car_id: v })}>
              <SelectTrigger><SelectValue placeholder="Pasirink" /></SelectTrigger>
              <SelectContent>
                {cars.data?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Kategorija</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {INVESTMENT_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{INV_CAT_LABEL[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Suma (€)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>
          <div>
            <Label>Įsigijimo data</Label>
            <DateInput
              value={form.purchase_date}
              onChange={(v) => setForm({ ...form, purchase_date: v })}
            />
          </div>
          <div>
            <Label>Aprašymas</Label>
            <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          <div>
            <Label>Rida (km)</Label>
            <Input
              type="number"
              inputMode="numeric"
              value={form.mileage_km}
              onChange={(e) => setForm({ ...form, mileage_km: e.target.value })}
              placeholder="pvz. 124500"
            />
          </div>
          <Button
            className="w-full"
            disabled={!form.amount || !form.car_id || createM.isPending}
            onClick={() =>
              createM.mutate({
                car_id: form.car_id,
                category: form.category,
                amount: Number(form.amount),
                purchase_date: form.purchase_date,
                mileage_km: form.mileage_km ? Number(form.mileage_km) : null,
                note: form.note,
              })
            }
          >
            <Plus className="h-4 w-4 mr-1" /> Pridėti
          </Button>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Investicijos</span>
            <span className="text-sm font-normal text-muted-foreground">
              Viso: <span className="font-bold text-foreground">{eur(total)}</span>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Kategorija</TableHead>
                <TableHead>Automobilis</TableHead>
                <TableHead>Aprašymas</TableHead>
                <TableHead className="text-right">Rida</TableHead>
                <TableHead className="text-right">Suma</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(q.data ?? []).map((i: any) => (
                <TableRow key={i.id}>
                  <TableCell className="tabular-nums">{i.purchase_date}</TableCell>
                  <TableCell>{INV_CAT_LABEL[i.category] ?? "—"}</TableCell>
                  <TableCell>{i.cars?.name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{i.note || "—"}</TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">{km(i.mileage_km)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{eur(Number(i.amount))}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => delM.mutate(i.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!q.data || q.data.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                    Nėra investicijų.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ===== Maintenance =====
function MaintenanceTab() {
  const fleet = useServerFn(getFleetStats);
  const upsert = useServerFn(upsertMaintenance);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["dash-fleet"], queryFn: () => fleet() });

  const upM = useMutation({
    mutationFn: (input: any) => upsert({ data: input }),
    onSuccess: () => {
      toast.success("Išsaugota");
      qc.invalidateQueries({ queryKey: ["dash-fleet"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (q.isLoading) return <div className="text-muted-foreground">Kraunama...</div>;
  if (!q.data) return null;

  return (
    <div className="space-y-4">
      {q.data.fleet.map((c: any) => (
        <Card key={c.id}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-4 w-4" /> {c.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 grid md:grid-cols-2 lg:grid-cols-4 gap-3">
            {MAINTENANCE_TYPES.map((type) => {
              const m = c.maintenance.find((x: any) => x.type === type);
              if (type === "oil" || type === "service" || type === "belt") {
                return (
                  <MaintMileageField
                    key={type}
                    label={MAINT_LABEL[type]}
                    initial={m?.dueMileageKm ?? ""}
                    onSave={(val) =>
                      upM.mutate({
                        car_id: c.id,
                        type,
                        due_date: null,
                        due_mileage_km: val === "" ? null : Number(val),
                        note: "",
                      })
                    }
                  />
                );
              }
              return (
                <MaintDateField
                  key={type}
                  label={MAINT_LABEL[type]}
                  initial={m?.dueDate ?? ""}
                  onSave={(dueDate) =>
                    upM.mutate({
                      car_id: c.id,
                      type,
                      due_date: dueDate || null,
                      note: "",
                    })
                  }
                />
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MaintDateField({
  label,
  initial,
  onSave,
}: {
  label: string;
  initial: string;
  onSave: (val: string) => void;
}) {
  const [val, setVal] = useState(initial);
  const dirty = val !== initial;
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-1">
        <DateInput value={val} onChange={setVal} className="flex-1" />
        <Button
          size="sm"
          variant={dirty ? "default" : "outline"}
          disabled={!dirty}
          onClick={() => onSave(val)}
        >
          Išs.
        </Button>
      </div>
    </div>
  );
}

function MaintMileageField({
  label,
  initial,
  onSave,
}: {
  label: string;
  initial: number | string;
  onSave: (val: string) => void;
}) {
  const initStr = initial === null || initial === undefined ? "" : String(initial);
  const [val, setVal] = useState(initStr);
  const dirty = val !== initStr;
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-1">
        <Input
          type="number"
          inputMode="numeric"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="km"
          className="h-9 flex-1 tabular-nums"
        />
        <Button
          size="sm"
          variant={dirty ? "default" : "outline"}
          disabled={!dirty}
          onClick={() => onSave(val)}
        >
          Išs.
        </Button>
      </div>
    </div>
  );
}
