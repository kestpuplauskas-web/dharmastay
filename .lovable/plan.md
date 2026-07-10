## Problema

`src/components/admin/ImageUploader.tsx` visos nuotraukos keliamos lygiagrečiai, bet kiekvienas `uploadOne` iškvietimas „užšąla" prie tos pačios pradinės `images` reikšmės (React closure). Todėl visi lygiagretūs skambučiai iškviečia `onChange({ images: [...[], newUrl] })` ir vienas kitą perrašo — galiausiai lieka tik paskutinė nuotrauka (arba pirma, priklausomai nuo tvarkos).

## Sprendimas

1. **Naudoti `useRef` naujausiam `{ cover, images }` snapshot'ui.** Kiekvieną `uploadOne` iškvietimą po sėkmingo `uploadOptimizedToStorage` skaityti iš ref'o, o ne iš uždarytos props reikšmės, tada kviesti `onChange` su tikruoju naujausiu sąrašu. Ref sinchronizuojamas per `useEffect` kiekvieną kartą pasikeitus props.

2. **Riboti iki 5 nuotraukų.**
   - `handleFiles` viršuje skaičiuoti likusią vietą: `remaining = 5 - images.length - pending.length`.
   - Jei `remaining <= 0` — parodyti toast „Maksimaliai 5 nuotraukos" ir nutraukti.
   - Jei pasirinkta daugiau nei `remaining` — apkarpyti masyvą ir informuoti toast'u.
   - `<input>` atributą palikti `multiple`, bet komentaru pažymėti limitą.
   - Drop zone tekste pridėti „iki 5 nuotraukų" užuominą.

3. **Neblokuoti UI kai limitas pasiektas** — drop zonai pridėti `disabled` būseną (papilkinta, `pointer-events-none`), kai `images.length + pending.length >= 5`.

## Techninės detalės

Keičiamas tik `src/components/admin/ImageUploader.tsx`. Jokių DB, Storage ar kitų komponentų pakeitimų nereikia — problema grynai kliento pusėje esančiame state valdyme.

Panašus fix'as ir `remove` operacijai (kad ji taip pat imtų iš ref'o, jei vartotojas tuo pat metu trina), tačiau šis scenarijus mažiau tikėtinas — paliksime esamą elgesį.
