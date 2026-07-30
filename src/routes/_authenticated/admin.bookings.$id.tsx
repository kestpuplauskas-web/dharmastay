import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAllProperties } from "@/lib/properties.functions";
import { getBooking, updateBooking } from "@/lib/bookings.functions";
import {
  BookingForm,
  defaultBookingForm,
  type BookingFormValues,
} from "@/components/admin/BookingForm";

export const Route = createFileRoute("/_authenticated/admin/bookings/$id")({
  component: EditBookingPage,
});

function EditBookingPage() {
  const { id } = useParams({ from: "/_authenticated/admin/bookings/$id" });
  const fetchOne = useServerFn(getBooking);
  const fetchProps = useServerFn(listAllProperties);
  const update = useServerFn(updateBooking);
  const navigate = useNavigate();

  const { data: props = [] } = useQuery({ queryKey: ["admin-props"], queryFn: () => fetchProps() });
  const { data: booking, isLoading } = useQuery({
    queryKey: ["admin-booking", id],
    queryFn: () => fetchOne({ data: { id } }),
  });

  const m = useMutation({
    mutationFn: (v: BookingFormValues) => update({ data: { id, ...v } }),
    onSuccess: () => navigate({ to: "/admin/bookings" }),
  });

  if (isLoading) return <p>Kraunama…</p>;
  if (!booking) return <p>Nerasta.</p>;

  const initial: BookingFormValues = {
    ...defaultBookingForm(props),
    property_id: booking.property_id,
    date_from: booking.date_from,
    date_to: booking.date_to,
    check_in_time: booking.check_in_time ?? "",
    check_out_time: booking.check_out_time ?? "",
    location: booking.location ?? "",
    guests: booking.guests ?? 1,
    customer_name: booking.customer_name ?? "",
    customer_phone: booking.customer_phone ?? "",
    customer_email: booking.customer_email ?? "",
    customer_address: booking.customer_address ?? "",
    customer_id_code: booking.customer_id_code ?? "",
    client_type: (booking.client_type ?? "person") as BookingFormValues["client_type"],
    birth_date: booking.birth_date ?? null,
    company_name: booking.company_name ?? "",
    company_code: booking.company_code ?? "",
    is_vat_payer: Boolean(booking.is_vat_payer),
    vat_number: booking.vat_number ?? "",
    source: (booking.source ?? "phone") as BookingFormValues["source"],
    status: (booking.status ?? "confirmed") as BookingFormValues["status"],
    total_amount: Number(booking.total_amount ?? 0),
    note: booking.note ?? "",
  };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Rezervacija {booking.booking_number}</h1>
      <BookingForm
        properties={props}
        initial={initial}
        onSubmit={(v) => m.mutate(v)}
        submitting={m.isPending}
      />
    </div>
  );
}