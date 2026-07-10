import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAllProperties, deleteProperty } from "@/lib/properties.functions";
import { propertyTypeLabel } from "@/lib/properties";

export const Route = createFileRoute("/_authenticated/admin/properties/")({
  component: PropertiesList,
});

function PropertiesList() {
  const fetchAll = useServerFn(listAllProperties);
  const remove = useServerFn(deleteProperty);
  const { data: props = [], refetch } = useQuery({
    queryKey: ["admin-all-properties"],
    queryFn: () => fetchAll(),
  });
  const del = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => refetch(),
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Objektai</h1>
        <Link
          to="/admin/properties/new"
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          + Naujas objektas
        </Link>
      </div>
      <div className="mt-6 overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr className="text-left">
              <th className="p-2">Pavadinimas</th>
              <th className="p-2">Tipas</th>
              <th className="p-2">Miestas</th>
              <th className="p-2">Kaina/naktis</th>
              <th className="p-2">Aktyvus</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {props.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-2 font-medium">{p.name}</td>
                <td className="p-2 text-muted-foreground">
                  {propertyTypeLabel(p.propertyType)}
                </td>
                <td className="p-2 text-muted-foreground">{p.city}</td>
                <td className="p-2">{p.pricePerNight.toFixed(0)} €</td>
                <td className="p-2">{p.isActive ? "✓" : "—"}</td>
                <td className="p-2 text-right">
                  <Link
                    to="/admin/properties/$id/edit"
                    params={{ id: p.id }}
                    className="text-primary underline"
                  >
                    Redaguoti
                  </Link>
                  <button
                    onClick={() => {
                      if (confirm(`Ištrinti „${p.name}"?`)) del.mutate(p.id);
                    }}
                    className="ml-4 text-destructive underline"
                  >
                    Šalinti
                  </button>
                </td>
              </tr>
            ))}
            {props.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-muted-foreground">
                  Nėra objektų — pridėkite pirmą.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}