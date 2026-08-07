# Durų kodo laiškas: kada siunčiamas ir kaip jį valdyti

## Kada siunčiamas

Šis laiškas („… apmokėta — durų kodas") siunčiamas automatiškai, kai rezervacijos statusas pakeičiamas į **Patvirtinta / apmokėta** (iš bet kokio kito statuso). Vienai rezervacijai siunčiamas tik kartą — pakartotinai perjungus statusą, laiškas nedubliuojamas. Kopija keliauja ir administratoriui.

Durų kodas laiške įrašomas tik tada, kai rezervacija patvirtinta/apmokėta ir objekto kortelėje užpildytas laukas „Durų kodas".

## Ar jį galima redaguoti per nustatymus

Šiuo metu — ne. Laiško tema ir tekstas jau saugomi duomenų bazėje kaip šablonas `door_code_delivery`, bet jis **nerodomas** administratoriaus skiltyje „Turinys", todėl per sąsają jo redaguoti negalima. Jungiklio Bendruosiuose nustatymuose jis taip pat neturi sąmoningai — tai būtina prieigos informacija.

## Ką siūlau padaryti

Pridėti šį šabloną į „Turinys" → „Pranešimai el. paštu" kaip atskirą kortelę „Durų kodas (po apmokėjimo)":

- tema + turinys su tekstų redaktoriumi ir kintamųjų įterpimu (`{{door_code}}`, `{{wifi_name}}`, `{{location}}` ir kt.);
- testinio laiško siuntimas, kaip kitose el. laiškų kortelėse;
- kortelės įjungimo jungiklis paliekamas, bet pagal dabartinę logiką laiškas laikomas privalomu ir lieka įjungtas.

Esami duomenų bazėje išsaugoti tekstai nekeičiami — kortelė iškart parodys tai, kas siunčiama dabar.

## Techninės detalės

- Naujas įrašas `CONTENT_TEMPLATES` masyve (`src/lib/content-templates.ts`): `category: "email"`, `name: "door_code_delivery"`, `hasSubject`, `hasRichText`, `canTestSend: true`, su dabartiniais numatytaisiais tekstais.
- Siuntimo logika (`src/lib/notifications.server.ts`) nekeičiama — ji jau ima šabloną pagal tą patį pavadinimą.