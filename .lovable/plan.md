## Problema

Kai rezervacija atidaroma iš kalendoriaus (su iš anksto užpildytu objektu ir datomis), suma lieka 0. Priežastis: `BookingForm` skaičiuoja kainą tik tada, kai vartotojas pakeičia objektą, datas ar svečius (`recalc` kviečiamas tik `onChange` įvykiuose). Pradinė būsena paimama tokia, kokia perduota, be perskaičiavimo.

## Sprendimas

`src/components/admin/BookingForm.tsx`:
- Pradinę formos būseną inicializuoti jau perskaičiuotą — pritaikyti tą pačią kainos skaičiavimo logiką (`computeTotals`) `useState` inicializacijoje, kai objektas ir datos jau nurodyti, o `total_amount` yra 0.
- `manualTotal` toliau lieka `false` tokiu atveju, kad vėlesni datų/paslaugų pakeitimai vis dar automatiškai perskaičiuotų sumą.
- Rankiniu būdu įvesta suma (redaguojant esamą rezervaciją) nekeičiama.

Kitų funkcijų (konfliktų tikrinimo, papildomų paslaugų, „Perskaičiuoti“ mygtuko) logika nekeičiama.
