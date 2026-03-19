

# Plan : Passer de mock data à un vrai backend avec Lovable Cloud

## Contexte

Actuellement, tout le site fonctionne avec des données fictives (mockLots.ts) et une authentification simulée via localStorage. Pour que les vendeurs puissent publier de vrais lots et que les acheteurs les voient, il faut mettre en place une vraie base de données, une authentification et un stockage d'images.

## Ce qui va changer pour l'utilisateur

- Les vendeurs pourront s'inscrire avec un vrai compte (email/mot de passe), publier des lots avec photos, les modifier et les supprimer
- Les acheteurs verront les vrais lots publiés par les vendeurs
- Les favoris, le panier et les messages seront liés au compte utilisateur
- Les données persistent entre les sessions et sont partagées entre tous les utilisateurs

## Architecture technique

### 1. Activer Lovable Cloud et configurer l'authentification

- Activer Supabase via Lovable Cloud
- Configurer l'authentification par email/mot de passe
- Remplacer le système localStorage (`src/lib/auth.ts`) par Supabase Auth
- Créer un contexte AuthContext pour gérer la session utilisateur dans toute l'app

### 2. Créer les tables de base de données

```text
profiles
├── id (uuid, FK auth.users)
├── email
├── full_name
├── phone
├── company_name
├── company_description
├── user_type (buyer | seller | both)
├── siret
├── created_at

lots
├── id (uuid)
├── seller_id (FK profiles)
├── title, brand, price, units
├── category, location, description
├── status (active | draft | sold)
├── images (text[])
├── created_at

lot_items
├── id (uuid)
├── lot_id (FK lots)
├── name, quantity, size

favorites
├── user_id (FK profiles)
├── lot_id (FK lots)

cart_items
├── user_id (FK profiles)
├── lot_id (FK lots)

messages
├── id, sender_id, receiver_id
├── lot_id (optional)
├── content, read, created_at
```

### 3. Sécurité (RLS)

- Tout le monde peut lire les lots actifs
- Seul le vendeur propriétaire peut créer/modifier/supprimer ses lots
- Chaque utilisateur ne voit que ses favoris et son panier
- Les messages sont visibles uniquement par l'expéditeur et le destinataire

### 4. Stockage d'images

- Créer un bucket `lot-images` pour les photos de lots
- Les vendeurs peuvent uploader des images lors de la création/modification d'un lot
- RLS : seul le propriétaire peut uploader/supprimer, lecture publique

### 5. Adapter le code existant

- **Marketplace** : remplacer `mockLots` par un fetch Supabase des lots actifs
- **LotDetail** : charger le lot + ses items + le profil vendeur depuis Supabase
- **SellerDashboard** : CRUD réel sur la table `lots` au lieu du state local
- **Favoris/Panier** : remplacer les contextes localStorage par des requêtes Supabase
- **Registration** : créer un vrai compte Supabase Auth + profil à l'inscription
- **Profile** : lire/modifier le profil depuis la base de données

### 6. Ordre d'implémentation

1. Activer Lovable Cloud + Auth
2. Migrations : tables + RLS + bucket storage
3. AuthContext + remplacement de `src/lib/auth.ts`
4. Adaptation des formulaires d'inscription (buyer + seller)
5. CRUD lots vendeur (SellerDashboard)
6. Marketplace + LotDetail (lecture depuis DB)
7. Favoris + Panier (DB au lieu de localStorage)
8. Messages (DB)

C'est un chantier conséquent, je procéderai étape par étape pour que chaque partie soit testable avant de passer à la suivante.

