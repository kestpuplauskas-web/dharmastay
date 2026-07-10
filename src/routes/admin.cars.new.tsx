import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCar } from "@/lib/cars.functions";
import { CarForm, emptyCar, type CarFormValue } from "@/components/admin/CarForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/cars/new")({
  component: NewCar,
});

function NewCar() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const create = useServerFn(createCar);

  const m = useMutation({
    mutationFn: (data: CarFormValue) => create({ data }),
    onSuccess: () => {
      toast.success("Automobilis sukurtas");
      qc.invalidateQueries({ queryKey: ["admin-cars"] });
      qc.invalidateQueries({ queryKey: ["cars"] });
      navigate({ to: "/admin" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Klaida"),
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Button asChild variant="ghost" size="sm">
        <Link to="/admin"><ArrowLeft className="h-4 w-4 mr-1" /> Atgal</Link>
      </Button>
      <h1 className="text-2xl font-bold">Naujas automobilis</h1>
      <CarForm
        initial={emptyCar}
        submitting={m.isPending}
        submitLabel="Sukurti"
        onSubmit={(v) => m.mutate(v)}
      />
    </div>
  );
}
