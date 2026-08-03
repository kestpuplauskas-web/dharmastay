import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { listAllProperties, getMyRole } from "@/lib/properties.functions";
import {
  getPropertySettings,
  savePropertySettings,
} from "@/lib/property-settings.functions";
import {
  DEFAULT_PROPERTY_SETTINGS,
  SETTINGS_SECTIONS,
  type SettingsSectionId,
} from "@/lib/property-settings";
import { SettingsSectionForm } from "@/components/admin/settings/SettingsSectionForm";
import {
  IntegrationsSection,
  type IntegrationCard,
} from "@/components/admin/settings/IntegrationsSection";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: PropertySettingsPage,
  head: () => ({
    meta: [
      { title: "Turto nustatymai · Rentivo Admin" },
      {
        name: "description",
        content:
          "Objekto bendrieji nustatymai: viešnagės taisyklės, mokesčiai, mokėjimai, sąskaitos, pranešimai ir integracijos.",
      },
      { property: "og:title", content: "Turto nustatymai · Rentivo Admin" },
      {
        property: "og:description",
        content: "Centrinė objekto konfigūracijos vieta viešbučių valdymo sistemoje.",
      },
    ],
  }),
});

type NavId = SettingsSectionId | "integrations";

function PropertySettingsPage() {
  const fetchProperties = useServerFn(listAllProperties);
  const fetchRole = useServerFn(getMyRole);
  const fetchSettings = useServerFn(getPropertySettings);
  const saveSettings = useServerFn(savePropertySettings);
  const qc = useQueryClient();

  const [propertyId, setPropertyId] = useState<string>("");
  const [active, setActive] = useState<NavId>("general");

  const { data: role } = useQuery({ queryKey: ["my-role"], queryFn: () => fetchRole() });
  const canEdit = Boolean(role?.isAdmin);

  const { data: properties, isLoading: loadingProperties } = useQuery({
    queryKey: ["admin-properties-settings"],
    queryFn: () => fetchProperties(),
  });

  const selectedId = propertyId || properties?.[0]?.id || "";
  const selected = properties?.find((p) => p.id === selectedId);

  const { data, isLoading: loadingSettings } = useQuery({
    queryKey: ["property-settings", selectedId],
    queryFn: () => fetchSettings({ data: { propertyId: selectedId } }),
    enabled: Boolean(selectedId),
  });

  const save = useMutation({
    mutationFn: (vars: { section: SettingsSectionId; values: Record<string, unknown> }) =>
      saveSettings({
        data: { propertyId: selectedId, section: vars.section, values: vars.values },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["property-settings", selectedId] });
      toast.success("Nustatymai išsaugoti.");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Nepavyko išsaugoti nustatymų."),
  });

  const integrations = useMemo<IntegrationCard[]>(() => {
    const icalOn = Boolean(selected?.icalImportUrl);
    const syncedAt = selected?.icalLastSyncAt
      ? new Date(selected.icalLastSyncAt).toLocaleString("lt-LT")
      : null;
    const icalDetail = icalOn
      ? `iCal susietas objekto lygiu${syncedAt ? ` · sinchronizuota ${syncedAt}` : ""}`
      : "iCal nuoroda nurodoma objekto kortelėje";
    return [
      {
        key: "booking",
        name: "Booking.com",
        description: "Užimtumo importas per iCal kalendorių.",
        status: icalOn ? "connected" : "coming_soon",
        detail: icalDetail,
      },
      {
        key: "airbnb",
        name: "Airbnb",
        description: "Užimtumo importas per iCal kalendorių.",
        status: icalOn ? "connected" : "coming_soon",
        detail: icalDetail,
      },
      {
        key: "gcal",
        name: "Google Calendar",
        description: "Rezervacijų sinchronizacija su Google kalendoriumi.",
        status: "coming_soon",
      },
      {
        key: "stripe",
        name: "Stripe",
        description: "Kortelių mokėjimai ir avansų surinkimas.",
        status: "coming_soon",
      },
      {
        key: "paysera",
        name: "Paysera",
        description: "Mokėjimai per Lietuvos bankus.",
        status: "coming_soon",
      },
      {
        key: "smtp",
        name: "SMTP",
        description: "Išeinančių el. laiškų siuntimo serveris.",
        status: "coming_soon",
      },
      {
        key: "sms",
        name: "SMS paslaugų teikėjas",
        description: "SMS priminimai svečiams.",
        status: "coming_soon",
      },
      {
        key: "api",
        name: "API raktai",
        description: "Prieigos raktai išorinėms sistemoms.",
        status: "coming_soon",
      },
      {
        key: "webhook",
        name: "Webhook URL",
        description: "Įvykių pranešimai į išorinę sistemą.",
        status: "coming_soon",
      },
      {
        key: "landing",
        name: "Klientinė svetainė",
        description: "Landing page, per kurią ateina rezervacijos.",
        status: "coming_soon",
      },
    ];
  }, [selected]);

  const navItems: { id: NavId; icon: string; title: string }[] = [
    ...SETTINGS_SECTIONS.map((s) => ({ id: s.id as NavId, icon: s.icon, title: s.title })),
    { id: "integrations", icon: "🔌", title: "Integracijos" },
  ];

  const section = SETTINGS_SECTIONS.find((s) => s.id === active);
  const settings = data?.settings ?? DEFAULT_PROPERTY_SETTINGS;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Settings2 className="h-6 w-6 text-primary" />
            Turto nustatymai
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Centrinė vieta, kur konfigūruojamas objekto veikimas.
          </p>
        </div>
        <div className="w-full md:w-72">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Objektas
          </label>
          {loadingProperties ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <Select value={selectedId} onValueChange={setPropertyId}>
              <SelectTrigger>
                <SelectValue placeholder="Pasirinkite objektą" />
              </SelectTrigger>
              <SelectContent>
                {(properties ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </header>

      {!loadingProperties && (properties ?? []).length === 0 ? (
        <p className="rounded-lg border p-6 text-sm text-muted-foreground">
          Pirmiausia sukurkite objektą — tada galėsite konfigūruoti jo nustatymus.
        </p>
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row">
          <nav className="lg:w-60 lg:shrink-0">
            <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
              {navItems.map((item) => {
                const isActive = item.id === active;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActive(item.id)}
                    className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors lg:w-full ${
                      isActive
                        ? "bg-accent font-medium text-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    <span aria-hidden>{item.icon}</span>
                    {item.title}
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="min-w-0 flex-1">
            {loadingSettings || !selectedId ? (
              <div className="flex items-center gap-2 rounded-lg border p-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Kraunama…
              </div>
            ) : active === "integrations" ? (
              <IntegrationsSection items={integrations} />
            ) : section ? (
              <SettingsSectionForm
                key={`${selectedId}-${section.id}`}
                section={section}
                settings={settings}
                canEdit={canEdit}
                saving={save.isPending}
                onSave={async (values) => {
                  await save.mutateAsync({ section: section.id, values });
                }}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}