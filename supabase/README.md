# Paiements Tara Money

Le paiement est créé et vérifié par l’Edge Function `tara-checkout`. Les clés Tara restent côté serveur. Le retour du navigateur ne débloque pas le téléchargement à lui seul : l’Edge Function confirme l’état `SUCCESS` auprès de Tara Money avant de lancer l’export.

Prérequis : lier ce dépôt au projet Supabase de CVcraft, puis configurer les secrets d’Edge Functions. `APP_ORIGIN` doit contenir l’origine exacte du site, sans chemin ni slash final. Plusieurs origines peuvent être séparées par des virgules.

```sh
supabase link --project-ref <project-ref>
supabase db push
supabase secrets set TARA_API_KEY=<cle-api> TARA_BUSINESS_ID=<business-id> APP_ORIGIN=https://votre-domaine.example
supabase functions deploy tara-checkout
```

Pour tester, utilisez les identifiants sandbox Tara Money. N’ajoutez jamais les clés Tara à une variable `VITE_*` ou au code client. Le modèle Gratuit n’appelle pas Tara Money; chaque téléchargement d’un autre modèle coûte actuellement 100 FCFA.

## Authentification par code e-mail

Configurez les modèles e-mail **Confirm signup** et **Magic Link** pour afficher le code avec `{{ .Token }}` (ne remplacez pas le code par un lien `{{ .ConfirmationURL }}`). L’inscription demande une adresse e-mail et un mot de passe; avec la confirmation d’e-mail activée, Supabase envoie le code `signup`. Si la confirmation est désactivée et que l’inscription crée directement une session, l’application la ferme puis demande un code OTP de connexion avant d’ouvrir le compte. La connexion vérifie d’abord le mot de passe puis envoie un code de type `email`. Le formulaire permet de renvoyer le code.

Pour la livraison des e-mails en production, configurez un serveur SMTP personnalisé dans les réglages **Authentication → SMTP Settings** de Supabase avec un expéditeur vérifié. Le service SMTP par défaut de Supabase est limité et peut ne pas envoyer les messages aux adresses des utilisateurs. En cas de code manquant, vérifier aussi les courriers indésirables, la configuration et les logs d’e-mail Auth du projet, ainsi que les limites d’envoi.

### Connexion Google

1. Dans Google Cloud Console, créez un client OAuth de type **Application Web** et ajoutez comme URI de redirection autorisée l’URL callback affichée dans la configuration Google du fournisseur Supabase : `https://<project-ref>.supabase.co/auth/v1/callback`.
2. Dans Supabase **Authentication → Providers → Google**, activez le fournisseur et renseignez le Client ID et le Client Secret Google.
3. Dans Supabase **Authentication → URL Configuration**, définissez l’URL du site et ajoutez les origines de l’application aux URL de redirection autorisées, dont `http://localhost:4173` pour le développement et l’URL de production exacte.
4. Si l’écran de consentement Google est en mode test, ajoutez le compte Google comme utilisateur test.

Après le retour OAuth, CVcraft restaure la session et reprend l’éditeur avec le brouillon et le modèle demandés. Les connexions LinkedIn utilisent aussi OAuth et nécessitent l’activation et la configuration de leur fournisseur dans Supabase.

## Sauvegarde du CV

Le CV créé sans compte est sauvegardé dans le stockage local du navigateur. Lors de la création d’un compte, ce brouillon est envoyé à Supabase et le brouillon local est supprimé après confirmation de la sauvegarde. Une fois connecté, les modifications suivantes sont enregistrées dans la base de données.
