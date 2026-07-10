# Atkurti admin panelės struktūrą NT versijai

Migracijos metu supaprastinau admin sritį iki 3 kortelių ir horizontalios navigacijos. Reikia atkurti tokią pat modulinę struktūrą, kokia buvo automobilių versijoje, tik pritaikytą NT (objektai vietoje automobilių, paros vietoje valandų, sezonai vietoje kategorijų).

## Ką atkuriu

### 1. Layout su šonine juosta (`admin.tsx`)
Vietoje horizontalios top-nav — sticky kairė šoninė juosta su „Rentivo Admin" logo ir meniu punktais:
- 📊 Skydas (`/admin`)
- 🏠 Objektai (`/admin/properties`)
- 📅 Rezervacijos (`/admin/bookings`)
- 📄 Sutartys (`/admin/contracts`)
- 💶 Finansai (`/admin/expenses`)

Apačioje — nuorodos „Svetainė" ir „Atsijungti".

### 2. Laikotarpio filtras (`PeriodFilter.tsx`)
Atkuriu komponentą su presetais: Šiandien / Ši savaitė / Šis mėnuo / Šis ketvirtis / Šie metai / Custom range. Rodo pasirinktą intervalą (`2026-07-01 → 2026-07-31`). Būklė laikoma URL search params, kad būtų dalinama nuorodomis.

### 3. Tabuoti KPI (`admin.index.tsx`)
Trys skirtukai su KPI kortelėmis:

**Operacijos**
- PAJAMOS — patvirtintų rezervacijų suma laikotarpiu
- UTILIZATION — užimtų parų % nuo visų prieinamų parų
- LAISVI ŠIANDIEN — `laisvi / viso` objektų
- 30D PATVIRTINTA — patvirtintos rezervacijos artimiausioms 30 d.
- LAUKIA APMOKĖJIMO — rezervacijos su `pending` mokėjimu
- ABV (Average Booking Value) — vidutinė rezervacijos vertė

**Parkas** (NT objektai)
- Viso objektų / aktyvių
- Objektų pagal tipą (apartamentai, viešbučiai, vilos, atostogų nameliai, svečių namai)
- Vidutinė paros kaina
- Objektai be nuotraukų / be aprašymo (data-quality signal)

**Verslas**
- Grynasis pelnas (pajamos − išlaidos)
- Išlaidos pagal kategoriją
- Mėnesio dinamika (paprastas trend)
- Vidutinė viešnagės trukmė (paros)

### 4. Timeline sekcijos
Po KPI — trys kortelės (pritaikytos NT žodynui):
- 🔑 **Atvykimai šiandien** (check-in) — pakeičia „Paimimai šiandien"
- 🚪 **Išvykimai šiandien** (check-out) — pakeičia „Grąžinimai šiandien"
- 💳 **Laukia apmokėjimo** — sąrašas su suma ir CTA

Ir „🆕 Naujausios rezervacijos (24h)" sąrašas.

### 5. Nauji server function'ai (`src/lib/dashboard.functions.ts`)
Vienas suminis `getDashboardStats({ from, to })` grąžinantis visus aukščiau esančius agregatus — kad UI neatliktų sunkių skaičiavimų kliento pusėje. Apsaugotas `requireSupabaseAuth` + `has_role('admin')` patikra.

## Techninės detalės

- `src/lib/dashboard-period.ts` jau egzistuoja — panaudoju jo helper'ius (`resolvePeriod`, presetai).
- Utilization skaičiavimas: `∑(booking_nights) / (aktyvūs_objektai × dienos_laikotarpyje)` — panašiai kaip auto versijoje buvo pagal fleet dienas.
- „30D patvirtinta" žiūri į `bookings` kur `status='confirmed'` ir `date_from` per artimiausias 30d.
- Timeline sekcijos filtruoja pagal `date_from = today` (check-in) ir `date_to = today` (check-out).
- Visos naujos serverio f-jos naudoja `requireSupabaseAuth`; kviečiamos iš komponentų per `useServerFn` + `useQuery`, ne per loader (viskas po `_authenticated/`, todėl bearer bus prijungtas).

## Failų sąrašas
- ✏️ `src/routes/_authenticated/admin.tsx` — perrašomas į sidebar layout
- ✏️ `src/routes/_authenticated/admin.index.tsx` — pilnas dashboard su tab'ais + timeline
- ➕ `src/components/admin/PeriodFilter.tsx`
- ➕ `src/components/admin/KpiCard.tsx`
- ➕ `src/components/admin/BookingsTimeline.tsx`
- ➕ `src/lib/dashboard.functions.ts`

Ne DB migracija — visi duomenys jau yra esamose lentelėse (`properties`, `bookings`, `expenses`).