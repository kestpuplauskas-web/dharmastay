## Tikslas
Pakeisti statinius „Lovų / Miegamųjų / Svetainių" laukus dinamine kambarių konfigūracijos sekcija objekto formoje.

## Pakeitimai

### 1. `src/lib/properties.ts`
Pridėti tipus ir konstantas:
```ts
export const ROOM_KINDS = [
  { value: "bedroom_1", label: "Miegamasis 1" },
  { value: "bedroom_2", label: "Miegamasis 2" },
  { value: "bedroom_3", label: "Miegamasis 3" },
  { value: "bedroom_4", label: "Miegamasis 4" },
  { value: "living_room", label: "Svetainė" },
] as const;

export const BED_TYPES = [
  { value: "extra_large_double", label: "Labai didelė dvigulė lova" },
  { value: "large_double", label: "Didelė dvigulė lova" },
  { value: "double", label: "Standartinė dvigulė lova" },
  { value: "single", label: "Vienvietė lova" },
  { value: "sofa_bed", label: "Miegamoji sofa" },
] as const;

export type RoomConfig = { kind: string; beds: number; bedType: string };
```
Papildyti `Rooms` tipą su `configs?: RoomConfig[]` (nekeičiant esamų laukų — atgalinis suderinamumas).

### 2. `src/components/admin/PropertyForm.tsx`
- Pašalinti input laukus: „Lovų", „Miegamųjų", „Svetainių". Palikti: Plotas m², Max svečių, Vonių.
- Pridėti naują sekciją „Miegojimo vietos / Kambariai":
  - Grid lentelė su stulpeliais: Kambario tipas (select), Lovų sk. (number, min 1), Lovos tipas (select), Trinti (mygtukas su ikona).
  - „+ Pridėti kambarį" mygtukas apačioje.
  - Rodyti bendrą „Iš viso lovų: N" (automatiškai sumuojama).
- Redaguojant esamą objektą: jei `rooms.configs` egzistuoja — užpildyti eilutes iš jo; jei ne, palikti tuščią sąrašą.
- Saugant: `beds` laukas automatiškai = suma iš configs; `rooms.configs` išsaugoma; `bedrooms`/`living_rooms` skaičiuojami iš configs (bedroom_* / living_room) kad išliktų suderinamumas su esamu UI, kuris tuos laukus rodo.

### 3. `src/lib/properties.functions.ts`
Papildyti `propertyInputSchema.rooms` su:
```ts
configs: z.array(z.object({
  kind: z.string(),
  beds: z.number().int().min(1).max(20),
  bedType: z.string(),
})).max(20).optional()
```

## Nepakeičiama
- DB schema (viskas telpa esamame `rooms` JSONB).
- Public UI (properties detail puslapis).
- Kiti laukai formoje.
