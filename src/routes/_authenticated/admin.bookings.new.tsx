import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAllProperties } from "@/lib/properties.functions";
import { createBooking } from "@/lib/bookings.functions";
import {
  BookingForm,
  defaultBookingForm,
  type BookingFormValues,
} from "@/components/admin/BookingForm";

export const Route = createFileRoute("/_authenticated/admin/bookings/new")({
  component: NewBookingPage,
});

function NewBookingPage() {
  const fetchProps = useServerFn(listAllProperties);
  const create = useServerFn(createBooking);
  const navigate = useNavigate();
  const { data: props = [] } = useQuery({ queryKey: ["admin-props"], queryFn: () => fetchProps() });
  const m = useMutation({
    mutationFn: (v: BookingFormValues) => create({ data: v }),
    onSuccess: () => navigate({ to: "/admin/bookings" }),
  });
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Nauja rezervacija</h1>
      <BookingForm
        properties={props}
        initial={defaultBookingForm(props)}
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