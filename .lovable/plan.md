## Tikslas

Rezervacijos formoje (nauja ir redagavimas) laukas „Suma (€)“ turi būti skaičiuojamas automatiškai:

```text
Suma = nakvynės kaina (pagal objekto sezoninę kainodarą × naktų sk.) + papildomų paslaugų suma
```

Sumą administratorius vis tiek gali įrašyti ranka.

## Kaip veiks

1. **Nakvynės kaina.** Naudojama jau esanti funkcija `priceForNights` (`src/lib/properties.ts`), kuri pagal naktų skaičių parenka tinkamą sezoninį tarifą iš objekto „Sezoninės kainos“ lentelės, o jei nė vienas intervalas netinka – bazinę kainą už naktį.

2. **Perskaičiavimas.** Dabartinė `recalc` logika `BookingForm.tsx` bus perrašyta: vietoje sumos „deltos“ pagal paslaugas, ji suskaičiuos pilną sumą (nakvynė + paslaugos) kaskart pasikeitus objektui, datoms, svečių skaičiui ar pažymėtoms paslaugoms.

3. **Rankinis keitimas.** Įvedus sumą ranka, įsijungia „rankinio režimo“ žyma – tolesni automatiniai perskaičiavimai sumos nebeperrašo. Šalia lauko atsiras:
   - paaiškinimas: „Apskaičiuota: X € (nakvynė Y € × N naktų + paslaugos Z €)“
   - mygtukas „Perskaičiuoti“, grąžinantis automatinę reikšmę.

4. **Redagavimo forma.** Atidarius esamą rezervaciją, rodoma išsaugota suma (rankinis režimas įjungtas), kad įrašas nepasikeistų savaime; norint atnaujinti – spaudžiamas „Perskaičiuoti“.

## Techninės detalės

- Keičiami failai: `src/components/admin/BookingForm.tsx` (pagrindinė logika ir UI), prireikus mažas pagalbinis skaičiavimas `src/lib/booking-extras.ts`.
- Serverio pusėje (`src/lib/bookings.functions.ts`) paslaugų kainos ir toliau validuojamos pagal objektą; `total_amount` išlieka priimamas iš formos, nes leidžiamas rankinis koregavimas.
- Duomenų bazės pakeitimų nereikia.
