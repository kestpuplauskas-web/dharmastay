# Klientinio kalendoriaus išvykimo datos vaizdas

## Tikslas
Pasirinkus atvykimo datą, pirmą galimą išvykimo dieną, kuri sutampa su kitos rezervacijos atvykimu, parodyti kaip aiškiai pasirenkamą: kairė langelio pusė įprastai laisva, dešinė — pilka ir užbraukta.

## Pakeitimai
- Atnaujinti abu klientinius kalendorius: rezervacijos dialoge ir apartamento puslapyje.
- Specialų pusės langelio vaizdą taikyti tik tada, kai klientas jau pasirinko atvykimą ir renkasi išvykimą.
- Pusiau pažymėti tik pirmą teisėtą apyvartos ribą; vėlesnės užimtos dienos liks pilnai užbrauktos, kad neklaidintų.
- Pridėti atskirą vaizdinį stilių: kairė pusė laisva, dešinė pilka ir užbraukta.
- Iki atvykimo datos pasirinkimo dabartinis užimtumo vaizdas nesikeis.

## Nekeičiama
- Datos pasirinkimo, persidengimų tikrinimo ir rezervavimo logika.
- Vienos nakties rezervacijų bei tos pačios dienos apyvartos veikimas.
- Administratoriaus kalendorius ir serverio dalis.

## Patikra
- Patikrinti scenarijų: atvykimas spalio 1 d., kita rezervacija prasideda spalio 2 d.; spalio 2 d. turi būti pusiau laisva ir ją turi būti galima pasirinkti kaip išvykimą.
- Patikrinti, kad pasirinkimas vis dar užsifiksuoja, o tikrai persidengiančios datos lieka neleidžiamos.
- Patikrinti vaizdą rezervacijos dialoge ir apartamento puslapyje.
