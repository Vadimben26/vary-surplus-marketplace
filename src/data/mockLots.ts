import lotClothing from "@/assets/lot-clothing.jpg";
import lotBags from "@/assets/lot-bags.jpg";
import lotSneakers from "@/assets/lot-sneakers.jpg";
import lotBeauty from "@/assets/lot-beauty.jpg";
import lotSport from "@/assets/lot-sport.jpg";
import lotElectronics from "@/assets/lot-electronics.jpg";

export interface LotItem {
  name: string;
  quantity: number;
  size: string;
}

export interface SellerInfo {
  name: string;
  rating: number;
  sales: number;
  location: string;
  description: string;
}

export interface Review {
  author: string;
  rating: number;
  date: string;
  comment: string;
}

export interface Lot {
  id: string;
  image: string;
  images: string[];
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
  items: LotItem[];
  seller: SellerInfo;
  reviews: Review[];
}

export const mockLots: Lot[] = [
  {
    id: "1",
    image: lotClothing,
    images: [lotClothing, lotSport, lotBeauty, lotSneakers],
    title: "Mix 1000 pièces vêtements été – Surplus de marque",
    brand: "Zara",
    price: "6 200 €",
    pricePerUnit: "6,20 €",
    units: 1000,
    rating: 4.3,
    location: "Madrid, Espagne",
    category: "Vêtements",
    isNew: true,
    description: "Lot de 1000 pièces de vêtements été neufs avec étiquettes. Mix varié de la collection printemps/été, idéal pour revendeurs multi-marques.",
    sizes: "XS - XXL",
    items: [
      { name: "T-shirt col rond basique", quantity: 250, size: "S-XL" },
      { name: "Robe midi fleurie", quantity: 150, size: "XS-L" },
      { name: "Short chino", quantity: 200, size: "S-XXL" },
      { name: "Chemise lin manches courtes", quantity: 180, size: "M-XL" },
      { name: "Top crop côtelé", quantity: 120, size: "XS-M" },
      { name: "Bermuda cargo", quantity: 100, size: "S-XL" },
    ],
    seller: {
      name: "TextilSur Madrid",
      rating: 4.5,
      sales: 127,
      location: "Madrid, Espagne",
      description: "Grossiste textile depuis 2015, spécialisé dans les surplus de grandes marques européennes. Livraison rapide dans toute l'UE.",
    },
    reviews: [
      { author: "Karim B.", rating: 5, date: "12 fév. 2026", comment: "Excellent lot, qualité conforme à la description. Les tailles étaient bien réparties." },
      { author: "Sophie M.", rating: 4, date: "28 jan. 2026", comment: "Bon rapport qualité/prix. Quelques pièces avec de légers défauts mais rien de grave." },
      { author: "Marco R.", rating: 4, date: "15 jan. 2026", comment: "Livraison rapide, emballage soigné. Je recommande ce vendeur." },
    ],
  },
  {
    id: "2",
    image: lotClothing,
    images: [lotClothing, lotSneakers, lotSport, lotBags],
    title: "Surplus 800 pièces denim premium – Neufs",
    brand: "Levi's",
    price: "18 400 €",
    pricePerUnit: "23 €",
    units: 800,
    rating: 4.8,
    location: "Lyon, France",
    category: "Vêtements",
    isNew: true,
    description: "Lot premium de 800 pièces denim Levi's neuves. Surplus de production de la saison passée, toutes avec étiquettes d'origine.",
    sizes: "28 - 38",
    items: [
      { name: "Jean 501 Original Fit", quantity: 200, size: "28-36" },
      { name: "Jean 511 Slim Fit", quantity: 180, size: "29-38" },
      { name: "Veste trucker denim classique", quantity: 120, size: "S-XL" },
      { name: "Short denim 501 Hemmed", quantity: 150, size: "28-34" },
      { name: "Jean 721 High Rise Skinny (F)", quantity: 100, size: "25-32" },
      { name: "Chemise western denim", quantity: 50, size: "M-XXL" },
    ],
    seller: {
      name: "DenimStock Lyon",
      rating: 4.9,
      sales: 89,
      location: "Lyon, France",
      description: "Spécialiste du denim de marque depuis 2018. Tous nos produits sont certifiés authentiques avec traçabilité complète.",
    },
    reviews: [
      { author: "Julie L.", rating: 5, date: "5 mars 2026", comment: "Qualité Levi's impeccable. Le lot correspondait exactement à la description détaillée." },
      { author: "Thomas D.", rating: 5, date: "20 fév. 2026", comment: "Deuxième commande chez ce vendeur, toujours au top. Les 501 se vendent comme des petits pains." },
      { author: "Amina K.", rating: 4, date: "8 fév. 2026", comment: "Très bon lot, juste la répartition des tailles un peu déséquilibrée sur les vestes." },
    ],
  },
  {
    id: "3",
    image: lotBags,
    images: [lotBags, lotClothing, lotBeauty, lotElectronics],
    title: "Pack 50 sacs à main premium – Cuir véritable",
    brand: "Michael Kors",
    price: "12 000 €",
    pricePerUnit: "240 €",
    units: 50,
    rating: 4.6,
    location: "Milan, Italie",
    category: "Vêtements",
    description: "Collection de 50 sacs à main Michael Kors en cuir véritable. Mix de modèles classiques et tendance, parfait pour boutiques haut de gamme.",
    sizes: "Taille unique",
    items: [
      { name: "Sac Jet Set Travel tote", quantity: 15, size: "Unique" },
      { name: "Sac Mercer crossbody", quantity: 12, size: "Unique" },
      { name: "Pochette Bradshaw clutch", quantity: 10, size: "Unique" },
      { name: "Sac Cece medium", quantity: 8, size: "Unique" },
      { name: "Mini sac Greenwich", quantity: 5, size: "Unique" },
    ],
    seller: {
      name: "Lusso Wholesale Milano",
      rating: 4.7,
      sales: 203,
      location: "Milan, Italie",
      description: "Distributeur agréé d'accessoires de luxe. 10 ans d'expérience dans le wholesale haut de gamme en Europe.",
    },
    reviews: [
      { author: "Émilie V.", rating: 5, date: "1 mars 2026", comment: "Sacs magnifiques, cuir de très belle qualité. Mes clientes adorent." },
      { author: "Pierre G.", rating: 4, date: "14 fév. 2026", comment: "Bon lot global. Emballage individuel soigné, ce qui est appréciable." },
    ],
  },
  {
    id: "4",
    image: lotClothing,
    images: [lotClothing, lotBags, lotSport, lotSneakers],
    title: "Lot 600 manteaux hiver – Fin de collection",
    brand: "Tommy Hilfiger",
    price: "24 000 €",
    pricePerUnit: "40 €",
    units: 600,
    rating: 4.5,
    location: "Amsterdam, Pays-Bas",
    category: "Vêtements",
    isNew: true,
    description: "600 manteaux et doudounes hiver Tommy Hilfiger neufs. Fin de collection de la saison passée avec étiquettes d'origine.",
    sizes: "S - XXL",
    items: [
      { name: "Doudoune longue Essential", quantity: 150, size: "S-XL" },
      { name: "Parka doublée sherpa", quantity: 120, size: "M-XXL" },
      { name: "Manteau laine classique", quantity: 100, size: "S-L" },
      { name: "Blouson aviateur", quantity: 80, size: "S-XL" },
      { name: "Doudoune légère sans manches", quantity: 90, size: "M-XXL" },
      { name: "Trench imperméable", quantity: 60, size: "S-XL" },
    ],
    seller: {
      name: "NordWear BV",
      rating: 4.6,
      sales: 156,
      location: "Amsterdam, Pays-Bas",
      description: "Grossiste spécialisé en vêtements d'extérieur et manteaux de marque. Partenaire officiel de liquidation pour plusieurs marques premium.",
    },
    reviews: [
      { author: "Lucas M.", rating: 5, date: "10 mars 2026", comment: "Manteaux de très belle qualité, les doudounes Essential sont un best-seller chez nous." },
      { author: "Fatima A.", rating: 4, date: "25 fév. 2026", comment: "Bon lot, livraison rapide depuis Amsterdam. Les tailles sont bien équilibrées." },
      { author: "David S.", rating: 5, date: "12 fév. 2026", comment: "Troisième commande chez NordWear, jamais déçu. Rapport qualité/prix imbattable." },
    ],
  },
  {
    id: "5",
    image: lotClothing,
    title: "Surplus 1200 t-shirts basiques – Coton bio",
    brand: "H&M",
    price: "4 800 €",
    pricePerUnit: "4 €",
    units: 1200,
    rating: 4.2,
    location: "Paris, France",
    category: "Vêtements",
    description: "1200 t-shirts basiques en coton bio H&M. Couleurs variées, idéal pour revendeurs en volume ou personnalisation.",
    sizes: "XS - XL",
    items: [
      { name: "T-shirt col rond blanc", quantity: 300, size: "XS-XL" },
      { name: "T-shirt col rond noir", quantity: 300, size: "XS-XL" },
      { name: "T-shirt col rond gris chiné", quantity: 200, size: "S-XL" },
      { name: "T-shirt col rond navy", quantity: 200, size: "S-L" },
      { name: "T-shirt col rond kaki", quantity: 100, size: "M-XL" },
      { name: "T-shirt col rond beige", quantity: 100, size: "S-L" },
    ],
    seller: {
      name: "EcoTextile Paris",
      rating: 4.3,
      sales: 312,
      location: "Paris, France",
      description: "Grossiste éco-responsable spécialisé dans les basiques en coton bio. Livraison sous 48h en France métropolitaine.",
    },
    reviews: [
      { author: "Nathalie P.", rating: 4, date: "8 mars 2026", comment: "Bons basiques, le coton est doux et résistant. Parfait pour notre boutique de personnalisation." },
      { author: "Omar H.", rating: 4, date: "22 fév. 2026", comment: "Rapport qualité/prix excellent. Les couleurs sont fidèles aux photos." },
      { author: "Claire D.", rating: 5, date: "5 fév. 2026", comment: "Commande livrée en 2 jours, tout était impeccable. Je recommande vivement." },
    ],
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
    description: "300 pièces d'accessoires Hugo Boss en cuir : portefeuilles, ceintures et porte-cartes. Tous neufs en boîte d'origine.",
    sizes: "Taille unique",
    items: [
      { name: "Portefeuille bi-fold cuir grainé", quantity: 80, size: "Unique" },
      { name: "Ceinture cuir lisse boucle logo", quantity: 70, size: "85-110cm" },
      { name: "Porte-cartes cuir saffiano", quantity: 60, size: "Unique" },
      { name: "Ceinture cuir réversible", quantity: 50, size: "85-105cm" },
      { name: "Portefeuille long zippé", quantity: 40, size: "Unique" },
    ],
    seller: {
      name: "LederHaus Berlin",
      rating: 4.8,
      sales: 178,
      location: "Berlin, Allemagne",
      description: "Distributeur allemand d'accessoires en cuir de luxe. Certifié par les marques, garantie d'authenticité sur chaque pièce.",
    },
    reviews: [
      { author: "Antoine L.", rating: 5, date: "6 mars 2026", comment: "Cuir de qualité exceptionnelle, les ceintures Boss se vendent très bien en boutique." },
      { author: "Isabelle F.", rating: 5, date: "18 fév. 2026", comment: "Emballage soigné, chaque pièce dans sa boîte. Vendeur très professionnel." },
      { author: "Youssef B.", rating: 4, date: "2 fév. 2026", comment: "Bon lot, quelques ceintures en tailles grandes manquantes mais globalement satisfait." },
    ],
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
    description: "500 chemises business Ralph Lauren directement de l'usine. Coton égyptien, coupe classique et slim fit disponibles.",
    sizes: "S - XXL",
    items: [
      { name: "Chemise oxford coton blanche", quantity: 120, size: "S-XXL" },
      { name: "Chemise slim fit bleu ciel", quantity: 100, size: "S-XL" },
      { name: "Chemise rayée classique", quantity: 80, size: "M-XXL" },
      { name: "Chemise popeline rose", quantity: 70, size: "S-XL" },
      { name: "Chemise lin mélangé beige", quantity: 65, size: "M-XL" },
      { name: "Chemise flanelle à carreaux", quantity: 65, size: "S-XXL" },
    ],
    seller: {
      name: "PortoTextil Lda",
      rating: 4.9,
      sales: 94,
      location: "Lisbonne, Portugal",
      description: "Fabricant et grossiste textile basé au Portugal. Accès direct aux surplus d'usines locales produisant pour les grandes marques.",
    },
    reviews: [
      { author: "Marie C.", rating: 5, date: "11 mars 2026", comment: "Qualité exceptionnelle, le coton égyptien est magnifique. Mes clients sont ravis." },
      { author: "Stéphane W.", rating: 5, date: "27 fév. 2026", comment: "Les chemises Ralph Lauren à ce prix, c'est incroyable. Tout était conforme." },
      { author: "Elena P.", rating: 5, date: "15 fév. 2026", comment: "Vendeur au top, communication parfaite et livraison soignée depuis le Portugal." },
    ],
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
    description: "400 robes été Mango de la collection printemps. Motifs floraux et unis, parfait pour la saison à venir.",
    sizes: "XS - L",
    items: [
      { name: "Robe midi fleurie manches bouffantes", quantity: 80, size: "XS-L" },
      { name: "Robe courte unie lin", quantity: 70, size: "S-L" },
      { name: "Robe longue bohème imprimée", quantity: 65, size: "XS-M" },
      { name: "Robe chemise rayée", quantity: 60, size: "S-L" },
      { name: "Robe wrap jersey unie", quantity: 65, size: "XS-L" },
      { name: "Robe à bretelles satin", quantity: 60, size: "XS-M" },
    ],
    seller: {
      name: "MediterráneoStock",
      rating: 4.4,
      sales: 67,
      location: "Barcelone, Espagne",
      description: "Grossiste espagnol spécialisé en mode féminine. Partenaire de liquidation pour plusieurs marques de fast-fashion européennes.",
    },
    reviews: [
      { author: "Camille R.", rating: 5, date: "9 mars 2026", comment: "Les robes sont superbes, les motifs floraux ont beaucoup plu à ma clientèle." },
      { author: "Laure B.", rating: 4, date: "20 fév. 2026", comment: "Bon lot dans l'ensemble, quelques robes avec de petites imperfections mais vendables." },
      { author: "Aïcha N.", rating: 4, date: "3 fév. 2026", comment: "Bonne qualité Mango, les tailles XS-S étaient un peu sous-représentées." },
    ],
  },
];

export const getLotById = (id: string): Lot | undefined => {
  return mockLots.find((lot) => lot.id === id);
};
