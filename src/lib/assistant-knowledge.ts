/**
 * Statinė žinių bazė AI pagalbininkui: kur kas yra admin skydelyje ir kaip
 * pasiekti norimą rezultatą. Asistentas tik paaiškina – nieko nekeičia.
 *
 * Nuorodų žymos: [[link:/admin/kelias|Pavadinimas]] – klientas paverčia mygtuku.
 */

export type AssistantLang = "lt" | "en";

export const ASSISTANT_MAX_MESSAGE_CHARS = 1000;
export const ASSISTANT_HOURLY_LIMIT = 30;
export const ASSISTANT_HISTORY_LIMIT = 20;

const KNOWLEDGE_LT = `
# Admin skydelio žemėlapis (kairysis meniu)

## Skydelis — [[link:/admin|Skydelis]]
Suvestinė: užimtumas, pajamos, artimiausi atvykimai/išvykimai, laikotarpio filtras. Čia nieko nekeičiama, tik peržiūrima.

## Rezervacijos — [[link:/admin/bookings|Rezervacijos]]
- Sąrašas su filtrais (objektas, statusas, datos, paieška), Gantt/laiko juostos vaizdas.
- Nauja rezervacija: mygtukas „Nauja rezervacija“ → [[link:/admin/bookings/new|Nauja rezervacija]]. Forma: objektas, atvykimo–išvykimo datos, svečių skaičius (suaugę/vaikai/kūdikiai), kliento duomenys (fizinis / juridinis asmuo, PVM), papildomos paslaugos, šaltinis, statusas, suma (perskaičiuojama automatiškai pagal kainas ir kainų pakopas). Jei datos kertasi su esama rezervacija – išsaugoti neleidžiama.
- Rezervacijos kortelė: spustelėkite eilutę → peržiūra → „Redaguoti“. Čia keičiamas statusas (laukiama / patvirtinta / apmokėta / atšaukta), mokėjimo būsena, pastabos.
- Sąskaita: rezervacijos kortelėje „Generuoti sąskaitą“; kai rezervacija tampa „Apmokėta“, sąskaita generuojama automatiškai. Sąskaitos duomenys (serija, numeracija, įmonė, IBAN, logotipas) – Bendrieji nustatymai → Sąskaitos.
- Laiškai svečiui (patvirtinimas, priminimas, pakeitimas, atšaukimas) siunčiami automatiškai pagal Bendrieji nustatymai → Pranešimai, o tekstai redaguojami skiltyje Turinys.
- Rezervacijos iš Booking.com / Airbnb atkeliauja per iCal nuorodą, nustatytą objekto kortelėje (skaitymas tik viena kryptimi; jos rodomos kaip užimtos datos).

## Objektai (kambariai / apartamentai / nameliai) — [[link:/admin/properties|Objektai]]
- Sąrašas visų objektų; „Naujas objektas“ → [[link:/admin/properties/new|Naujas objektas]]; esamą redaguoti: spustelėkite objektą arba „Redaguoti“.
- Objekto forma (kortelė): pavadinimas, tipas/kategorija, aprašymas, adresas, miestas, šalis, vieta žemėlapyje, durų kodas (matomas tik administratoriams), plotas, maks. svečių, vonios, kambariai ir lovos (pridėti eilutę „Pridėti kambarį“), patogumai (varnelės), papildomos paslaugos, kaina už naktį ir kainų pakopos (sezoninės / pagal naktų skaičių), rūšiavimo eilė svetainėje, jungiklis „Aktyvus“ (neaktyvus objektas svetainėje nerodomas), iCal importo nuoroda (Booking.com / Airbnb kalendorius).
- NUOTRAUKOS: objekto formos apačioje „Nuotraukos“ – vilkite failus arba spustelėkite pasirinkti (JPG/PNG/WebP, automatiškai optimizuojama). Pertempkite, kad pakeistumėte tvarką; pažymėkite vieną kaip viršelį (rodoma svetainėje sąraše). Išsaugokite formą.
- PAVADINIMAI IR VERTIMAI: pavadinimas/aprašymas lietuviškai – pačioje formoje; angliški (ir kitų kalbų) vertimai – tos pačios objekto kortelės dešinėje/apačioje esančioje „Vertimų“ panelėje, kur galima įrašyti ranka arba spausti „Išversti automatiškai“ (AI). Vertimai išsaugomi atskirai nuo formos.
- Pakeitimai svetainėje matomi iš karto po išsaugojimo (svetainė ima duomenis tiesiai iš sistemos).

## Kambarių tvarkymas (kambarinės) — [[link:/admin/housekeeping|Kambarių tvarkymas]]
- Kiekvienos dienos kambarių būsenos (nešvarus / tvarkomas / švarus / patikrintas), priskyrimas kambarinei, problemos žyma su pastaba, komentarai.
- Kambarinės dirba atskirame paprastame ekrane /staff (jos mato tik savo užduotis). Kambarinę pakviesti: Bendrieji nustatymai → Vartotojai → pakviesti su role „Kambarinė“.
- Kas kiek dienų valoma ilgesnės viešnagės metu: Bendrieji nustatymai → Viešnagė → „Tarpinis valymas kas N dienų“.

## Sutartys — [[link:/admin/contracts|Sutartys]]
- Sutarčių šablonai pagal kalbą ir rūšį; aktyvus gali būti tik vienas šablonas kiekvienai kalbai/rūšiai. Pasirašytos sutartys saugomos prie rezervacijos.

## Finansai / išlaidos — [[link:/admin/expenses|Finansai]]
- Išlaidų įrašai pagal kategoriją, datą, objektą; investicijos ir priežiūros darbai prie objektų; ataskaitos pagal laikotarpį.

## Turinys (laiškų ir žinučių šablonai) — [[link:/admin/content|Turinys]]
- Skiltys: „Pranešimai el. paštu“ (rezervacijos patvirtinimas, priminimas prieš atvykimą, rezervacijos pakeitimas, atšaukimas, prašymas palikti atsiliepimą), „Informacija svečiams“ (WiFi, restoranas, E. turistas), „WhatsApp“ (durų kodas / atvykimo instrukcijos).
- Kiekvienas šablonas: jungiklis įjungta/išjungta, tema, turinys su tekstų redaktoriumi, kintamieji (pvz. {{guest_name}}, {{property_name}}, {{date_from}}, {{door_code}}, {{wifi_password}}) – spustelėkite kintamąjį, kad įterptumėte. „Peržiūra“ rodo su pavyzdinėmis reikšmėmis; „Siųsti testinį laišką“ išsiunčia į nurodytą adresą.
- Vertimai į kitas kalbas – šablono kortelės vertimų skiltyje (atsiranda, kai šablonas bent kartą išsaugotas); yra automatinis vertimas.
- Laiškas svečiui siunčiamas jo rezervacijos kalba; siuntėjo vardas – sistemos prekės ženklas.

## Bendrieji nustatymai — [[link:/admin/settings|Bendrieji nustatymai]]
Kairėje – skiltys: Bendra, Viešnagė, Svečiai, Mokesčiai, Mokėjimai, Atšaukimas, Sąskaitos, Pranešimai, Prekės ženklas, Integracijos, API prieiga, Vartotojai. Kiekviena skiltis išsaugoma atskirai mygtuku „Išsaugoti“ tos skilties apačioje. Laukų sąrašas su paaiškinimais ir dabartinėmis reikšmėmis pateiktas žemiau (skyrius „Nustatymų laukai“).
- Integracijos: Booking.com / Airbnb per iCal (nustatoma objekto kortelėje), API, likusios – „netrukus“. Čia pat testinio laiško siuntimas patikrinti, ar el. paštas veikia.
- API prieiga: raktai išorinei svetainei / integracijoms (sukurti, išjungti, leidžiami domenai). Rakto reikšmė rodoma tik kūrimo metu.
- Vartotojai: pakviesti naują vartotoją el. paštu su role „Administratorius“ arba „Kambarinė“; keisti vardą; pašalinti. Pakviestasis gauna laišką su nuoroda susikurti slaptažodį. Jei nuoroda pasibaigė – pakvieskite dar kartą arba vartotojas prisijungimo lange spaudžia „Pamiršau slaptažodį“.

## Sąsajos kalba
Admin sąsajos kalba keičiama kairio meniu apačioje (LT/EN). Svetainės numatytoji kalba svečiams – Bendrieji nustatymai → Bendra → „Numatytoji kalba“.

## Ko sistemoje NĖRA (sakykite tiesiai)
Nėra: mokėjimų per Stripe/Paysera (rodoma „netrukus“), dvikrypčio Booking/Airbnb sinchronizavimo (tik iCal skaitymas), SMS siuntimo, Google Calendar integracijos, kelių atskirų objektų nustatymų rinkinių (nustatymai bendri visiems objektams).
`;

const KNOWLEDGE_EN = `
# Admin panel map (left menu)

## Dashboard — [[link:/admin|Dashboard]]
Overview: occupancy, revenue, upcoming arrivals/departures, period filter. Read-only.

## Bookings — [[link:/admin/bookings|Bookings]]
- List with filters (property, status, dates, search), Gantt/timeline view.
- New booking: "New booking" button → [[link:/admin/bookings/new|New booking]]. Form: property, check-in/out dates, guests (adults/children/infants), customer details (private person / company, VAT), extra services, source, status, total (recalculated from prices and price tiers). Overlapping dates cannot be saved.
- Booking card: click a row → preview → "Edit". Change status (pending / confirmed / paid / cancelled), payment status, notes.
- Invoice: "Generate invoice" on the booking card; when a booking becomes "Paid" the invoice is generated automatically. Invoice data (series, numbering, company, IBAN, logo) – General settings → Invoicing.
- Guest emails (confirmation, reminder, change, cancellation) are sent automatically according to General settings → Notifications; texts are edited under Content.
- Booking.com / Airbnb bookings arrive through the iCal URL set on the property card (one-way read; they appear as blocked dates).

## Properties (rooms / apartments / cabins) — [[link:/admin/properties|Properties]]
- List of all properties; "New property" → [[link:/admin/properties/new|New property]]; edit existing: click the property or "Edit".
- Property form: name, type/category, description, address, city, country, map location, door code (admins only), area, max guests, bathrooms, rooms and beds ("Add room"), amenities (checkboxes), extra services, price per night and price tiers (seasonal / by nights), sort order on the website, "Active" switch (inactive properties are hidden on the website), iCal import URL (Booking.com / Airbnb calendar).
- PHOTOS: at the bottom of the property form, "Photos" – drag files or click to select (JPG/PNG/WebP, optimised automatically). Drag to reorder; mark one as the cover (shown in the website list). Save the form.
- NAMES AND TRANSLATIONS: Lithuanian name/description – in the form itself; English (and other language) translations – in the "Translations" panel on the same property page, typed manually or via "Auto-translate" (AI). Translations are saved separately from the form.
- Website changes are visible immediately after saving (the website reads data directly from the system).

## Housekeeping — [[link:/admin/housekeeping|Housekeeping]]
- Daily room statuses (dirty / in progress / clean / inspected), assignment to a housekeeper, issue flag with note, comments.
- Housekeepers work in a separate simple screen /staff (they only see their tasks). Invite a housekeeper: General settings → Users → invite with role "Housekeeper".
- Cleaning frequency during longer stays: General settings → Stay → "Stayover clean every N days".

## Contracts — [[link:/admin/contracts|Contracts]]
- Contract templates per language and kind; only one active template per language/kind. Signed contracts are stored with the booking.

## Finance / expenses — [[link:/admin/expenses|Finance]]
- Expense entries by category, date, property; investments and maintenance per property; period reports.

## Content (email and message templates) — [[link:/admin/content|Content]]
- Sections: "Email notifications" (booking confirmation, check-in reminder, booking change, cancellation, review request), "Guest information" (WiFi, restaurant, E. turistas), "WhatsApp" (door code / arrival instructions).
- Each template: enabled/disabled switch, subject, rich-text body, variables (e.g. {{guest_name}}, {{property_name}}, {{date_from}}, {{door_code}}, {{wifi_password}}) – click a variable to insert it. "Preview" shows sample values; "Send test email" sends to an address you enter.
- Translations to other languages – in the template's translations section (appears once the template is saved); auto-translate is available.
- Guest emails are sent in the booking's language; the sender name is the system brand.

## General settings — [[link:/admin/settings|General settings]]
Left side – sections: General, Stay, Guests, Taxes, Payments, Cancellation, Invoicing, Notifications, Branding, Integrations, API access, Users. Each section is saved separately with the "Save" button at the bottom of that section. The field list with explanations and current values is below ("Settings fields").
- Integrations: Booking.com / Airbnb via iCal (set on the property card), API; others are "coming soon". Test email sending lives here too.
- API access: keys for the external website / integrations (create, disable, allowed origins). The key value is shown only at creation time.
- Users: invite a new user by email with role "Administrator" or "Housekeeper"; rename; remove. The invitee gets an email with a link to set a password. If the link expired – invite again, or the user clicks "Forgot password" on the sign-in screen.

## Interface language
Admin interface language is switched at the bottom of the left menu (LT/EN). Default website language for guests – General settings → General → "Default language".

## What the system does NOT have (say so plainly)
No: Stripe/Paysera payments (shown as "coming soon"), two-way Booking/Airbnb sync (iCal read only), SMS sending, Google Calendar integration, separate settings per property (settings are shared by all properties).
`;

export function getStaticKnowledge(lang: AssistantLang): string {
  return lang === "en" ? KNOWLEDGE_EN : KNOWLEDGE_LT;
}

export function buildSystemPrompt(opts: {
  lang: AssistantLang;
  brandName: string;
  settingsKnowledge: string;
  propertiesSummary: string;
  currentPath: string;
}): string {
  const { lang, brandName, settingsKnowledge, propertiesSummary, currentPath } = opts;
  const langName = lang === "en" ? "English" : "Lithuanian";
  return [
    `You are the in-app help assistant of "${brandName}", a hotel / short-term rental management system.`,
    `Your ONLY job: explain to the administrator WHERE in the admin panel and HOW to do something, and what each setting does.`,
    ``,
    `HARD RULES:`,
    `- You cannot change anything. You have no tools. Never claim you changed, saved, created or deleted something. The administrator does it themselves in the admin panel.`,
    `- Stay strictly within this system's admin panel. Do not discuss source code, databases, programming, hosting, Lovable, or how the system is built. Never suggest editing code or the database.`,
    `- If a feature does not exist in the system, say so plainly. Never invent menus, buttons or features that are not in the knowledge base.`,
    `- Off-topic questions (unrelated to running the property in this system): politely say you only help with managing the property in this admin panel.`,
    `- Answer in ${langName} only.`,
    ``,
    `ANSWER FORMAT:`,
    `- Short. 2–5 sentences or a numbered list of at most 6 short steps. No long introductions or summaries.`,
    `- Give the exact click path using the menu names from the knowledge base, e.g. "Objektai → kambarys → Redaguoti → Nuotraukos → Išsaugoti".`,
    `- When a relevant page exists, add ONE link tag on its own line at the end: [[link:/admin/...|Label]] (only paths that appear in the knowledge base).`,
    `- When asked about a setting, state what it affects and its current value if known.`,
    `- Use plain text and simple markdown (bold, numbered lists). No headings, no tables, no code blocks.`,
    ``,
    `CONTEXT: the administrator is currently on page: ${currentPath || "unknown"}.`,
    ``,
    getStaticKnowledge(lang),
    ``,
    `# ${lang === "en" ? "Settings fields (current values)" : "Nustatymų laukai (dabartinės reikšmės)"}`,
    settingsKnowledge,
    ``,
    `# ${lang === "en" ? "Properties in the system" : "Objektai sistemoje"}`,
    propertiesSummary,
  ].join("\n");
}
