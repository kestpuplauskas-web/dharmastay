import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useLanguageBootstrap } from "@/components/LanguageSwitcher";
import { getActiveContractTemplatePublic } from "@/lib/contracts.functions";
import DOMPurify from "dompurify";

export const Route = createFileRoute("/privatumo-politika")({
  head: () => ({
    meta: [
      { title: "Privatumo politika — Rentivo" },
      { name: "description", content: "Rentivo privatumo politika. Kaip renkame, naudojame ir saugome jūsų asmens duomenis." },
      { property: "og:title", content: "Privatumo politika — Rentivo" },
      { property: "og:description", content: "Kaip renkame, naudojame ir saugome jūsų asmens duomenis." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  useLanguageBootstrap();
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith("en") ? "en" : "lt";
  const fetchTemplate = useServerFn(getActiveContractTemplatePublic);

  const { data: template, isLoading } = useQuery({
    queryKey: ["contract-template-public", lang, "privacy"],
    queryFn: () => fetchTemplate({ data: { language: lang as "lt" | "en", kind: "privacy" } }),
  });

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground pt-16 md:pt-20">
      <SiteHeader variant="solid" />
      <main className="flex-1 container mx-auto px-6 py-16 max-w-3xl">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground underline">
          {t("legal.backHome")}
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mt-4">
          {t("legal.privacyTitle")}
        </h1>

        {isLoading && (
          <p className="mt-8 text-muted-foreground">{t("legal.loading")}</p>
        )}

        {!isLoading && !template?.content && (
          <div className="mt-8 text-muted-foreground">
            {t("legal.privacyPreparing")}
          </div>
        )}

        {template?.content && (
          <div
            className="mt-8 prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(template.content),
            }}
          />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
