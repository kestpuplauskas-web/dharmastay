import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { listAllCarsForAdmin, replaceCarImages } from "@/lib/cars.functions";
import { uploadOptimizedToStorage, extractCarImagesPath } from "@/lib/image-optimize";

export const Route = createFileRoute("/_authenticated/admin/tools/migrate-images")({
  component: MigratePage,
});

type CarRow = {
  id: string;
  name: string;
  cover: string;
  images: string[];
};

type Status = "idle" | "loading" | "running" | "done" | "error";

type PerCar = {
  id: string;
  name: string;
  before: number;
  after: number;
  status: "pending" | "processing" | "done" | "error" | "skipped";
  error?: string;
};

function isCarImagesUrl(u: string) {
  return extractCarImagesPath(u) !== null;
}

async function fetchAsBlob(url: string): Promise<Blob> {
  const normalized = url.replace(
    /^https:\/\/www\.dropbox\.com\/(scl\/|s\/)/,
    "https://dl.dropboxusercontent.com/$1",
  );
  const finalUrl = /dropbox\.com/.test(normalized)
    ? normalized.replace(/([?&])dl=0(&|$)/, "$1raw=1$2").replace(/dl=0$/, "raw=1")
    : normalized;
  const res = await fetch(finalUrl, { mode: "cors" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.blob();
}

function MigratePage() {
  const loadCars = useServerFn(listAllCarsForAdmin);
  const saveCar = useServerFn(replaceCarImages);
  const [status, setStatus] = useState<Status>("idle");
  const [cars, setCars] = useState<CarRow[]>([]);
  const [progress, setProgress] = useState<PerCar[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const totals = useMemo(() => {
    const done = progress.filter((p) => p.status === "done").length;
    const errors = progress.filter((p) => p.status === "error").length;
    const skipped = progress.filter((p) => p.status === "skipped").length;
    return { done, errors, skipped, total: progress.length };
  }, [progress]);

  async function load() {
    setStatus("loading");
    setGlobalError(null);
    try {
      const rows = await loadCars();
      setCars(rows);
      setProgress(
        rows.map((c) => ({
          id: c.id,
          name: c.name,
          before: c.images.length,
          after: 0,
          status: "pending",
        })),
      );
      setStatus("idle");
    } catch (e) {
      setGlobalError(e instanceof Error ? e.message : "Klaida");
      setStatus("error");
    }
  }

  function updateItem(id: string, patch: Partial<PerCar>) {
    setProgress((p) => p.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  async function run() {
    setStatus("running");
    setGlobalError(null);
    for (const car of cars) {
      // skip already migrated
      const alreadyMigrated =
        car.images.length > 0 && car.images.every(isCarImagesUrl);
      if (alreadyMigrated) {
        updateItem(car.id, { status: "skipped", after: car.images.length });
        continue;
      }
      updateItem(car.id, { status: "processing" });
      try {
        const newUrls: string[] = [];
        for (const url of car.images) {
          if (isCarImagesUrl(url)) {
            newUrls.push(url);
            continue;
          }
          try {
            const blob = await fetchAsBlob(url);
            const uploaded = await uploadOptimizedToStorage(blob, car.id);
            newUrls.push(uploaded.url);
          } catch (e) {
            // swallow individual failures — keep original so we can retry later
            console.warn("Nepavyko konvertuoti nuotraukos", url, e);
          }
        }
        if (newUrls.length === 0) {
          throw new Error("Nė vienos nuotraukos nepavyko atsisiųsti");
        }
        // pick new cover: match original cover position if possible
        const originalIdx = car.images.findIndex((u) => u === car.cover);
        const newCover =
          originalIdx >= 0 && newUrls[originalIdx] ? newUrls[originalIdx] : newUrls[0];
        await saveCar({ data: { id: car.id, cover: newCover, images: newUrls } });
        updateItem(car.id, { status: "done", after: newUrls.length });
      } catch (e) {
        updateItem(car.id, {
          status: "error",
          error: e instanceof Error ? e.message : "Klaida",
        });
      }
    }
    setStatus("done");
  }

  const pct = totals.total
    ? Math.round(((totals.done + totals.errors + totals.skipped) / totals.total) * 100)
    : 0;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nuotraukų migracija į Storage</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Vienkartinis įrankis. Perkelia visų automobilių Dropbox nuotraukas į naują
          Storage bucket'ą (WebP, max 1200px, ~200 KB). Po sėkmingos migracijos šis
          puslapis ir Dropbox palaikymas bus pašalinti.
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          {status === "idle" && cars.length === 0 && (
            <Button onClick={load}>1. Užkrauti automobilių sąrašą</Button>
          )}
          {status === "loading" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Kraunama…
            </div>
          )}
          {cars.length > 0 && status !== "loading" && (
            <>
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  Automobilių: <b>{cars.length}</b>
                  {" · "}Baigta: <b>{totals.done}</b>
                  {" · "}Praleista: <b>{totals.skipped}</b>
                  {" · "}Klaidų: <b className="text-destructive">{totals.errors}</b>
                </div>
                <Button
                  onClick={run}
                  disabled={status === "running"}
                >
                  {status === "running" ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Vykdoma…
                    </>
                  ) : status === "done" ? (
                    "Pakartoti"
                  ) : (
                    "2. Paleisti migraciją"
                  )}
                </Button>
              </div>
              <Progress value={pct} />
              <ul className="space-y-1 text-sm">
                {progress.map((p) => (
                  <li key={p.id} className="flex items-center gap-2">
                    {p.status === "done" && (
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    )}
                    {p.status === "skipped" && (
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    {p.status === "error" && (
                      <XCircle className="h-4 w-4 text-destructive shrink-0" />
                    )}
                    {p.status === "processing" && (
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    )}
                    {p.status === "pending" && (
                      <span className="inline-block h-4 w-4 rounded-full border shrink-0" />
                    )}
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {p.before} → {p.after}
                    </span>
                    {p.error && (
                      <span className="text-xs text-destructive truncate max-w-[200px]">
                        {p.error}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
          {globalError && (
            <div className="text-sm text-destructive">{globalError}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
