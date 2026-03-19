import { MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";

const Messages = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="px-4 md:px-8 py-16 pb-24 max-w-[1600px] mx-auto text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <MessageCircle className="h-8 w-8 text-primary" />
        </div>
        <h1 className="font-heading text-2xl font-bold text-foreground mb-3">{t("messages.title")}</h1>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">{t("messages.empty")}</p>
        <Link
          to="/marketplace"
          className="inline-block px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary-dark transition-colors"
        >
          {t("common.browseLots")}
        </Link>
      </main>
      <BottomNav />
    </div>
  );
};

export default Messages;
