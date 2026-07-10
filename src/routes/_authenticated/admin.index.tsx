import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAllProperties } from "@/lib/properties.functions";
import { listBookings } from "@/lib/bookings.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const fetchProps = useServerFn(listAllProperties);
  const fetchBookings = useServerFn(listBookings);
  const { data: props = [] } = useQuery({ queryKey: ["admin-props"], queryFn: () => fetchProps() });
  const { data: bookings = [] } = useQuery({
    queryKey: ["admin-bookings-recent"],
    queryFn: () => fetchBookings({ data: {} }),
  });

  const active = props.filter((p) => p.isActive).length;
  const upcoming = bookings.filter(
    (b: any) => b.status !== "cancelled" && new Date(b.date_to) >= new Date(),
  ).length;
  const revenue = bookings
    .filter((b: any) => b.status === "completed")
    .reduce((s: number, b: any) => s + Number(b.total_amount ?? 0), 0);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Skydelis</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Aktyvūs objektai</p>
          <p className="mt-2 text-3xl font-semibold">{active}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Būsimos rezervacijos</p>
          <p className="mt-2 text-3xl font-semibold">{upcoming}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Užbaigtų pajamos</p>
          <p className="mt-2 text-3xl font-semibold">{revenue.toFixed(0)} €</p>
        </div>
      </div>
    </div>
  );
}