import { useTranslation } from "react-i18next";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";

const CGV = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="px-4 md:px-8 py-8 pb-24 max-w-3xl mx-auto prose prose-sm dark:prose-invert">
        <h1 className="font-heading text-2xl font-bold text-foreground">{t("legal.cgv.title")}</h1>
        <p className="text-xs text-muted-foreground mb-8">{t("legal.cgv.lastUpdated")}</p>

        <section>
          <h2>{t("legal.cgv.s1Title")}</h2>
          <p>{t("legal.cgv.s1Text")}</p>
        </section>

        <section>
          <h2>{t("legal.cgv.s2Title")}</h2>
          <p>{t("legal.cgv.s2Text")}</p>
        </section>

        <section>
          <h2>{t("legal.cgv.s3Title")}</h2>
          <p>{t("legal.cgv.s3Text")}</p>
        </section>

        <section>
          <h2>{t("legal.cgv.s4Title")}</h2>
          <p>{t("legal.cgv.s4Text")}</p>
        </section>

        <section>
          <h2>{t("legal.cgv.s5Title")}</h2>
          <p>{t("legal.cgv.s5Text")}</p>
        </section>

        <section>
          <h2>{t("legal.cgv.s6Title")}</h2>
          <p>{t("legal.cgv.s6Text")}</p>
        </section>

        <section>
          <h2>{t("legal.cgv.s7Title")}</h2>
          <p>{t("legal.cgv.s7Text")}</p>
        </section>

        <section>
          <h2>{t("legal.cgv.s8Title")}</h2>
          <p>{t("legal.cgv.s8Text")}</p>
        </section>
      </main>
      <BottomNav />
    </div>
  );
};

export default CGV;
