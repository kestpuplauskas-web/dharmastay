import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  listContractTemplates, createContractTemplate, updateContractTemplate, deleteContractTemplate,
} from "@/lib/contracts.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import {
  Plus, Pencil, Trash2, Eye, Bold, Italic, Heading1, Heading2,
  List as ListIcon, ListOrdered, Pilcrow,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/contracts")({
  head: () => ({ meta: [{ title: "Sutartys | Rentivo Admin" }] }),
  component: ContractsPage,
});

const VARIABLES: { key: string; label: string }[] = [
  { key: "{{kliento_vardas}}", label: "Kliento vardas" },
  { key: "{{automobilis}}", label: "Automobilis" },
  { key: "{{paemimo_vieta}}", label: "Paėmimo vieta" },
  { key: "{{grazinimo_vieta}}", label: "Grąžinimo vieta" },
  { key: "{{nuo}}", label: "Nuo" },
  { key: "{{iki}}", label: "Iki" },
  { key: "{{trukme}}", label: "Trukmė" },
  { key: "{{suma}}", label: "Suma €" },
  { key: "{{rezervacijos_nr}}", label: "Rezervacijos Nr." },
  { key: "{{data}}", label: "Data (šiandien)" },
];

type Template = {
  id: string;
  name: string;
  language: "lt" | "en";
  kind: "rental" | "privacy";
  content: string;
  is_active: boolean;
  created_at: string;
};

const KIND_LABEL: Record<"rental" | "privacy", string> = {
  rental: "Nuomos sutartis",
  privacy: "Privatumo politika",
};

function ContractsPage() {
  const fetchList = useServerFn(listContractTemplates);
  const createFn = useServerFn(createContractTemplate);
  const updateFn = useServerFn(updateContractTemplate);
  const deleteFn = useServerFn(deleteContractTemplate);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["contract-templates"],
    queryFn: () => fetchList(),
  });

  const [editing, setEditing] = useState<Template | null>(null);
  const [creating, setCreating] = useState(false);
  const [previewing, setPreviewing] = useState<Template | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["contract-templates"] });

  const createM = useMutation({
    mutationFn: (data: any) => createFn({ data }),
    onSuccess: () => { toast.success("Šablonas sukurtas"); invalidate(); setCreating(false); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Klaida"),
  });
  const updateM = useMutation({
    mutationFn: (data: any) => updateFn({ data }),
    onSuccess: () => { toast.success("Šablonas atnaujintas"); invalidate(); setEditing(null); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Klaida"),
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => { toast.success("Šablonas ištrintas"); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Klaida"),
  });

  const rows = (q.data as Template[] | undefined) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sutartys</h1>
        <p className="text-sm text-muted-foreground">Nuomos sutarties šablonai.</p>
      </div>

      <section className="rounded-lg border bg-card">
        <header className="p-5 border-b">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold">Sutarčių šablonai</h2>
              <p className="text-sm text-muted-foreground">
                Redaguokite nuomos sutarties tekstą kurį klientas pasirašys rezervacijos metu.
              </p>
            </div>
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4 mr-1" /> Naujas šablonas
            </Button>
          </div>
        </header>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pavadinimas</TableHead>
                <TableHead>Tipas</TableHead>
                <TableHead>Kalba</TableHead>
                <TableHead>Sukurta</TableHead>
                <TableHead>Statusas</TableHead>
                <TableHead className="text-right w-40">Veiksmai</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.isLoading && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Kraunama...</TableCell></TableRow>
              )}
              {!q.isLoading && rows.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Šablonų dar nėra. Sukurkite pirmąjį.</TableCell></TableRow>
              )}
              {rows.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="text-sm">{KIND_LABEL[t.kind] ?? t.kind}</TableCell>
                  <TableCell className="uppercase text-xs">{t.language}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(t.created_at).toLocaleDateString("lt-LT")}
                  </TableCell>
                  <TableCell>
                    {t.is_active ? (
                      <Badge className="bg-primary/15 text-primary border-primary/30" variant="outline">Aktyvus</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Neaktyvus</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setPreviewing(t)} title="Peržiūrėti">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(t)} title="Redaguoti">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon" variant="ghost" className="h-8 w-8"
                        onClick={() => { if (confirm(`Ištrinti šabloną "${t.name}"?`)) deleteM.mutate(t.id); }}
                        title="Trinti"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {(creating || editing) && (
        <TemplateDialog
          initial={editing}
          open={creating || !!editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSubmit={(data) => {
            if (editing) updateM.mutate({ ...data, id: editing.id });
            else createM.mutate(data);
          }}
          submitting={createM.isPending || updateM.isPending}
        />
      )}

      <PreviewDialog template={previewing} onClose={() => setPreviewing(null)} />
    </div>
  );
}

function TemplateDialog({
  initial, open, onClose, onSubmit, submitting,
}: {
  initial: Template | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; language: "lt" | "en"; kind: "rental" | "privacy"; content: string; is_active: boolean }) => void;
  submitting: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [language, setLanguage] = useState<"lt" | "en">(initial?.language ?? "lt");
  const [kind, setKind] = useState<"rental" | "privacy">(initial?.kind ?? "rental");
  const [isActive, setIsActive] = useState(initial?.is_active ?? false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: initial?.content ?? "<p></p>",
  });

  useEffect(() => {
    return () => { editor?.destroy(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const insertVariable = (key: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(key).run();
  };

  const submit = () => {
    if (!name.trim()) { toast.error("Įveskite pavadinimą"); return; }
    const content = editor?.getHTML() ?? "";
    onSubmit({ name: name.trim(), language, kind, content, is_active: isActive });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Redaguoti šabloną" : "Naujas šablonas"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 space-y-1">
              <Label>Pavadinimas</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="pvz. Standartinė nuomos sutartis LT" />
            </div>
            <div className="space-y-1">
              <Label>Tipas</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as "rental" | "privacy")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rental">Nuomos sutartis</SelectItem>
                  <SelectItem value="privacy">Privatumo politika</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Kalba</Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as "lt" | "en")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lt">Lietuvių</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-md border p-3">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label className="text-sm">Aktyvus šablonas (tik vienas tos pačios kalbos ir tipo)</Label>
          </div>

          <div className="space-y-2">
            <Label>Kintamieji</Label>
            <div className="flex flex-wrap gap-1.5">
              {VARIABLES.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => insertVariable(v.key)}
                  className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-mono hover:bg-primary hover:text-primary-foreground transition"
                  title={v.label}
                >
                  {v.key}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Sutarties tekstas</Label>
            <EditorToolbar editor={editor} />
            <div className="rounded-md border min-h-[300px] bg-background">
              <EditorContent
                editor={editor}
                className="prose prose-sm dark:prose-invert max-w-none p-4 focus:outline-none min-h-[300px] [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[280px]"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Atšaukti</Button>
          <Button onClick={submit} disabled={submitting}>{submitting ? "Saugoma..." : "Išsaugoti"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditorToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;
  const Btn = ({ active, onClick, children, title }: any) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`h-8 w-8 inline-flex items-center justify-center rounded hover:bg-muted ${active ? "bg-muted text-primary" : "text-foreground"}`}
    >
      {children}
    </button>
  );
  return (
    <div className="flex items-center gap-1 rounded-md border bg-muted/30 p-1">
      <Btn title="Pastraipa" active={editor.isActive("paragraph")} onClick={() => editor.chain().focus().setParagraph().run()}>
        <Pilcrow className="h-4 w-4" />
      </Btn>
      <Btn title="Antraštė 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
        <Heading1 className="h-4 w-4" />
      </Btn>
      <Btn title="Antraštė 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="h-4 w-4" />
      </Btn>
      <div className="w-px h-5 bg-border mx-1" />
      <Btn title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="h-4 w-4" />
      </Btn>
      <Btn title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="h-4 w-4" />
      </Btn>
      <div className="w-px h-5 bg-border mx-1" />
      <Btn title="Sąrašas" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <ListIcon className="h-4 w-4" />
      </Btn>
      <Btn title="Numeruotas sąrašas" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="h-4 w-4" />
      </Btn>
    </div>
  );
}

function PreviewDialog({ template, onClose }: { template: Template | null; onClose: () => void }) {
  const html = useMemo(() => template?.content ?? "", [template]);
  return (
    <Dialog open={!!template} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template?.name}</DialogTitle>
        </DialogHeader>
        <div
          className="prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </DialogContent>
    </Dialog>
  );
}
