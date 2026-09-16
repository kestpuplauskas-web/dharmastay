# Pataisymas: pasirinktas apartamentas nebešokinėja

## Problema

Naujos rezervacijos formoje administratorius pasirenka apartamentą (pvz. „Double room 3-5"), tada pasirenka datas — ir apartamentas automatiškai pasikeičia į kitą (pvz. „Double room 2-2").

Priežastis: kai datos tampa galiojančios, automatinis kambarių parinkimas pagal svečių skaičių persirašo administratoriaus pasirinkimą. Pasirinkimas apartamentų sąraše nėra laikomas „rankiniu", todėl automatika jį nustelbia.

## Sprendimas

1. Pasirinkus apartamentą sąraše, tai laikoma rankiniu sprendimu: pasirinkimas įrašomas kaip pirmasis kambarys ir automatinė parinktis jo nebekeičia.
2. Automatinis siūlymas lieka veikti tik tada, kai administratorius pats dar nieko nepasirinko arba kai pasirinktų kambarių talpos nepakanka svečių skaičiui — tokiu atveju pasirinktas apartamentas paliekamas pirmas, o trūkstami kambariai pridedami šalia (ne pakeičiami).
3. Rankinį režimą galima atstatyti esamu būdu (kaip ir dabar, keičiant kambarius sąraše), elgsena nesikeičia.

## Techninės detalės

Failas: `src/components/admin/BookingForm.tsx`

- Apartamento `Select` `onValueChange`: papildomai `setManualRooms(true)` ir `setRoomIds([val])` (išlaikant kitus jau pridėtus kambarius, jei tokių yra — pirmasis pakeičiamas nauju).
- Automatinio siūlymo `useEffect` (apie 223–231 eil.): praleidžiamas, kai `manualRooms` (jau yra) arba kai naudotojas jau turi pasirinktą `property_id` ir jo talpos pakanka `guestsToPlace`.
- Kai talpos nepakanka, `suggestRooms` kviečiamas tik trūkstamiems svečiams iš likusių laisvų kambarių, o administratoriaus pasirinktas kambarys lieka sąrašo pradžioje.
- Sinchronizacijos `useEffect` (233–240 eil.) lieka, bet jis nebeperrašinės pasirinkimo, nes `roomIds[0]` jau bus administratoriaus pasirinktas objektas.

Patikra: tipų patikra, build logas ir Playwright scenarijus — pasirinkti „Double room 3-5", tada datas, patvirtinti, kad objektas nepasikeitė.
