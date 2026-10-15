/**
 * Visų Dharma Stay objektų vietos – naudojama žemėlapyje (pagrindinis puslapis
 * ir kontaktų puslapis) bei adresų sąrašui. Koordinatės [ilgis, plotis].
 */
export type StayLocation = {
  id: string;
  /** Trumpa etiketė, rodoma žemėlapyje. */
  label: string;
  /** Pilnas adresas – naudojama ištikimybės (aria-label) pranešimui. */
  address: string;
  coords: [number, number];
};

export const stayLocations: StayLocation[] = [
  {
    id: "birutes-1",
    label: "Birutės g. 1",
    address: "Birutės g. 1, Telšiai",
    coords: [22.2489937, 55.9836747],
  },
  {
    id: "grazinos-1",
    label: "Gražinos g. 1",
    address: "Gražinos g. 1, Telšiai",
    coords: [22.2648184, 55.9717143],
  },
  {
    id: "laisves-10",
    label: "Laisvės g. 10",
    address: "Laisvės g. 10, Telšiai",
    coords: [22.2527655, 55.9849441],
  },
  {
    id: "turgaus-17",
    label: "Turgaus a. 17-2",
    address: "Turgaus a. 17-2, Telšiai",
    coords: [22.2521882, 55.9838554],
  },
  {
    id: "turgaus-24",
    label: "Turgaus a. 24/1",
    address: "Turgaus a. 24/1, Telšiai",
    coords: [22.2531389, 55.9833374],
  },
];

/** Žemėlapio centras – visų objektų vidurkis. */
export const mapCenter: [number, number] = [
  stayLocations.reduce((sum, l) => sum + l.coords[0], 0) / stayLocations.length,
  stayLocations.reduce((sum, l) => sum + l.coords[1], 0) / stayLocations.length,
];
