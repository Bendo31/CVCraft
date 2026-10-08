import fs from 'node:fs'
import { execSync } from 'node:child_process'

let envFile = ''
try {
  envFile = fs.readFileSync('.env', 'utf-8')
} catch {
  console.error('Fichier .env introuvable.')
  process.exit(1)
}

const match = envFile.match(/^SUPABASE_ACCESS_TOKEN=(.*)$/m)
const token = match ? match[1].trim().replace(/^['"]|['"]$/g, '') : process.env.SUPABASE_ACCESS_TOKEN

if (!token) {
  console.error('Veuillez renseigner SUPABASE_ACCESS_TOKEN dans le fichier .env (ex: SUPABASE_ACCESS_TOKEN=sbp_...)')
  process.exit(1)
}

console.log('Déploiement de la fonction tara-checkout vers Supabase...')
try {
  execSync('npx supabase functions deploy tara-checkout --project-ref wvduvaeibbwdphrlbsfp', {
    stdio: 'inherit',
    env: {
      ...process.env,
      SUPABASE_ACCESS_TOKEN: token,
    },
  })
  console.log('Déploiement terminé avec succès !')
} catch (err) {
  process.exit(1)
}
