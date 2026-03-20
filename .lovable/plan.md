

# Audit : fonctionnalités manquantes pour la mise en ligne

## Ce qui fonctionne déjà
- Authentification (inscription, connexion, profils)
- CRUD lots vendeur (création, modification, suppression avec photos)
- Marketplace acheteur (consultation, filtres, détail lot)
- Favoris et panier (base de données)
- Messagerie basique entre utilisateurs
- Traduction automatique des messages
- i18n (FR/EN/ES)
- RLS et sécurité de base

---

## Fonctionnalités critiques manquantes (bloquantes pour la mise en ligne)

### 1. Paiement et transactions
- **Intégration Stripe** pour le paiement comptant des lots
- **Système d'escrow** : retenir les fonds jusqu'à confirmation de réception par l'acheteur
- **Commission automatique** de 19% côté acheteur (affichage) + marge Vary sur la transaction
- **Abonnements VIP** vendeur et acheteur à 299€/mois via Stripe
- **Facturation** : génération de factures pour chaque transaction

### 2. Flux de commande complet
- Page de checkout avec récapitulatif et paiement
- Statuts de commande (payé → en préparation → expédié → livré → confirmé)
- Tableau de bord des commandes côté acheteur ET vendeur
- Notification de confirmation de réception par l'acheteur (libère les fonds)
- Gestion des litiges / réclamations

### 3. Transport intégré
- Calcul automatique des frais de transport (API transporteur ou tarifs fixes par zone)
- Suivi de colis (numéro de tracking)
- Intégration avec un ou plusieurs transporteurs

### 4. Notifications
- Emails transactionnels (confirmation commande, expédition, réception)
- Notifications in-app (nouveau message, commande, etc.)
- Emails d'authentification brandés (domaine personnalisé)

### 5. Vérification des professionnels
- Validation manuelle ou automatique des inscriptions (SIRET, documents)
- Workflow d'approbation admin avant activation du compte
- Upload et vérification de documents légaux (Kbis, etc.)

---

## Fonctionnalités importantes (fortement recommandées)

### 6. Panel d'administration
- Dashboard admin pour Vary (vous)
- Modération des lots publiés
- Gestion des utilisateurs (suspension, vérification)
- Suivi des transactions et commissions
- Statistiques globales (GMV, nombre de lots, utilisateurs actifs)

### 7. Système d'avis réels
- Remplacer les avis fictifs par de vrais avis post-transaction
- Un acheteur ne peut noter qu'après confirmation de réception
- Note moyenne calculée dynamiquement

### 8. Recherche avancée
- Recherche full-text performante (Supabase Full Text Search ou Algolia)
- Filtres combinés plus robustes
- Tri par pertinence, prix, date, note

### 9. SEO et performance
- Méta-tags dynamiques par lot (Open Graph, Twitter Cards)
- Sitemap automatique
- Pages statiques optimisées (CGV, mentions légales, politique de confidentialité)

### 10. Pages légales obligatoires
- CGV / CGU
- Politique de confidentialité (RGPD)
- Mentions légales
- Politique de cookies

---

## Fonctionnalités secondaires (améliorations post-lancement)

- Système de recommandations personnalisées
- Analytics vendeur avancées (VIP)
- Programme de parrainage
- API publique pour intégrations tierces
- App mobile (PWA)
- Chat en temps réel (WebSocket au lieu de polling)
- Multi-devises

---

## Ordre de priorité recommandé

1. **Pages légales** (CGV, RGPD, mentions) — obligatoire légalement
2. **Paiement Stripe + escrow** — sans paiement, pas de marketplace
3. **Flux de commande complet** — checkout → livraison → confirmation
4. **Emails transactionnels** — domaine personnalisé + notifications
5. **Vérification des professionnels** — confiance et sécurité
6. **Panel admin** — pour gérer la plateforme
7. **Avis réels** — remplacer les fictifs
8. **Transport intégré** — calcul et suivi
9. **Recherche avancée** — améliorer l'expérience
10. **SEO + performance** — acquisition organique

C'est un chantier conséquent. Je recommande de commencer par les paiements Stripe + pages légales, car ce sont les deux prérequis absolus pour accepter de vraies transactions.

