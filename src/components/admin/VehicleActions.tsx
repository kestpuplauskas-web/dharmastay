import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateInput } from "@/components/ui/date-input";
import {
  createExpense,
  createInvestment,
  EXPENSE_CATEGORIES,
  INVESTMENT_CATEGORIES,
} from "@/lib/operations.functions";
import {
  startService,
  endService,
  uploadCarDocument,
} from "@/lib/vehicle.functions";

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

const INV_CAT_LABEL: Record<string, string> = {
  purchase: "Automobilio įsigyjimas",
  registration: "Registracijos mokestis",
  other: "Kita",
};

const DOC_KIND_LABEL: Record<string, string> = {
  registration: "Registracijos liudijimas",
  insurance: "Draudimas",
  inspection: "Techninė apžiūra",
  purchase: "Pirkimo dokumentai",
  other: "Kita",
};

function useInvalidate(carId: string) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["vehicle-overview", carId] });
    qc.invalidateQueries({ queryKey: ["expenses"] });
    qc.invalidateQueries({ queryKey: ["investments"] });
    qc.invalidateQueries({ queryKey: ["admin-cars"] });
  };
}

// ---------- Add Expense ----------
export function AddExpenseDialog({
  carId,
  open,
  onOpenChange,
}: {
  carId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const create = useServerFn(createExpense);
  const invalidate = useInvalidate(carId);
  const [form, setForm] = useState({
    category: "maintenance",
    amount: "",
    expense_date: new Date().toISOString().slice(0, 10),
    note: "",
    mileage_km: "",
  });

  const m = useMutation({
    mutationFn: () =>
      create({
        data: {
          category: form.category as any,
          amount: Number(form.amount),
          expense_date: form.expense_date,
          car_id: carId,
          mileage_km: form.mileage_km ? Number(form.mileage_km) : null,
          note: form.note,
        },
      }),
    onSuccess: () => {
      toast.success("Išlaida pridėta");
      invalidate();
      onOpenChange(false);
      setForm({ ...form, amount: "", note: "", mileage_km: "" });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pridėti išlaidą</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Kategorija</Label>
            <Select
              value={form.category}
              onValueChange={(v) => setForm({ ...form, category: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{CAT_LABEL[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
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
          </div>
          <div>
            <Label>Rida (km)</Label>
            <Input
              type="number"
              value={form.mileage_km}
              onChange={(e) => setForm({ ...form, mileage_km: e.target.value })}
            />
          </div>
          <div>
            <Label>Aprašymas</Label>
            <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Atšaukti</Button>
          <Button onClick={() => m.mutate()} disabled={!form.amount || m.isPending}>
            Pridėti
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Add Investment ----------
export function AddInvestmentDialog({
  carId,
  open,
  onOpenChange,
}: {
  carId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const create = useServerFn(createInvestment);
  const invalidate = useInvalidate(carId);
  const [form, setForm] = useState({
    category: "purchase",
    amount: "",
    purchase_date: new Date().toISOString().slice(0, 10),
    note: "",
    mileage_km: "",
  });

  const m = useMutation({
    mutationFn: () =>
      create({
        data: {
          car_id: carId,
          category: form.category as any,
          amount: Number(form.amount),
          purchase_date: form.purchase_date,
          mileage_km: form.mileage_km ? Number(form.mileage_km) : null,
          note: form.note,
        },
      }),
    onSuccess: () => {
      toast.success("Investicija pridėta");
      invalidate();
      onOpenChange(false);
      setForm({ ...form, amount: "", note: "", mileage_km: "" });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pridėti investiciją</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
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
          <div className="grid grid-cols-2 gap-3">
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
                value={form.purchase_date}
                onChange={(v) => setForm({ ...form, purchase_date: v })}
              />
            </div>
          </div>
          <div>
            <Label>Rida (km)</Label>
            <Input
              type="number"
              value={form.mileage_km}
              onChange={(e) => setForm({ ...form, mileage_km: e.target.value })}
            />
          </div>
          <div>
            <Label>Aprašymas</Label>
            <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Atšaukti</Button>
          <Button onClick={() => m.mutate()} disabled={!form.amount || m.isPending}>
            Pridėti
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Start Service ----------
export function StartServiceDialog({
  carId,
  open,
  onOpenChange,
}: {
  carId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const fn = useServerFn(startService);
  const invalidate = useInvalidate(carId);
  const [reason, setReason] = useState("");
  const m = useMutation({
    mutationFn: () => fn({ data: { car_id: carId, reason } }),
    onSuccess: () => {
      toast.success("Pažymėta kaip servise");
      invalidate();
      onOpenChange(false);
      setReason("");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Siųsti į servisą</DialogTitle>
          <DialogDescription>
            Automobilio statusas pasikeis į „Servise". Bus sukurtas serviso įvykis.
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label>Priežastis</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Pvz. variklio gedimas, planinis tepalų keitimas"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Atšaukti</Button>
          <Button onClick={() => m.mutate()} disabled={m.isPending}>
            Patvirtinti
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- End Service ----------
export function EndServiceDialog({
  carId,
  open,
  onOpenChange,
}: {
  carId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const fn = useServerFn(endService);
  const invalidate = useInvalidate(carId);
  const [form, setForm] = useState({ cost: "", mileage_km: "", note: "" });
  const m = useMutation({
    mutationFn: () =>
      fn({
        data: {
          car_id: carId,
          cost: form.cost ? Number(form.cost) : null,
          mileage_km: form.mileage_km ? Number(form.mileage_km) : null,
          note: form.note,
        },
      }),
    onSuccess: () => {
      toast.success("Remontas užbaigtas");
      invalidate();
      onOpenChange(false);
      setForm({ cost: "", mileage_km: "", note: "" });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Baigti remontą</DialogTitle>
          <DialogDescription>
            Jei nurodysi kainą — bus automatiškai pridėta išlaida (Autoremontas).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Kaina (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
              />
            </div>
            <div>
              <Label>Rida (km)</Label>
              <Input
                type="number"
                value={form.mileage_km}
                onChange={(e) => setForm({ ...form, mileage_km: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Pastaba</Label>
            <Textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Atšaukti</Button>
          <Button onClick={() => m.mutate()} disabled={m.isPending}>
            Baigti
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Upload Document ----------
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result || "");
      const i = s.indexOf(",");
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function UploadDocumentDialog({
  carId,
  open,
  onOpenChange,
}: {
  carId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const fn = useServerFn(uploadCarDocument);
  const invalidate = useInvalidate(carId);
  const [kind, setKind] = useState<string>("registration");
  const [title, setTitle] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const base64 = await fileToBase64(file);
      await fn({
        data: {
          car_id: carId,
          kind: kind as any,
          title,
          expires_at: expiresAt || null,
          filename: file.name,
          mime_type: file.type || "application/pdf",
          base64,
        },
      });
      toast.success("Įkelta");
      invalidate();
      onOpenChange(false);
      setFile(null);
      setTitle("");
      setExpiresAt("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Įkelti dokumentą</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Tipas</Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(DOC_KIND_LABEL).map(([k, l]) => (
                  <SelectItem key={k} value={k}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Pavadinimas (nebūtina)</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Galioja iki (nebūtina)</Label>
            <DateInput value={expiresAt} onChange={setExpiresAt} />
          </div>
          <div>
            <Label>PDF failas</Label>
            <Input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Atšaukti</Button>
          <Button onClick={submit} disabled={!file || busy}>
            {busy ? "Įkeliama..." : "Įkelti"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
