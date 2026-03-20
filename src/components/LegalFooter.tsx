import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const LegalFooter = () => {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border bg-card py-6 px-4 md:px-8">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">© {new Date().getFullYear()} Vary</span>
        <Link to="/cgv" className="hover:text-primary transition-colors">{t("legal.footer.cgv")}</Link>
        <Link to="/mentions-legales" className="hover:text-primary transition-colors">{t("legal.footer.mentions")}</Link>
        <Link to="/confidentialite" className="hover:text-primary transition-colors">{t("legal.footer.privacy")}</Link>
        <Link to="/cookies" className="hover:text-primary transition-colors">{t("legal.footer.cookies")}</Link>
      </div>
    </footer>
  );
};

export default LegalFooter;
