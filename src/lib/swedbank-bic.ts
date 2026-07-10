// Swedbank E-commerce Payment Initiation V3 palaikomos finansų įstaigos (LT/LV/EE).
// Šaltinis: https://pi.swedbank.com/developer (finansų įstaigų sąrašas).
export type SwedbankBank = {
  bic: string;
  name: string;
  country: "LT" | "LV" | "EE";
};

export const SWEDBANK_BANKS: SwedbankBank[] = [
  // Lietuva
  { bic: "HABALT22", name: "Swedbank AB", country: "LT" },
  { bic: "CBVILT2X", name: "SEB bankas AB", country: "LT" },
  { bic: "AGBLLT2X", name: "Luminor Bank AS", country: "LT" },
  { bic: "RETBLT21", name: "Revolut Bank UAB", country: "LT" },
  { bic: "INDULT2X", name: "Citadele bankas AB", country: "LT" },
  { bic: "CBSBLT26", name: "AB Artea bankas", country: "LT" },
  { bic: "MDBALT22", name: "Urbo bankas UAB", country: "LT" },
  // Latvija
  { bic: "HABALV22", name: "Swedbank AS", country: "LV" },
  { bic: "UNLALV2X", name: "SEB banka AS", country: "LV" },
  { bic: "RIKOLV2X", name: "Luminor Bank AS", country: "LV" },
  { bic: "PARXLV22", name: "Citadele banka AS", country: "LV" },
  // Estija
  { bic: "HABAEE2X", name: "Swedbank AS", country: "EE" },
  { bic: "EEUHEE2X", name: "SEB Pank AS", country: "EE" },
  { bic: "RIKOEE22", name: "Luminor Bank AS", country: "EE" },
  { bic: "LHVBEE22", name: "LHV Pank AS", country: "EE" },
  { bic: "EKRDEE22", name: "Coop Pank AS", country: "EE" },
  { bic: "PARXEE22", name: "Citadele banka AS Estijos filialas", country: "EE" },
];

export function findBank(bic: string): SwedbankBank | undefined {
  return SWEDBANK_BANKS.find((b) => b.bic === bic);
}
