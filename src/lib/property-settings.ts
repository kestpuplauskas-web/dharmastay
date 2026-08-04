import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Konstantos (jokių hardcoded reikšmių komponentuose)                  */
/* ------------------------------------------------------------------ */

export const CURRENCIES = [
  { value: "EUR", label: "EUR — Euras" },
  { value: "USD", label: "USD — JAV doleris" },
  { value: "GBP", label: "GBP — Svaras sterlingų" },
  { value: "PLN", label: "PLN — Lenkijos zlotas" },
] as const;

export const LANGUAGES = [
  { value: "lt", label: "Lietuvių" },
  { value: "en", label: "English" },
  { value: "ru", label: "Русский" },
  { value: "pl", label: "Polski" },
  { value: "de", label: "Deutsch" },
] as const;

export const TIMEZONES = [
  { value: "Europe/Vilnius", label: "Europe/Vilnius (UTC+2/+3)" },
  { value: "Europe/Riga", label: "Europe/Riga" },
  { value: "Europe/Tallinn", label: "Europe/Tallinn" },
  { value: "Europe/Warsaw", label: "Europe/Warsaw" },
  { value: "Europe/London", label: "Europe/London" },
  { value: "UTC", label: "UTC" },
] as const;

export const COUNTRIES = [
  { value: "LT", label: "Lietuva" },
  { value: "LV", label: "Latvija" },
  { value: "EE", label: "Estija" },
  { value: "PL", label: "Lenkija" },
  { value: "DE", label: "Vokietija" },
  { value: "GB", label: "Jungtinė Karalystė" },
] as const;

export const PAYMENT_METHODS = [
  { value: "cash", label: "Grynaisiais" },
  { value: "bank_transfer", label: "Banko pavedimu" },
  { value: "card", label: "Banko kortele" },
  { value: "stripe", label: "Stripe" },
  { value: "paysera", label: "Paysera" },
  { value: "paypal", label: "PayPal" },
] as const;

export const DEPOSIT_TYPES = [
  { value: "full", label: "Visa suma" },
  { value: "percent", label: "Procentas" },
  { value: "fixed", label: "Fiksuota suma" },
] as const;

export const FEE_TYPES = [
  { value: "percent", label: "Procentas nuo sumos" },
  { value: "fixed", label: "Fiksuota suma" },
  { value: "first_night", label: "Pirmos nakties kaina" },
] as const;

/* ------------------------------------------------------------------ */
/* Bendra nustatymų forma                                              */
/* ------------------------------------------------------------------ */

const time = z
  .string()
  .regex(/^\d{2}:\d{2}$/, "Formatas turi būti HH:MM");
const optionalText = (max = 300) => z.string().trim().max(max).default("");

export const settingsSchemas = {
  general: z.object({
    displayName: optionalText(200),
    address: optionalText(300),
    city: optionalText(120),
    postalCode: optionalText(20),
    country: z.string().min(2).max(3).default("LT"),
    lat: z.number().min(-90).max(90).nullable().default(null),
    lng: z.number().min(-180).max(180).nullable().default(null),
    timezone: z.string().min(1).default("Europe/Vilnius"),
    currency: z.string().min(3).max(3).default("EUR"),
    defaultLanguage: z.string().min(2).max(5).default("lt"),
    phone: optionalText(40),
    email: z.union([z.literal(""), z.string().email("Neteisingas el. pašto formatas")]).default(""),
  }),
  stay: z.object({
    checkinFrom: time,
    checkinUntil: time,
    checkoutUntil: time,
    minNights: z.number().int().min(1).max(365),
    maxNights: z.number().int().min(1).max(365),
    maxAdvanceDays: z.number().int().min(1).max(1095),
    autoConfirmBookings: z.boolean(),
    requirePhone: z.boolean(),
    requireEmail: z.boolean(),
  }),
  guests: z.object({
    childrenFreeUntilAge: z.number().int().min(0).max(18),
    petsAllowed: z.boolean(),
    partiesAllowed: z.boolean(),
    quietHoursFrom: time,
    quietHoursTo: time,
    minGuestAge: z.number().int().min(0).max(99),
  }),
  taxes: z.object({
    vatRate: z.number().min(0).max(100),
    cityTax: z.number().min(0).max(1000),
    cityTaxMinAge: z.number().int().min(0).max(99),
    extraGuestFee: z.number().min(0).max(10000),
  }),
  payments: z.object({
    depositRequired: z.boolean(),
    depositType: z.enum(["full", "percent", "fixed"]),
    depositAmount: z.number().min(0).max(100000),
    paymentDueDays: z.number().int().min(0).max(365),
    paymentMethods: z.array(z.string()).default([]),
    autoRefundDeposit: z.boolean(),
  }),
  cancellation: z.object({
    freeCancellationDays: z.number().int().min(0).max(365),
    cancellationFeeType: z.enum(["percent", "fixed", "first_night"]),
    cancellationFee: z.number().min(0).max(100000),
    noShowFee: z.number().min(0).max(100000),
    cancellationPolicyText: z.string().max(5000).default(""),
  }),
  invoicing: z.object({
    invoiceSeries: optionalText(20),
    invoiceNextNumber: z.number().int().min(1).max(1000000),
    companyName: optionalText(200),
    companyCode: optionalText(50),
    companyVatCode: optionalText(50),
    companyAddress: optionalText(300),
    iban: optionalText(50),
    bankName: optionalText(120),
    invoiceLogoUrl: optionalText(500),
    invoiceNotes: z.string().max(2000).default(""),
  }),
  notifications: z.object({
    notifyBookingConfirmation: z.boolean(),
    notifyCheckinReminder: z.boolean(),
    notifyBookingChange: z.boolean(),
    notifyReviewRequest: z.boolean(),
    notifyCancellationConfirmation: z.boolean(),
    checkinReminderHoursBefore: z.number().int().min(1).max(336),
    reviewRequestHoursAfter: z.number().int().min(1).max(336),
  }),
  branding: z.object({
    brandPrimaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Naudokite HEX formatą, pvz. #0F172A"),
    brandSecondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Naudokite HEX formatą, pvz. #64748B"),
    brandLogoUrl: optionalText(500),
    brandEmailLogoUrl: optionalText(500),
    brandPdfLogoUrl: optionalText(500),
  }),
} as const;

export type SettingsSectionId = keyof typeof settingsSchemas;

export const propertySettingsSchema = settingsSchemas.general
  .merge(settingsSchemas.stay)
  .merge(settingsSchemas.guests)
  .merge(settingsSchemas.taxes)
  .merge(settingsSchemas.payments)
  .merge(settingsSchemas.cancellation)
  .merge(settingsSchemas.invoicing)
  .merge(settingsSchemas.notifications)
  .merge(settingsSchemas.branding);

export type PropertySettings = z.infer<typeof propertySettingsSchema>;

export const DEFAULT_PROPERTY_SETTINGS: PropertySettings = {
  displayName: "",
  address: "",
  city: "",
  postalCode: "",
  country: "LT",
  lat: null,
  lng: null,
  timezone: "Europe/Vilnius",
  currency: "EUR",
  defaultLanguage: "lt",
  phone: "",
  email: "",

  checkinFrom: "15:00",
  checkinUntil: "22:00",
  checkoutUntil: "11:00",
  minNights: 1,
  maxNights: 30,
  maxAdvanceDays: 365,
  autoConfirmBookings: false,
  requirePhone: true,
  requireEmail: true,

  childrenFreeUntilAge: 3,
  petsAllowed: false,
  partiesAllowed: false,
  quietHoursFrom: "22:00",
  quietHoursTo: "07:00",
  minGuestAge: 18,

  vatRate: 21,
  cityTax: 0,
  cityTaxMinAge: 18,
  extraGuestFee: 0,

  depositRequired: false,
  depositType: "percent",
  depositAmount: 0,
  paymentDueDays: 3,
  paymentMethods: ["cash", "bank_transfer"],
  autoRefundDeposit: false,

  freeCancellationDays: 7,
  cancellationFeeType: "percent",
  cancellationFee: 0,
  noShowFee: 0,
  cancellationPolicyText: "",

  invoiceSeries: "",
  invoiceNextNumber: 1,
  companyName: "",
  companyCode: "",
  companyVatCode: "",
  companyAddress: "",
  iban: "",
  bankName: "",
  invoiceLogoUrl: "",
  invoiceNotes: "",

  notifyBookingConfirmation: true,
  notifyCheckinReminder: true,
  notifyBookingChange: true,
  notifyReviewRequest: false,
  notifyCancellationConfirmation: true,
  checkinReminderHoursBefore: 24,
  reviewRequestHoursAfter: 24,

  brandPrimaryColor: "#0F172A",
  brandSecondaryColor: "#64748B",
  brandLogoUrl: "",
  brandEmailLogoUrl: "",
  brandPdfLogoUrl: "",
};

/** camelCase forma <-> snake_case DB stulpeliai */
export const SETTINGS_COLUMN_MAP: Record<keyof PropertySettings, string> = {
  displayName: "display_name",
  address: "address",
  city: "city",
  postalCode: "postal_code",
  country: "country",
  lat: "lat",
  lng: "lng",
  timezone: "timezone",
  currency: "currency",
  defaultLanguage: "default_language",
  phone: "phone",
  email: "email",
  checkinFrom: "checkin_from",
  checkinUntil: "checkin_until",
  checkoutUntil: "checkout_until",
  minNights: "min_nights",
  maxNights: "max_nights",
  maxAdvanceDays: "max_advance_days",
  autoConfirmBookings: "auto_confirm_bookings",
  requirePhone: "require_phone",
  requireEmail: "require_email",
  childrenFreeUntilAge: "children_free_until_age",
  petsAllowed: "pets_allowed",
  partiesAllowed: "parties_allowed",
  quietHoursFrom: "quiet_hours_from",
  quietHoursTo: "quiet_hours_to",
  minGuestAge: "min_guest_age",
  vatRate: "vat_rate",
  cityTax: "city_tax",
  cityTaxMinAge: "city_tax_min_age",
  extraGuestFee: "extra_guest_fee",
  depositRequired: "deposit_required",
  depositType: "deposit_type",
  depositAmount: "deposit_amount",
  paymentDueDays: "payment_due_days",
  paymentMethods: "payment_methods",
  autoRefundDeposit: "auto_refund_deposit",
  freeCancellationDays: "free_cancellation_days",
  cancellationFeeType: "cancellation_fee_type",
  cancellationFee: "cancellation_fee",
  noShowFee: "no_show_fee",
  cancellationPolicyText: "cancellation_policy_text",
  invoiceSeries: "invoice_series",
  invoiceNextNumber: "invoice_next_number",
  companyName: "company_name",
  companyCode: "company_code",
  companyVatCode: "company_vat_code",
  companyAddress: "company_address",
  iban: "iban",
  bankName: "bank_name",
  invoiceLogoUrl: "invoice_logo_url",
  invoiceNotes: "invoice_notes",
  notifyBookingConfirmation: "notify_booking_confirmation",
  notifyCheckinReminder: "notify_checkin_reminder",
  notifyBookingChange: "notify_booking_change",
  notifyReviewRequest: "notify_review_request",
  notifyCancellationConfirmation: "notify_cancellation_confirmation",
  checkinReminderHoursBefore: "checkin_reminder_hours_before",
  reviewRequestHoursAfter: "review_request_hours_after",
  brandPrimaryColor: "brand_primary_color",
  brandSecondaryColor: "brand_secondary_color",
  brandLogoUrl: "brand_logo_url",
  brandEmailLogoUrl: "brand_email_logo_url",
  brandPdfLogoUrl: "brand_pdf_logo_url",
};

export const hhmm = (v: unknown, fallback: string) =>
  typeof v === "string" && v.length >= 5 ? v.slice(0, 5) : fallback;

/* ------------------------------------------------------------------ */
/* Sekcijų aprašai — naują sekciją pridedi vienu įrašu                  */
/* ------------------------------------------------------------------ */

export type FieldType =
  | "text"
  | "email"
  | "tel"
  | "url"
  | "number"
  | "time"
  | "switch"
  | "select"
  | "textarea"
  | "color"
  | "checkboxGroup";

export type FieldDef = {
  name: keyof PropertySettings;
  label: string;
  type: FieldType;
  help?: string;
  unit?: string;
  options?: readonly { value: string; label: string }[];
  step?: number;
  min?: number;
  max?: number;
  nullable?: boolean;
  colSpan?: 1 | 2;
};

export type SectionDef = {
  id: SettingsSectionId;
  icon: string;
  title: string;
  description: string;
  fields: FieldDef[];
};

export const SETTINGS_SECTIONS: SectionDef[] = [
  {
    id: "general",
    icon: "🏨",
    title: "Objekto informacija",
    description:
      "Bendri valdytojo duomenys, naudojami sąskaitose, laiškuose ir svetainėje (galioja visiems objektams).",
    fields: [
      { name: "displayName", label: "Pavadinimas", type: "text", help: "Rodomas svečiams ir dokumentuose." },
      { name: "address", label: "Adresas", type: "text", help: "Gatvė ir namo numeris." },
      { name: "city", label: "Miestas", type: "text" },
      { name: "postalCode", label: "Pašto kodas", type: "text" },
      { name: "country", label: "Šalis", type: "select", options: COUNTRIES },
      { name: "timezone", label: "Laiko zona", type: "select", options: TIMEZONES, help: "Naudojama atvykimo laikams ir priminimams." },
      { name: "lat", label: "GPS platuma", type: "number", step: 0.000001, nullable: true, help: "Pvz. 54.687157" },
      { name: "lng", label: "GPS ilguma", type: "number", step: 0.000001, nullable: true, help: "Pvz. 25.279652" },
      { name: "currency", label: "Valiuta", type: "select", options: CURRENCIES },
      { name: "defaultLanguage", label: "Numatytoji kalba", type: "select", options: LANGUAGES },
      { name: "phone", label: "Telefonas", type: "tel", help: "Kontaktinis numeris svečiams." },
      { name: "email", label: "El. paštas", type: "email", help: "Iš šio adreso siunčiami pranešimai." },
    ],
  },
  {
    id: "stay",
    icon: "🛏",
    title: "Viešnagės taisyklės",
    description: "Atvykimo ir išvykimo laikai bei rezervacijų apribojimai.",
    fields: [
      { name: "checkinFrom", label: "Check-in nuo", type: "time", unit: "val." },
      { name: "checkinUntil", label: "Check-in iki", type: "time", unit: "val." },
      { name: "checkoutUntil", label: "Check-out iki", type: "time", unit: "val." },
      { name: "minNights", label: "Minimalus nakvynių skaičius", type: "number", unit: "naktys", min: 1 },
      { name: "maxNights", label: "Maksimalus nakvynių skaičius", type: "number", unit: "naktys", min: 1 },
      { name: "maxAdvanceDays", label: "Rezervacijos laikotarpis į priekį", type: "number", unit: "dienos", min: 1, help: "Kiek dienų į priekį svečiai gali rezervuoti." },
      { name: "autoConfirmBookings", label: "Automatiškai patvirtinti rezervacijas", type: "switch", colSpan: 2, help: "Naujos rezervacijos iškart gauna patvirtintos būseną." },
      { name: "requirePhone", label: "Rezervacijai privalomas telefono numeris", type: "switch", colSpan: 2 },
      { name: "requireEmail", label: "Rezervacijai privalomas el. paštas", type: "switch", colSpan: 2 },
    ],
  },
  {
    id: "guests",
    icon: "👨‍👩‍👧",
    title: "Svečių politika",
    description: "Taisyklės vaikams, augintiniams ir ramybės laikui.",
    fields: [
      { name: "childrenFreeUntilAge", label: "Vaikai gyvena nemokamai iki", type: "number", unit: "metų", min: 0 },
      { name: "minGuestAge", label: "Minimalus svečio amžius", type: "number", unit: "metų", min: 0 },
      { name: "quietHoursFrom", label: "Ramybės laikas nuo", type: "time", unit: "val." },
      { name: "quietHoursTo", label: "Ramybės laikas iki", type: "time", unit: "val." },
      { name: "petsAllowed", label: "Leidžiami augintiniai", type: "switch", colSpan: 2 },
      { name: "partiesAllowed", label: "Leidžiami vakarėliai", type: "switch", colSpan: 2 },
    ],
  },
  {
    id: "taxes",
    icon: "💶",
    title: "Mokesčiai",
    description: "Mokesčiai, taikomi skaičiuojant galutinę rezervacijos kainą.",
    fields: [
      { name: "vatRate", label: "PVM tarifas", type: "number", unit: "%", step: 0.01, min: 0 },
      { name: "cityTax", label: "Miesto mokestis", type: "number", unit: "€ / svečiui už naktį", step: 0.01, min: 0 },
      { name: "cityTaxMinAge", label: "Miesto mokesčio amžiaus riba", type: "number", unit: "metų", min: 0, help: "Jaunesniems svečiams mokestis netaikomas." },
      { name: "extraGuestFee", label: "Mokestis už papildomą svečią", type: "number", unit: "€ / naktis", step: 0.01, min: 0 },
    ],
  },
  {
    id: "payments",
    icon: "💳",
    title: "Mokėjimai",
    description: "Avanso reikalavimai ir priimami mokėjimo būdai.",
    fields: [
      { name: "depositRequired", label: "Reikalingas avansas", type: "switch", colSpan: 2 },
      { name: "depositType", label: "Avanso tipas", type: "select", options: DEPOSIT_TYPES },
      { name: "depositAmount", label: "Avanso dydis", type: "number", unit: "% arba €", step: 0.01, min: 0, help: "Priklauso nuo pasirinkto avanso tipo." },
      { name: "paymentDueDays", label: "Apmokėjimo terminas", type: "number", unit: "dienos", min: 0 },
      { name: "autoRefundDeposit", label: "Automatiškai grąžinti užstatą", type: "switch", colSpan: 2 },
      { name: "paymentMethods", label: "Leidžiami mokėjimo būdai", type: "checkboxGroup", options: PAYMENT_METHODS, colSpan: 2 },
    ],
  },
  {
    id: "cancellation",
    icon: "🚫",
    title: "Atšaukimo politika",
    description: "Sąlygos, taikomos atšaukus rezervaciją arba neatvykus.",
    fields: [
      { name: "freeCancellationDays", label: "Nemokamo atšaukimo terminas", type: "number", unit: "dienos iki atvykimo", min: 0 },
      { name: "cancellationFeeType", label: "Atšaukimo mokesčio tipas", type: "select", options: FEE_TYPES },
      { name: "cancellationFee", label: "Atšaukimo mokestis", type: "number", unit: "% arba €", step: 0.01, min: 0 },
      { name: "noShowFee", label: "Neatvykimo mokestis", type: "number", unit: "% arba €", step: 0.01, min: 0 },
      { name: "cancellationPolicyText", label: "Atšaukimo taisyklės", type: "textarea", colSpan: 2, help: "Tekstas rodomas svečiui rezervacijos metu ir patvirtinimo laiške." },
    ],
  },
  {
    id: "invoicing",
    icon: "📄",
    title: "Sąskaitų nustatymai",
    description: "Rekvizitai ir numeracija, naudojami generuojant sąskaitas.",
    fields: [
      { name: "invoiceSeries", label: "Sąskaitos serija", type: "text", help: "Pvz. RNT" },
      { name: "invoiceNextNumber", label: "Sekantis numeris", type: "number", min: 1 },
      { name: "companyName", label: "Įmonės pavadinimas", type: "text" },
      { name: "companyCode", label: "Įmonės kodas", type: "text" },
      { name: "companyVatCode", label: "PVM kodas", type: "text" },
      { name: "companyAddress", label: "Įmonės adresas", type: "text" },
      { name: "iban", label: "IBAN", type: "text" },
      { name: "bankName", label: "Banko pavadinimas", type: "text" },
      { name: "invoiceLogoUrl", label: "Logotipas sąskaitose", type: "url", colSpan: 2, help: "Nuoroda į logotipo paveikslėlį." },
      { name: "invoiceNotes", label: "Sąskaitos pastabos", type: "textarea", colSpan: 2 },
    ],
  },
  {
    id: "notifications",
    icon: "✉",
    title: "Automatiniai pranešimai",
    description: "Kokius laiškus sistema siunčia svečiams automatiškai.",
    fields: [
      { name: "notifyBookingConfirmation", label: "Rezervacijos patvirtinimas", type: "switch", colSpan: 2 },
      { name: "notifyCheckinReminder", label: "Atvykimo priminimas", type: "switch", colSpan: 2 },
      { name: "notifyBookingChange", label: "Rezervacijos pakeitimas", type: "switch", colSpan: 2 },
      { name: "notifyReviewRequest", label: "Atsiliepimo prašymas", type: "switch", colSpan: 2 },
      { name: "notifyCancellationConfirmation", label: "Atšaukimo patvirtinimas", type: "switch", colSpan: 2 },
      { name: "checkinReminderHoursBefore", label: "Atvykimo priminimas prieš", type: "number", unit: "val.", min: 1 },
      { name: "reviewRequestHoursAfter", label: "Atsiliepimo prašymas po išvykimo", type: "number", unit: "val.", min: 1 },
    ],
  },
  {
    id: "branding",
    icon: "🎨",
    title: "Prekės ženklas",
    description: "Spalvos ir logotipai, naudojami svetainėje, laiškuose ir PDF dokumentuose.",
    fields: [
      { name: "brandPrimaryColor", label: "Pagrindinė spalva", type: "color" },
      { name: "brandSecondaryColor", label: "Antrinė spalva", type: "color" },
      { name: "brandLogoUrl", label: "Logotipas", type: "url", colSpan: 2 },
      { name: "brandEmailLogoUrl", label: "El. laiškų logotipas", type: "url", colSpan: 2 },
      { name: "brandPdfLogoUrl", label: "PDF dokumentų logotipas", type: "url", colSpan: 2 },
    ],
  },
];