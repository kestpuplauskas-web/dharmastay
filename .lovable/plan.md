## Tikslas

Admin rezervacijos formoje (nauja ir redagavimas) rodyti pasirinkto objekto papildomas paslaugas ir leisti jas pažymėti. Jei objektas paslaugų neturi — sekcija nerodoma.

## Ką darysime

1. **Duomenų laukai rezervacijoje**
   - `bookings` lentelėje jau yra `extras` (JSON) ir `extras_total` — naudosime juos, naujos migracijos nereikia.
   - `bookingInput` schemoje (`src/lib/bookings.functions.ts`) pridėsime:
     - `extras`: masyvas `{ name, calc, pricePerDay, amount }` (max 20, default `[]`)
     - `extras_total`: skaičius (default 0)
   - Serveryje (create/update) sumas perskaičiuosime iš objekto `extra_services` (kaina imama iš objekto, ne iš kliento), kaip jau daroma viešoje `booking-submit` rutėje.

2. **Formos UI (`src/components/admin/BookingForm.tsx`)**
   - Nauja sekcija „Papildomos paslaugos“, matoma tik kai pasirinktas objektas turi `extraServices`.
   - Kiekvienai paslaugai: žymimasis langelis, pavadinimas, skaičiavimo būdas (pvz. „Pagal asmenų sk.“), kaina €/d., ir apskaičiuota suma pagal naktų skaičių bei svečių sudėtį (`calcExtraTotal` iš `src/lib/properties.ts`, kūdikiai iki 3 m. neapmokestinami).
   - Sumos perskaičiuojamos keičiant datas ar svečių skaičių.
   - Pakeitus objektą — pažymėjimai išvalomi (kitas objektas turi kitas paslaugas).

3. **Suma (€)**
   - Po paslaugų sąrašu rodoma „Paslaugų suma: X €“.
   - „Suma (€)“ laukas lieka rankinis, bet pažymėjus/atžymėjus paslaugą automatiškai pridedamas/atimamas skirtumas, kad administratoriui nereikėtų skaičiuoti; rankinis koregavimas vis tiek galimas.

4. **Redagavimas ir peržiūra**
   - `admin.bookings.$id.tsx` — įrašo `extras` užkraunami į formą, kad pažymėjimai išliktų.
   - Rezervacijos peržiūroje/sąraše pasirinktos paslaugos rodomos kaip eilutės su suma (jei jų yra).

## Techninės pastabos

- Objektų sąrašas formoje jau ateina iš `listAllProperties`, kuris grąžina `extraServices`, todėl papildomų užklausų nereikia.
- Serverio pusėje paslaugų kainos visada validuojamos pagal objekto įrašą (apsauga nuo klaidingų/klastotų sumų).
