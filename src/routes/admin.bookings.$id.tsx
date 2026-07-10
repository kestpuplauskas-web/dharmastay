import { createFileRoute, useNavigate, Link, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBooking, updateBooking, deleteBooking } from "@/lib/bookings.functions";
import { BookingForm } from "@/components/admin/BookingForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/bookings/$id")({
  component: EditBooking,
});

function EditBooking() {
  const { id } = useParams({ from: "/admin/bookings/$id" });
  const navigate = useNavigate();
  const fetchOne = useServerFn(getBooking);
  const upd = useServerFn(updateBooking);
  const del = useServerFn(deleteBooking);

  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-booking", id], queryFn: () => fetchOne({ data: { id } }) });

  const updM = useMutation({
    mutationFn: (data: any) => upd({ data: { ...data, id } }),
    onSuccess: () => {
      toast.success("Atnaujinta");
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      qc.invalidateQueries({ queryKey: ["admin-booking", id] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      navigate({ to: "/admin/bookings" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Klaida"),
  });

  const delM = useMutation({
    mutationFn: () => del({ data: { id } }),
    onSuccess: () => { toast.success("Ištrinta"); navigate({ to: "/admin/bookings" }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Klaida"),
  });

  if (q.isLoading) return <div className="text-muted-foreground">Kraunama...</div>;
  if (!q.data) return <div>Nerasta</div>;

  const b: any = q.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/bookings"><ArrowLeft className="h-4 w-4 mr-1" /> Atgal</Link>
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => { if (confirm("Tikrai ištrinti?")) delM.mutate(); }}
        >
          <Trash2 className="h-4 w-4 mr-1" /> Ištrinti
        </Button>
      </div>
      <div>
        <h1 className="text-2xl font-bold">Redaguoti rezervaciją</h1>
      </div>
      <BookingForm
        excludeId={id}
        bookingNumber={b.booking_number ?? undefined}
        initial={{
          car_id: b.car_id,
          date_from: b.date_from,
          date_to: b.date_to,
          pickup_time: b.pickup_time ?? "",
          return_time: b.return_time ?? "",
          pickup_location: b.pickup_location ?? "",
          return_location: b.return_location ?? "",
          customer_name: b.customer_name ?? "",
          customer_phone: b.customer_phone ?? "",
          customer_email: b.customer_email ?? "",
          customer_address: b.customer_address ?? "",
          customer_id_code: b.customer_id_code ?? "",
          mileage_out: b.mileage_out ?? null,
          mileage_in: b.mileage_in ?? null,
          source: b.source ?? "phone",
          status: b.status ?? "confirmed",
          total_amount: Number(b.total_amount ?? 0),
          note: b.note ?? "",
        }}
        submitLabel="Išsaugoti"
        busy={updM.isPending}
        onSubmit={async (d) => { await updM.mutateAsync(d); }}
      />
    </div>
  );
}
