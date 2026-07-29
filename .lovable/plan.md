## Papildomos paslaugos (Extra Services)

Pridedame dinaminę „Papildomos paslaugos" sekciją į objekto formą, saugome duomenis DB, ir naudojame klientinėje rezervacijos formoje.

### 1. DB migracija
Į `properties` lentelę pridėti stulpelį `extra_services jsonb not null default '[]'::jsonb`. Struktūra:
```json
[{ "name": "Pusryčiai", "calc": "per_person", "pricePerDay": 10 }]
```
`calc` reikšmės: `per_person` | `per_child` | `flat_per_day`.

Į `bookings` pridėti `extras jsonb not null default '[]'::jsonb` — išsaugoti pasirinktas paslaugas su suskaičiuotomis sumomis, ir `extras_total numeric not null default 0`.

### 2. Tipai ir konstantos (`src/lib/properties.ts`)
- `EXTRA_SERVICES` sąrašas su default `calc` tipu kiekvienai:
  - Pusryčiai / Pietūs / Vakarienė → `per_person`
  - Vaikiška lovytė → `per_child`
  - Pirties nuoma / Kubilo nuoma → `flat_per_day`
- `EXTRA_CALC_LABELS` LT etiketės.
- `ExtraService` tipas ir helper `calcExtraTotal({ calc, pricePerDay }, { adults, children, days })` — vaikai iki 3 m. nemokamai už maistą (skaičiuojami tik `adults + childrenOver3` kai `per_person`).

### 3. Admin forma (`PropertyForm.tsx` + `properties.functions.ts`)
- Į `PropertyFormValues` pridėti `extraServices: ExtraService[]`.
- Nauja sekcija „Papildomos paslaugos" su `+ Pridėti paslaugą` mygtuku. Kiekviena eilutė: pavadinimas (Select su fiksuotais + „Kita…" custom laisvai įrašyti), skaičiavimo tipas (Select, auto-defaultina pagal pasirinkimą), įkainis €/d., trash mygtukas.
- Grid layout su antraštėmis.
- Zod schema `properties.functions.ts` — priimti `extraServices` masyvą (max 20).

### 4. Klientinė rezervacija (`properties.$id.tsx`)
- Pridėti laukus: `adults`, `children` (vietoj vieno `guests`, arba prie jo pridėti „vaikų sk." — laikysime `guests = adults + children`).
- Kiekvienai paslaugai — checkbox (arba kiekiui `dienų skaičius` input jei norima kitokio nei rezervacijos ilgis; MVP naudosime rezervacijos ilgį).
- Kliento pusėje realiai suskaičiuoti kiekvienos pasirinktos paslaugos sumą pagal `calcExtraTotal` ir rodyti „Papildomai mokama suma" bei pridėti prie galutinės sumos.
- Į `/api/public/booking-submit` POST body pridėti `adults`, `children`, `extras: [{ name, calc, pricePerDay }]` (tik pavadinimai/kodai kuriuos vartotojas pasirinko).

### 5. `booking-submit` endpoint
- Priimti `adults`, `children`, `extras` (pasirinktų pavadinimai + calc + pricePerDay, bet validuoti prieš `properties.extra_services` sąrašą, kad kaina/`calc` sutaptų — apsauga nuo klastojimo).
- Suskaičiuoti serveryje `extras_total`, `total_amount = nights_price + extras_total`.
- Įrašyti į `bookings.extras` ir `bookings.extras_total`.

### 6. Admin rezervacijos peržiūra
- `admin.bookings.$id.tsx` — parodyti pasirinktų papildomų paslaugų sąrašą su sumomis ir bendrą papildomą sumą (mažas informacinis blokas, tik peržiūra).

### Techninės pastabos
- Vaikai iki 3 metų nemokamai už maistą: klientinėje formoje pridėsime atskirą lauką „vaikų iki 3 m." kad būtų galima teisingai suskaičiuoti maisto paslaugas (per_person naudos `adults + children_over_3`).
- `flat_per_day` — asmenų skaičius nevertinamas, tik dienos × įkainis.
- Nauji stulpeliai turi default reikšmes, esamos rezervacijos ir objektai lieka veikti.

Po patvirtinimo pradėsiu nuo DB migracijos, tada kodo pakeitimai vienu ėjimu.
