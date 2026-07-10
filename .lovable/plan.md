## Problema

Kai bandai atidaryti `/admin`, `_authenticated` layout'as (integracijos valdomas) neranda sesijos ir peradresuoja į `/auth`. Bet projekte prisijungimo puslapis yra `/login`, ne `/auth` — todėl gaunasi „page not found".

Įrodymas: `src/routes/_authenticated/route.tsx` turi `const SIGN_IN_ROUTE = '/auth'`, o `src/routes/` yra tik `login.tsx`, jokio `auth.tsx`.

## Sprendimas

Pervadinti prisijungimo maršrutą į `/auth`, kaip numato Lovable Supabase integracija (kad ateityje viskas — OAuth callback, sesijos hydration, auto-atjungimo redirect'ai — veiktų iš karto).

Konkrečiai:

1. **Pervadinti `src/routes/login.tsx` → `src/routes/auth.tsx`** ir viduje `createFileRoute("/login")` → `createFileRoute("/auth")`. Turinys (formos, `signInWithPassword`, `signUp`, „pamiršau slaptažodį") lieka toks pat.
2. **Atnaujinti visas `to: "/login"` / `<Link to="/login">` nuorodas** projekte į `/auth` (patikrinsiu su `rg`, pataisysiu — tikėtinai `SiteHeader.tsx`, `admin.tsx` „Atsijungti" mygtukas, `reset-password.tsx` grįžimo nuoroda, kt.).
3. **Nekeisti** `_authenticated/route.tsx` (jis integracijos valdomas ir jau nukreiptas į `/auth`).

Alternatyva — palikti `/login` ir pakeisti `SIGN_IN_ROUTE` į `/login` — atmestina: integracija tą failą regeneruoja, jei ištrinamas, ir OAuth flow tikisi būtent `/auth`.

## Rezultatas

Atveriant `/admin` be sesijos — patenka į `/auth` su prisijungimo forma. Po sėkmingo prisijungimo (`onAuthStateChange` `login.tsx` viduje) — automatiškai peradresuoja į `/admin`.
