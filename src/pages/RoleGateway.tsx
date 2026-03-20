import { Link, useParams, Navigate } from "react-router-dom";
import { ShieldCheck, ArrowRight, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";

const RoleGateway = () => {
  const { t } = useTranslation();
  const { role } = useParams<{ role: "acheteur" | "vendeur" }>();
  const { canAccessBuyer, canAccessSeller, loading } = useAuth();
  const isBuyer = role === "acheteur";

  // If user already has this role, redirect directly
  if (!loading) {
    if (isBuyer && canAccessBuyer()) return <Navigate to="/marketplace" replace />;
    if (!isBuyer && canAccessSeller()) return <Navigate to="/seller" replace />;
  }

  const roleLabel = isBuyer ? t("nav.roleGatewayBuyer") : t("nav.roleGatewaySeller");
  const formPath = isBuyer ? "/inscription/acheteur" : "/inscription/vendeur";
  const backPath = isBuyer ? "/seller" : "/marketplace";

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="flex items-center justify-center px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="h-10 w-10 text-primary" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground mb-3">
            {t("nav.roleGatewayTitle", { role: roleLabel })}
          </h1>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            {t("nav.roleGatewayDesc", { role: roleLabel })}
          </p>
          <Link
            to={formPath}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors"
          >
            {t("nav.roleGatewayCta")}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <div className="mt-4">
            <Link to={backPath} className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              {t("nav.roleGatewayBack")}
            </Link>
          </div>
        </motion.div>
      </main>
      <BottomNav />
    </div>
  );
};

export default RoleGateway;
