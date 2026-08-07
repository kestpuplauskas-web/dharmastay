import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  callStaffApi,
  STAFF_STATUS_CLASS,
  STAFF_STATUS_LABEL,
  type StaffRoom,
} from "@/lib/staff-api-client";

export const Route = createFileRoute("/_authenticated/staff/")({
  component: RoomList,
});

function RoomList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["staff-rooms"],
    queryFn: () => callStaffApi<{ data: StaffRoom[] }>("/rooms"),
    refetchInterval: 30_000,
  });

  if (isLoading) return <div className="p-4 text-muted-foreground">Kraunama…</div>;
  if (error) return <div className="p-4 text-destructive">{(error as Error).message}</div>;

  const rooms = [...(data?.data ?? [])].sort((a, b) => {
    if (a.checkout_today !== b.checkout_today) return a.checkout_today ? -1 : 1;
    return 0;
  });

  if (rooms.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">Kambarių nerasta.</p>;
  }

  return (
    <div className="space-y-3">
      {rooms.map((r) => (
        <Link
          key={r.id}
          to="/staff/$id"
          params={{ id: r.id }}
          className="block rounded-xl border bg-card p-4 shadow-sm active:scale-[0.99]"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="font-medium">{r.name}</span>
            <span
              className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs ${STAFF_STATUS_CLASS[r.status]}`}
            >
              {STAFF_STATUS_LABEL[r.status]}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {r.checkout_today && (
              <span className="rounded-md bg-muted px-2 py-0.5">Išvyksta šiandien</span>
            )}
            {r.checkin_today && (
              <span className="rounded-md bg-muted px-2 py-0.5">Atvyksta šiandien</span>
            )}
            {!r.checkout_today && !r.checkin_today && r.occupied_today && (
              <span className="rounded-md bg-muted px-2 py-0.5">Užimta</span>
            )}
          </div>
          {r.assigned_to && (
            <p className="mt-2 text-xs text-muted-foreground">
              Priskirta: {r.assigned_to_email ?? "—"}
            </p>
          )}
        </Link>
      ))}
    </div>
  );
}