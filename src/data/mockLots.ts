import lotClothing from "@/assets/lot-clothing.jpg";
import lotBags from "@/assets/lot-bags.jpg";

export interface Lot {
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
  description?: string;
  sizes?: string;
  condition?: string;
}

export const mockLots: Lot[] = [
  {
    id: "1",
    image: lotClothing,
    title: "Mix 1000 pièces vêtements été – Surplus de marque",
    brand: "Zara",
    price: "6 200 €",
    pricePerUnit: "6,20 €",
    units: 1000,
    rating: 4.3,
    location: "Madrid, Espagne",
    category: "Vêtements",
    isNew: true,
    description: "Lot de 1000 pièces de vêtements été neufs avec étiquettes. Mix de t-shirts, robes, shorts et chemises. Toutes tailles disponibles du XS au XXL.",
    sizes: "XS - XXL",
    condition: "Neuf avec étiquettes",
  },
  {
    id: "2",
    image: lotClothing,
    title: "Surplus 800 pièces denim premium – Neufs",
    brand: "Levi's",
    price: "18 400 €",
    pricePerUnit: "23 €",
    units: 800,
    rating: 4.8,
    location: "Lyon, France",
    category: "Vêtements",
    isNew: true,
    description: "Lot de 800 pièces denim premium neuves. Jeans, vestes et shorts en denim de qualité supérieure. Surplus de production de la dernière saison.",
    sizes: "28 - 38",
    condition: "Neuf avec étiquettes",
  },
  {
    id: "3",
    image: lotBags,
    title: "Pack 50 sacs à main premium – Cuir véritable",
    brand: "Michael Kors",
    price: "12 000 €",
    pricePerUnit: "240 €",
    units: 50,
    rating: 4.6,
    location: "Milan, Italie",
    category: "Vêtements",
    description: "Collection de 50 sacs à main en cuir véritable. Mix de modèles classiques et tendance. Parfait pour boutiques haut de gamme.",
    sizes: "Taille unique",
    condition: "Neuf sans étiquettes",
  },
  {
    id: "4",
    image: lotClothing,
    title: "Lot 600 manteaux hiver – Fin de collection",
    brand: "Tommy Hilfiger",
    price: "24 000 €",
    pricePerUnit: "40 €",
    units: 600,
    rating: 4.5,
    location: "Amsterdam, Pays-Bas",
    category: "Vêtements",
    isNew: true,
    description: "600 manteaux et doudounes hiver neufs. Fin de collection de la saison passée. Qualité premium, toutes tailles.",
    sizes: "S - XXL",
    condition: "Neuf avec étiquettes",
  },
  {
    id: "5",
    image: lotClothing,
    title: "Surplus 1200 t-shirts basiques – Cotton bio",
    brand: "H&M",
    price: "4 800 €",
    pricePerUnit: "4 €",
    units: 1200,
    rating: 4.2,
    location: "Paris, France",
    category: "Vêtements",
    description: "1200 t-shirts basiques en coton bio. Couleurs variées : blanc, noir, gris, navy. Idéal pour revendeurs en volume.",
    sizes: "XS - XL",
    condition: "Neuf avec étiquettes",
  },
  {
    id: "6",
    image: lotBags,
    title: "Lot 300 accessoires cuir – Mix portefeuilles et ceintures",
    brand: "Hugo Boss",
    price: "9 600 €",
    pricePerUnit: "32 €",
    units: 300,
    rating: 4.7,
    location: "Berlin, Allemagne",
    category: "Vêtements",
    description: "300 pièces d'accessoires en cuir : portefeuilles, ceintures et porte-cartes. Qualité premium, neufs en boîte.",
    sizes: "Taille unique",
    condition: "Neuf en boîte",
  },
  {
    id: "7",
    image: lotClothing,
    title: "Pack 500 chemises business – Surplus usine",
    brand: "Ralph Lauren",
    price: "15 000 €",
    pricePerUnit: "30 €",
    units: 500,
    rating: 4.9,
    location: "Lisbonne, Portugal",
    category: "Vêtements",
    isNew: true,
    description: "500 chemises business premium directement de l'usine. Coton égyptien, coupe classique et slim fit disponibles.",
    sizes: "S - XXL",
    condition: "Neuf avec étiquettes",
  },
  {
    id: "8",
    image: lotClothing,
    title: "Lot 400 robes été – Collection printemps",
    brand: "Mango",
    price: "8 000 €",
    pricePerUnit: "20 €",
    units: 400,
    rating: 4.4,
    location: "Barcelone, Espagne",
    category: "Vêtements",
    description: "400 robes été de la collection printemps. Motifs floraux et unis. Parfait pour la saison à venir.",
    sizes: "XS - L",
    condition: "Neuf avec étiquettes",
  },
];

export const getLotById = (id: string): Lot | undefined => {
  return mockLots.find((lot) => lot.id === id);
};
