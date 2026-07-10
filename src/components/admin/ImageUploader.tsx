import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, X, Star, StarOff, Loader2, AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { uploadOptimizedToStorage, removeFromStorage } from "@/lib/image-optimize";

type Props = {
  cover: string;
  images: string[];
  onChange: (next: { cover: string; images: string[] }) => void;
  /** Aplankas Storage bucket'e — pvz. automobilio ID arba „new". */
  folder?: string;
};

type PendingItem = {
  id: string;
  name: string;
  status: "processing" | "uploading" | "error";
  error?: string;
  file: File;
};

const ACCEPT = "image/jpeg,image/jpg,image/png,image/webp";
const MAX_IMAGES = 5;

export function ImageUploader({ cover, images, onChange, folder = "new" }: Props) {
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Naujausias snapshot'as, kad lygiagretūs uploadai neperrašytų vienas kito.
  const stateRef = useRef({ cover, images });
  useEffect(() => {
    stateRef.current = { cover, images };
  }, [cover, images]);

  const uploadOne = useCallback(
    async (file: File, id: string) => {
      setPending((p) =>
        p.map((it) => (it.id === id ? { ...it, status: "processing" } : it)),
      );
      try {
        setPending((p) =>
          p.map((it) => (it.id === id ? { ...it, status: "uploading" } : it)),
        );
        const res = await uploadOptimizedToStorage(file, folder);
        const current = stateRef.current;
        const nextImages = [...current.images, res.url];
        const nextCover = current.cover || res.url;
        stateRef.current = { cover: nextCover, images: nextImages };
        onChange({ cover: nextCover, images: nextImages });
        setPending((p) => p.filter((it) => it.id !== id));
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Nepavyko įkelti";
        setPending((p) =>
          p.map((it) => (it.id === id ? { ...it, status: "error", error: msg } : it)),
        );
        toast.error(`${file.name}: ${msg}`);
      }
    },
    [onChange, folder],
  );

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (arr.length === 0) {
        toast.error("Palaikomi tik nuotraukų failai (JPG, PNG, WebP)");
        return;
      }
      const current = stateRef.current;
      const used = current.images.length + pending.filter((p) => p.status !== "error").length;
      const remaining = MAX_IMAGES - used;
      if (remaining <= 0) {
        toast.error(`Maksimaliai ${MAX_IMAGES} nuotraukos`);
        return;
      }
      let toUpload = arr;
      if (arr.length > remaining) {
        toUpload = arr.slice(0, remaining);
        toast.warning(`Įkeltos tik pirmos ${remaining} nuotraukos (max ${MAX_IMAGES})`);
      }
      const items: PendingItem[] = toUpload.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        status: "processing" as const,
        file,
      }));
      setPending((p) => [...p, ...items]);
      items.forEach((it) => void uploadOne(it.file, it.id));
    },
    [uploadOne, pending],
  );


  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  const retry = (id: string) => {
    const item = pending.find((p) => p.id === id);
    if (!item) return;
    void uploadOne(item.file, id);
  };

  const remove = async (idx: number) => {
    const url = images[idx];
    const next = images.filter((_, i) => i !== idx);
    const wasCover = url === cover;
    onChange({ cover: wasCover ? next[0] ?? "" : cover, images: next });
    try {
      await removeFromStorage(url);
    } catch {
      // silent — DB atskyrimas jau įvyko
    }
  };

  const setCover = (url: string) => onChange({ cover: url, images });

  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= images.length) return;
    const next = images.slice();
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange({ cover, images: next });
  };

  const atLimit = images.length + pending.filter((p) => p.status !== "error").length >= MAX_IMAGES;

  return (
    <div className="space-y-3">
      <Label>Nuotraukos</Label>
      <p className="text-xs text-muted-foreground">
        Vilkite failus arba spustelėkite pasirinkti (iki {MAX_IMAGES} nuotraukų). Nuotraukos
        automatiškai optimizuojamos: WebP, max 1200px, ~80% kokybės, iki ~200 KB. Pažymėkite vieną
        kaip viršelį.
      </p>

      <div
        onDragOver={(e) => {
          if (atLimit) return;
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          if (atLimit) {
            e.preventDefault();
            return;
          }
          onDrop(e);
        }}
        onClick={() => {
          if (atLimit) {
            toast.error(`Maksimaliai ${MAX_IMAGES} nuotraukos`);
            return;
          }
          inputRef.current?.click();
        }}
        className={cn(
          "relative rounded-xl border-2 border-dashed p-8 text-center transition",
          atLimit
            ? "border-border bg-muted/30 opacity-60 cursor-not-allowed"
            : "cursor-pointer " +
              (dragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/60 hover:bg-muted/40"),
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          disabled={atLimit}
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <div className="font-medium">
          {atLimit
            ? `Pasiektas limitas (${MAX_IMAGES} nuotraukos)`
            : "Vilkite nuotraukas čia arba spustelėkite pasirinkti"}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          JPG, PNG arba WebP · konvertuojama į WebP · max {MAX_IMAGES}
        </div>
      </div>


      {pending.length > 0 && (
        <div className="space-y-2">
          {pending.map((it) => (
            <div
              key={it.id}
              className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 text-sm"
            >
              {it.status === "error" ? (
                <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="truncate">{it.name}</div>
                <div className="text-xs text-muted-foreground">
                  {it.status === "processing" && "Optimizuojama…"}
                  {it.status === "uploading" && "Keliama…"}
                  {it.status === "error" && (it.error || "Klaida")}
                </div>
              </div>
              {it.status === "error" && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => retry(it.id)}
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Bandyti dar kartą
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setPending((p) => p.filter((x) => x.id !== it.id))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {images.length === 0 && pending.length === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Dar nėra nuotraukų.
        </div>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {images.map((url, i) => {
            const isCover = url === cover;
            return (
              <div
                key={url + i}
                className={cn(
                  "relative group rounded-lg overflow-hidden border bg-muted",
                  isCover && "ring-2 ring-primary",
                )}
              >
                <div className="aspect-[16/10] bg-muted">
                  <img
                    src={url}
                    alt={`Nuotrauka ${i + 1}`}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.opacity = "0.3";
                    }}
                  />
                </div>
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/55 px-2 py-1.5 opacity-0 group-hover:opacity-100 transition">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      className="text-white/90 disabled:opacity-30 text-xs px-1"
                      aria-label="Aukštyn"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === images.length - 1}
                      className="text-white/90 disabled:opacity-30 text-xs px-1"
                      aria-label="Žemyn"
                    >
                      →
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCover(url)}
                      className="text-white"
                      aria-label="Pažymėti kaip viršelį"
                      title="Viršelis"
                    >
                      {isCover ? (
                        <Star className="h-4 w-4 fill-yellow-300 text-yellow-300" />
                      ) : (
                        <StarOff className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(i)}
                      className="text-white"
                      aria-label="Pašalinti"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {isCover && (
                  <span className="absolute top-2 left-2 text-[10px] uppercase tracking-wide bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                    Viršelis
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
