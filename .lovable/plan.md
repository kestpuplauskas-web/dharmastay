# Išvykimo diena kalendoriuje – rodoma kaip visiškai laisva

## Kas negerai dabar

Spalio 1 d. yra ankstesnės rezervacijos **išvykimo diena**. Klientiniame kalendoriuje tokia diena šiuo metu:

- pažymima pusiau pilka (pusė langelio atrodo užimta),
- yra neaktyvi renkantis **atvykimo** datą — todėl jos negalima paspausti.

Realiai ta diena laisva: ankstesnis svečias išvyksta iki 11:00, naujas gali atvykti nuo 15:00.

## Ką pakeisiu

1. **Išvykimo diena tampa įprasta laisva diena** — be jokio pusinio pilkumo, be perbraukimo.
2. **Ją galima pasirinkti ir kaip atvykimo, ir kaip išvykimo datą.**
3. Užimtos lieka tik **nakvynių dienos** (nuo atvykimo iki paskutinės nakties imtinai) — jos rodomos pilnai pilkos ir nepasirenkamos.
4. Tikras nakvynių persidengimas ir toliau neleidžiamas (patikra išlieka).

Pavyzdys: rezervacija 09-28 → 10-01. Kalendoriuje užimta 09-28, 09-29, 09-30; **10-01 — laisva ir paspaudžiama**.

## Techninė dalis

- `src/components/stay/AvailabilityCalendar.tsx` ir `src/components/site/BookingDateRange.tsx`: pašalinamas `isDepartureDay` naudojimas `disabled` sąlygoje ir `modifiers.depart`; lieka tik `isNight`.
- `src/styles.css`: pašalinamos nebenaudojamos `.day-depart` taisyklės (admin kalendoriaus `.day-occ-*` stiliai nekeičiami).
- Admin panelės kalendorius (`BookingsGantt.tsx`) nekeičiamas.
- Patikra: tipų patikra, build, vizualus patikrinimas naršyklėje.
