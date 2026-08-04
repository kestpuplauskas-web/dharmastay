import { useCallback, useMemo, useState } from "react";
import { createFileRoute, useBlocker } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getMyRole } from "@/lib/properties.functions";
import {
  listContentTemplates,
  saveContentTemplate,
  sendTestContentEmail,
} from "@/lib/content-templates.functions";
import {
  CONTENT_SECTIONS,
  CONTENT_TEMPLATES,
  templateKey,
  type ContentCategory,
} from "@/lib/content-templates";
import { ContentTemplateCard } from "@/components/admin/content/ContentTemplateCard";
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

export const Route = createFileRoute("/_authenticated/admin/content")({
  component: ContentPage,
  head: () => ({
    meta: [
      { title: "Turinys · Rentivo Admin" },
      {
        name: "description",
        content:
          "Klientams siunčiamų el. laiškų, WhatsApp žinučių ir svečiams skirtos informacijos šablonų valdymas.",
      },
      { property: "og:title", content: "Turinys · Rentivo Admin" },
      {
        property: "og:description",
        content: "El. laiškų, WhatsApp žinučių ir svečių informacijos šablonai vienoje vietoje.",
      },
    ],
  }),
});

function ContentPage() {
  const fetchRole = useServerFn(getMyRole);
  const fetchTemplates = useServerFn(listContentTemplates);
  const saveTemplate = useServerFn(saveContentTemplate);
  const sendTest = useServerFn(sendTestContentEmail);
  const qc = useQueryClient();

  const [active, setActive] = useState<ContentCategory>("email");
  const [dirtyMap, setDirtyMap] = useState<Record<string, boolean>>({});

  const { data: role } = useQuery({ queryKey: ["my-role"], queryFn: () => fetchRole() });
  const canEdit = Boolean(role?.isAdmin);

  const { data: templates, isLoading: loading } = useQuery({
    queryKey: ["content-templates"],
    queryFn: () => fetchTemplates(),
  });

  const recordMap = useMemo(() => {
    const map: Record<string, (typeof templates extends undefined ? never : NonNullable<typeof templates>)[number]> = {};
    for (const t of templates ?? []) map[templateKey(t.category, t.templateName)] = t;
    return map;
  }, [templates]);

  const save = useMutation({
    mutationFn: (vars: {
      category: ContentCategory;
      templateName: string;
      subject: string;
      content: string;
      fields: Record<string, string>;
      isEnabled: boolean;
    }) => saveTemplate({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content-templates"] });
      toast.success("Turinys išsaugotas.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Nepavyko išsaugoti."),
  });

  const testSend = useMutation({
    mutationFn: (vars: { to: string; subject: string; html: string }) =>
      sendTest({ data: vars }),
    onSuccess: () => toast.success("Testinis laiškas išsiųstas."),
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Nepavyko išsiųsti testinio laiško."),
  });

  const onDirtyChange = useCallback((key: string, dirty: boolean) => {
    setDirtyMap((prev) => (prev[key] === dirty ? prev : { ...prev, [key]: dirty }));
  }, []);

  const hasUnsaved = Object.values(dirtyMap).some(Boolean);

  const { proceed, reset, status } = useBlocker({
    shouldBlockFn: () => hasUnsaved,
    withResolver: true,
    enableBeforeUnload: hasUnsaved,
  });

  const sectionTemplates = CONTENT_TEMPLATES.filter((t) => t.category === active);
  const activeSection = CONTENT_SECTIONS.find((s) => s.id === active)!;

  return (
    <div className="space-y-6">
      <header>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <FileText className="h-6 w-6 text-primary" />
            Turinys
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Informacija, siunčiama klientams el. paštu, WhatsApp žinutėmis ar rodoma svečiui.
            Nustatymai galioja visiems objektams.
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row">
        <nav className="lg:w-60 lg:shrink-0">
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
            {CONTENT_SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActive(s.id)}
                className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors lg:w-full ${
                  s.id === active
                    ? "bg-accent font-medium text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <span aria-hidden>{s.icon}</span>
                {s.title}
              </button>
            ))}
          </div>
        </nav>

        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">{activeSection.title}</h2>
            <p className="text-sm text-muted-foreground">{activeSection.description}</p>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Kraunama…
            </div>
          ) : (
            sectionTemplates.map((def) => (
              <ContentTemplateCard
                key={`${def.category}:${def.name}`}
                def={def}
                record={recordMap[templateKey(def.category, def.name)]}
                canEdit={canEdit}
                saving={save.isPending}
                sendingTest={testSend.isPending}
                onDirtyChange={onDirtyChange}
                onSave={async (v) => {
                  await save.mutateAsync({
                    category: def.category,
                    templateName: def.name,
                    subject: v.subject ?? "",
                    content: v.content ?? "",
                    fields: v.fields ?? {},
                    isEnabled: v.isEnabled,
                  });
                }}
                onSendTest={async (args) => {
                  await testSend.mutateAsync(args);
                }}
              />
            ))
          )}
        </div>
      </div>

      <AlertDialog open={status === "blocked"}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Neišsaugoti pakeitimai</AlertDialogTitle>
            <AlertDialogDescription>
              Turite neišsaugotų pakeitimų. Ar tikrai norite išeiti?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => reset?.()}>Likti</AlertDialogCancel>
            <AlertDialogAction onClick={() => proceed?.()}>Išeiti</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}