## Tikslas

Nauja admin skiltis **Turto nustatymai** (kairiajame meniu po „Finansai") — centrinė vieta, kur kiekvienam objektui konfigūruojama viešnagės, mokėjimų, sąskaitų, pranešimų, prekės ženklo ir integracijų informacija. Architektūra modulinė, kad ateityje būtų lengva pridėti naujų sekcijų ir integracijų.

## 1. Duomenų bazė (migracija)

Nauja lentelė `public.property_settings`, 1:1 su `properties`:

- Sisteminiai: `id`, `property_id` (UNIQUE, FK → properties, ON DELETE CASCADE), `created_at`, `updated_at`, `updated_by`
- Objekto informacija: pavadinimas, adresas, miestas, pašto kodas, šalis, GPS (lat/lng), laiko zona, valiuta, numatytoji kalba, telefonas, el. paštas
- Viešnagės taisyklės: check-in nuo/iki, check-out iki, min/max nakvynių, max rezervacijos langas (dienomis), auto-patvirtinimas, privalomas telefonas, privalomas el. paštas
- Svečių politika: vaikai nemokamai iki X metų, augintiniai, vakarėliai, ramybės laikas nuo/iki, min. svečio amžius
- Mokesčiai: PVM %, miesto mokestis, jo amžiaus riba, mokestis už papildomą svečią
- Mokėjimai: ar reikalingas avansas, avanso tipas (`full` / `percent` / `fixed`), avanso dydis, apmokėjimo terminas (dienos), leidžiami mokėjimo būdai (jsonb masyvas), auto užstato grąžinimas
- Atšaukimo politika: nemokamo atšaukimo terminas, mokesčio tipas, mokestis, neatvykimo mokestis, taisyklių tekstas
- Sąskaitos: serija, sekantis numeris, įmonės pavadinimas / kodas / PVM kodas / adresas, IBAN, bankas, logotipo URL, pastabos
- Pranešimai: 6 jungikliai + valandos prieš atvykimą ir po išvykimo
- Branding: pagrindinė ir antrinė spalva, logotipas, el. laiškų logotipas, PDF logotipas
- Integracijos: `integrations` jsonb (ateities raktams, webhook URL ir kt.)

Numatytosios reikšmės ir NOT NULL ten, kur prasminga; `updated_at` trigeris.

**RLS ir teisės:**
- `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated`, `GRANT ALL ... TO service_role` (anon negauna prieigos)
- Peržiūra: bet kuris prisijungęs naudotojas
- Kūrimas / redagavimas / trynimas: tik `has_role(auth.uid(), 'admin')`

Naujas „owner" vaidmuo nekuriamas (pagal jūsų atsakymą) — redaguoja `admin`, kiti tik peržiūri.

## 2. Serverio logika

- `src/lib/property-settings.ts` — bendri tipai, Zod schemos pagal sekcijas, konstantos (valiutos, kalbos, laiko zonos, mokėjimo būdai, avanso tipai). Jokių „hardcoded" reikšmių komponentuose.
- `src/lib/property-settings.functions.ts` — `getPropertySettings({ propertyId })` (grąžina esamus arba numatytuosius), `savePropertySettings({ propertyId, section, values })` su `requireSupabaseAuth` middleware ir admin patikra; upsert pagal `property_id`, `updated_by = auth.uid()`. Dalinis išsaugojimas pagal sekciją, kad kiekviena forma saugotų tik savo laukus.

## 3. Vartotojo sąsaja

- Meniu punktas **Turto nustatymai** (`/admin/settings`) po „Finansai", ikona `Settings2`.
- Puslapio viršuje objekto pasirinkimas (dropdown), nes nustatymai yra objekto lygio; pasirinkimas išsaugomas URL parametre.
- Dviejų stulpelių išdėstymas: kairėje sekcijų navigacija, dešinėje pasirinktos sekcijos forma. Mobiliuose navigacija virsta horizontaliai slenkamu sąrašu / išskleidžiamu meniu.
- Sekcijos: 🏨 Objekto informacija · 🛏 Viešnagės taisyklės · 👨‍👩‍👧 Svečių politika · 💶 Mokesčiai · 💳 Mokėjimai · 📄 Sąskaitos · ✉ Automatiniai pranešimai · 🎨 Branding · 🔌 Integracijos
- Kiekviena sekcija: atskiras komponentas `src/components/admin/settings/<Section>Section.tsx`, React Hook Form + Zod, aiškūs pavadinimai, pagalbiniai aprašymai po laukais, vienetai (€ / % / val. / dienos), „Išsaugoti" mygtukas su loading būsena, sėkmės ir klaidos pranešimai (sonner).
- Ne administratoriams laukai `disabled` ir rodomas paaiškinimas, kad teisių redaguoti nėra.
- Integracijų skiltis: kortelės Booking.com, Airbnb, Google Calendar, Stripe, Paysera, SMTP, SMS, API raktai, Webhook URL, klientinė landing page. Booking.com / Airbnb kortelės rodo būseną **Prijungta** su paskutinės iCal sinchronizacijos laiku (paimta iš objekto `ical_last_sync_at` / `ical_last_status`) ir nuorodą į objekto kortelę, kur nuoroda konfigūruojama. Likusios kortelės — ženkliukas **Greitai**.

## Techninės pastabos

- Naujas maršrutas `src/routes/_authenticated/admin.settings.tsx`; formos komponentai atskirose bylose, valdomos per bendrą `SettingsSection` apvalkalą (antraštė, aprašymas, footer su mygtuku), todėl naujos sekcijos pridedamos vienu failu + įrašu registre.
- Duomenų nuskaitymas per TanStack Query, išsaugojimas per `useMutation` + cache invalidacija.
- Po migracijos atsinaujina `src/integrations/supabase/types.ts`, todėl visos užklausos bus pilnai tipizuotos.
- Esama iCal logika nekeičiama — integracijų skiltis ją tik atvaizduoja.
