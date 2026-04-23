import { useQuery } from "@tanstack/react-query";
import { AlertOctagon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Banner shown to sellers whose account is temporarily suspended after a
 * red-zone dispute. Shows the suspension end date and a link to file an
 * appeal. The seller has 7 days to contest; Vary decides within 48 h.
 */
const SellerSuspensionBanner = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();

  const { data: suspendedUntil } = useQuery<string | null>({
    queryKey: ["seller-suspension", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("suspended_until")
        .eq("id", profile!.id)
        .maybeSingle();
      return data?.suspended_until ?? null;
    },
  });

  if (!suspendedUntil) return null;
  const until = new Date(suspendedUntil);
  if (until.getTime() < Date.now()) return null;

  return (
    <div className="mb-6 rounded-2xl border border-destructive/40 bg-destructive/5 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex items-start gap-3 flex-1">
        <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
          <AlertOctagon className="h-5 w-5 text-destructive" />
        </div>
        <div>
          <h3 className="font-heading font-semibold text-foreground">
            {t("sellerSuspension.title", "Compte temporairement suspendu")}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t(
              "sellerSuspension.description",
              "Suite à un litige majeur, votre compte est suspendu jusqu'au {{date}}. Vous avez 7 jours pour soumettre un appel — Vary répondra sous 48 h.",
              { date: until.toLocaleDateString("fr-FR") },
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SellerSuspensionBanner;
