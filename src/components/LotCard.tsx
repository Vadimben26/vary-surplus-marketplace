import { Heart, Star, MapPin, Package } from "lucide-react";
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
  rating: number;
  location: string;
  category: string;
  isNew?: boolean;
}

const LotCard = ({
  id, image, title, brand, price, pricePerUnit, units, rating, location, isNew,
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
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-primary uppercase tracking-wide">{brand}</span>
          <div className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-primary text-primary" />
            <span className="text-xs font-medium text-foreground">{rating.toFixed(1)}</span>
          </div>
        </div>
        <h3 className="font-heading font-semibold text-foreground text-sm leading-snug line-clamp-2">{title}</h3>
        <div className="flex items-center gap-1 text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span className="text-xs">{location}</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Package className="h-3 w-3" />
          <span className="text-xs">{units} unités</span>
        </div>
        <div className="pt-1">
          <span className="font-heading font-bold text-foreground">{price}</span>
          {pricePerUnit && <span className="text-xs text-muted-foreground ml-1">({pricePerUnit}/u)</span>}
        </div>
      </div>
    </motion.div>
  );
};

export default LotCard;
