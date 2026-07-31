## Tikslas
Automatinis užimtumo importas iš išorinių kalendorių (Booking.com, Airbnb) per iCal (.ics) nuorodą. Tik importas — eksporto nedarome.

Svarbu: šiame projekte lentelės vadinasi `properties` (ne `rooms`) ir `bookings` (ne `reservations`), todėl laukus pridėsime prie jų.

## 1. Duomenų bazė (migracija)
- `properties`: nauji laukai
  - `ical_import_url` (text, nullable) — Booking.com/Airbnb iCal nuoroda
  - `ical_last_sync_at` (timestamptz, nullable), `ical_last_status` (text, nullable) — paskutinės sinchronizacijos laikas ir rezultatas
- `bookings`: nauji laukai
  - `external_uid` (text, nullable) — iCal VEVENT UID
  - `external_source` (text, nullable) — pvz. `booking`, `airbnb`
  - unikalus indeksas `(property_id, external_uid)` — apsauga nuo dublikatų
- Naujas statusas `blocked_external` („Išorinė / užblokuota") leidžiamas `bookings.status` reikšmėse.

## 2. Importo logika (backend)
Naujas viešas endpoint'as `src/routes/api/public/ical-sync.ts` (TanStack server route), apsaugotas slaptu raktu (`ICAL_SYNC_SECRET`) header'yje:
- Paima visus objektus su užpildytu `ical_import_url`
- Parsina .ics tekstą (nuosava, priklausomybių nereikalaujanti VEVENT parsinimo funkcija `src/lib/ical.ts`: UID, DTSTART, DTEND, SUMMARY; palaikomas eilučių sulaužymo (line folding) ir DATE bei DATE-TIME formatai)
- Kiekvienam VEVENT sukuria arba atnaujina `bookings` įrašą:
  - `status = 'blocked_external'`, `source = 'booking'/'airbnb'`, `customer_name` iš SUMMARY, sumos 0
  - upsert pagal `(property_id, external_uid)` — pasikeitusios datos atnaujinamos
  - įrašai, kurių nebeliko .ics faile (ateities datoms), pažymimi `cancelled` arba ištrinami — dingusios išorinės rezervacijos nebeblokuoja kalendoriaus
- Grąžina santrauką (sukurta / atnaujinta / pašalinta), klaidos loguojamos į `ical_last_status`

Papildomai `syncPropertyIcal` server funkcija (autentifikuota) rankinei sinchronizacijai iš admin panelės.

## 3. Automatinis paleidimas kas 15 min.
- pg_cron + pg_net darbas duomenų bazėje, kviečiantis `/api/public/ical-sync` kas 15 minučių su slaptu raktu.

## 4. Admin UI
- `PropertyForm.tsx`: naujas laukas „Booking.com / Airbnb iCal nuoroda" (URL validacija) + rodomas paskutinės sinchronizacijos laikas ir mygtukas „Sinchronizuoti dabar".
- `BookingsGantt.tsx`: `blocked_external` juostos rodomos pilkai, su „Booking.com" žyma, neredaguojamos (be tempimo/keitimo).
- Rezervacijų sąraše ir statusų vertimuose: `blocked_external` → „Išorinė / užblokuota".

## 5. Konfliktų logika
`assertNoOverlap` jau tikrina visus ne-`cancelled` įrašus, todėl importuotos datos automatiškai blokuos naujų rezervacijų kūrimą tam pačiam objektui.

## Techninės detalės
- iCal parsinimas be išorinių npm bibliotekų (Worker runtime saugu).
- `.ics` failų parsinimas atlieka DTEND korekciją: Booking.com naudoja išvykimo dieną kaip exclusive, o mūsų `date_to` reiškia išvykimo dieną — reikšmės sutampa 1:1.
- Įrašymui naudojamas `supabaseAdmin` (service role) endpoint'o viduje, po rakto patikrinimo.
- Reikės sukurti slaptą raktą `ICAL_SYNC_SECRET`.
