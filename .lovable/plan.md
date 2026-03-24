

## Améliorations recommandées — classées par impact

Voici les axes d'amélioration les plus pertinents pour ton application, par ordre de priorité :

---

### 1. Internationalisation du questionnaire acheteur (cohérence critique)
**Problème** : Le questionnaire acheteur contient encore beaucoup de textes en dur en français (titres d'étapes, labels de catégories, sources de référencement, noms de pays, options radio) alors que le vendeur utilise `t("...")` via i18n.

**Solution** : Ajouter les clés manquantes dans `en.json`, `es.json`, `fr.json` et remplacer tous les strings hardcodés dans `BuyerRegistration.tsx` par des appels `t()`.

**Fichiers** : `src/pages/BuyerRegistration.tsx`, `src/i18n/locales/fr.json`, `en.json`, `es.json`

---

### 2. Upload des photos boutique (acheteur)
**Problème** : Les photos sélectionnées dans le formulaire acheteur ne sont jamais uploadées vers le stockage — elles restent en mémoire locale et sont perdues.

**Solution** : Implémenter l'upload vers un bucket de stockage lors de la soumission, comme c'est déjà fait pour les images warehouse du vendeur. Sauvegarder les URLs dans `buyer_preferences`.

**Fichiers** : `src/pages/BuyerRegistration.tsx`, migration pour ajouter `store_photos text[]` à `buyer_preferences`

---

### 3. Mot de passe oublié / Reset password
**Problème** : Il n'existe aucun flux "Mot de passe oublié" sur la page de connexion. Un utilisateur qui oublie son mot de passe est bloqué.

**Solution** : Ajouter un lien "Mot de passe oublié ?" sur `Login.tsx` qui appelle `supabase.auth.resetPasswordForEmail()`, plus une page de confirmation.

**Fichiers** : `src/pages/Login.tsx`, nouvelle page `src/pages/ResetPassword.tsx`, `App.tsx`

---

### 4. Notifications en temps réel (messages non lus)
**Problème** : L'utilisateur ne sait pas qu'il a reçu un nouveau message sans ouvrir la page Messages manuellement.

**Solution** : Ajouter un badge de compteur sur l'icône Messages dans `BottomNav` et `TopNav` en utilisant Supabase Realtime pour écouter les nouveaux messages.

**Fichiers** : `src/components/BottomNav.tsx`, `src/components/TopNav.tsx`, hook `useUnreadMessages`

---

### 5. Page profil enrichie avec les préférences
**Problème** : La page profil n'affiche que `full_name`, `phone`, `company_name` et `company_description`. Toutes les préférences collectées pendant l'inscription (catégories, budget, styles, ciblage) ne sont jamais montrées.

**Solution** : Ajouter un onglet "Préférences" dans `Profile.tsx` qui charge et affiche les données de `buyer_preferences` ou `seller_preferences` avec possibilité de les modifier.

**Fichiers** : `src/pages/Profile.tsx`

---

### 6. Connexion sociale (Google / Apple)
**Problème** : Seule l'authentification email/mot de passe est disponible, ce qui ajoute de la friction à l'inscription.

**Solution** : Ajouter des boutons "Continuer avec Google" sur les pages Login et Registration en utilisant `supabase.auth.signInWithOAuth()`.

**Fichiers** : `src/pages/Login.tsx`, `src/pages/Registration.tsx`

---

### Récapitulatif des priorités

| # | Amélioration | Impact | Effort |
|---|---|---|---|
| 1 | i18n questionnaire acheteur | Cohérence | Moyen |
| 2 | Upload photos acheteur | Fonctionnel | Faible |
| 3 | Reset mot de passe | Critique UX | Faible |
| 4 | Notifications messages | Engagement | Moyen |
| 5 | Profil enrichi + préférences | Valeur données | Moyen |
| 6 | Connexion Google | Conversion | Faible |

