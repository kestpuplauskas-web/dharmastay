import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  listExpenses,
  createExpense,
  deleteExpense,
  EXPENSE_CATEGORIES,
} from "@/lib/operations.functions";
import { listAllProperties } from "@/lib/properties.functions";
import { DatePicker } from "@/components/DatePicker";
import { NumberInput } from "@/components/NumberInput";

export const Route = createFileRoute("/_authenticated/admin/expenses")({
  component: ExpensesPage,
});

function ExpensesPage() {
  const fetchExp = useServerFn(listExpenses);
  const create = useServerFn(createExpense);
  const remove = useServerFn(deleteExpense);
  const fetchProps = useServerFn(listAllProperties);
  const { data: expenses = [], refetch } = useQuery({
    queryKey: ["admin-expenses"],
    queryFn: () => fetchExp(),
  });
  const { data: props = [] } = useQuery({ queryKey: ["admin-props"], queryFn: () => fetchProps() });
  const [form, setForm] = useState({
    category: "utilities" as (typeof EXPENSE_CATEGORIES)[number],
    amount: 0,
    expense_date: new Date().toISOString().slice(0, 10),
    property_id: "" as string,
    note: "",
  });
  const m = useMutation({
    mutationFn: () =>
      create({
        data: {
          ...form,
          property_id: form.property_id || undefined,
        },
      }),
    onSuccess: () => {
      setForm({ ...form, amount: 0, note: "" });
      refetch();
    },
  });
  const del = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => refetch(),
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Išlaidos</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          m.mutate();
        }}
        className="mt-4 grid gap-2 rounded-lg border p-4 md:grid-cols-6"
      >
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value as any })}
          className="rounded border px-2 py-1 text-sm"
        >
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <NumberInput
          step="0.01"
          min={0}
          placeholder="0.00"
          value={form.amount || null}
          emptyFallback={null}
          onChange={(n) => setForm({ ...form, amount: n ?? 0 })}
          className="rounded border px-2 py-1 text-sm"
          required
        />
        <DatePicker
          value={form.expense_date}
          onChange={(val) => setForm({ ...form, expense_date: val })}
        />
        <select
          value={form.property_id}
          onChange={(e) => setForm({ ...form, property_id: e.target.value })}
          className="rounded border px-2 py-1 text-sm"
        >
          <option value="">Nesusieta</option>
          {props.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input
          placeholder="Pastaba"
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
          className="rounded border px-2 py-1 text-sm"
        />
        <button className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground">
          Pridėti
        </button>
      </form>

      <div className="mt-6 overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr className="text-left">
              <th className="p-2">Data</th>
              <th className="p-2">Kategorija</th>
              <th className="p-2">Suma</th>
              <th className="p-2">Objektas</th>
              <th className="p-2">Pastaba</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e: any) => (
              <tr key={e.id} className="border-t">
                <td className="p-2 text-xs">{e.expense_date}</td>
                <td className="p-2">{e.category}</td>
                <td className="p-2">{Number(e.amount ?? 0).toFixed(2)} €</td>
                <td className="p-2">{e.properties?.name ?? "—"}</td>
                <td className="p-2 text-xs text-muted-foreground">{e.note}</td>
                <td className="p-2 text-right">
                  <button
                    onClick={() => confirm("Ištrinti?") && del.mutate(e.id)}
                    className="text-destructive underline"
                  >
                    Šalinti
                  </button>
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-muted-foreground">
                  Kol kas nėra išlaidų.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}