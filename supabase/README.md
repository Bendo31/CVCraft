# Paiements Tara Money

Les paiements sont déclenchés par MobilePay via `POST https://www.dklo.co/api/tara/mobilepay`, puis vérifiés par l’Edge Function `tara-checkout`. Les clés Tara restent côté serveur. Le statut `SUCCESS` de la demande MobilePay indique seulement que Tara a accepté la demande; le téléchargement et l’activation d’une offre attendent la confirmation finale de transaction.

Prérequis : lier ce dépôt au projet Supabase de CVcraft, puis configurer les secrets d’Edge Functions. `APP_ORIGIN` doit contenir l’origine exacte du site, sans chemin ni slash final. Plusieurs origines peuvent être séparées par des virgules.

Sous Windows PowerShell, utilisez `npx.cmd` plutôt que `npx` : PowerShell peut bloquer le lanceur `npx.ps1` selon sa stratégie d’exécution. Cette méthode ne nécessite pas de modifier la stratégie de sécurité.

```powershell
npx.cmd supabase login
npx.cmd supabase projects list
npx.cmd supabase link --project-ref wvduvaeibbwdphrlbsfp
npx.cmd supabase db push
$taraApiKey = Read-Host "Clé API sandbox Tara"
$taraBusinessId = Read-Host "Business ID Tara"
npx.cmd supabase secrets set --project-ref wvduvaeibbwdphrlbsfp "TARA_API_KEY=$taraApiKey" "TARA_BUSINESS_ID=$taraBusinessId" "APP_ORIGIN=http://localhost:4173"
$taraApiKey = $null
$taraBusinessId = $null
npx.cmd supabase functions deploy tara-checkout --project-ref wvduvaeibbwdphrlbsfp
```

Remplacez les valeurs de secrets uniquement dans le terminal. Ne les écrivez pas dans ce fichier, dans le code client ou dans le chat. La clé Tara précédemment partagée doit être révoquée et remplacée.

Après déploiement, si l’API retourne encore `Could not find the table 'public.cvcraft_subscriptions' in the schema cache`, appliquez toutes les migrations du dépôt avec `supabase db push` puis attendez quelques secondes que PostgREST recharge son schéma. Les migrations incluent `NOTIFY pgrst, 'reload schema'`. Vérifiez ensuite **Supabase → Table Editor** : `cvcraft_subscriptions` doit exister. Rafraîchissez le dashboard après cela. Jusqu’à la migration, l’application garde l’accès Free, affiche un avertissement et bloque l’achat des offres pour éviter un état de paiement incohérent.

Pour les tests, utilisez la clé sandbox et un numéro camerounais MTN ou Orange au format `2376XXXXXXXX`. Le formulaire accepte un numéro local et ajoute l’indicatif `237`; Tara détermine l’opérateur à partir du numéro. Il n’existe pas d’URL sandbox distincte : demandez à Tara d’activer le mode sandbox pour le business concerné. N’ajoutez jamais la clé à une variable `VITE_*` ou au code client. Les offres Pro (1 500 FCFA pour trois mois) et Gold (2 500 FCFA par mois), ainsi que les téléchargements premium à l’acte (100 FCFA), utilisent tous l’API `mobilepay`.

Les appels MobilePay partent uniquement du serveur et utilisent le webhook Supabase. Le webhook ne sert pas de preuve de paiement : chaque notification est confirmée par un appel authentifié `POST /transactions/status` avec le `productId`. L’identifiant produit est aussi fourni à l’URL webhook, pour gérer les notifications MobilePay qui omettent `productId` dans leur corps. Les paiements restent en attente jusqu’à confirmation de Tara.

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

Appliquez le schéma et les politiques de sauvegarde à Supabase avant d’activer l’enregistrement cloud :

```sh
supabase db push
```

Les migrations créent `public.resumes`, `public.cvcraft_subscriptions` et `public.cvcraft_plan_payments`, permettent plusieurs lignes CV par utilisateur, et configurent RLS ainsi qu’un trigger de quota côté base. Free et Pro autorisent un CV; Gold actif en autorise trois. Une offre expirée conserve les CV mais bloque leur modification et leur téléchargement jusqu’à réactivation. Gold arrivé à expiration conserve également les CV excédant le quota Free, sans les supprimer.

Le CV créé sans compte est sauvegardé dans le stockage local du navigateur. Après authentification depuis l’accueil, l’utilisateur arrive sur le tableau de bord; un brouillon local y est transféré vers Supabase s’il n’existe pas déjà de CV cloud. Une authentification demandée pour débloquer un modèle reprend le parcours dans l’éditeur. Une fois connecté, les modifications du CV sont automatiquement enregistrées dans Supabase après une courte pause de saisie, et les changements en cours sont enregistrés avant de quitter l’éditeur.

Le modèle sélectionné et son statut (`free`, `pending_payment` ou `paid`) sont enregistrés dans le champ `content` de la table `public.resumes`, pour rester compatibles avec le schéma existant. Le statut ne passe à `paid` qu’après confirmation du paiement par l’Edge Function. Les abonnements sont attribués uniquement par la fonction SQL `activate_cvcraft_plan_payment`, appelée avec le rôle de service après confirmation Tara; sa colonne `entitlement_applied_at` rend la vérification répétée idempotente.

Le tableau de bord affiche les CV selon l’offre et propose Modifier, Supprimer et Dupliquer. La duplication est disponible avec Gold actif jusqu’à trois CV; elle est désactivée pour Free et Pro, qui ne peuvent créer qu’un CV. Le backend contrôle les quotas à chaque création et modification. Si un compte passe à une offre avec un quota inférieur, ses CV excédentaires sont conservés mais seuls les CV les plus récemment modifiés dans le quota sont actifs; les autres peuvent être supprimés. Une offre payante expirée bloque l’édition et le téléchargement de tous les CV, mais laisse leur suppression possible. Les capacités Gold ATS, historique de versions et lien public sont affichées comme bientôt disponibles et ne sont pas encore implémentées.
