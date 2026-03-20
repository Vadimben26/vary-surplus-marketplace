import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Heart, ShoppingCart, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import varyLogo from "@/assets/vary-logo.png";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const BottomNav = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { favorites } = useFavorites();
  const { cartItems } = useCart();
  const { profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread message count
  useEffect(() => {
    if (!profile?.id) return;

    const fetchUnread = async () => {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", profile.id)
        .eq("read", false);
      setUnreadCount(count || 0);
    };

    fetchUnread();

    const channel = supabase
      .channel("unread-badge")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => fetchUnread()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.id]);

  // Also listen for custom events from Messages page
  useEffect(() => {
    const handler = (e: Event) => {
      setUnreadCount((e as CustomEvent).detail);
    };
    window.addEventListener("vary-unread-count", handler);
    return () => window.removeEventListener("vary-unread-count", handler);
  }, []);

  const navItems = [
    { icon: null, label: t("nav.home"), path: "/marketplace", isLogo: true },
    { icon: Heart, label: t("nav.favorites"), path: "/favoris", isLogo: false },
    { icon: ShoppingCart, label: t("nav.cart"), path: "/panier", isLogo: false },
    { icon: MessageCircle, label: t("nav.messages"), path: "/messages", isLogo: false },
  ];

  const getBadge = (path: string) => {
    if (path === "/favoris") return favorites.length;
    if (path === "/panier") return cartItems.length;
    if (path === "/messages") return unreadCount;
    return 0;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border">
      <div className="flex items-center justify-around h-14 md:h-16 px-4 max-w-[1600px] mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path === "/messages" && location.pathname.startsWith("/messages"));
          const badge = getBadge(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`relative flex flex-col items-center gap-0.5 px-4 md:px-6 py-1.5 rounded-xl transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.isLogo ? (
                <motion.img
                  src={varyLogo}
                  alt="Vary"
                  className="h-6 md:h-7 w-auto"
                  whileHover={{ scale: 1.1, rotate: -3 }}
                  whileTap={{ scale: 0.9 }}
                />
              ) : (
                <span className="relative">
                  {item.icon && <item.icon className={`h-5 w-5 md:h-6 md:w-6 ${isActive ? "text-primary" : ""}`} />}
                  {badge > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center"
                    >
                      {badge > 9 ? "9+" : badge}
                    </motion.span>
                  )}
                </span>
              )}
              <span className="text-[10px] md:text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
