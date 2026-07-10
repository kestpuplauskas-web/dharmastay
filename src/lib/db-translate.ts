// Translation helper for DB-stored user-facing values (LT -> EN).
// Falls back to the raw value when no mapping is found.

const MAP: Record<string, string> = {
  // Categories
  "Ekonominė klasė": "Economy class",
  "Vidutinė klasė": "Mid-size class",
  "Verslo klasė": "Business class",
  "Premium klasė": "Premium class",
  "SUV / visureigis": "SUV",
  "Visureigis": "SUV",
  "Mikroautobusas": "Minivan",
  // Fuel
  "Dyzelinas": "Diesel",
  "Benzinas": "Petrol",
  "Hibridas": "Hybrid",
  "Elektra": "Electric",
  "Dujos": "LPG",
  // Transmission
  "Automatinė": "Automatic",
  "Mechaninė": "Manual",
  // Feature groups
  "Komfortas": "Comfort",
  "Saugumas": "Safety",
  "Multimedija": "Multimedia",
  "Komplektacija": "Equipment",
  // Feature items (defaults + common variants)
  "Oro kondicionierius (climate control)": "Air conditioning (climate control)",
  "Dviejų zonų klimato kontrolė": "Dual-zone climate control",
  "Odinis salonas": "Leather interior",
  "Šildomos priekinės sėdynės": "Heated front seats",
  "Elektra valdomi langai": "Electric windows",
  "Erdvi bagažinė": "Spacious trunk",
  "Centrinis užraktas su distanciniu valdymu": "Central locking with remote",
  "Apsauga nuo saulės": "Sun protection",
  "ABS, ESP, ASR sistemos": "ABS, ESP, ASR systems",
  "ABS, ESP ir traukos kontrolė": "ABS, ESP and traction control",
  "Vairuotojo, keleivio ir šoninės oro pagalvės": "Driver, passenger and side airbags",
  "Priekinės ir šoninės oro pagalvės": "Front and side airbags",
  "ISOFIX vaikiškos kėdutės tvirtinimas": "ISOFIX child seat mounts",
  "Atstumo iki kliūties jutikliai": "Parking distance sensors",
  "Parkavimo jutikliai": "Parking sensors",
  "Galinio vaizdo kamera": "Rear-view camera",
  "Bluetooth laisvų rankų įranga": "Bluetooth hands-free",
  "USB / AUX įvestys": "USB / AUX inputs",
  "USB / AUX jungtys": "USB / AUX ports",
  "Apple CarPlay / Android Auto": "Apple CarPlay / Android Auto",
  "Navigacija": "Navigation",
  "Daugiafunkcis vairas": "Multifunction steering wheel",
  "Žieminės padangos (sezono metu)": "Winter tires (in season)",
  "Atsarginis ratas / remonto rinkinys": "Spare wheel / repair kit",
  "Pirmosios pagalbos vaistinėlė ir gesintuvas": "First aid kit and fire extinguisher",
  "Pirmosios pagalbos rinkinys, gesintuvas ir avarinis trikampis":
    "First aid kit, fire extinguisher and warning triangle",
  "Atšvaitinė liemenė ir avarinis trikampis": "Reflective vest and warning triangle",
  "Automatinė pavarų dėžė": "Automatic transmission",
  "Mechaninė pavarų dėžė": "Manual transmission",
  "Lengvojo lydinio ratlankiai": "Alloy wheels",
};

function translateTierLabel(v: string): string | null {
  let m = v.match(/^(\d+)\s*diena$/i);
  if (m) return `${m[1]} day`;
  m = v.match(/^(\d+)\s*(?:[-–]\s*(\d+))?\s*(?:dienos|dienų|d\.)$/i);
  if (m) return m[2] ? `${m[1]}–${m[2]} days` : `${m[1]} days`;
  m = v.match(/^Ilgalaikė nuoma\s+(\d+)\s*[-–]\s*(\d+)\s*dien(?:os|ų)?$/i);
  if (m) return `Long-term ${m[1]}–${m[2]} days`;
  m = v.match(/^Ilgalaikė nuoma\s+(\d+)\+\s*dien(?:os|ų)?$/i);
  if (m) return `Long-term ${m[1]}+ days`;
  return null;
}

function translateMileage(v: string): string | null {
  const m = v.match(/^(\d+)\s*km\s+per\s+dien(?:a|ą)$/i);
  if (m) return `${m[1]} km per day`;
  return null;
}

export function trDb(value: string | undefined | null, lang: string | undefined): string {
  if (!value) return "";
  if (!lang?.startsWith("en")) return value;
  const key = value.trim();
  if (MAP[key]) return MAP[key];
  return translateTierLabel(key) ?? translateMileage(key) ?? value;
}
