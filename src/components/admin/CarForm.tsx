import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Plus } from "lucide-react";
import { ImageUploader } from "./ImageUploader";
import { tiersFromBase, DEFAULT_FEATURES, type FeatureGroup, type PriceTier } from "@/lib/cars";

export type CarFormValue = {
  name: string;
  category: string;
  year: number;
  transmission: string;
  seats: number;
  fuel: string;
  consumption: string;
  mileagePolicy: string;
  pricePerDay: number;
  coverImageUrl: string;
  imageUrls: string[];
  features: FeatureGroup[];
  priceTiers: PriceTier[];
  isActive: boolean;
  sortOrder: number;
};

export const emptyCar: CarFormValue = {
  name: "",
  category: "",
  year: new Date().getFullYear(),
  transmission: "Automatinė",
  seats: 5,
  fuel: "Benzinas",
  consumption: "",
  mileagePolicy: "Neribotas",
  pricePerDay: 50,
  coverImageUrl: "",
  imageUrls: [],
  features: DEFAULT_FEATURES,
  priceTiers: tiersFromBase(50),
  isActive: true,
  sortOrder: 100,
};

type Props = {
  initial: CarFormValue;
  onSubmit: (value: CarFormValue) => Promise<void> | void;
  submitting?: boolean;
  submitLabel?: string;
  /** Storage aplankas — automobilio ID, arba „new" kuriant naują. */
  folder?: string;
};

export function CarForm({ initial, onSubmit, submitting, submitLabel = "Išsaugoti", folder = "new" }: Props) {
  const [v, setV] = useState<CarFormValue>(initial);

  const update = <K extends keyof CarFormValue>(k: K, val: CarFormValue[K]) =>
    setV((s) => ({ ...s, [k]: val }));

  const regenerateTiers = () => update("priceTiers", tiersFromBase(v.pricePerDay));

  const addFeatureGroup = () =>
    update("features", [...v.features, { title: "Nauja grupė", items: [] }]);
  const removeFeatureGroup = (i: number) =>
    update(
      "features",
      v.features.filter((_, idx) => idx !== i),
    );
  const setGroupTitle = (i: number, title: string) =>
    update(
      "features",
      v.features.map((g, idx) => (idx === i ? { ...g, title } : g)),
    );
  const setGroupItems = (i: number, items: string[]) =>
    update(
      "features",
      v.features.map((g, idx) => (idx === i ? { ...g, items } : g)),
    );

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(v);
      }}
    >
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="font-semibold text-lg">Pagrindiniai duomenys</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Labeled label="Pavadinimas">
              <Input value={v.name} onChange={(e) => update("name", e.target.value)} required />
            </Labeled>
            <Labeled label="Kategorija">
              <Input value={v.category} onChange={(e) => update("category", e.target.value)} required />
            </Labeled>
            <Labeled label="Metai">
              <Input
                type="number"
                value={v.year}
                onChange={(e) => update("year", parseInt(e.target.value) || 0)}
              />
            </Labeled>
            <Labeled label="Pavarų dėžė">
              <Input value={v.transmission} onChange={(e) => update("transmission", e.target.value)} />
            </Labeled>
            <Labeled label="Sėdimos vietos">
              <Input
                type="number"
                value={v.seats}
                onChange={(e) => update("seats", parseInt(e.target.value) || 0)}
              />
            </Labeled>
            <Labeled label="Kuras">
              <Input value={v.fuel} onChange={(e) => update("fuel", e.target.value)} />
            </Labeled>
            <Labeled label="Suvartojimas">
              <Input
                value={v.consumption}
                onChange={(e) => update("consumption", e.target.value)}
                placeholder="5.4 l/100km"
              />
            </Labeled>
            <Labeled label="Ridos politika">
              <Input
                value={v.mileagePolicy}
                onChange={(e) => update("mileagePolicy", e.target.value)}
              />
            </Labeled>
            <Labeled label="Bazinė kaina (€/d.)">
              <Input
                type="number"
                step="0.01"
                value={v.pricePerDay}
                onChange={(e) => update("pricePerDay", parseFloat(e.target.value) || 0)}
              />
            </Labeled>
            <Labeled label="Rūšiavimo eilė (mažiau = aukščiau)">
              <Input
                type="number"
                value={v.sortOrder}
                onChange={(e) => update("sortOrder", parseInt(e.target.value) || 0)}
              />
            </Labeled>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Switch
              id="is-active"
              checked={v.isActive}
              onCheckedChange={(b) => update("isActive", b)}
            />
            <Label htmlFor="is-active">Rodyti svetainėje</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <ImageUploader
            cover={v.coverImageUrl}
            images={v.imageUrls}
            folder={folder}
            onChange={({ cover, images }: { cover: string; images: string[] }) =>
              setV((s) => ({ ...s, coverImageUrl: cover, imageUrls: images }))
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Kainų lygiai</h2>
            <Button type="button" variant="outline" size="sm" onClick={regenerateTiers}>
              Generuoti iš bazinės kainos
            </Button>
          </div>
          <div className="space-y-2">
            {v.priceTiers.map((t, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <Input
                  className="col-span-5"
                  value={t.label}
                  onChange={(e) => {
                    const next = v.priceTiers.slice();
                    next[i] = { ...t, label: e.target.value };
                    update("priceTiers", next);
                  }}
                />
                <Input
                  className="col-span-2"
                  type="number"
                  value={t.minDays}
                  onChange={(e) => {
                    const next = v.priceTiers.slice();
                    next[i] = { ...t, minDays: parseInt(e.target.value) || 0 };
                    update("priceTiers", next);
                  }}
                />
                <Input
                  className="col-span-2"
                  type="number"
                  value={t.maxDays}
                  onChange={(e) => {
                    const next = v.priceTiers.slice();
                    next[i] = { ...t, maxDays: parseInt(e.target.value) || 0 };
                    update("priceTiers", next);
                  }}
                />
                <Input
                  className="col-span-2"
                  type="number"
                  step="0.01"
                  value={t.pricePerDay}
                  onChange={(e) => {
                    const next = v.priceTiers.slice();
                    next[i] = { ...t, pricePerDay: parseFloat(e.target.value) || 0 };
                    update("priceTiers", next);
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="col-span-1"
                  onClick={() => update("priceTiers", v.priceTiers.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Savybės</h2>
            <Button type="button" variant="outline" size="sm" onClick={addFeatureGroup}>
              <Plus className="h-4 w-4 mr-1" /> Pridėti grupę
            </Button>
          </div>
          {v.features.map((g, i) => (
            <div key={i} className="border rounded-lg p-4 space-y-3">
              <div className="flex gap-2">
                <Input
                  value={g.title}
                  onChange={(e) => setGroupTitle(i, e.target.value)}
                  placeholder="Grupės pavadinimas"
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeFeatureGroup(i)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                rows={Math.max(3, g.items.length + 1)}
                value={g.items.join("\n")}
                onChange={(e) => setGroupItems(i, e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
                placeholder="Po vieną elementą eilutėje"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2 sticky bottom-4 bg-background/80 backdrop-blur p-3 rounded-xl border">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saugoma..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}
