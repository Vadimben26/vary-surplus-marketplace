import { Link, useLocation } from "react-router-dom";
import { Heart, ShoppingCart, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import varyLogo from "@/assets/vary-logo.png";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useCart } from "@/contexts/CartContext";

const navItems = [
  { icon: null, label: "Accueil", path: "/marketplace", isLogo: true },
  { icon: Heart, label: "Favoris", path: "/favoris", isLogo: false },
  { icon: ShoppingCart, label: "Panier", path: "/panier", isLogo: false },
  { icon: MessageCircle, label: "Messages", path: "/messages", isLogo: false },
];

const BottomNav = () => {
  const location = useLocation();
  const { favorites } = useFavorites();
  const { cartItems } = useCart();

  const getBadge = (path: string) => {
    if (path === "/favoris") return favorites.length;
    if (path === "/panier") return cartItems.length;
    return 0;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border">
      <div className="flex items-center justify-around h-14 md:h-16 px-4 max-w-[1600px] mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
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
