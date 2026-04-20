import { Heart, MapPin, Package, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useFavorites } from "@/contexts/FavoritesContext";

interface LotCardProps {
  id: string;
  image: string;
  title: string;
  brand: string;
  price: string;
  pricePerUnit?: string;
  units: number;
  location: string;
  category: string;
  isNew?: boolean;
  discount?: number;
  sellerId?: string;
  sellerCompanyName?: string;
}

const LotCard = ({
  id, image, title, brand, price, pricePerUnit, units, location, isNew, discount,
  sellerId, sellerCompanyName,
}: LotCardProps) => {
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  const liked = isFavorite(id);

  return (
    <motion.div
      className="group cursor-pointer"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      onClick={() => navigate(`/lot/${id}`)}
    >
      <div className="relative aspect-square rounded-xl overflow-hidden bg-muted mb-3">
        <img src={image} alt={title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
        <button
          onClick={(e) => { e.stopPropagation(); toggleFavorite(id); }}
          className="absolute top-3 right-3 p-2 rounded-full bg-card/80 backdrop-blur-sm hover:bg-card transition-colors"
        >
          <Heart className={`h-4 w-4 transition-colors ${liked ? "fill-destructive text-destructive" : "text-foreground"}`} />
        </button>
        {isNew && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-xs font-semibold bg-primary text-primary-foreground">Nouveau</span>
        )}
        {discount != null && discount > 0 && (
          <span className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold bg-green-600 text-white">
            <TrendingDown className="h-3 w-3" />
            -{discount}%
          </span>
        )}
        {location && (
          <span className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-card/90 backdrop-blur-sm text-foreground">
            <MapPin className="h-3 w-3" />
            {location}
          </span>
        )}
      </div>
      <div className="space-y-1">
        <span className="text-xs font-semibold text-primary uppercase tracking-wide">{brand}</span>
        <h3 className="font-heading font-semibold text-foreground text-sm leading-snug line-clamp-2">{title}</h3>
        {sellerId && sellerCompanyName && (
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/vendeur/${sellerId}`); }}
            className="block text-[11px] text-muted-foreground hover:text-primary hover:underline truncate text-left"
          >
            {sellerCompanyName}
          </button>
        )}
        <div className="flex items-center gap-3 text-muted-foreground">
          <span className="flex items-center gap-1 text-xs">
            <Package className="h-3 w-3" />
            {units} pcs
          </span>
        </div>
        <div className="flex items-baseline gap-2 pt-1">
          <span className="font-heading font-bold text-foreground">{price}</span>
          {pricePerUnit && (
            <span className="text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              {pricePerUnit}/pc
            </span>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/lot/${id}`); }}
          className="w-full mt-2 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Voir lot
        </button>
      </div>
    </motion.div>
  );
};

export default LotCard;
