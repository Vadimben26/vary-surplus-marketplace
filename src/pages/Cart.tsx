import { ShoppingCart, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import LegalFooter from "@/components/LegalFooter";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

const Cart = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { cartItems, removeFromCart, clearCart } = useCart();

  const { data: cartLots = [] } = useQuery({
    queryKey: ["cart-lots", cartItems],
    queryFn: async () => {
      if (cartItems.length === 0) return [];
      const { data } = await supabase
        .from("lots")
        .select("*")
        .in("id", cartItems);
      return data || [];
    },
  });

  const subtotal = cartLots.reduce((sum, lot) => sum + Number(lot.price), 0);
  const total = subtotal;

  const handleRemove = (id: string) => {
    removeFromCart(id);
    toast.info(t("cart.removed"));
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="px-4 md:px-8 py-8 pb-24 max-w-4xl mx-auto">
        <h1 className="font-heading text-2xl font-bold text-foreground mb-6">{t("cart.title")} ({cartLots.length})</h1>

        {cartLots.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingCart className="h-8 w-8 text-primary" />
            </div>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">{t("cart.empty")}</p>
            <Link to="/marketplace" className="inline-block px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary-dark transition-colors">
              {t("common.browseLots")}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-4">
              {cartLots.map((lot) => (
                <motion.div key={lot.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-2xl border border-border p-4 flex gap-4">
                  <Link to={`/lot/${lot.id}`} className="w-24 h-24 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                    {lot.images?.[0] && (
                      <img src={lot.images[0]} alt={lot.title} className="w-full h-full object-cover" />
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-primary uppercase">{lot.brand}</p>
                    <Link to={`/lot/${lot.id}`}>
                      <h3 className="font-heading font-semibold text-foreground text-sm line-clamp-2 hover:text-primary transition-colors">{lot.title}</h3>
                    </Link>
                    <p className="text-xs text-muted-foreground mt-1">{lot.units} {t("common.units")}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-heading font-bold text-foreground">{Number(lot.price).toLocaleString("fr-FR")} €</span>
                      <button onClick={() => handleRemove(lot.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="bg-card rounded-2xl border border-border p-6 h-fit sticky top-20">
              <h3 className="font-heading font-semibold text-foreground mb-4">{t("cart.summary")}</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("cart.subtotal")} ({cartLots.length} {cartLots.length > 1 ? t("cart.lots") : t("cart.lot")})</span>
                  <span className="text-foreground font-medium">{subtotal.toLocaleString("fr-FR")} €</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between">
                  <span className="font-heading font-bold text-foreground">{t("cart.total")}</span>
                  <span className="font-heading font-bold text-primary text-lg">{total.toLocaleString("fr-FR")} €</span>
                </div>
              </div>
              <button
                onClick={() => navigate("/checkout")}
                className="w-full mt-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary-dark transition-colors"
              >
                {t("checkout.proceedToPayment")}
              </button>
            </div>
          </div>
        )}
      </main>
      <LegalFooter />
      <BottomNav />
    </div>
  );
};

export default Cart;
