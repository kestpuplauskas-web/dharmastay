import { useEffect, useState } from "react";
import { useBlocker } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Languages, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import DOMPurify from "dompurify";
import { RichTextEditor } from "@/components/admin/content/RichTextEditor";
import { translationLanguagesFor } from "@/lib/languages";
import { useDefaultLanguage } from "@/hooks/useDefaultLanguage";
import { getTranslations, saveTranslations } from "@/lib/translations.functions";
import type { TranslatableEntity, TranslatableFieldDef } from "@/lib/translations";

export function TranslationPanel({
  entityType,
  entityId,
  fields,
  originals,
}: {
  entityType: TranslatableEntity;
  entityId: string;
  fields: TranslatableFieldDef[];
  /** Originalo tekstai, rodomi šalia kaip nuoroda. */
  originals: Record<string, string>;
}) {
  const fetchTranslations = useServerFn(getTranslations);
  const save = useServerFn(saveTranslations);
  const qc = useQueryClient();

  // Verčiamos visos kalbos, IŠSKYRUS objekto numatytąją.
  const defaultLang = useDefaultLanguage();
  const languages = translationLanguagesFor(defaultLang);

  const [activeLang, setActiveLang] = useState("");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  // Objekto formos „Išsaugoti" mygtukas išmeta iš puslapio — įspėjame.
  const { proceed, reset, status } = useBlocker({
    shouldBlockFn: () => dirty,
    withResolver: true,
    enableBeforeUnload: dirty,
  });

  const langKey = languages.map((l) => l.code).join(",");
  useEffect(() => {
    if (languages.length === 0) return;
    if (!languages.some((l) => l.code === activeLang)) {
      setActiveLang(languages[0]!.code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [langKey, activeLang]);

  const { data: translations, isLoading } = useQuery({
    queryKey: ["translations", entityType, entityId],
    queryFn: () => fetchTranslations({ data: { entityType, entityId } }),
  });

  const fieldKey = fields.map((f) => f.field).join("|");
  useEffect(() => {
    const next: Record<string, string> = {};
    for (const f of fields) next[f.field] = translations?.[f.field]?.[activeLang] ?? "";
    setDraft(next);
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translations, activeLang, fieldKey]);

  const edit = (field: string, value: string) => {
    setDirty(true);
    setDraft((s) => ({ ...s, [field]: value }));
  };

  const m = useMutation({
    mutationFn: () =>
      save({ data: { entityType, entityId, lang: activeLang, values: draft } }),
    onSuccess: () => {
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["translations", entityType, entityId] });
      toast.success("Vertimai išsaugoti.");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Nepavyko išsaugoti vertimų."),
  });

  if (languages.length === 0 || !activeLang) return null;

  const filled = fields.filter((f) => (draft[f.field] ?? "").trim() !== "").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Languages className="h-5 w-5" />
          Vertimai
        </CardTitle>
        <CardDescription>
          Neprivaloma. Jei vertimo nėra, svečiui rodomas tekstas numatytąja kalba (
          {defaultLang.toUpperCase()}). Išversta {filled} iš {fields.length}.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {languages.length > 1 && (
          <div className="flex gap-1">
            {languages.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setActiveLang(l.code)}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  l.code === activeLang
                    ? "bg-accent font-medium text-foreground"
                    : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {l.code.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Kraunama…
          </div>
        ) : (
          fields.map((f) => (
            <div key={f.field} className="space-y-1.5">
              <Label>{f.label}</Label>
              {f.html ? (
                <div
                  className="prose prose-sm dark:prose-invert max-w-none rounded-md bg-muted px-3 py-2 text-muted-foreground"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(originals[f.field]?.trim() || "<p>(tuščias)</p>"),
                  }}
                />
              ) : (
                <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground whitespace-pre-wrap">
                  {originals[f.field]?.trim() || "(tuščias)"}
                </div>
              )}
              {f.html ? (
                <RichTextEditor
                  value={draft[f.field] ?? ""}
                  onChange={(html) => edit(f.field, html === "<p></p>" ? "" : html)}
                />
              ) : f.multiline ? (
                <Textarea
                  rows={3}
                  value={draft[f.field] ?? ""}
                  placeholder={`${activeLang.toUpperCase()} vertimas`}
                  onChange={(e) => edit(f.field, e.target.value)}
                />
              ) : (
                <Input
                  value={draft[f.field] ?? ""}
                  placeholder={`${activeLang.toUpperCase()} vertimas`}
                  onChange={(e) => edit(f.field, e.target.value)}
                />
              )}
            </div>
          ))
        )}
      </CardContent>

      <CardFooter className="flex items-center gap-3 border-t pt-4">
        <Button type="button" onClick={() => m.mutate()} disabled={m.isPending || !dirty}>
          {m.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Išsaugoti vertimus
        </Button>
        {dirty && (
          <span className="text-sm text-muted-foreground">Yra neišsaugotų vertimų.</span>
        )}
      </CardFooter>

      <AlertDialog open={status === "blocked"}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Neišsaugoti vertimai</AlertDialogTitle>
            <AlertDialogDescription>
              Įvedėte vertimų, kurių neišsaugojote. Išėję iš šio puslapio juos prarasite.
              Vertimai saugomi atskiru mygtuku „Išsaugoti vertimus" — objekto formos
              išsaugojimas jų neįrašo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={reset}>Likti puslapyje</AlertDialogCancel>
            <AlertDialogAction onClick={proceed}>Išeiti neišsaugojus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
