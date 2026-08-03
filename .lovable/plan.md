# Promptas kitai paskyrai (klientinės dalies integracija)

Žemiau — tekstas, kurį nukopijuojate ir įklijuojate kitos paskyros Lovable projekte. Prieš tai atlikite du veiksmus savo pusėje.

## Jūsų pusėje prieš perduodant

1. Admin -> Bendrieji nustatymai -> API prieiga: sukurkite du raktus:
   - „Klientinė svetainė – PROD", leidžiami domenai: klientinės svetainės publikuotas adresas (be pasvirojo brūkšnio gale)
   - „Klientinė svetainė – DEV", leidžiami domenai: klientinės svetainės peržiūros (preview) adresas
2. Nukopijuokite abu raktus (rodomi tik vieną kartą) ir perduokite saugiu kanalu.

Bazinis adresas PROD: `https://project--3b144e50-7336-4c5e-a93d-7aeca70328ba.lovable.app/api/public/v1`

Bazinis adresas DEV: `https://project--3b144e50-7336-4c5e-a93d-7aeca70328ba-dev.lovable.app/api/public/v1`

## Perduodamas promptas

```text
Integruok išorinį NT nuomos API (Rentivo core). Klientinė dalis neturi savo objektų/rezervacijų DB,
neskaičiuoja kainų pati, neinicijuoja mokėjimo ir nekeičia statusų — visi duomenys imami iš API.

1) Sukurk secretus:
   RENTIVO_API_URL_PROD = https://project--3b144e50-7336-4c5e-a93d-7aeca70328ba.lovable.app/api/public/v1
   RENTIVO_API_KEY_PROD = <prod raktas>
   RENTIVO_API_URL_DEV  = https://project--3b144e50-7336-4c5e-a93d-7aeca70328ba-dev.lovable.app/api/public/v1
   RENTIVO_API_KEY_DEV  = <dev raktas>

2) Sukurk vieną serverio pusės klientą (pvz. src/lib/rentivo.server.ts), kuris pagal aplinką parenka URL ir raktą:
   - gamyboje naudok PROD reikšmes, kitu atveju DEV;
   - visos užklausos daromos TIK iš serverio (createServerFn arba server route),
     su antraštėmis Authorization: Bearer <raktas> ir Content-Type: application/json;
   - raktas niekada nepatenka į naršyklę, jokių VITE_ prefiksų.

3) Endpointai (bazinis adresas + kelias):
   GET  /properties                              -> aktyvių objektų sąrašas
   GET  /properties/{id}                         -> objekto detalės + užimtos datos
   GET  /availability?property_id=&from=&to=     -> užimti intervalai / available: true|false
   POST /quote                                   -> kainos skaičiavimas be rezervacijos
   POST /bookings                                -> rezervacijos sukūrimas
   GET  /bookings/{booking_number}?email=        -> būsenos patikra

4) POST /quote ir POST /bookings kūnas:
   property_id (uuid), date_from, date_to (YYYY-MM-DD),
   adults (>=1), children, infants, extras: [{ name }].
   /bookings papildomai: customer_name, customer_email, customer_phone, bic (nebūtina).
   /quote atsakymas: { data: { nights, total_amount, currency: "EUR", available, ... } }
   /bookings atsakymas: { data: { booking_number, status, date_from, date_to, total_amount, expires_at } }

5) Vartotojo srautas:
   objektų sąrašas -> objekto puslapis su užimtomis datomis kalendoriuje ->
   datų ir svečių pasirinkimas -> /quote -> kontaktų forma su banko pasirinkimu ->
   /bookings -> padėkos puslapis su rezervacijos numeriu, suma ir pavedimo rekvizitais.

6) Klaidos grąžinamos kaip { error: { code, message } }:
   401 unauthorized, 403 forbidden_origin, 404 not_found,
   409 dates_unavailable, 429 rate_limited, 400 bad_request / too_many_guests.
   Vartotojui rodyk draugiškas lietuviškas žinutes, ne API tekstą.

7) Taisyklės: date_to visada vėlesnė už date_from; datų formatas YYYY-MM-DD;
   valiuta EUR; jokių kainų skaičiavimų naršyklės pusėje.
```

## Techninės pastabos

- Šiame (core) projekte kodo keisti nereikia — viešas API sluoksnis jau veikia.
- CORS tikrinamas pagal rakto „Leidžiami domenai" lauką, todėl PROD ir DEV turi turėti atskirus raktus.
- Vienas raktas veikia abiejose aplinkose, tačiau atskiri raktai leidžia bet kada išjungti tik testinę prieigą.