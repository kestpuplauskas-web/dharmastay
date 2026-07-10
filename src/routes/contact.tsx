import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Phone, Mail, MessageCircle, Clock, MapPin } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useLanguageBootstrap } from "@/components/LanguageSwitcher";
import { Card, CardContent } from "@/components/ui/card";
import { LOCATIONS } from "@/lib/cars";

const PHONE_DISPLAY = "+370 692 49602";
const PHONE_HREF = "tel:+37069249602";
const EMAIL = "info@rentivo.lt";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Kontaktai — Rentivo" },
      { name: "description", content: "Susisiekite su Rentivo telefonu, el. paštu ar WhatsApp. Darbo valandos ir paėmimo vietos." },
      { property: "og:title", content: "Kontaktai — Rentivo" },
      { property: "og:description", content: "Telefonas, el. paštas, WhatsApp ir darbo valandos." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  useLanguageBootstrap();
  const { t } = useTranslation();
  const waMsg = encodeURIComponent(t("contact.whatsappMessage"));
  const waHref = `https://wa.me/37069249602?text=${waMsg}`;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground pt-16 md:pt-20">
      <SiteHeader variant="solid" />
      <main className="flex-1 container mx-auto px-6 py-16 max-w-5xl">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{t("contact.title")}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{t("contact.subtitle")}</p>

        <div className="grid md:grid-cols-3 gap-5 mt-10">
          <ContactCard
            icon={<Phone className="h-5 w-5" />}
            title={t("contact.phone")}
            hint={t("contact.phoneHint")}
            value={PHONE_DISPLAY}
            href={PHONE_HREF}
          />
          <ContactCard
            icon={<MessageCircle className="h-5 w-5" />}
            title={t("contact.whatsapp")}
            hint={t("contact.whatsappHint")}
            value={PHONE_DISPLAY}
            href={waHref}
            accent
          />
          <ContactCard
            icon={<Mail className="h-5 w-5" />}
            title={t("contact.email")}
            hint={t("contact.emailHint")}
            value={EMAIL}
            href={`mailto:${EMAIL}`}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-5 mt-8">
          <Card className="border-border/60">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <Clock className="h-5 w-5 text-primary" /> {t("contact.hours")}
              </div>
              <ul className="mt-4 space-y-1.5 text-muted-foreground">
                <li>{t("contact.hoursWeekdays")}</li>
                <li>{t("contact.hoursSat")}</li>
                <li>{t("contact.hoursSun")}</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <MapPin className="h-5 w-5 text-primary" /> {t("contact.locations")}
              </div>
              <ul className="mt-4 space-y-1.5 text-muted-foreground">
                {LOCATIONS.map((l) => (
                  <li key={l.name}>{l.name}{l.fee > 0 ? ` (+${l.fee} €)` : ""}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="mt-10 text-center">
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-6 py-3 text-white font-semibold shadow-sm hover:opacity-90 transition"
          >
            <MessageCircle className="h-5 w-5" /> {t("contact.writeOnWhatsapp")}
          </a>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function ContactCard({
  icon, title, hint, value, href, accent,
}: { icon: React.ReactNode; title: string; hint: string; value: string; href: string; accent?: boolean }) {
  return (
    <Card className={accent ? "border-[#25D366]/40" : "border-border/60"}>
      <CardContent className="p-6">
        <div className={`h-11 w-11 rounded-xl grid place-items-center mb-4 ${accent ? "bg-[#25D366]/15 text-[#25D366]" : "bg-primary/10 text-primary"}`}>
          {icon}
        </div>
        <h3 className="font-semibold text-lg">{title}</h3>
        <p className="text-muted-foreground text-sm mt-1">{hint}</p>
        <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="mt-3 inline-block font-medium text-primary hover:underline">
          {value}
        </a>
      </CardContent>
    </Card>
  );
}
