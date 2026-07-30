## Tikslas
Tam pačiam objektui negali egzistuoti dvi persidengiančios rezervacijos, jei jos nėra atšauktos („cancelled“). Bandant išsaugoti – aiškus klaidos pranešimas.

## Dabartinė būklė (patikrinta kode)
- `createBooking` ir `updateBooking` (`src/lib/bookings.functions.ts`) persidengimo netikrina – galima „užrašyti ant viršaus“.
- `checkBookingConflicts` serverio funkcija egzistuoja, bet formoje nenaudojama.
- `rescheduleBooking` (kalendoriaus vilkimas) tikrina teisingai (`lt`/`gt` – išvykimo diena = kito atvykimo diena leidžiama).
- Viešas `api/public/booking-submit` tikrina, bet su `lte`/`gte` – blokuoja net ir teisėtą tos pačios dienos pasikeitimą.

## Ką darysime

1. **Serverio apsauga (pagrindinė)**
   - `src/lib/bookings.functions.ts`: bendra pagalbinė funkcija `assertNoOverlap(supabase, {property_id, date_from, date_to, excludeId?})`, kuri renka nesutampančius įrašus su sąlyga `status != 'cancelled'`, `date_from < naujas date_to`, `date_to > naujas date_from`.
   - Iškviesti ją `createBooking` ir `updateBooking` (su `excludeId = id`) prieš įrašymą.
   - Klaida lietuviškai, su konkrečia informacija: „Šios datos jau užimtos: Vardas Pavardė (2026-08-01 → 2026-08-05). Rezervacija neišsaugota.“
   - Taip pat patikrinsime, kad `date_to > date_from`.

2. **Duomenų bazės lygis (galutinė garantija)**
   - Migracija: `btree_gist` plėtinys + `EXCLUDE` apribojimas ant `bookings`, kuris neleidžia persidengiančių `daterange(date_from, date_to, '[)')` tam pačiam `property_id`, kai `status <> 'cancelled'`.
   - Taip apsauga galios ir viešoms užklausoms bei kalendoriaus vilkimui, net jei kur nors būtų praleistas patikrinimas.

3. **Formos UX**
   - `src/components/admin/BookingForm.tsx`: pasikeitus objektui/datoms iškviečiama `checkBookingConflicts`; jei randama – po datų laukais rodomas įspėjimas ir mygtukas „Išsaugoti“ blokuojamas.
   - Serverio klaida taip pat rodoma prie formos (naujos ir redagavimo puslapiuose).

4. **Viešos rezervacijos suvienodinimas**
   - `src/routes/api/public/booking-submit.ts`: `lte/gte` → `lt/gt`, kad išvykimo dieną būtų galima atvykti naujam svečiui (kaip kalendoriuje).

## Techninės detalės
- Persidengimo logika visur vienoda: pusiau atviras intervalas `[date_from, date_to)`.
- Atšauktos rezervacijos (`cancelled`) ignoruojamos ir gali laisvai persidengti.
- Prieš migraciją bus patikrinta, ar nėra jau esamų persidengiančių įrašų (jei būtų, pranešime ir suderinsime, ką su jais daryti).
