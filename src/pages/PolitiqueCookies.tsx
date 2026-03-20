import { useTranslation } from "react-i18next";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";

const PolitiqueCookies = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="px-4 md:px-8 py-8 pb-24 max-w-3xl mx-auto prose prose-sm dark:prose-invert">
        <h1 className="font-heading text-2xl font-bold text-foreground">{t("legal.cookies.title")}</h1>
        <p className="text-xs text-muted-foreground mb-8">{t("legal.cookies.lastUpdated")}</p>

        <section>
          <h2>{t("legal.cookies.s1Title")}</h2>
          <p>{t("legal.cookies.s1Text")}</p>
        </section>

        <section>
          <h2>{t("legal.cookies.s2Title")}</h2>
          <p>{t("legal.cookies.s2Text")}</p>
        </section>

        <section>
          <h2>{t("legal.cookies.s3Title")}</h2>
          <p>{t("legal.cookies.s3Text")}</p>
        </section>

        <section>
          <h2>{t("legal.cookies.s4Title")}</h2>
          <p>{t("legal.cookies.s4Text")}</p>
        </section>
      </main>
      <BottomNav />
    </div>
  );
};

export default PolitiqueCookies;
