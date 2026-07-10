import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPropertyById, updateProperty } from "@/lib/properties.functions";
import { PropertyForm, propertyToForm, type PropertyFormValues } from "@/components/admin/PropertyForm";

export const Route = createFileRoute("/_authenticated/admin/properties/$id/edit")({
  component: EditPropertyPage,
});

function EditPropertyPage() {
  const { id } = useParams({ from: "/_authenticated/admin/properties/$id/edit" });
  const fetchOne = useServerFn(getPropertyById);
  const update = useServerFn(updateProperty);
  const navigate = useNavigate();

  const { data: prop, isLoading } = useQuery({
    queryKey: ["property-edit", id],
    queryFn: () => fetchOne({ data: { id } }),
  });

  const m = useMutation({
    mutationFn: (v: PropertyFormValues) => update({ data: { id, patch: v } }),
    onSuccess: () => navigate({ to: "/admin/properties" }),
  });

  if (isLoading) return <p className="text-muted-foreground">Kraunama…</p>;
  if (!prop) return <p>Nerasta.</p>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Redaguoti: {prop.name}</h1>
      <PropertyForm
        initial={propertyToForm(prop)}
        onSubmit={(v) => m.mutate(v)}
        submitting={m.isPending}
      />
      {m.error && (
        <p className="mt-3 text-sm text-destructive">
          {m.error instanceof Error ? m.error.message : String(m.error)}
        </p>
      )}
    </div>
  );
}