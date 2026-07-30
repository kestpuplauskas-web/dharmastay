## Problema

Paspaudus tuščią langelį (pvz. rugpjūčio 11 d.) forma atsidaro su visai kitomis datomis (2026-08-07 → 08-08), todėl iškart rodomas „datos užimtos" pranešimas. Pranešimas techniškai teisingas — klaida yra kalendoriuje: paspaustas langelis grąžina ne tą datą.

## Priežastis

`src/components/admin/BookingsGantt.tsx` eilutėje dienų langeliai (`<button>`) neturi aiškiai nurodyto grid stulpelio — jie išdėliojami automatiškai. Rezervacijų juostos turi aiškų `gridColumn`, todėl CSS grid jas išdėsto pirmiau, o automatiniai langeliai „peršoka" jau užimtus stulpelius ir pasislenka į dešinę.

Konkrečiai: Petro rezervacija 2026-08-06 → 08-09 užima 4 stulpelius, todėl visi po jos einantys langeliai pasislenka 4 dienomis — vizualiai rugpjūčio 11 d. langelis iš tikrųjų yra rugpjūčio 07 d. mygtukas. Eilutėse be rezervacijų poslinkio nėra, todėl klaida atrodo atsitiktinė.

## Sprendimas

1. Kiekvienam dienos langeliui `BookingsGantt.tsx` nustatyti aiškų `style={{ gridColumn: 2 + i, gridRow: 1 }}`, kad išdėstymas nepriklausytų nuo rezervacijų juostų.
2. Tą patį padaryti antraštės eilutėje (dienų numeriai), kad viskas liktų sulygiuota.
3. Patikrinti, kad juostos ir „šiandien" linija liktų virš langelių (z-index nesikeičia).
4. Patikrinti naršyklėje: eilutėje su rezervacija paspausti kelis langelius ir įsitikinti, kad formos datos atitinka paspaustą dieną; taip pat patikrinti vilkimą per kelias dienas.

Užimtų datų perspėjimo logika ir kalendoriaus elgsena lieka nepakeista (kaip pasirinkta) — jis tiesiog nustos rodytis be reikalo, nes datos bus perduodamos teisingos.
