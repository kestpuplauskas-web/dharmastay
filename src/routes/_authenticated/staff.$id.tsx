import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  callStaffApi,
  STAFF_STATUS_CLASS,
  STAFF_STATUS_LABEL,
  type StaffRoom,
  type StaffRoomStatus,
} from "@/lib/staff-api-client";

const STATUSES: StaffRoomStatus[] = ["svaru", "reikia_tvarkyti", "tvarkoma", "problema"];

export const Route = createFileRoute("/_authenticated/staff/$id")({
  component: RoomDetail,
});

function RoomDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [note, setNote] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["staff-rooms"],
    queryFn: () => callStaffApi<{ data: StaffRoom[] }>("/rooms"),
  });
  const room = data?.data.find((r) => r.id === id);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["staff-rooms"] });
  const onError = (e: unknown) => toast.error(e instanceof Error ? e.message : "Klaida");

  const setStatus = useMutation({
    mutationFn: (status: StaffRoomStatus) =>
      callStaffApi(`/rooms/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ status, ...(note ? { note } : {}) }),
      }),
    onSuccess: () => {
      toast.success("Būsena atnaujinta");
      invalidate();
    },
    onError,
  });
  const assign = useMutation({
    mutationFn: () => callStaffApi(`/rooms/${id}/assign`, { method: "POST" }),
    onSuccess: invalidate,
    onError,
  });
  const unassign = useMutation({
    mutationFn: () => callStaffApi(`/rooms/${id}/unassign`, { method: "POST" }),
    onSuccess: invalidate,
    onError,
  });

  if (isLoading) return <div className="p-4 text-muted-foreground">Kraunama…</div>;
  if (!room) return <div className="p-4 text-muted-foreground">Kambarys nerastas.</div>;

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/staff" })}>
        <ChevronLeft className="mr-1 h-4 w-4" /> Atgal
      </Button>

      <div>
        <h1 className="text-xl font-semibold">{room.name}</h1>
        <span
          className={`mt-2 inline-block rounded-full border px-2.5 py-0.5 text-xs ${STAFF_STATUS_CLASS[room.status]}`}
        >
          {STAFF_STATUS_LABEL[room.status]}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {room.checkout_today && (
          <span className="rounded-md bg-muted px-2 py-1">Išvyksta šiandien</span>
        )}
        {room.checkin_today && (
          <span className="rounded-md bg-muted px-2 py-1">Atvyksta šiandien</span>
        )}
        {room.occupied_today && <span className="rounded-md bg-muted px-2 py-1">Užimta</span>}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Pastaba</p>
        <Textarea
          value={note}
          maxLength={500}
          placeholder={room.note || "Pastaba (nebūtina)"}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {STATUSES.map((s) => (
          <Button
            key={s}
            variant={room.status === s ? "default" : "outline"}
            disabled={setStatus.isPending}
            onClick={() => setStatus.mutate(s)}
          >
            {STAFF_STATUS_LABEL[s]}
          </Button>
        ))}
      </div>

      <div className="flex gap-2">
        {!room.assigned_to ? (
          <Button className="flex-1" disabled={assign.isPending} onClick={() => assign.mutate()}>
            Priimti valyti
          </Button>
        ) : (
          <Button
            variant="outline"
            className="flex-1"
            disabled={unassign.isPending}
            onClick={() => unassign.mutate()}
          >
            Atsisakyti
          </Button>
        )}
      </div>
      {room.assigned_to && (
        <p className="text-center text-xs text-muted-foreground">
          Priskirta: {room.assigned_to_email ?? "—"}
        </p>
      )}
    </div>
  );
}