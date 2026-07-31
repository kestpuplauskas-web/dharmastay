## Sprendimas: nieko nekeičiame

iCal sinchronizacija lieka kas 15 min. Jokių kodo ar duomenų bazės pakeitimų nereikia.

## Kreditų sąnaudos (atsakymas į klausimą)

Cron sinchronizacija **nenaudoja build/plan kreditų** — tie nurašomi tik už mano darbą pokalbyje. Ji skaičiuojama tik kaip Lovable Cloud naudojimas.

Iš jūsų dabartinio šio laikotarpio naudojimo:

| Kategorija | Naudota per laikotarpį |
| --- | --- |
| Cloud Worker Requests | 0.0008 kreditų |
| Cloud egress | 0.011 kreditų |
| Cloud cached egress | 0.0015 kreditų |
| Cloud file storage | 0.00007 kreditų |

Kas 15 min = ~2 880 paleidimų per mėnesį. Vienas paleidimas = 1 HTTP užklausa į `/api/public/ical-sync` + keli DB įrašai + nedidelis .ics parsisiuntimas.

**Įvertinimas: viena sinchronizacija ≈ 0.0001 kredito; visas mėnuo ≈ 0.1–0.3 kredito.** Tai telpa į nemokamą 40 kreditų/mėn. Cloud limitą.

Pastaba: didžiausias Cloud punktas jūsų sąskaitoje yra „Cloud compute pico" (7.88 kreditų) — tai bendras duomenų bazės veikimas 24/7, nepriklausantis nuo sinchronizacijos.

## Kada verta peržiūrėti

Jei objektų su iCal nuorodomis taps 50+, kaina augtų proporcingai (kiekvienas objektas = atskiras parsisiuntimas), bet net ir tada liktų kelių kreditų per mėnesį ribose. Tada būtų prasminga svarstyti dažnio sumažinimą iki 30 min.
