import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createProperty } from "@/lib/properties.functions";
import { PropertyForm, propertyToForm, type PropertyFormValues } from "@/components/admin/PropertyForm";

export const Route = createFileRoute("/_authenticated/admin/properties/new")({
  component: NewPropertyPage,
});

function NewPropertyPage() {
  const create = useServerFn(createProperty);
  const navigate = useNavigate();
  const m = useMutation({
    mutationFn: (v: PropertyFormValues) => create({ data: v }),
    onSuccess: () => navigate({ to: "/admin/properties" }),
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Naujas objektas</h1>
      <PropertyForm
        initial={propertyToForm(null)}
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