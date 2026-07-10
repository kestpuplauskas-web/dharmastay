import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listBookings, deleteBooking } from "@/lib/bookings.functions";

export const Route = createFileRoute("/_authenticated/admin/bookings/")({
  component: BookingsList,
});

function BookingsList() {
  const fetchAll = useServerFn(listBookings);
  const remove = useServerFn(deleteBooking);
  const { data: bookings = [], refetch } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: () => fetchAll({ data: {} }),
  });
  const del = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => refetch(),
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Rezervacijos</h1>
        <Link
          to="/admin/bookings/new"
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          + Nauja rezervacija
        </Link>
      </div>
      <div className="mt-6 overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr className="text-left">
              <th className="p-2">Nr.</th>
              <th className="p-2">Objektas</th>
              <th className="p-2">Datos</th>
              <th className="p-2">Klientas</th>
              <th className="p-2">Suma</th>
              <th className="p-2">Statusas</th>
              <th className="p-2">Mokėjimas</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b: any) => (
              <tr key={b.id} className="border-t">
                <td className="p-2 font-mono text-xs">{b.booking_number}</td>
                <td className="p-2">{b.properties?.name ?? "—"}</td>
                <td className="p-2 text-xs">
                  {b.date_from} → {b.date_to}
                </td>
                <td className="p-2">
                  {b.customer_name}
                  <div className="text-xs text-muted-foreground">{b.customer_email}</div>
                </td>
                <td className="p-2">{Number(b.total_amount ?? 0).toFixed(0)} €</td>
                <td className="p-2">{b.status}</td>
                <td className="p-2 text-xs">{b.payment_status}</td>
                <td className="p-2 text-right">
                  <Link
                    to="/admin/bookings/$id"
                    params={{ id: b.id }}
                    className="text-primary underline"
                  >
                    Atidaryti
                  </Link>
                  <button
                    onClick={() => {
                      if (confirm("Ištrinti rezervaciją?")) del.mutate(b.id);
                    }}
                    className="ml-3 text-destructive underline"
                  >
                    Šalinti
                  </button>
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={8} className="p-4 text-center text-muted-foreground">
                  Nėra rezervacijų.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}