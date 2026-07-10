import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  listContractTemplates,
  upsertContractTemplate,
  deleteContractTemplate,
} from "@/lib/contracts.functions";

export const Route = createFileRoute("/_authenticated/admin/contracts")({
  component: ContractsPage,
});

function ContractsPage() {
  const fetchAll = useServerFn(listContractTemplates);
  const upsert = useServerFn(upsertContractTemplate);
  const remove = useServerFn(deleteContractTemplate);
  const { data: templates = [], refetch } = useQuery({
    queryKey: ["admin-templates"],
    queryFn: () => fetchAll(),
  });
  const [editing, setEditing] = useState<any>(null);
  const m = useMutation({
    mutationFn: (t: any) => upsert({ data: t }),
    onSuccess: () => {
      setEditing(null);
      refetch();
    },
  });
  const del = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => refetch(),
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sutartys / Politikos</h1>
        <button
          onClick={() =>
            setEditing({
              name: "",
              content: "",
              language: "lt",
              kind: "rental",
              is_active: true,
            })
          }
          className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground"
        >
          + Naujas šablonas
        </button>
      </div>

      {editing && (
        <div className="mt-4 space-y-2 rounded-lg border p-4">
          <input
            placeholder="Pavadinimas"
            value={editing.name}
            onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            className="w-full rounded border px-2 py-1 text-sm"
          />
          <div className="flex gap-2">
            <select
              value={editing.language}
              onChange={(e) => setEditing({ ...editing, language: e.target.value })}
              className="rounded border px-2 py-1 text-sm"
            >
              <option value="lt">LT</option>
              <option value="en">EN</option>
            </select>
            <select
              value={editing.kind}
              onChange={(e) => setEditing({ ...editing, kind: e.target.value })}
              className="rounded border px-2 py-1 text-sm"
            >
              <option value="rental">Nuomos taisyklės</option>
              <option value="privacy">Privatumo politika</option>
            </select>
            <label className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={editing.is_active}
                onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
              />
              Aktyvus
            </label>
          </div>
          <textarea
            rows={12}
            value={editing.content}
            onChange={(e) => setEditing({ ...editing, content: e.target.value })}
            className="w-full rounded border px-2 py-1 text-sm font-mono"
          />
          <div className="flex gap-2">
            <button
              onClick={() => m.mutate(editing)}
              className="rounded-md bg-primary px-4 py-1 text-sm text-primary-foreground"
            >
              Saugoti
            </button>
            <button onClick={() => setEditing(null)} className="text-sm">
              Atšaukti
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-2">
        {templates.map((t: any) => (
          <div key={t.id} className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium">
                {t.name}{" "}
                <span className="text-xs text-muted-foreground">
                  ({t.language} / {t.kind}) {t.is_active ? "✓ aktyvus" : ""}
                </span>
              </p>
            </div>
            <div className="flex gap-3 text-sm">
              <button onClick={() => setEditing(t)} className="text-primary underline">
                Redaguoti
              </button>
              <button
                onClick={() => confirm("Ištrinti šabloną?") && del.mutate(t.id)}
                className="text-destructive underline"
              >
                Šalinti
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}