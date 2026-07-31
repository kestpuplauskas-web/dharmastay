## Tikslas

Pertvarkyti admin „Nauja rezervacija" formą (`src/components/admin/BookingForm.tsx`) į tris aiškias korteles su moderniu shadcn/ui išdėstymu. Visa esama logika (kainų skaičiavimas, konfliktų tikrinimas, papildomos paslaugos) lieka nepakeista.

## 1. Duomenų bazė

Nauja migracija: `bookings` lentelei pridedamas laukas „Valstybė" (tekstas, numatyta reikšmė „Lietuva"). Įtraukiamas į rezervacijos išsaugojimo ir redagavimo schemą.

## 2. Formos struktūra

**Kortelė A — Rezervacijos informacija**
- Objektas (per visą plotį)
- Atvykimo–išvykimo datos (per visą plotį, esamas DateRangePicker + užimtų datų perspėjimas)
- Atvykimo laikas | Išvykimo laikas (2 stulpeliai)
- Svečių skaičius (siauras laukas, ~max-w-xs)

**Kortelė B — Kliento duomenys**
- Viršuje: kliento tipas kaip ToggleGroup („Fizinis asmuo" / „Juridinis asmuo")
- 2 stulpelių tinklelis:
  - Vardas Pavardė | El. paštas
  - Telefonas | Adresas
  - Gimimo data | Valstybė (default „Lietuva")
- Juridiniam asmeniui papildomai: Įmonės pavadinimas, Įmonės kodas, PVM mokėtojo jungiklis + PVM kodas

**Kortelė C — Finansai ir sistemos parametrai**
- Papildomos paslaugos (jei objektas jas turi) — čia, nes veikia sumą
- Šaltinis | Statusas (2 stulpeliai)
- Suma (€) su € prefiksu lauke, po juo apskaičiuota suma ir „Perskaičiuoti"
- Pastaba (per visą plotį, apačioje)

**Veiksmai**: apačioje dešinėje „Atšaukti" (pilkas, grįžta į /admin/bookings) ir „Išsaugoti rezervaciją" (pagrindinis).

## 3. Techninės detalės

- Naudojami shadcn komponentai: `Card`/`CardHeader`/`CardContent`, `Input`, `Label`, `Select`, `ToggleGroup`, `Checkbox`, `Textarea`, `Button`, `Separator`.
- Vienodi tarpai: `space-y-6` tarp kortelių, `gap-4`/`gap-6` tinkleliuose; visur aiškios etiketės ir placeholder tekstai.
- Spalvos tik per semantinius tokenus (be `text-white` ir pan.).
- Ta pati forma naudojama ir rezervacijos redagavime (`admin.bookings.$id.tsx`) — „Atšaukti" mygtukas veikia abiem atvejais.
- Failai: migracija, `src/lib/bookings.functions.ts` (customer_country schema), `src/components/admin/BookingForm.tsx` (perrašymas), nedideli pataisymai `admin.bookings.new.tsx` / `admin.bookings.$id.tsx`.
