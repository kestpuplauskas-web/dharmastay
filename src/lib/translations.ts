export type TranslatableEntity = "property" | "content_template" | "property_settings";

export type TranslatableFieldDef = {
  /** Rakto reikšmė DB stulpelyje `field`. */
  field: string;
  label: string;
  multiline?: boolean;
};

/** Objekto laukai, kuriuos galima versti. */
export const PROPERTY_TRANSLATABLE_FIELDS: TranslatableFieldDef[] = [
  { field: "name", label: "Pavadinimas" },
  { field: "description", label: "Aprašymas", multiline: true },
  { field: "location_note", label: "Vietos pastabos", multiline: true },
  { field: "rooms_notes", label: "Kambarių pastabos", multiline: true },
];

/**
 * Papildomos paslaugos saugomos jsonb masyve ir kainų skaičiavime atpažįstamos
 * PAGAL PAVADINIMĄ, tad lietuviškas pavadinimas faktiškai yra jų identifikatorius.
 */
export const EXTRA_SERVICE_FIELD_PREFIX = "extra_service.";

export function extraServiceField(ltName: string): string {
  return `${EXTRA_SERVICE_FIELD_PREFIX}${ltName.trim()}`;
}

/** Ar šis laukas apskritai gali būti verčiamas? */
export function isAllowedField(entityType: TranslatableEntity, field: string): boolean {
  if (entityType !== "property") return true; // kiti tipai bus pridėti vėlesniuose etapuose
  if (PROPERTY_TRANSLATABLE_FIELDS.some((f) => f.field === field)) return true;
  return (
    field.startsWith(EXTRA_SERVICE_FIELD_PREFIX) &&
    field.length > EXTRA_SERVICE_FIELD_PREFIX.length
  );
}

/** Vertimų rinkinys: { [field]: { [lang]: value } } */
export type TranslationMap = Record<string, Record<string, string>>;
