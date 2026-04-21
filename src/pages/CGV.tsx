import { useTranslation } from "react-i18next";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";

const CGV = () => {
  const { t } = useTranslation();
  const sections = Array.from({ length: 14 }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="px-4 md:px-8 py-8 pb-24 max-w-3xl mx-auto prose prose-sm dark:prose-invert">
        <h1 className="font-heading text-2xl font-bold text-foreground">{t("legal.cgv.title")}</h1>
        <p className="text-xs text-muted-foreground mb-8">{t("legal.cgv.lastUpdated")}</p>

        {sections.map((n) => (
          <section key={n}>
            <h2>{t(`legal.cgv.s${n}Title`)}</h2>
            <p className="whitespace-pre-line">{t(`legal.cgv.s${n}Text`)}</p>
          </section>
        ))}
      </main>
      <BottomNav />
    </div>
  );
};

export default CGV;
