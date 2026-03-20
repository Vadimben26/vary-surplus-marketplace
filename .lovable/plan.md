

# Mode développeur : accès complet à toutes les fonctionnalités

## Problème
Tu n'as pas d'abonnement VIP actif en base, donc toutes les fonctionnalités VIP (insights acheteurs, offres anticipées, etc.) sont verrouillées.

## Solution
Ajouter un **panneau développeur** (visible uniquement pour ton compte) qui permet de basculer instantanément les features VIP on/off sans passer par Stripe.

### Ce qui sera fait

1. **Créer une subscription VIP factice en base** pour ton profil (`buyer_vip` + `seller_vip` avec statut `active`) — cela déverrouille immédiatement toutes les features VIP existantes sans modifier le code applicatif.

2. **Ajouter un petit toggle "Dev Mode"** dans la page Profil (visible uniquement si ton email = `vadimbenchetrit@icloud.com`) qui permet d'activer/désactiver les abonnements VIP directement en base. Un simple switch pour `buyer_vip` et `seller_vip`.

### Détails techniques
- Migration SQL : `INSERT INTO subscriptions` avec `plan = 'buyer_vip'` et `plan = 'seller_vip'` pour ton `profile.id`
- Petit composant `DevPanel` dans la page Profil avec deux toggles
- Les toggles insèrent/suppriment des lignes dans `subscriptions` (nécessite une policy UPDATE/DELETE pour le dev)
- Condition d'affichage : `profile.email === 'vadimbenchetrit@icloud.com'`

Cela te donnera accès à tout (insights VIP vendeur, offres anticipées acheteur, etc.) immédiatement pendant le développement.

