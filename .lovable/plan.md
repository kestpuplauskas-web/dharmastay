# Naujos rezervacijos lango išdėstymo pakeitimas

Tik pirmosios kortelės („Rezervacijos informacija") išdėstymas. Verslo ir rezervacijų logika, likusios dvi kortelės („Kliento duomenys", „Finansai") bei mygtukai apačioje nepakeičiami.

## Dabartinė pirmosios kortelės tvarka

1. Objektas (Select)
2. Atvykimo–išvykimo datos (DateRangePicker) + nakvynių skaičius
3. Atvykimo / išvykimo laikas (2 stulpeliai)
4. Svečių skaičius (GuestsPicker)
5. Kambarių parinkimas (ribota border kortelė, rodoma kai `isNew && datesValid`)

## Nauja tvarka (pagal nuotrauką)

1. **Atvykimo–išvykimo datos** (DateRangePicker) — pirmas, su nakvynių skaičiumi žemiau
2. **Atvykimo laikas / Išvykimo laikas** (2 stulpeliai)
3. **Svečių skaičius** (GuestsPicker)
4. **Objektas + kambariai** — viskas viename rėmuotas (`rounded-lg border`) sub-kortelės bloke:
   - Objektas (Select) — viršuje
   - „Pridėti kambarį" mygtukas — po Select
   - kambarių sąrašas (esami `roomIds` pasirinkimai su keitimu/šalinimu)
   - apačia: `border-t` + „Bendra talpa: X · svečių: Y" (ir multiRoom atveju bendra kaina)
   - konfliktų/trūkumo pranešimai lieka šiame bloke
5. **Bendra suma** (`v.total_amount`, pvz. „49.00 €") — kortelės apačioje dešinėje, matoma visada (ne tik multiRoom)

## Pakeitimai

- `src/components/admin/BookingForm.tsx`: perrikiuojami elementai pirmosios `CardContent` sekcijoje (datos → laikai → svečiai → objekto/kambarių rėmuotas blokas → bendra suma). `DateRangePicker`/`TimeInput`/`GuestsPicker`/`Select`/kambarių logika išlaikoma be pakeitimų — tik tvarka ir grupavimas.
- Objekto `Select` (dabar linijos 378–397) perkeliamas į rėmuotą bloką kartu su kambarių sąrašu (dabar 471–596), sujungiant į vieną `rounded-lg border p-4` konteinerį.
- Bendros sumos eilutė pridedama kortelės apačioje (dešinėje), naudojant `v.total_amount` arba `totals.computed`.

## Ko neliečiame

- Kliento duomenų kortelė, finansų kortelė, submit/cancel mygtukai.
- Visi `useEffect`, `suggestRooms`, konfliktų tikrinimas, kainų skaičiavimas, server funkcijos.
- `src/styles.css`, locale failai (neišreičiami nauji tekstų raktai, išskyrus jei trūksta esamo rakto santraukai — tuomet pridedam tik naują raktą).

## Patikra

- `bunx tsgo --noEmit`
- `/tmp/observability/build-errors.log`
- `curl -sf -o /dev/null http://localhost:8080/`
- Playwright `/admin/bookings/new`: patikrinti naują tvarką (datos viršuje, objektas su kambariais rėmuotame bloke, suma apačioje).
