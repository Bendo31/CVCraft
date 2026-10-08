import fs from 'node:fs'
import { execSync } from 'node:child_process'

let envFile = ''
try {
  envFile = fs.readFileSync('.env', 'utf-8')
} catch {
  console.error('Fichier .env introuvable.')
  process.exit(1)
}

function getVar(name) {
  const match = envFile.match(new RegExp(`^${name}=(.*)$`, 'm'))
  return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : process.env[name] || ''
}

const token = getVar('SUPABASE_ACCESS_TOKEN')
const apiKey = getVar('TARA_API_KEY')
const businessId = getVar('TARA_BUSINESS_ID')

if (!token) {
  console.error('SUPABASE_ACCESS_TOKEN manquant dans .env')
  process.exit(1)
}

if (!apiKey || !businessId) {
  console.error('Veuillez renseigner TARA_API_KEY et TARA_BUSINESS_ID dans votre fichier .env')
  process.exit(1)
}

console.log('Configuration des secrets Tara sur Supabase...')
try {
  execSync(`npx supabase secrets set --project-ref wvduvaeibbwdphrlbsfp "TARA_API_KEY=${apiKey}" "TARA_BUSINESS_ID=${businessId}"`, {
    stdio: 'inherit',
    env: { ...process.env, SUPABASE_ACCESS_TOKEN: token },
  })
  console.log('✅ Secrets Tara configurés avec succès sur Supabase !')
} catch {
  process.exit(1)
}
