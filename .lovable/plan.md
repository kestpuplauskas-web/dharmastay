## Tikslas
Objekto formos nuotraukų galerijoje įgalinti drag-and-drop pertvarkymą. Pirmoji nuotrauka (index 0) visada = viršelis. Viešame puslapyje nuotraukos jau rodomos pagal `images` masyvo eiliškumą, todėl užteks išsaugoti tą eiliškumą DB.

## Pakeitimai

### 1. `src/components/admin/ImageUploader.tsx`
- Pridėti `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (per `bun add`).
- Apvynioti tinklelį į `DndContext` + `SortableContext` (`rectSortingStrategy`).
- Kiekvieną nuotraukos kortelę iškelti į `SortableImage` komponentą su `useSortable` (drag handle = visa kortelė, `cursor-grab`/`grabbing`, švelnus `transform` + `transition`).
- Ant tempimo — drop indikatorius: aktyvi kortelė `opacity-50 ring-2 ring-primary`, kitos slenkasi natūraliai per `@dnd-kit` animaciją.
- `onDragEnd`: `arrayMove(images, oldIndex, newIndex)`, tuomet `onChange({ cover: next[0], images: next })`.
- Semantikos pakeitimas: **viršelis visada = `images[0]`**. Pašalinti „Star / StarOff" mygtukus; „VIRŠELIS" badge rodomas tik ant pirmos kortelės. Rodyklių mygtukai (`←`/`→`) tampa nebereikalingi — pašalinti (drag-and-drop juos pakeičia).
- Įkeliant naujas nuotraukas: pridedamos į galą; jei masyvas buvo tuščias — pirmoji tampa viršeliu automatiškai (kaip ir dabar).
- Trinant `images[0]` — naujas viršelis = naujas `images[0]`.
- Mobile: `PointerSensor` su `activationConstraint: { distance: 6 }`, kad scroll neblokuotų.

### 2. `src/components/admin/PropertyForm.tsx`
- Jokių pokyčių logikoje — `ImageUploader` grąžina `{ cover, images }`, kur `cover === images[0]`. Išsaugojimas per esamą „Išsaugoti" mygtuką (jau eina į `updateProperty` / `createProperty`).

### 3. Viešas puslapis
- `src/routes/properties.$id.tsx` jau naudoja `property.image` (cover) + `property.images.slice(1, 7)` — su nauja semantika `image === images[0]`, todėl eiliškumas atitiks admin nustatymą be papildomų pakeitimų. Patikrinti, kad `slice(1, 7)` naudoja tą patį `images` masyvą (taip).
- `src/routes/index.tsx` ir `src/routes/offers.tsx` naudoja `property.image` kortelėse — irgi atitinka.

### 4. Duomenų sluoksnis
- Jokių DB migracijų — `image_urls` (jsonb) jau saugo tvarkingą masyvą, `cover_image_url` bus lygus `image_urls[0]`.

## Ne apimtyje
- Auto-save po kiekvieno vilkimo (reikalavimas leidžia „arba" — pasirenkame išsaugojimą per „Išsaugoti" mygtuką, kad atitiktų esamą formos elgesį ir nesukurtų papildomų tinklo užklausų).
