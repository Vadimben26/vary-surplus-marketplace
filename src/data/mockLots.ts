import lotSneakers from "@/assets/lot-sneakers.jpg";
import lotBags from "@/assets/lot-bags.jpg";
import lotElectronics from "@/assets/lot-electronics.jpg";
import lotClothing from "@/assets/lot-clothing.jpg";
import lotSport from "@/assets/lot-sport.jpg";
import lotBeauty from "@/assets/lot-beauty.jpg";

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
}

export const mockLots: Lot[] = [
  {
    id: "1",
    image: lotSneakers,
    title: "Lot de 200 paires sneakers neuves – Mix tailles",
    brand: "Nike",
    price: "8 500 €",
    pricePerUnit: "42,50 €",
    units: 200,
    rating: 4.8,
    location: "Paris, France",
    category: "Sneakers",
    isNew: true,
  },
  {
    id: "2",
    image: lotBags,
    title: "Pack 50 sacs à main premium – Cuir véritable",
    brand: "Michael Kors",
    price: "12 000 €",
    pricePerUnit: "240 €",
    units: 50,
    rating: 4.6,
    location: "Milan, Italie",
    category: "Accessoires",
  },
  {
    id: "3",
    image: lotElectronics,
    title: "Lot 500 tablettes et smartphones reconditionnés A+",
    brand: "Samsung",
    price: "45 000 €",
    pricePerUnit: "90 €",
    units: 500,
    rating: 4.9,
    location: "Berlin, Allemagne",
    category: "Électronique",
    isNew: true,
  },
  {
    id: "4",
    image: lotClothing,
    title: "Mix 1000 pièces vêtements été – Surplus de marque",
    brand: "Zara",
    price: "6 200 €",
    pricePerUnit: "6,20 €",
    units: 1000,
    rating: 4.3,
    location: "Madrid, Espagne",
    category: "Vêtements",
  },
  {
    id: "5",
    image: lotSport,
    title: "Lot équipements sportswear neufs – Mix tailles",
    brand: "Adidas",
    price: "15 800 €",
    pricePerUnit: "31,60 €",
    units: 500,
    rating: 4.7,
    location: "Amsterdam, Pays-Bas",
    category: "Sport",
    isNew: true,
  },
  {
    id: "6",
    image: lotBeauty,
    title: "Pack 300 produits cosmétiques premium neufs",
    brand: "L'Oréal",
    price: "4 500 €",
    pricePerUnit: "15 €",
    units: 300,
    rating: 4.5,
    location: "Bruxelles, Belgique",
    category: "Beauté",
  },
  {
    id: "7",
    image: lotSneakers,
    title: "Lot 150 paires running – Fin de série",
    brand: "New Balance",
    price: "5 250 €",
    pricePerUnit: "35 €",
    units: 150,
    rating: 4.4,
    location: "Lisbonne, Portugal",
    category: "Sneakers",
  },
  {
    id: "8",
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
  },
];
