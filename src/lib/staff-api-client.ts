import { supabase } from "@/integrations/supabase/client";

/** Kviečia /api/staff/v1/* su Bearer tokenu iš esamos Supabase sesijos. */
export async function callStaffApi<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(`/api/staff/v1${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(body?.error?.message ?? `Klaida (${res.status})`);
  }
  return (await res.json()) as T;
}

export type StaffRoomStatus = "svaru" | "reikia_tvarkyti" | "tvarkoma" | "problema";

export type StaffRoom = {
  id: string;
  name: string;
  checkin_today: boolean;
  checkout_today: boolean;
  occupied_today: boolean;
  next_checkin: string | null;
  next_checkout: string | null;
  status: StaffRoomStatus;
  note: string;
  assigned_to: string | null;
  assigned_to_email: string | null;
  updated_at: string | null;
};

export const STAFF_STATUS_LABEL: Record<StaffRoomStatus, string> = {
  svaru: "Švaru",
  reikia_tvarkyti: "Reikia tvarkyti",
  tvarkoma: "Tvarkoma",
  problema: "Problema",
};

export const STAFF_STATUS_CLASS: Record<StaffRoomStatus, string> = {
  svaru: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  reikia_tvarkyti: "border-destructive/40 bg-destructive/10 text-destructive",
  tvarkoma: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  problema: "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-400",
};