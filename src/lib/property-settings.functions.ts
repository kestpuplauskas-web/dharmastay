import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  DEFAULT_PROPERTY_SETTINGS,
  SETTINGS_COLUMN_MAP,
  hhmm,
  settingsSchemas,
  type PropertySettings,
  type SettingsSectionId,
} from "./property-settings";

const TIME_KEYS: (keyof PropertySettings)[] = [
  "checkinFrom",
  "checkinUntil",
  "checkoutUntil",
  "quietHoursFrom",
  "quietHoursTo",
];
const NUMBER_KEYS: (keyof PropertySettings)[] = [
  "vatRate",
  "cityTax",
  "extraGuestFee",
  "depositAmount",
  "cancellationFee",
  "noShowFee",
  "lat",
  "lng",
];

function rowToSettings(row: Record<string, unknown> | null): PropertySettings {
  if (!row) return { ...DEFAULT_PROPERTY_SETTINGS };
  const out = { ...DEFAULT_PROPERTY_SETTINGS } as Record<string, unknown>;
  for (const [key, column] of Object.entries(SETTINGS_COLUMN_MAP)) {
    const raw = row[column];
    if (raw === undefined) continue;
    const k = key as keyof PropertySettings;
    if (TIME_KEYS.includes(k)) {
      out[key] = hhmm(raw, String(DEFAULT_PROPERTY_SETTINGS[k]));
    } else if (NUMBER_KEYS.includes(k)) {
      out[key] = raw === null ? (k === "lat" || k === "lng" ? null : 0) : Number(raw);
    } else if (key === "paymentMethods") {
      out[key] = Array.isArray(raw) ? (raw as string[]) : [];
    } else if (raw === null) {
      out[key] = DEFAULT_PROPERTY_SETTINGS[k];
    } else {
      out[key] = raw;
    }
  }
  return out as PropertySettings;
}

function sectionToColumns(values: Record<string, unknown>) {
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    const column = SETTINGS_COLUMN_MAP[key as keyof PropertySettings];
    if (!column) continue;
    patch[column] = value === "" && key !== "cancellationPolicyText" && key !== "invoiceNotes"
      ? null
      : value;
  }
  return patch;
}

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) {
    console.error("[property-settings:has_role]", error.message);
    throw new Error("Nepavyko patikrinti teisių.");
  }
  if (!data) throw new Error("Neturite teisių keisti nustatymų.");
}

export const getPropertySettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: row, error } = await context.supabase
      .from("property_settings")
      .select("*")
      .eq("scope", "global")
      .maybeSingle();
    if (error) {
      console.error("[getPropertySettings]", error.message);
      throw new Error("Nepavyko įkelti nustatymų.");
    }
    return {
      exists: Boolean(row),
      updatedAt: (row?.updated_at as string | undefined) ?? null,
      settings: rowToSettings(row as Record<string, unknown> | null),
    };
  });

const sectionIds = Object.keys(settingsSchemas) as [SettingsSectionId, ...SettingsSectionId[]];

export const savePropertySettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => {
    const base = z
      .object({
        section: z.enum(sectionIds),
        values: z.record(z.unknown()),
      })
      .parse(d);
    const parsedValues = settingsSchemas[base.section].parse(base.values);
    return { ...base, values: parsedValues as Record<string, unknown> };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin({ supabase: context.supabase, userId: context.userId });

    const patch = {
      ...sectionToColumns(data.values),
      scope: "global",
      updated_by: context.userId,
    };

    const { data: row, error } = await context.supabase
      .from("property_settings")
      .upsert(patch as never, { onConflict: "scope" })
      .select("*")
      .single();

    if (error) {
      console.error("[savePropertySettings]", error.message);
      throw new Error("Nepavyko išsaugoti nustatymų.");
    }
    return {
      updatedAt: (row?.updated_at as string | undefined) ?? null,
      settings: rowToSettings(row as Record<string, unknown>),
    };
  });