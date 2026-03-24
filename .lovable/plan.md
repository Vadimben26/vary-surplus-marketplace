

## Améliorations possibles pour les questionnaires et l'application

Voici les axes d'amélioration identifiés, classés par impact :

---

### 1. Sauvegarde des données du questionnaire en base
**Probleme actuel** : Les formulaires collectent beaucoup de données (budget, marques, styles, catégories, segments, etc.) mais seuls `full_name`, `phone`, `company_name`, `siret` et `company_description` sont sauvegardés dans le profil. Tout le reste est perdu.

**Solution** : Créer des tables dédiées (`buyer_preferences`, `seller_preferences`) pour stocker toutes les réponses du questionnaire (type de magasin, CA, catégories, styles, budget, marques recherchées, ciblage acheteur, etc.)

---

### 2. Barre de progression visuelle
**Actuellement** : Le stepper montre les numéros d'étapes mais pas de progression globale en pourcentage.

**Solution** : Ajouter une barre de progression animée sous le stepper (ex: "40% complété") pour donner un sentiment d'avancement.

---

### 3. Sauvegarde automatique entre les étapes
**Probleme** : Si l'utilisateur ferme la page à l'étape 3, il perd tout.

**Solution** : Sauvegarder les données dans `localStorage` à chaque changement d'étape, et les restaurer au chargement.

---

### 4. Validation en temps réel (inline)
**Actuellement** : Les erreurs apparaissent en toast quand on clique "Suivant".

**Solution** : Afficher les erreurs sous chaque champ en rouge dès que l'utilisateur quitte le champ (onBlur), pour un feedback immédiat.

---

### 5. Internationalisation du questionnaire acheteur
**Probleme** : Le questionnaire acheteur a beaucoup de textes en dur en français (labels, options radio, messages de succès) au lieu d'utiliser les clés i18n.

**Solution** : Remplacer tous les textes hardcodés par des appels `t("...")`.

---

### 6. Upload des photos (buyer store photos)
**Actuellement** : Les photos sélectionnées dans le formulaire acheteur ne sont pas uploadées vers le stockage.

**Solution** : Uploader vers le bucket de stockage lors de la soumission, comme c'est fait pour les images warehouse du vendeur.

---

### 7. Footer légal sur les formulaires
**Actuellement** : Pas de `LegalFooter` sur les pages d'inscription acheteur/vendeur.

**Solution** : Ajouter le composant `LegalFooter` en bas des deux formulaires.

---

### Recommandation de priorité
1. **Sauvegarde des données en base** (critique - sans ça les questionnaires ne servent à rien)
2. **Internationalisation acheteur** (cohérence)
3. **Sauvegarde locale entre étapes** (UX)
4. **Validation inline** (UX)
5. **Upload photos** (fonctionnel)
6. **Barre de progression** (cosmétique)
7. **Footer légal** (conformité)

