import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Editor } from "@tiptap/react";
import DOMPurify from "dompurify";
import { ChevronDown, Eye, ExternalLink, Loader2, Save, Send } from "lucide-react";
import {
  buildFormSchema,
  buildWhatsappLink,
  defaultsFor,
  normalizeWhatsappPhone,
  renderPreview,
  type ContentTemplateDef,
  type ContentTemplateRecord,
} from "@/lib/content-templates";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RichTextEditor } from "./RichTextEditor";
import { VariablePicker } from "./VariablePicker";

type FormValues = {
  subject: string;
  content: string;
  isEnabled: boolean;
  fields: Record<string, string>;
};

function toValues(def: ContentTemplateDef, record?: ContentTemplateRecord): FormValues {
  const base = defaultsFor(def);
  const fields = { ...base.fields };
  for (const key of Object.keys(fields)) {
    const v = record?.fields?.[key];
    if (typeof v === "string" && v !== "") fields[key] = v;
  }
  return {
    subject: record?.subject ?? base.subject,
    content: record?.content ?? base.content,
    isEnabled: record?.isEnabled ?? base.isEnabled,
    fields,
  };
}

export function ContentTemplateCard({
  def,
  record,
  canEdit,
  saving,
  sendingTest,
  onSave,
  onSendTest,
  onDirtyChange,
}: {
  def: ContentTemplateDef;
  record?: ContentTemplateRecord;
  canEdit: boolean;
  saving: boolean;
  sendingTest: boolean;
  onSave: (values: FormValues) => Promise<void>;
  onSendTest: (args: { to: string; subject: string; html: string }) => Promise<void>;
  onDirtyChange: (key: string, dirty: boolean) => void;
}) {
  const schema = useMemo(() => buildFormSchema(def), [def]);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema as never),
    defaultValues: toValues(def, record),
    mode: "onBlur",
  });

  const [editor, setEditor] = useState<Editor | null>(null);
  const [open, setOpen] = useState(false);
  const plainRef = useRef<HTMLTextAreaElement | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [waOpen, setWaOpen] = useState(false);
  const [waPhone, setWaPhone] = useState("");

  useEffect(() => {
    form.reset(toValues(def, record));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def.name, record]);

  const dirty = form.formState.isDirty;
  const dirtyKey = `${def.category}:${def.name}`;
  useEffect(() => {
    onDirtyChange(dirtyKey, dirty);
    return () => onDirtyChange(dirtyKey, false);
  }, [dirty, dirtyKey, onDirtyChange]);

  const values = form.watch();
  const errors = form.formState.errors;
  const disabled = !canEdit || saving;
  const showVariables = def.hasRichText || def.category === "whatsapp";

  const insertVariable = (token: string) => {
    if (def.hasRichText && editor) {
      editor.chain().focus().insertContent(token).run();
      return;
    }
    const el = plainRef.current;
    const current = form.getValues("content") ?? "";
    if (!el) {
      form.setValue("content", `${current}${token}`, { shouldDirty: true });
      return;
    }
    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? current.length;
    const next = `${current.slice(0, start)}${token}${current.slice(end)}`;
    form.setValue("content", next, { shouldDirty: true, shouldValidate: true });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const previewHtml = def.hasRichText
    ? DOMPurify.sanitize(renderPreview(values.content ?? ""))
    : null;

  const linkUrl = def.openLinkField ? (values.fields?.[def.openLinkField] ?? "") : "";

  return (
    <Card>
      <form onSubmit={form.handleSubmit(async (v) => { await onSave(v); })}>
        <CardHeader className="gap-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="flex min-w-0 flex-1 items-start gap-3 text-left"
            >
              <ChevronDown
                className={`mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
              />
              <span className="min-w-0">
                <CardTitle className="text-base sm:text-lg">{def.title}</CardTitle>
                <CardDescription>{def.description}</CardDescription>
              </span>
            </button>
            <div className="flex items-center gap-2">
              {dirty && (
                <Badge variant="outline" className="text-xs">
                  Neišsaugota
                </Badge>
              )}
              <Label htmlFor={`enabled-${dirtyKey}`} className="text-xs text-muted-foreground">
                {values.isEnabled ? "Įjungta" : "Išjungta"}
              </Label>
              <Switch
                id={`enabled-${dirtyKey}`}
                checked={Boolean(values.isEnabled)}
                disabled={disabled}
                onCheckedChange={(c) =>
                  form.setValue("isEnabled", c, { shouldDirty: true })
                }
              />
            </div>
          </div>
        </CardHeader>

        {open && (
        <>
        <CardContent className="space-y-4">
          {def.hasSubject && (
            <div className="space-y-1.5">
              <Label htmlFor={`subject-${dirtyKey}`}>Laiško tema</Label>
              <Input
                id={`subject-${dirtyKey}`}
                disabled={disabled}
                aria-invalid={Boolean(errors.subject)}
                {...form.register("subject")}
              />
              {errors.subject?.message && (
                <p className="text-xs text-destructive">{String(errors.subject.message)}</p>
              )}
            </div>
          )}

          {(def.fields ?? []).map((f) => (
            <div key={f.name} className="space-y-1.5">
              <Label htmlFor={`f-${dirtyKey}-${f.name}`}>{f.label}</Label>
              {f.type === "textarea" ? (
                <Textarea
                  id={`f-${dirtyKey}-${f.name}`}
                  rows={3}
                  disabled={disabled}
                  aria-invalid={Boolean(errors.fields?.[f.name])}
                  {...form.register(`fields.${f.name}` as const)}
                />
              ) : (
                <Input
                  id={`f-${dirtyKey}-${f.name}`}
                  type={f.type === "url" ? "url" : "text"}
                  disabled={disabled}
                  aria-invalid={Boolean(errors.fields?.[f.name])}
                  {...form.register(`fields.${f.name}` as const)}
                />
              )}
              {errors.fields?.[f.name]?.message && (
                <p className="text-xs text-destructive">
                  {String(errors.fields[f.name]?.message)}
                </p>
              )}
            </div>
          ))}

          {def.hasRichText && (
            <div className="space-y-1.5">
              <Label>Turinys</Label>
              <RichTextEditor
                value={values.content ?? ""}
                disabled={disabled}
                invalid={Boolean(errors.content)}
                onEditorReady={setEditor}
                onChange={(html) =>
                  form.setValue("content", html, { shouldDirty: true, shouldValidate: true })
                }
              />
              {errors.content?.message && (
                <p className="text-xs text-destructive">{String(errors.content.message)}</p>
              )}
            </div>
          )}

          {!def.hasRichText && def.category === "whatsapp" && (
            <div className="space-y-1.5">
              <Label htmlFor={`content-${dirtyKey}`}>Žinutės tekstas</Label>
              <Textarea
                id={`content-${dirtyKey}`}
                rows={5}
                disabled={disabled}
                aria-invalid={Boolean(errors.content)}
                {...form.register("content")}
                ref={(el) => {
                  form.register("content").ref(el);
                  plainRef.current = el;
                }}
              />
              {errors.content?.message && (
                <p className="text-xs text-destructive">{String(errors.content.message)}</p>
              )}
            </div>
          )}

          {showVariables && <VariablePicker onInsert={insertVariable} disabled={disabled} />}
        </CardContent>

        <CardFooter className="flex flex-col items-stretch gap-2 border-t pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          {def.openLinkField && (
            <Button
              type="button"
              variant="outline"
              disabled={!linkUrl}
              onClick={() => window.open(linkUrl, "_blank", "noopener,noreferrer")}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Atidaryti nuorodą
            </Button>
          )}
          {(def.hasRichText || def.category === "whatsapp") && (
            <Button type="button" variant="outline" onClick={() => setPreviewOpen(true)}>
              <Eye className="mr-2 h-4 w-4" />
              Peržiūra
            </Button>
          )}
          {def.canTestSend && (
            <Button
              type="button"
              variant="outline"
              disabled={!canEdit}
              onClick={() => setTestOpen(true)}
            >
              <Send className="mr-2 h-4 w-4" />
              Siųsti testinį laišką
            </Button>
          )}
          {def.canTestWhatsapp && (
            <Button
              type="button"
              variant="outline"
              disabled={!canEdit}
              onClick={() => setWaOpen(true)}
            >
              <Send className="mr-2 h-4 w-4" />
              Siųsti testinę WhatsApp žinutę
            </Button>
          )}
          <Button type="submit" disabled={disabled}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {saving ? "Saugoma…" : "Išsaugoti"}
          </Button>
        </CardFooter>
        </>
        )}
      </form>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Peržiūra — {def.title}</DialogTitle>
            <DialogDescription>
              Kintamieji pakeisti pavyzdinėmis reikšmėmis.
            </DialogDescription>
          </DialogHeader>
          {def.hasSubject && (
            <p className="rounded-md bg-muted px-3 py-2 text-sm font-medium">
              {renderPreview(values.subject ?? "")}
            </p>
          )}
          {previewHtml !== null ? (
            <div
              className="prose prose-sm dark:prose-invert max-w-none rounded-md border p-4"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          ) : (
            <p className="whitespace-pre-wrap rounded-md border p-4 text-sm">
              {renderPreview(values.content ?? "")}
            </p>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Testinis laiškas</DialogTitle>
            <DialogDescription>
              Laiškas bus išsiųstas su pavyzdinėmis kintamųjų reikšmėmis.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor={`test-${dirtyKey}`}>Gavėjo el. paštas</Label>
            <Input
              id={`test-${dirtyKey}`}
              type="email"
              value={testEmail}
              placeholder="vardas@pastas.lt"
              onChange={(e) => setTestEmail(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setTestOpen(false)}>
              Atšaukti
            </Button>
            <Button
              type="button"
              disabled={sendingTest || !testEmail}
              onClick={async () => {
                await onSendTest({
                  to: testEmail,
                  subject: values.subject ?? def.title,
                  html: values.content ?? "",
                });
                setTestOpen(false);
              }}
            >
              {sendingTest ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Siųsti
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={waOpen} onOpenChange={setWaOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Testinė WhatsApp žinutė</DialogTitle>
            <DialogDescription>
              Įveskite gavėjo telefono numerį — atidarysime WhatsApp su paruošta žinute
              (kintamieji pakeisti pavyzdinėmis reikšmėmis).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor={`wa-${dirtyKey}`}>Gavėjo telefono nr.</Label>
            <Input
              id={`wa-${dirtyKey}`}
              type="tel"
              value={waPhone}
              placeholder="+370 600 00000"
              onChange={(e) => setWaPhone(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Su šalies kodu, pvz. +370 600 00000.
            </p>
          </div>
          <p className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md border p-3 text-sm">
            {renderPreview(values.content ?? "")}
          </p>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setWaOpen(false)}>
              Atšaukti
            </Button>
            <Button
              type="button"
              disabled={normalizeWhatsappPhone(waPhone).length < 8}
              onClick={() => {
                window.open(
                  buildWhatsappLink(waPhone, renderPreview(values.content ?? "")),
                  "_blank",
                  "noopener,noreferrer",
                );
                setWaOpen(false);
              }}
            >
              <Send className="mr-2 h-4 w-4" />
              Atidaryti WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}