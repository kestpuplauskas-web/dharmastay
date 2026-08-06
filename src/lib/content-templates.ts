import { z } from "zod";

export const CONTENT_VARIABLES = [
  { token: "{{guest_name}}", label: "Svečio vardas" },
  { token: "{{property_name}}", label: "Objekto pavadinimas" },
  { token: "{{location}}", label: "Vieta" },
  { token: "{{room_name}}", label: "Kambario pavadinimas" },
  { token: "{{booking_number}}", label: "Rezervacijos nr." },
  { token: "{{date_from}}", label: "Atvykimo data" },
  { token: "{{date_to}}", label: "Išvykimo data" },
  { token: "{{check_in}}", label: "Atvykimo laikas" },
  { token: "{{check_out}}", label: "Išvykimo laikas" },
  { token: "{{door_code}}", label: "Durų kodas" },
  { token: "{{wifi_name}}", label: "WiFi pavadinimas" },
  { token: "{{wifi_password}}", label: "WiFi slaptažodis" },
  { token: "{{total_amount}}", label: "Bendra suma" },
  { token: "{{currency}}", label: "Valiuta" },
  { token: "{{phone}}", label: "Telefonas" },
  { token: "{{email}}", label: "El. paštas" },
] as const;

export const PREVIEW_SAMPLE: Record<string, string> = {
  "{{guest_name}}": "Jonas Jonaitis",
  "{{property_name}}": "Dharma Stay",
  "{{location}}": "Vilniaus g. 10, Druskininkai — 2 aukštas, durys Nr. 3",
  "{{room_name}}": "Miegamasis 1",
  "{{booking_number}}": "R-26001",
  "{{date_from}}": "2026-08-10",
  "{{date_to}}": "2026-08-14",
  "{{check_in}}": "15:00",
  "{{check_out}}": "11:00",
  "{{door_code}}": "1234#",
  "{{wifi_name}}": "DharmaStay_WiFi",
  "{{wifi_password}}": "svecias2026",
  "{{total_amount}}": "480,00",
  "{{currency}}": "EUR",
  "{{phone}}": "+370 600 00000",
  "{{email}}": "info@revoo.lt",
};

export function renderPreview(text: string) {
  return Object.entries(PREVIEW_SAMPLE).reduce(
    (acc, [token, value]) => acc.split(token).join(value),
    text ?? "",
  );
}

export type ContentCategory = "email" | "whatsapp" | "guest_info";

export type ContentFieldDef = {
  name: string;
  label: string;
  type: "text" | "textarea" | "url";
  defaultValue?: string;
  required?: boolean;
};

export type ContentTemplateDef = {
  category: ContentCategory;
  name: string;
  title: string;
  description: string;
  hasSubject: boolean;
  hasRichText: boolean;
  canTestSend?: boolean;
  canTestWhatsapp?: boolean;
  fields?: ContentFieldDef[];
  defaultSubject?: string;
  defaultContent?: string;
  openLinkField?: string;
};

export const ETURISTAS_DEFAULT_URL =
  "https://eturistas.ntis.lt/srv-edit/yGcAqPoxUjtPUWOfNdvFwKYYcQrnDfRBnjZlcFokltyAnhvhJe";

export const CONTENT_TEMPLATES: ContentTemplateDef[] = [
  {
    category: "email",
    name: "booking_confirmation",
    title: "Rezervacijos patvirtinimas",
    description: "Siunčiama klientui, kai rezervacija patvirtinama.",
    hasSubject: true,
    hasRichText: true,
    canTestSend: true,
    defaultSubject: "Jūsų rezervacija {{booking_number}} patvirtinta",
    defaultContent:
      "<p>Sveiki, {{guest_name}},</p><p>Jūsų rezervacija <strong>{{booking_number}}</strong> objekte {{property_name}} patvirtinta.</p><p>Atvykimas: {{date_from}} nuo {{check_in}}<br>Išvykimas: {{date_to}} iki {{check_out}}<br>Suma: {{total_amount}} {{currency}}</p><p>Iki susitikimo!</p>",
  },
  {
    category: "email",
    name: "booking_cancellation",
    title: "Rezervacijos atšaukimas",
    description: "Siunčiama klientui, kai rezervacija atšaukiama.",
    hasSubject: true,
    hasRichText: true,
    canTestSend: true,
    defaultSubject: "Rezervacija {{booking_number}} atšaukta",
    defaultContent:
      "<p>Sveiki, {{guest_name}},</p><p>Informuojame, kad Jūsų rezervacija {{booking_number}} objekte {{property_name}} ({{date_from}}–{{date_to}}) buvo atšaukta.</p><p>Kilus klausimams, rašykite {{email}} arba skambinkite {{phone}}.</p>",
  },
  {
    category: "email",
    name: "booking_change",
    title: "Rezervacijos pakeitimas",
    description: "Siunčiama, kai pasikeičia rezervacijos duomenys.",
    hasSubject: true,
    hasRichText: true,
    canTestSend: true,
    defaultSubject: "Rezervacijos {{booking_number}} pakeitimai",
    defaultContent:
      "<p>Sveiki, {{guest_name}},</p><p>Jūsų rezervacija {{booking_number}} buvo atnaujinta.</p><p>Naujos datos: {{date_from}} – {{date_to}}<br>Suma: {{total_amount}} {{currency}}</p>",
  },
  {
    category: "email",
    name: "checkin_reminder",
    title: "Priminimas prieš atvykimą",
    description: "Priminimas svečiui likus kelioms dienoms iki atvykimo.",
    hasSubject: true,
    hasRichText: true,
    canTestSend: true,
    defaultSubject: "Laukiame Jūsų {{date_from}} — {{property_name}}",
    defaultContent:
      "<p>Sveiki, {{guest_name}},</p><p>Primename apie artėjantį apsilankymą objekte {{property_name}}.</p><p>Atvykimas: {{date_from}} nuo {{check_in}}<br>Durų kodas: {{door_code}}<br>WiFi: {{wifi_name}} / {{wifi_password}}</p>",
  },
  {
    category: "email",
    name: "review_request",
    title: "Prašymas palikti atsiliepimą",
    description: "Siunčiama svečiui po išvykimo.",
    hasSubject: true,
    hasRichText: true,
    canTestSend: true,
    defaultSubject: "Ačiū, kad viešėjote {{property_name}}",
    defaultContent:
      "<p>Sveiki, {{guest_name}},</p><p>Ačiū, kad rinkotės {{property_name}}. Būsime dėkingi už Jūsų atsiliepimą.</p>",
  },
  {
    category: "whatsapp",
    name: "door_code",
    title: "Durų kodas",
    description: "WhatsApp žinutė su atvykimo instrukcijomis ir durų kodu.",
    hasSubject: false,
    hasRichText: false,
    canTestWhatsapp: true,
    defaultContent:
      "Sveiki, {{guest_name}}! Jūsų durų kodas objekte {{property_name}}: {{door_code}}. Atvykimas {{date_from}} nuo {{check_in}}. WiFi: {{wifi_name}} / {{wifi_password}}",
  },
  {
    category: "guest_info",
    name: "wifi",
    title: "WiFi",
    description: "Interneto prisijungimo duomenys, rodomi svečiui.",
    hasSubject: false,
    hasRichText: false,
    fields: [
      { name: "wifiName", label: "WiFi pavadinimas", type: "text", required: true },
      { name: "wifiPassword", label: "WiFi slaptažodis", type: "text", required: true },
    ],
  },
  {
    category: "guest_info",
    name: "restaurant",
    title: "Restorano informacija",
    description: "Informacija apie pusryčius, restoraną ar maitinimą.",
    hasSubject: false,
    hasRichText: true,
  },
  {
    category: "guest_info",
    name: "eturistas",
    title: "E. turistas",
    description: "Svečių registracijos forma E. turisto sistemoje.",
    hasSubject: false,
    hasRichText: false,
    openLinkField: "url",
    fields: [
      { name: "title", label: "Pavadinimas", type: "text", defaultValue: "E. turistas", required: true },
      {
        name: "description",
        label: "Aprašymas",
        type: "textarea",
        defaultValue:
          "Prieš atvykstant prašome užpildyti svečio registracijos formą E. turisto sistemoje.",
      },
      { name: "url", label: "Nuoroda", type: "url", defaultValue: ETURISTAS_DEFAULT_URL, required: true },
    ],
  },
];

export const CONTENT_SECTIONS: {
  id: ContentCategory;
  icon: string;
  title: string;
  description: string;
}[] = [
  {
    id: "email",
    icon: "✉️",
    title: "Pranešimai el. paštu",
    description: "Automatiniai laiškai, siunčiami klientams rezervacijos metu.",
  },
  {
    id: "whatsapp",
    icon: "💬",
    title: "WhatsApp",
    description: "Trumposios žinutės svečiams prieš atvykimą.",
  },
  {
    id: "guest_info",
    icon: "🛎️",
    title: "Informacija svečiams",
    description: "Praktinė informacija, pasiekiama svečiui apsilankymo metu.",
  },
];

export function templateKey(category: string, name: string) {
  return `${category}:${name}`;
}

/** Normalizuoja LT/tarptautinį telefono numerį į E.164 be „+“ (wa.me formatas). */
export function normalizeWhatsappPhone(raw: string): string {
  const digits = (raw ?? "").replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
  let n = digits.startsWith("+") ? digits.slice(1) : digits;
  if (n.startsWith("00")) n = n.slice(2);
  else if (n.startsWith("8") && n.length === 9) n = `370${n.slice(1)}`;
  return n;
}

export function buildWhatsappLink(phone: string, message: string) {
  return `https://wa.me/${normalizeWhatsappPhone(phone)}?text=${encodeURIComponent(message)}`;
}

export const contentTemplateSchema = z.object({
  category: z.enum(["email", "whatsapp", "guest_info"]),
  templateName: z.string().min(1).max(80),
  subject: z.string().max(300).default(""),
  content: z.string().max(20000).default(""),
  fields: z.record(z.string().max(2000)).default({}),
  isEnabled: z.boolean().default(true),
});

export type ContentTemplateRecord = {
  category: ContentCategory;
  templateName: string;
  subject: string;
  content: string;
  fields: Record<string, string>;
  isEnabled: boolean;
  updatedAt: string | null;
};

export function defaultsFor(def: ContentTemplateDef): ContentTemplateRecord {
  const fields: Record<string, string> = {};
  for (const f of def.fields ?? []) fields[f.name] = f.defaultValue ?? "";
  return {
    category: def.category,
    templateName: def.name,
    subject: def.defaultSubject ?? "",
    content: def.defaultContent ?? "",
    fields,
    isEnabled: true,
    updatedAt: null,
  };
}

export function buildFormSchema(def: ContentTemplateDef) {
  const shape: Record<string, z.ZodTypeAny> = { isEnabled: z.boolean() };

  shape["subject"] = def.hasSubject
    ? z.string().trim().min(1, "Laiško tema privaloma.").max(300, "Per ilga tema.")
    : z.string().max(300);

  const needsContent = def.hasRichText || def.category === "whatsapp";
  shape["content"] = needsContent
    ? z.string().trim().min(1, "Turinys privalomas.").max(20000, "Per ilgas turinys.")
    : z.string().max(20000);

  const fieldShape: Record<string, z.ZodTypeAny> = {};
  for (const f of def.fields ?? []) {
    if (f.type === "url") {
      const url = z.string().trim().url("Neteisingas nuorodos formatas.");
      fieldShape[f.name] = f.required ? url : z.union([z.literal(""), url]);
    } else {
      let s = z.string().trim().max(2000);
      if (f.required) s = s.min(1, `${f.label} privalomas.`);
      fieldShape[f.name] = s;
    }
  }
  shape["fields"] = z.object(fieldShape);

  return z.object(shape);
}