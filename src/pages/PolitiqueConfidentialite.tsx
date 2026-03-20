import { useTranslation } from "react-i18next";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";

const PolitiqueConfidentialite = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="px-4 md:px-8 py-8 pb-24 max-w-3xl mx-auto prose prose-sm dark:prose-invert">
        <h1 className="font-heading text-2xl font-bold text-foreground">{t("legal.privacy.title")}</h1>
        <p className="text-xs text-muted-foreground mb-8">{t("legal.privacy.lastUpdated")}</p>

        <section>
          <h2>{t("legal.privacy.s1Title")}</h2>
          <p>{t("legal.privacy.s1Text")}</p>
        </section>

        <section>
          <h2>{t("legal.privacy.s2Title")}</h2>
          <p>{t("legal.privacy.s2Text")}</p>
        </section>

        <section>
          <h2>{t("legal.privacy.s3Title")}</h2>
          <p>{t("legal.privacy.s3Text")}</p>
        </section>

        <section>
          <h2>{t("legal.privacy.s4Title")}</h2>
          <p>{t("legal.privacy.s4Text")}</p>
        </section>

        <section>
          <h2>{t("legal.privacy.s5Title")}</h2>
          <p>{t("legal.privacy.s5Text")}</p>
        </section>

        <section>
          <h2>{t("legal.privacy.s6Title")}</h2>
          <p>{t("legal.privacy.s6Text")}</p>
        </section>

        <section>
          <h2>{t("legal.privacy.s7Title")}</h2>
          <p>{t("legal.privacy.s7Text")}</p>
        </section>
      </main>
      <BottomNav />
    </div>
  );
};

export default PolitiqueConfidentialite;
