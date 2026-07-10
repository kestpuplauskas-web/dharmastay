
# Swedbank integracijos pašalinimas

Šis planas apima tik pirmą žingsnį: visos Swedbank mokėjimų integracijos pašalinimą ir mokėjimo srauto supaprastinimą į „rankinį banko pavedimą". Perėjimas iš automobilių į NT nuomą bus atliekamas atskirose užduotyse.

## Ką pašalinti

Serverio pusės failai:
- `src/lib/swedbank-banklink.server.ts`
- `src/lib/swedbank-pi.server.ts`
- `src/routes/api/public/payment/initiate.ts`
- `src/routes/api/public/payment/return.ts`
- `src/routes/api/public/payment/notify.ts`
- `src/routes/api/public/payment/cancel.ts`

Su tuo susijusios `secrets` reikšmės (nebebus naudojamos, bet paliekamos projekte — jų pašalinimas nekritinis; galima ištrinti vėliau):
`SWEDBANK_*`, `SWEDBANK_PI_*`.

## Ką pakeisti

- `src/lib/swedbank-bic.ts` — pervadinti į neutralesnį pavadinimą (pvz. `src/lib/banks.ts`) ir palikti tik banko sąrašą (BIC, pavadinimas, šalis). Jokio ryšio su Swedbank API.
- `src/components/BankLogo.tsx` — palikti kaip yra (rodo bankų logotipus pagal BIC).
- Rezervacijos formos / apmokėjimo puslapiai (`booking-submit.ts`, admin rezervacijų puslapiai): vietoje „inicijuoti mokėjimą Swedbank" srauto, po rezervacijos submit'o parodyti klientui:
  - pasirinktą banką (iš sąrašo);
  - pavedimo rekvizitus (gavėjas, IBAN, suma, mokėjimo paskirtis / rezervacijos numeris);
  - pastabą, kad rezervacija bus patvirtinta gavus pavedimą.
- `bookings` lentelės laukai `payment_provider`, `payment_reference`, `bic` lieka — juose saugosime pasirinktą banką ir rankinio pavedimo būseną (`payment_status` valdomas admin'o rankiniu būdu). Jokių DB schemos migracijų šiame etape.
- Nuorodos į `/api/public/payment/*` iš UI pašalinamos.

## Ko NEDARYSIM šiame etape

- Nekeičiam produkto turinio (dar liks „automobilių" tekstai/route'ai) — tai atskira užduotis.
- Netriname `SWEDBANK_*` secrets (jie tiesiog netaps naudojami).
- Nekuriam naujų mokėjimo integracijų (Stripe, Paddle ir pan.).

## Rezultatas

Po šio etapo projektas nebeturės jokios išorinės mokėjimų sistemos. Rezervacijos formoje klientas pasirenka banką iš sąrašo, gauna pavedimo rekvizitus ir moka pats. Admin rankiniu būdu patvirtina apmokėjimą rezervacijų sąraše.
