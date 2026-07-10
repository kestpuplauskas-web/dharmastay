import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Phone, Mail, MessageCircle } from "lucide-react";
import rentivoLogo from "@/assets/rentivo-logo.png";

const PHONE_DISPLAY = "+370 692 49602";
const PHONE_HREF = "tel:+37069249602";
const WHATSAPP_HREF = "https://wa.me/37069249602";
const EMAIL = "info@rentivo.lt";

export function SiteFooter() {
  const { t } = useTranslation();
  return (
    <footer id="contact-footer" className="border-t bg-background">
      <div className="container mx-auto px-6 py-10 grid gap-6 md:grid-cols-3 text-sm text-muted-foreground">
        <div>
          <img src={rentivoLogo} alt="Rentivo" className="h-10 w-auto object-contain" />
          <p className="mt-3">{t("footer.rights", { year: new Date().getFullYear() })}</p>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <Link to="/privatumo-politika" className="hover:text-foreground underline underline-offset-2">
              {t("footer.privacyPolicy")}
            </Link>
            <Link to="/paslaugu-taisykles" className="hover:text-foreground underline underline-offset-2">
              {t("footer.termsOfService")}
            </Link>
          </div>
        </div>

        <div className="space-y-2">
          <a href={PHONE_HREF} className="flex items-center gap-2 hover:text-foreground">
            <Phone className="h-4 w-4 text-primary" /> {PHONE_DISPLAY}
          </a>
          <a
            href={WHATSAPP_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-foreground"
          >
            <MessageCircle className="h-4 w-4 text-primary" /> {t("footer.whatsapp")}: {PHONE_DISPLAY}
          </a>
          <a href={`mailto:${EMAIL}`} className="flex items-center gap-2 hover:text-foreground">
            <Mail className="h-4 w-4 text-primary" /> {EMAIL}
          </a>
        </div>

        <div className="md:text-right">
          <a
            href={WHATSAPP_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2 text-white font-medium shadow-sm hover:opacity-90 transition"
          >
            <MessageCircle className="h-4 w-4" /> {t("contact.writeOnWhatsapp")}
          </a>
        </div>
      </div>
    </footer>
  );
}
