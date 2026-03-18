import { Link, useLocation } from "react-router-dom";
import { Heart, ShoppingCart, MessageCircle } from "lucide-react";
import varyLogo from "@/assets/vary-logo.png";

const navItems = [
  { icon: null, label: "Accueil", path: "/", isLogo: true },
  { icon: Heart, label: "Favoris", path: "/favoris", isLogo: false },
  { icon: ShoppingCart, label: "Panier", path: "/panier", isLogo: false },
  { icon: MessageCircle, label: "Messages", path: "/messages", isLogo: false },
];

const BottomNav = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.isLogo ? (
                <img src={varyLogo} alt="Vary" className="h-6 w-auto" />
              ) : (
                item.icon && <item.icon className={`h-5 w-5 ${isActive ? "text-primary" : ""}`} />
              )}
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
