

# Suggestions d'améliorations pour Vary

Voici les axes d'amélioration identifiés après analyse complète du projet :

---

## 1. Catégories visuelles sur le Marketplace

Actuellement, la page Marketplace affiche directement la grille de lots sans mise en avant. Ajouter une **barre de catégories horizontale scrollable** (Femme, Homme, Enfants, Sport, Accessoires, Denim) avec des icônes ou images, comme sur Vinted/Airbnb.

**Fichiers** : `Marketplace.tsx`, potentiellement un nouveau `CategoryBar.tsx`

---

## 2. Badges sur la bottom nav (favoris & panier)

Afficher un **badge compteur** sur les icônes Favoris et Panier dans la barre de navigation inférieure pour indiquer le nombre d'articles sauvegardés/ajoutés.

**Fichier** : `BottomNav.tsx` (consommer `useFavorites` et `useCart`)

---

## 3. Tri et filtres améliorés

Ajouter des options de **tri** (prix croissant/décroissant, popularité, date d'ajout) et un filtre par **catégorie** directement dans le panneau de filtres existant.

**Fichiers** : `MarketplaceHeader.tsx`, `Marketplace.tsx`

---

## 4. Page Messages fonctionnelle

Actuellement vide. Créer une **interface de messagerie mock** avec une liste de conversations (vendeurs contactés) et un fil de discussion simple.

**Fichier** : `Messages.tsx`

---

## 5. Vue mobile optimisée de la page lot

Sur mobile, le bouton "Ajouter au panier" est perdu en bas de page. Ajouter un **footer sticky mobile** avec le prix et le bouton d'achat toujours visible.

**Fichier** : `LotDetail.tsx`

---

## 6. Animations et micro-interactions

- Ajouter une **animation au cœur** quand on like (scale bounce)
- **Toast de confirmation** plus visuels avec aperçu du lot ajouté au panier
- **Skeleton loading** sur les images des lots au chargement

**Fichiers** : `LotCard.tsx`, `LotDetail.tsx`

---

## 7. Section "Lots similaires" sur la page détail

Après les avis, afficher une **grille de lots similaires** (même catégorie/marque) pour encourager la navigation.

**Fichiers** : `LotDetail.tsx`

---

## 8. Processus de commande (checkout)

Le panier n'a pas de suite. Ajouter un **flow de validation de commande** avec récapitulatif, adresse de livraison, et confirmation (mock, sans paiement réel).

**Fichiers** : nouveau `Checkout.tsx`, mise à jour `Cart.tsx` et `App.tsx`

---

## Recommandation

Je suggère de commencer par les points **2** (badges nav), **5** (sticky mobile CTA) et **1** (catégories) car ils ont le plus gros impact visuel et UX pour un effort modéré. Dis-moi lesquels tu veux que j'implémente.

