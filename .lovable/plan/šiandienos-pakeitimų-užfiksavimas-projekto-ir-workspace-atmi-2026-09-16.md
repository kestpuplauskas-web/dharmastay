# Šiandienos pakeitimų užfiksavimas projekto ir workspace atmintyje

## Tikslas

Šiandienos (2026-09-16) darbų suvestinė turi būti išsaugota **workspace knowledge** ir **project knowledge** (memory) sistemose, kad naujos sesijos iškart suprastų dabartinę būseną.

## Ką užfiksuoti (project knowledge)

1. **Rezervacijų forma (admin)** — naujas „Rezervacijos informacija" išdėstymas: datos → laikai → svečiai → objektas+kambariai viename bloke; įvedus datas „Objektas" dropdown neberodomas (pirmas kambarys = objektas); pridedant kelis kambarius „Suma (€)" automatiškai sutampa su kambarių bendra suma; email/telefonas neprivalomi; kambarių pasiūlymai pagal svečių skaičių su rankinio pasirinkimo apsauga (`manualRooms`).
2. **Klientinio kalendoriaus užimtumas** — atvykimo diena pilnai užimta, išvykimo diena visiškai laisva; puslangeliai tik admin panelėje (BookingsGantt: juosta nuo atvykimo vidurio iki išvykimo vidurio); vizualus „apyvartos dienos" žymėjimas klientui (pirma pusė laisva, antra pilka) tik renkantis išvykimą; vienos nakties rezervacija leidžiama (`min={1}`).
3. **Rezervacijų sąrašas** — „Nuo" ir „Iki" stulpeliai perkelti kairėje po „Užsakymo Nr".
4. **Gantt šiandienos juosta** — per dienos langelio vidurį, ne ant linijos.
5. **Kalbos ir tekstai** — LT yra pagrindinė klientinė kalba (be redirecto į /en); „El. paštas"/"Telefonas" be asteriskų; „Lietuviško Maisto Restoranas" h1; `found_few/found_many` lietuviški pluralai.
6. **Saugumas** — sutvarkyti radiniai: `bookings_no_public_policy`, `car_images_public_bucket_broad`, `properties_anon_select_all_columns`, `properties_door_code_public_exposure`; liko 1 neišspręstas kritinis radinys.
7. **Taisyklės ateities darbui** — pasirinkimo logika kalendoriuje „išlaikyti kaip yra" (vartotojas aiškiai prašė neliesti); vizualūs tekstų pakeitimai redaguojami duomenų šaltinyje (locale/content failai).

## Ką užfiksuoti (workspace / user knowledge)

- Vartotojas yra verslo administratorius (Dharma / dharmastay), dirba lietuviškai, nori glaustų atsakymų lietuvių kalba ir aiškių „atlikta" patvirtinimų be techninio pertekliaus.

## Techniniai žingsniai

- Sukurti projekto atminties failą `mem://features/rezervacijos-ir-kalendorius` su pirmiau išvardytomis taisyklėmis ir atnaujinti `mem://index.md` nuorodomis.
- Atnaujinti `mem://~user` vartotojo lygmens pageidavimus (kalba, glaustumas, vaidmuo).

## Ko neliesime

- Jokio kodo, migracijų ar backend pakeitimų — tik atminties įrašai.
