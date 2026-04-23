import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, MapPin, Calendar, BadgeCheck } from "lucide-react";
import LotCard from "@/components/LotCard";
import varyLogo from "@/assets/vary-logo.png";
import LegalFooter from "@/components/LegalFooter";
import { usePageMeta } from "@/hooks/usePageMeta";

const initialsOf = (name?: string | null) => {
  if (!name) return "V";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
};

const Stars = ({ value, size = "text-base" }: { value: number; size?: string }) => {
  const full = Math.round(value);
  return (
    <span className={`${size} text-amber-500 leading-none tracking-tight`} aria-label={`${value}/5`}>
      {Array.from({ length: 5 }).map((_, i) => (i < full ? "★" : "☆")).join("")}
    </span>
  );
};

const relTime = (iso: string) => {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "à l'instant";
  const m = Math.floor(diff / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `il y a ${d} jour${d > 1 ? "s" : ""}`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `il y a ${mo} mois`;
  return `il y a ${Math.floor(mo / 12)} an${mo >= 24 ? "s" : ""}`;
};

const SellerProfile = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: seller, isLoading } = useQuery({
    queryKey: ["seller-profile", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, company_name, company_description, created_at")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  usePageMeta({
    title: seller ? `${seller.company_name ?? seller.full_name ?? "Vendeur"}` : "Vendeur",
    description: seller?.company_description ?? undefined,
  });

  const { data: prefs } = useQuery({
    queryKey: ["seller-profile-prefs", seller?.id],
    queryFn: async () => {
      if (!seller?.id) return null;
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("id", seller.id)
        .maybeSingle();
      if (!profileRow?.user_id) return null;
      const { data } = await supabase
        .from("seller_preferences")
        .select("validation_status, categories, years_in_business, monthly_volume, buyer_filters")
        .eq("user_id", profileRow.user_id)
        .maybeSingle();
      return data;
    },
    enabled: !!seller?.id,
  });

  const isApproved = prefs?.validation_status === "approved";

  const { data: lots = [] } = useQuery({
    queryKey: ["seller-profile-lots", id],
    queryFn: async () => {
      if (!id) return [];
      const { data } = await supabase
        .from("lots")
        .select("*, lot_items(quantity, retail_price)")
        .eq("seller_id", id)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      return (data || []).map((l: any) => {
        const rv = (l.lot_items || []).reduce(
          (s: number, i: any) => s + (i.retail_price || 0) * (i.quantity || 0),
          0,
        );
        return { ...l, retailValue: rv, discount: rv > 0 ? Math.round((1 - l.price / rv) * 100) : 0 };
      });
    },
    enabled: !!id,
  });

  const { data: rating } = useQuery({
    queryKey: ["seller-rating", id],
    queryFn: async () => {
      if (!id) return { average_rating: 0, review_count: 0 };
      const { data } = await (supabase as any).rpc("get_seller_rating", { seller_profile_id: id });
      const row = Array.isArray(data) ? data[0] : data;
      return {
        average_rating: Number(row?.average_rating) || 0,
        review_count: Number(row?.review_count) || 0,
      };
    },
    enabled: !!id,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["seller-reviews", id],
    queryFn: async () => {
      if (!id) return [];
      const { data } = await (supabase as any)
        .from("reviews")
        .select("id, rating, comment, created_at, lots(title), profiles!reviews_buyer_id_fkey(full_name)")
        .eq("seller_id", id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!id,
  });

  const memberSince = useMemo(() => {
    if (!seller?.created_at) return "";
    return new Date(seller.created_at).toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    });
  }, [seller?.created_at]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Vendeur introuvable</h1>
          <button onClick={() => navigate("/marketplace")} className="text-primary hover:underline">
            Retour au marketplace
          </button>
        </div>
      </div>
    );
  }

  const displayName = seller.company_name || seller.full_name || "Vendeur";
  const avg = rating?.average_rating || 0;
  const reviewCount = rating?.review_count || 0;

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 md:px-8 h-14">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Link to="/marketplace">
            <img src={varyLogo} alt="Vary" className="h-7 w-auto" />
          </Link>
          <div className="w-5" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-10">
        {/* Header section */}
        <section className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="font-heading font-bold text-primary text-xl">{initialsOf(displayName)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground leading-tight">
              {displayName}
            </h1>
            {seller.full_name && seller.company_name && (
              <p className="text-sm text-muted-foreground mt-0.5">{seller.full_name}</p>
            )}
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Membre depuis {memberSince}
              </span>
              {isApproved && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-semibold">
                  <BadgeCheck className="h-3 w-3" />
                  Vendeur vérifié
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Stats bar */}
        <section className="flex flex-wrap items-center gap-6 pb-6 border-b border-border">
          <div>
            <p className="font-heading font-bold text-foreground text-lg">{lots.length}</p>
            <p className="text-xs text-muted-foreground">Lots actifs</p>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Stars value={avg} />
              <span className="font-heading font-bold text-foreground text-lg">
                {reviewCount > 0 ? avg.toFixed(1) : "—"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("sellerProfile.reviewCount", { count: reviewCount })}
            </p>
          </div>
          {prefs?.years_in_business && (
            <div>
              <p className="font-heading font-bold text-foreground text-lg">{prefs.years_in_business}</p>
              <p className="text-xs text-muted-foreground">Années d'activité</p>
            </div>
          )}
        </section>

        {/* About */}
        {(() => {
          const allowedCountries = ((prefs as any)?.buyer_filters?.countries ?? []) as string[];
          const showAbout =
            !!seller.company_description ||
            (prefs?.categories?.length ?? 0) > 0 ||
            allowedCountries.length > 0;
          if (!showAbout) return null;
          return (
            <section className="space-y-4">
              <h2 className="font-heading text-lg font-bold text-foreground">À propos</h2>
              {seller.company_description && (
                <p className="text-sm text-muted-foreground leading-relaxed">{seller.company_description}</p>
              )}
              {(prefs?.categories?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Catégories</p>
                  <div className="flex flex-wrap gap-2">
                    {prefs!.categories!.map((c: string) => (
                      <span key={c} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {allowedCountries.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Pays livrés</p>
                  <div className="flex flex-wrap gap-2">
                    {allowedCountries.map((c: string) => (
                      <span key={c} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-foreground text-xs font-medium">
                        <MapPin className="h-3 w-3" />
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          );
        })()}

        {/* Active lots */}
        <section>
          <h2 className="font-heading text-lg font-bold text-foreground mb-4">
            Lots disponibles ({lots.length})
          </h2>
          {lots.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ce vendeur n'a pas de lots disponibles pour le moment.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {lots.map((l: any) => {
                const totalTTC = Math.round(l.price * 1.19);
                const ppu = l.units > 0 ? (l.price * 1.19 / l.units).toFixed(2) : null;
                return (
                  <LotCard
                    key={l.id}
                    id={l.id}
                    image={l.images?.[0] || ""}
                    title={l.title}
                    brand={l.brand}
                    price={`${totalTTC.toLocaleString("fr-FR")} €`}
                    pricePerUnit={ppu ? `${ppu} €` : undefined}
                    units={l.units}
                    location={l.location || ""}
                    category={l.category || ""}
                    discount={l.discount > 0 ? l.discount : undefined}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* Reviews */}
        <section>
          <h2 className="font-heading text-lg font-bold text-foreground mb-4">
            {t("sellerProfile.reviewsTitle", { count: reviewCount })}
          </h2>
          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("sellerProfile.noReviews")}</p>
          ) : (
            <ul className="space-y-4">
              {reviews.map((r: any) => {
                const buyerName = r.profiles?.full_name || "Acheteur";
                const parts = buyerName.split(/\s+/).filter(Boolean);
                const anon = parts.length > 1
                  ? `${parts[0]} ${parts[1][0]?.toUpperCase()}.`
                  : parts[0] || "Acheteur";
                return (
                  <li key={r.id} className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <div className="flex items-center gap-2">
                        <Stars value={r.rating} size="text-sm" />
                        <span className="text-xs font-semibold text-foreground">{anon}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{relTime(r.created_at)}</span>
                    </div>
                    {r.comment && (
                      <p className="text-sm text-foreground leading-relaxed mt-1">{r.comment}</p>
                    )}
                    {r.lots?.title && (
                      <p className="text-xs text-muted-foreground mt-2">Sur le lot : {r.lots.title}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      <LegalFooter />
    </div>
  );
};

export default SellerProfile;
