
# Perkėlimas iš automobilių nuomos į NT nuomą

Perkeliame visą platformą (klientinę + administratoriaus) į NT nuomą. Pilna migracija — pervadinam DB lenteles, storage bucket'us, route'us, komponentus ir i18n. Darysime keliais etapais, kad būtų aiškiau ir saugiau.

## Domeno modelis (NT)

**Objekto tipai (kategorijos):** Apartamentai, Viešbutis, Atostogų namelis, Vila, Svečių namai.

**Objekto laukai:**
- pavadinimas, tipas (kategorija), aprašymas
- adresas, miestas, šalis, lat/lng (žemėlapiui)
- plotas m², max svečių, lovų kiekis
- kambarių sudėtis (jsonb): pvz. `{ bedrooms: 1, living_rooms: 1, bathrooms: 1, kitchenette: true, parking_spot: true }`
- patogumai jsonb (Wi‑Fi, virtuvė, terasa, baseinas, oro kondicionierius…)
- nuotraukos (cover + galerija), kaip dabar
- price_per_night + sezoninės kainos (price_tiers su datų intervalais)
- is_active, sort_order

**Rezervacijos:** date_from/date_to lieka (check‑in/check‑out), pickup/return_time → check_in_time/check_out_time, pickup/return_location → tampa vienu adresu (objekto), mileage_out/in — pašaliname.

## Etapai

### 1 etapas — DB migracija (schemos pervadinimas)

Viena migracija, kurioje:
- pervadinam `cars` → `properties`, pašalinam automobiliams skirtus stulpelius (`transmission`, `seats`, `fuel`, `consumption`, `mileage_policy`, `current_mileage`), pridedam NT laukus (`property_type`, `address`, `city`, `country`, `lat`, `lng`, `area_m2`, `max_guests`, `beds`, `rooms jsonb`, `amenities jsonb`, `description`);
- `bookings.car_id` → `property_id`, pašalinam `mileage_in/out`, `pickup_location`/`return_location` sujungiam į vieną `location`, `pickup_time`/`return_time` → `check_in_time`/`check_out_time`;
- pervadinam susijusias lenteles: `car_documents` → `property_documents`, `car_investments` → `property_investments`, `car_maintenance` → `property_maintenance`, `car_service_events` → `property_events`; `expenses.car_id` → `property_id`;
- perrašom funkcijas `recalc_car_mileage`, `bump_car_mileage_from_booking` — pašalinam (NT jų nereikia); `set_booking_number` lieka (R‑YY###);
- `service_status` stulpelį pervadinam į `status` (`active` / `maintenance` / `blocked`);
- GRANT + RLS politikos pernešamos su naujais vardais.

Storage bucket'ai: `car-images` → `property-images`, `car-documents` → `property-documents` (senų nekeičiam per SQL — sukursim naujus, pasakysim, kad nuotraukas reikės perkelti; tuščiame projekte tai nesvarbu).

### 2 etapas — Serverio kodas

- `src/lib/cars.functions.ts` → `properties.functions.ts` (list/get/create/update/delete/reorder), `cars.ts` → `properties.ts` (tipai).
- `src/lib/vehicle.functions.ts` → `property.functions.ts` (dokumentai, investicijos, priežiūra).
- `bookings.functions.ts`, `operations.functions.ts`, `dashboard.functions.ts` — pakeičiam `car_id`/`cars` į `property_id`/`properties`, ataskaitose „automobilių pajamos" → „objektų pajamos", metrikas be ridos.
- `api/public/booking-submit.ts` — vietoj automobilio validuojam objektą, kaina = naktų sk. × price_per_night (+ sezoninis kainos apskaičiavimas).
- Panaikinam iš schemos automobiliams likusius rudimentus (banks.ts, bic, payment_provider — vis dar naudojame kaip pasirinktą banką pervedimui, tai palieku kaip anksčiau sutarta).

### 3 etapas — Klientinė dalis (viešoji)

- `/cars/$carId` → `/properties/$id` (naujas maršruto failas, senas ištrinamas).
- `index.tsx` (pagrindinis) — hero, siūlomi objektai, filtrai pagal miestą, tipą, svečių skaičių, datas.
- `offers.tsx` → objektų sąrašas su filtrais (miestas, tipas, svečiai, datos, kaina).
- Objekto puslapis: galerija, tipas, adresas su žemėlapiu (naudosim OpenStreetMap embed be API rakto), plotas / svečiai / kambariai, patogumų sąrašas, kalendorius su užimtomis datomis, rezervacijos forma (check‑in / check‑out / svečių sk.), banko pasirinkimas mokėjimui.
- `about.tsx`, `contact.tsx`, `faq.tsx`, `news.tsx`, `paslaugu-taisykles.tsx` — tekstus pakeičiam į NT kontekstą (bendrai, be konkrečios įmonės detalių — paliksim placeholder'ius, kur reikia).
- `SiteHeader.tsx` — nuorodos „Objektai", „Apie mus", „Kontaktai".

### 4 etapas — Administratoriaus dalis

- `admin.cars.*` → `admin.properties.*` (index, new, $id.index, $id.edit).
- `CarForm.tsx` → `PropertyForm.tsx` — laukai: tipas, adresas + koordinatės, plotas, svečiai, lovos, kambariai (dinaminė jsonb forma), patogumai (checkbox grupė), kainos + sezonai, nuotraukos.
- `admin.dashboard.tsx` — KPI: aktyvūs objektai, užimtumas %, pajamos, vidutinis nakties tarifas; grafikai be ridos.
- `admin.bookings.*` — laukai pritaikyti check‑in/check‑out; be ridos.
- `admin.expenses.tsx` — priskyrimas objektui.
- `admin.contracts.tsx` — sutarčių šablonai, placeholder'ius `{{car_*}}` → `{{property_*}}`.
- `VehicleActions.tsx` → `PropertyActions.tsx`, `BookingsTimeline.tsx` — Y ašyje objektai.

### 5 etapas — i18n ir turinys

- `src/i18n/locales/{lt,en}.json` — pervadinam raktus `car.*` → `property.*`, `vehicle.*` → `property.*`; pridedam naujus (amenities, rooms, kt.). Automatiniuose tekstuose „automobilis" → „objektas / būstas", „nuoma" liks.
- SEO meta (title/description/og) pagrindiniuose puslapiuose atnaujinami į NT.

### 6 etapas — Valymas

- Ištrinam nebenaudojamus failus (senus route'us, komponentus).
- Regeneruojami Supabase tipai po migracijos.

## Ką nedarysime šiuo metu

- Nekeliame senų nuotraukų iš `car-images` į `property-images` (tuščias projektas — remixe nuotraukų nėra).
- Nediegiame naujo mokėjimo integravimo (lieka rankinis banko pervedimas, kaip anksčiau susitarta).
- Nediegiame žemėlapių paslaugos su API raktu — naudosim OpenStreetMap iframe embed.
- Nekuriame naujų klientų autentifikacijos flow'ų — admin auth lieka toks pat.
- `mem://design/car-photos` atmintis lieka archyvuota (automobilių logika daugiau nebus taikoma, bet neištrinsime — pranešiu, kad ji pasenusi).

## Techninės detalės

- Migracija bus vienoje SQL su `ALTER TABLE ... RENAME`, `DROP COLUMN`, `ADD COLUMN`, `RENAME CONSTRAINT`, RLS + GRANT'ų perkopijavimas. Duomenų pametimo nebus (renaminam, ne dropinam lenteles).
- Po migracijos regeneruojami `src/integrations/supabase/types.ts` — po to lygiagrečiai perrašom TS kodą (kad build'as nesugriūtų, DB pervadinimą ir kodo pervadinimą darysime tame pačiame batch'e — DB per migracijos tool, kodą per apply_patch).
- Route pervadinimams `routeTree.gen.ts` regeneruoja pats Vite plugin — jį neredaguojam.

## Apimtis / trukmė

Labai didelis pakeitimas: ~30 failų perrašomi arba pervadinami. Padarysiu vienu žingsniu (DB migracija + kodo pervadinimas), tada dar viena pataisymų iteracija po pirmojo build'o. Rezultate klientinė ir admin dalis bus visiškai NT.

Ar patvirtinti planą ir pradėti?
