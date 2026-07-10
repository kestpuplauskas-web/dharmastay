import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { createBooking } from "@/lib/bookings.functions";
import { BookingForm } from "@/components/admin/BookingForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";

const searchSchema = z.object({
  carId: fallback(z.string().optional(), undefined),
  from: fallback(z.string().optional(), undefined),
  to: fallback(z.string().optional(), undefined),
});

export const Route = createFileRoute("/admin/bookings/new")({
  validateSearch: zodValidator(searchSchema),
  component: NewBooking,
});

function NewBooking() {
  const navigate = useNavigate();
  const { carId, from, to } = Route.useSearch();
  const create = useServerFn(createBooking);
  const m = useMutation({
    mutationFn: (data: any) => create({ data }),
    onSuccess: () => {
      toast.success("Rezervacija sukurta");
      navigate({ to: "/admin/bookings" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Klaida"),
  });

  const initial = {
    car_id: carId ?? "",
    date_from: from ?? "",
    date_to: to ?? from ?? "",
  };

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/admin/bookings"><ArrowLeft className="h-4 w-4 mr-1" /> Atgal</Link>
      </Button>
      <h1 className="text-2xl font-bold">Nauja rezervacija</h1>
      <BookingForm initial={initial} submitLabel="Sukurti" busy={m.isPending} onSubmit={async (d) => { await m.mutateAsync(d); }} />
    </div>
  );
}
