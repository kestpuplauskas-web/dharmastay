import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listAllCars, deleteCar } from "@/lib/cars.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, EyeOff } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/cars/")({
  component: AdminIndex,
});

function AdminIndex() {
  const fetchCars = useServerFn(listAllCars);
  const del = useServerFn(deleteCar);
  const qc = useQueryClient();

  const q = useQuery({ queryKey: ["admin-cars"], queryFn: () => fetchCars() });

  const delM = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Ištrinta");
      qc.invalidateQueries({ queryKey: ["admin-cars"] });
      qc.invalidateQueries({ queryKey: ["cars"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Klaida"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Automobiliai</h1>
          <p className="text-sm text-muted-foreground">
            {q.data ? `${q.data.length} viso` : "Kraunama..."}
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/cars/new"><Plus className="h-4 w-4 mr-1" /> Pridėti automobilį</Link>
        </Button>
      </div>

      {q.isLoading && <div className="text-muted-foreground">Kraunama...</div>}
      {q.error && <div className="text-destructive">{(q.error as Error).message}</div>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {q.data?.map((car) => (
          <Card key={car.id} className="overflow-hidden p-0 group hover:shadow-md transition-shadow">
            <Link to="/admin/cars/$id" params={{ id: car.id }} className="block">
              <div className="aspect-[16/10] bg-muted relative">
                {car.image ? (
                  <img src={car.image} alt={car.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full grid place-items-center text-muted-foreground text-sm">
                    Be nuotraukos
                  </div>
                )}
                {!car.isActive && (
                  <Badge variant="secondary" className="absolute top-2 right-2">
                    <EyeOff className="h-3 w-3 mr-1" /> Paslėpta
                  </Badge>
                )}
              </div>
            </Link>
            <CardContent className="p-4 space-y-2">
              <Link to="/admin/cars/$id" params={{ id: car.id }} className="block">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold leading-tight group-hover:text-primary transition-colors">{car.name}</h3>
                    <p className="text-xs text-muted-foreground">{car.category} · {car.year}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary">{car.pricePerDay}€</div>
                    <div className="text-[10px] text-muted-foreground">/diena</div>
                  </div>
                </div>
              </Link>
              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm(`Ištrinti „${car.name}"?`)) delM.mutate(car.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
