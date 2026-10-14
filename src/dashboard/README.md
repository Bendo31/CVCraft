# Dossier Dashboard · CapVers

Ce dossier contient le module complet de **Compte Rendu & Dashboard de pilotage** de la plateforme CapVers.

## Fonctionnalités

1. **Compte Rendu des Utilisateurs** :
   - Nombre total de clients inscrits
   - Nombre de clients gratuits (`Free`)
   - Nombre de clients payants (`Premium` : Pro & Gold)
   - Taux de conversion global (Gratuit ➔ Premium)

2. **Indicateurs Financiers & Encaissements** :
   - Montant total encaissé en direct (en FCFA)
   - Chiffre d'affaires par offre :
     - Offre Pro (100 FCFA / 3 mois)
     - Offre Gold (100 FCFA / 1 mois)
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

## Accès (Adresse Spécifique)

Le dashboard est masqué des menus publics de navigation pour des raisons de confidentialité. Il est accessible uniquement via ses adresses d'accès directes :

- **Chemin direct** :
  - `http://localhost:5173/dashboard` ou `https://votre-domaine.com/dashboard`
  - ou `/admin`
- **Hash direct** :
  - `https://votre-domaine.com/#dashboard` ou `#admin`
- **Paramètre URL** :
  - `https://votre-domaine.com/?view=admin` ou `?admin`

