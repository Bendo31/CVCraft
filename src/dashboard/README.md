# Dossier Dashboard · CV Craft

Ce dossier contient le module complet de **Compte Rendu & Dashboard de pilotage** de la plateforme CV Craft.

## Fonctionnalités

1. **Compte Rendu des Utilisateurs** :
   - Nombre total de clients inscrits
   - Nombre de clients gratuits (`Free`)
   - Nombre de clients payants (`Premium` : Pro & Gold)
   - Taux de conversion global (Gratuit ➔ Premium)

2. **Indicateurs Financiers & Encaissements** :
   - Montant total encaissé en direct (en FCFA)
   - Chiffre d'affaires par offre :
     - Offre Pro (1 500 FCFA / 3 mois)
     - Offre Gold (2 500 FCFA / 1 mois)
     - Ventes unitaires de modèles de CV (100 FCFA via Tara Mobile Money)
   - Panier moyen par transaction

3. **Statistiques Produit & CVs** :
   - Total des CVs créés
   - Total des téléchargements PDF effectués
   - Modèles de CV les plus populaires et utilisés

4. **Tableaux Détaillés & Recherche** :
   - **Journal des Transactions** : Référence, date, offre, contact client, opérateur, montant et statut (`SUCCESS`, `PENDING`, `FAILURE`)
   - **Répertoire Clients** : Liste des inscrits, contacts, statut de l'abonnement et historique des dépenses
   - **Synthèse Exécutive** : Résumé d'activité prêt à l'emploi pour les rapports de gestion

5. **Outils d'Exportation & Impression** :
   - Export immédiat de tous les chiffres et transactions en **fichier CSV**
   - Fonction d'impression / export en **PDF** optimisée

6. **Double Mode de Données** :
   - **Mode Données Réelles** : Connecté en temps réel à Supabase via la fonction RPC `get_admin_dashboard_stats` et les tables `cvcraft_plan_payments`, `cvcraft_subscriptions`, `tara_payments`, `resumes`.
   - **Mode Simulation** : Permet de tester et visualiser instantanément l'ensemble des graphiques et fonctionnalités même avec une base de données vide.

## Accès

- Depuis l'application :
  - Lien dans le pied de page (`Dashboard Site`)
  - Bouton dans la barre de navigation
  - Bouton dans l'espace personnel de l'utilisateur
  - Accès direct par URL : `?view=admin` ou `?view=dashboard` ou hash `#admin`
