# Kelių kambarių rezervacija su 1 svečiu

## Kas nutinka dabar

Kai svečių yra mažiau nei pridėtų kambarių, svečiai išdalinami po kambarius ir antram kambariui nebelieka nė vieno suaugusio. Sistema neleidžia išsaugoti rezervacijos be bent vieno suaugusio, todėl išsaugojimas nutrūksta su klaida.

## Sutinku su jūsų siūlymu

Jei užsakovas vienas, logiška, kad jis būna įrašytas kaip svečias kiekviename pridėtame kambaryje. Taip kiekvienas kambarys turi savo rezervaciją, savo užsakymo numerį ir savo laišką (durų kodas, atvykimo info) — o tai praktiška, nes kambariai skirtingi.

## Ką padarysiu

1. Kai svečių skaičius mažesnis už pridėtų kambarių skaičių, kiekvienam kambariui, kuriam neliko svečių, priskiriamas tas pats pagrindinis svečias (1 suaugęs). Kambariai su realiai paskirstytais svečiais nesikeičia.
2. Kliento duomenys (vardas, kontaktai, įmonė), datos ir laikai visiems kambariams tie patys — kaip ir dabar.
3. Laiškai siunčiami už kiekvieną sukurtą rezervaciją, t. y. tiek laiškų, kiek kambarių.
4. Kainos skaičiavimas nesikeičia: kiekvienas kambarys turi savo kainą, bendra suma lieka jų suma.
5. Papildomos paslaugos ir toliau priskiriamos tik pirmai rezervacijai, kad nesidubliuotų.

## Ką verta žinoti

Bendras svečių skaičius ataskaitose bus toks, kiek kambarių (pvz., 2 kambariai — 2 svečiai), nes kiekviena rezervacija turi bent vieną svečią. Jei norite, kad statistikoje liktų tik 1 svečias, galiu vietoje to leisti kambarį be svečių — pasakykite.

## Techninė dalis

- `src/components/admin/BookingForm.tsx` / `src/lib/room-allocation.ts`: `distributeGuests` rezultate kambariams, kuriems liko 0 svečių, nustatomas `adults: 1`.
- Serverio validacija (`bookings.functions.ts`) nekeičiama — kiekviena rezervacija toliau turi ≥1 suaugusį.
- Kalendoriaus ir datų pasirinkimo logika neliečiama.
