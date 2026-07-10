import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCarById, updateCar } from "@/lib/cars.functions";
import { CarForm, type CarFormValue } from "@/components/admin/CarForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/cars/$id/edit")({
  component: EditCar,
});

function EditCar() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchOne = useServerFn(getCarById);
  const update = useServerFn(updateCar);

  const q = useQuery({
    queryKey: ["car", id],
    queryFn: () => fetchOne({ data: { id } }),
  });

  const m = useMutation({
    mutationFn: (patch: CarFormValue) => update({ data: { id, patch } }),
    onSuccess: () => {
      toast.success("Išsaugota");
      qc.invalidateQueries({ queryKey: ["admin-cars"] });
      qc.invalidateQueries({ queryKey: ["cars"] });
      qc.invalidateQueries({ queryKey: ["car", id] });
      qc.invalidateQueries({ queryKey: ["vehicle-overview", id] });
      navigate({ to: "/admin/cars/$id", params: { id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Klaida"),
  });

  if (q.isLoading) return <div className="text-muted-foreground">Kraunama...</div>;
  if (q.error) return <div className="text-destructive">{(q.error as Error).message}</div>;
  if (!q.data) return <div>Nerastas.</div>;

  const car = q.data;
  const initial: CarFormValue = {
    name: car.name,
    category: car.category,
    year: car.year,
    transmission: car.transmission,
    seats: car.seats,
    fuel: car.fuel,
    consumption: car.consumption,
    mileagePolicy: car.mileagePolicy,
    pricePerDay: car.pricePerDay,
    coverImageUrl: car.image,
    imageUrls: car.images,
    features: car.features,
    priceTiers: car.priceTiers,
    isActive: car.isActive ?? true,
    sortOrder: car.sortOrder ?? 100,
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Button asChild variant="ghost" size="sm">
        <Link to="/admin/cars/$id" params={{ id }}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Atgal į apžvalgą
        </Link>
      </Button>
      <h1 className="text-2xl font-bold">Redaguoti: {car.name}</h1>
      <CarForm
        initial={initial}
        submitting={m.isPending}
        folder={id}
        onSubmit={(v) => m.mutate(v)}
      />
    </div>
  );
}
