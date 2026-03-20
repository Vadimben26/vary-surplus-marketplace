

# Réorganisation de la navigation

## Côté vendeur : fusionner Litiges dans Suivi
- **SellerTracking.tsx** : ajouter des onglets internes ("En cours" / "Litiges") dans la page Suivi existante
- L'onglet "En cours" affiche les commandes avec statuts paid/preparing/shipped/delivered/confirmed
- L'onglet "Litiges" affiche les commandes disputed/refunded (contenu actuel de SellerDisputes)
- **BottomNav.tsx** : ret