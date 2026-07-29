## Tikslas
Atnaujinti `/admin/properties` sąrašo puslapį su moderniu UI: dvigubas režimas (Kortelės/Lentelė), paieška, filtrai, rūšiavimas, geresnės kortelės ir lentelė su ikonų veiksmais.

## Failai

**Modifikuoti** `src/routes/_authenticated/admin.properties.index.tsx` — pilnas perrašymas su naujais komponentais.

**Naudoti esamus komponentus** iš shadcn (`@/components/ui/`): `card`, `badge`, `button`, `input`, `select`, `dropdown-menu`, `alert-dialog`, `table`. Jei kurio nėra, importuosime iš lucide-react ikonoms (`Search`, `Pencil`, `Trash2`, `MoreVertical`, `Users`, `BedDouble`, `Ruler`, `LayoutGrid`, `List`, `Copy`).

## Struktūra

### Viršutinė juosta (Toolbar)
- Kairė: pavadinimas „Objektai" + objektų skaičius (pvz. „12 objektų").
- Dešinė: `+ Naujas objektas` mygtukas.
- Antra eilutė (responsive `flex flex-wrap gap-2`):
  - `Input` su `Search` ikona — paieška pagal `name` arba `city` (case‑insensitive).
  - `Select` — Tipas (visi + `PROPERTY_TYPES`).
  - `Select` — Būsena (visi / aktyvus / neaktyvus).
  - `Select` — Rūšiuoti pagal (pavadinimas A‑Z, kaina ↑, kaina ↓, naujausi — pagal `sortOrder` arba id).
  - `ToggleGroup` arba dviejų mygtukų grupė (`LayoutGrid` / `List` ikonos) — vaizdo perjungimas. Default: `grid`. Būsena saugoma `localStorage` (`admin-properties-view`).

### Grid vaizdas (default)
`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`. Kiekvienas objektas — `Card`:
- Viršuje `aspect-[4/3]` nuotrauka (`p.image` arba fallback: pilkas `div` su `ImageOff` ikona).
- `Badge` viršutiniame kairiajame kampe: žalia „Aktyvus" arba pilka „Neaktyvus".
- Turinys:
  - Pavadinimas (`font-semibold`, `truncate`).
  - `text-xs text-muted-foreground`: `propertyTypeLabel(propertyType) • city`.
  - Trys ikonos su skaičiais: `Users` (maxGuests), `BedDouble` (beds), `Ruler` (areaM2 m²) — praleisti jei nėra reikšmės.
  - Kaina: `text-lg font-bold` — `X € / naktis`.
- Footer: `Redaguoti` mygtukas (`Button variant="secondary"` su `Pencil`) + `DropdownMenu` (`MoreVertical`) su: „Kopijuoti nuorodą" (kopijuoja `window.location.origin + /properties/<id>` per `navigator.clipboard`), „Šalinti" (raudona, atidaro `AlertDialog`).

### Table vaizdas
`Table` iš shadcn su stulpeliais:
1. Objektas — thumb (`h-10 w-10 rounded-md object-cover` + fallback) + pavadinimas.
2. Tipas — `propertyTypeLabel`.
3. Miestas.
4. Talpa — `<Users/> N` ir `<BedDouble/> N` inline.
5. Kaina/naktis — dešinėje lygiuota.
6. Būsena — `Badge`.
7. Veiksmai — `Button variant="ghost" size="icon"` su `Pencil` (Link į edit) ir `Trash2` (`AlertDialog` patvirtinimas).

### Šalinimo dialogas
Vienas bendras `AlertDialog` valdomas `useState<{id, name} | null>`; patvirtinus — `del.mutate(id)`. Naudojamas iš abiejų vaizdų. Pakeičia esamą `confirm()`.

### Tuščios būsenos
- Nėra objektų iš viso: centruota kortelė su tekstu ir „+ Naujas objektas" CTA.
- Yra objektų, bet filtrai neatitiko: „Nerasta objektų pagal filtrus" + mygtukas „Išvalyti filtrus".

## Techninės pastabos
- Filtravimas ir rūšiavimas — kliento pusėje per `useMemo`. Duomenų srautas (`useServerFn`/`useQuery`) nekeičiamas.
- Pilna responsive adaptacija: `grid-cols-1` mobile → `4` desktop; toolbar `flex-wrap`; lentelė turi `overflow-x-auto` wrapper mobile.
- Naudoti semantinius tokens (`bg-card`, `text-muted-foreground`, `border`) — jokių hardkodintų spalvų.
- Jokių backend/serverio keitimų.
