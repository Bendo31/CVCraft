# GEMINI.md

## Contexte du projet

CV Craft est une plateforme SaaS africaine de création de CV professionnels.

La mission du produit est simple :

> Permettre à toute personne de créer un CV professionnel depuis son téléphone en moins de 5 minutes.

Le projet cible prioritairement :

* Étudiants
* Jeunes diplômés
* Chercheurs d'emploi
* Stagiaires
* Freelances
* Entrepreneurs souhaitant disposer d'un profil professionnel

Le produit est conçu en priorité pour le marché africain francophone avant une extension internationale.

---

# Vision Produit

CV Craft n'est pas un simple générateur de PDF.

L'objectif à long terme est de devenir une plateforme de gestion d'identité professionnelle permettant à un utilisateur de :

* Créer son CV
* Générer un profil professionnel en ligne
* Générer un QR Code
* Partager son profil
* Créer une lettre de motivation
* Être visible par les recruteurs
* À terme se connecter à l'écosystème WAYA

Cependant, le développement doit rester progressif.

---

# Principe Fondamental

Toujours privilégier :

1. La simplicité
2. La rapidité
3. La valeur utilisateur immédiate

Éviter :

* Les fonctionnalités complexes prématurées
* Le sur-développement
* Les architectures inutiles
* Les optimisations précoces

Chaque fonctionnalité doit répondre à la question :

> Cette fonctionnalité aide-t-elle réellement l'utilisateur à obtenir un emploi plus rapidement ?

Si la réponse est non, elle n'est pas prioritaire.

---

# Roadmap Produit

## Phase 1 — MVP CV Builder

Objectif :

Permettre la création d'un CV professionnel complet.

Fonctionnalités :

* Informations personnelles
* Expériences professionnelles
* Formations
* Compétences
* Langues
* Centres d'intérêt
* Photo de profil optionnelle
* Aperçu temps réel
* Export PDF
* Sauvegarde locale

Critères de succès :

* CV créé en moins de 5 minutes
* Utilisation fluide sur mobile
* Export PDF fiable

---

## Phase 2 — Comptes Utilisateurs

Fonctionnalités :

* Authentification
* Sauvegarde cloud
* Gestion de plusieurs CV
* Duplication de CV
* Mise à jour de CV existants

Critères de succès :

* Retour des utilisateurs sur la plateforme
* Fidélisation

---

## Phase 3 — Premium

Fonctionnalités :

* Modèles premium
* Personnalisation avancée
* Suppression du branding
* QR Code automatique
* Lien public de partage

Monétisation :

* Freemium
* Premium mensuel
* Premium annuel

---

## Phase 4 — Lettres de Motivation

Fonctionnalités :

* Création manuelle
* Génération assistée par IA
* Export PDF
* Gestion de plusieurs lettres

Objectif :

Augmenter la valeur par utilisateur.

---

## Phase 5 — Profil Professionnel

Fonctionnalités :

* Profil public
* URL personnalisée
* Portfolio
* Réseaux sociaux
* Statistiques de consultation

Exemple :

/u/maxime-nwaha

---

## Phase 6 — Plateforme Recruteurs

Prérequis :

Minimum 5 000 utilisateurs actifs.

Fonctionnalités :

* CVthèque
* Recherche de candidats
* Publication d'offres
* Filtres avancés
* Dashboard RH

Objectif :

Monétisation B2B.

---

## Phase 7 — Intégration WAYA

Fonctionnalités :

* Génération automatique d'un profil NFC
* Liaison avec carte WAYA
* QR Code partagé
* Profil professionnel centralisé

Objectif :

Créer une synergie entre CV Craft et WAYA.

---

# Priorités Produit

Ordre strict :

1. Expérience utilisateur
2. Mobile first
3. Performance
4. Qualité du PDF
5. Acquisition utilisateur
6. Monétisation
7. IA
8. Marketplace RH

---

# Principes UX

Toujours privilégier :

* Parcours courts
* Peu de clics
* Peu de champs
* Interface mobile
* Temps de chargement minimal

Éviter :

* Les formulaires interminables
* Les popups agressifs
* Les étapes inutiles

Objectif :

> Un utilisateur doit pouvoir générer son premier CV sans tutoriel.

---

# Directives Techniques

Avant toute nouvelle fonctionnalité :

Analyser :

* Impact utilisateur
* Complexité de développement
* Coût de maintenance
* Impact sur les performances

Préférer :

* Solutions simples
* Composants réutilisables
* Architecture modulaire
* Code maintenable

Éviter :

* Refontes inutiles
* Dépendances excessives
* Sur-ingénierie

---

# Cadre d'Exécution pour les IA

Lorsque l'IA assiste au développement du projet :

Toujours :

* Respecter la roadmap
* Prioriser le MVP
* Limiter le périmètre des demandes
* Proposer la solution la plus simple viable
* Préserver les performances
* Préserver l'expérience mobile

Ne jamais :

* Ajouter des fonctionnalités hors roadmap sans justification
* Introduire une architecture complexe prématurément
* Transformer CV Craft en réseau social
* Prioriser l'IA avant la validation du produit de base
* Développer la marketplace recruteurs avant d'avoir une base utilisateur significative

---

# Règle de Décision

En cas d'hésitation :

Choisir la solution qui :

* réduit le temps de développement ;
* réduit le coût de maintenance ;
* améliore l'expérience utilisateur ;
* rapproche le produit de son objectif principal.

Objectif final :

> Permettre à un utilisateur africain de créer, partager et valoriser son profil professionnel de la manière la plus simple possible.
