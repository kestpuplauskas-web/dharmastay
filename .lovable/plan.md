# Naujos rezervacijos formos: „Objektas" dubliavimo pašalinimas

Tik pirmosios kortelės („Rezervacijos informacija") rėmuotas blokas. Verslo ir rezervacijų logika nepakeičiama.

## Problema

Kai `isNew && datesValid`, „Objektas" Select ( viršuje) ir „Kambariai svečiams" sąrašas (po juo) rodo tą patį objektą — dubliuojama.

## Pakeitimas

`src/components/admin/BookingForm.tsx` (eil. ~452–599):

- **Kai `isNew && datesValid`**: pašalinti „Objektas" Select (Label + Select, 453–473 eil.). Kambarių sąrašo pirmas kambarys jau yra objekto pasirinkimas — keičiamas per `Select`, `v.property_id` sinchronizuojamas per `useEffect` (244–251 eil.).
- **Kai `!isNew || !datesValid`** (redagavimas arba nauja be datų): palikti „Objektas" Select kaip dabar — kambarių sąrašas neatsiranda, dubliavimo nėra.

Taigi „Objektas" Select tampa sąlyginiu: rodomas tik kai kambarių sąrašas nėra matomas.

## Sąlyga

```
{(!isNew || !datesValid) && (
  <div className="grid gap-2">
    <Label htmlFor="property">{tr("bookings.form.property")}</Label>
    <Select ...>...</Select>
  </div>
)}

{isNew && datesValid && (
  <div className="mt-4">  // mt-4 nuimamas, kai nėra Objektas viršuje
    ...kambarių sąrašas...
  </div>
)}
```

Pritaikyti `mt-4` tik tada, kai viršuje yra „Objektas" Select (t.y. `!isNew || !datesValid`). Kai `isNew && datesValid`, kambarių blokas yra pirmasis rėmuoto bloke — be viršutinio tarpio.

## Ko neliečiame

- Kliento duomenų kortelė, finansų kortelė, mygtukai.
- Visa logika: `suggestRooms`, `distributeGuests`, `useEffect` sinchronizavimas, konfliktų tikrinimas, kainų skaičiavimas, server funkcijos.
- `property_id` sinchronizavimas tarp `roomIds[0]` ir `v.property_id` (veikia per esamą `useEffect`).
- i18n raktai, locale failai.

## Patikra

- `bunx tsgo --noEmit`
- `/tmp/observability/build-errors.log`
- `curl -sf -o /dev/null http://localhost:8080/`
- Playwright `/admin/bookings/new`: įvesti datas → „Objektas" neberodomas, kambarių sąrašo pirmas kambarys = objektas; keisti pirmą kambarį → `property_id` atsinaujina; redagavimo atveju (esamas booking) → „Objektas" rodomas.
