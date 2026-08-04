import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPropertyForEdit, updateProperty } from "@/lib/properties.functions";
import { syncPropertyIcal } from "@/lib/ical.functions";
import { PropertyForm, propertyToForm, type PropertyFormValues } from "@/components/admin/PropertyForm";

export const Route = createFileRoute("/_authenticated/admin/properties/$id/edit")({
  component: EditPropertyPage,
});

function EditPropertyPage() {
  const { id } = useParams({ from: "/_authenticated/admin/properties/$id/edit" });
  const fetchOne = useServerFn(getPropertyForEdit);
  const update = useServerFn(updateProperty);
  const navigate = useNavigate();

  const syncIcal = useServerFn(syncPropertyIcal);

  const { data: prop, isLoading, refetch } = useQuery({
    queryKey: ["property-edit", id],
    queryFn: () => fetchOne({ data: { id } }),
  });

  const m = useMutation({
    mutationFn: (v: PropertyFormValues) => update({ data: { id, patch: v } }),
    onSuccess: () => navigate({ to: "/admin/properties" }),
  });

  const sync = useMutation({
    mutationFn: () => syncIcal({ data: { propertyId: id } }),
    onSuccess: () => refetch(),
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
        icalMeta={{
          lastSyncAt: prop.icalLastSyncAt,
          lastStatus: prop.icalLastStatus,
          onSync: prop.icalImportUrl ? () => sync.mutate() : undefined,
          syncing: sync.isPending,
        }}
      />
      {m.error && (
        <p className="mt-3 text-sm text-destructive">
          {m.error instanceof Error ? m.error.message : String(m.error)}
        </p>
      )}
    </div>
  );
}