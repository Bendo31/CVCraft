import { createClient } from '@supabase/supabase-js'

// 1. Récupération des clés depuis les variables d'environnement Vite ou le localStorage
const ENV_SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const ENV_SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

const STORAGE_KEY_URL = 'cvcraft_supabase_url'
const STORAGE_KEY_ANON = 'cvcraft_supabase_anon_key'

/**
 * Récupère l'URL et la clé Supabase actives (soit depuis .env, soit depuis le localStorage).
 */
export function getSupabaseCredentials() {
  const localUrl = (typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY_URL) || '' : '').trim()
  const localKey = (typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY_ANON) || '' : '').trim()

  const url = localUrl || ENV_SUPABASE_URL
  const anonKey = localKey || ENV_SUPABASE_ANON_KEY
  const isValid = Boolean(
    url &&
    anonKey &&
    (url.startsWith('https://') || url.startsWith('http://'))
  )

  return {
    url,
    anonKey,
    isConfigured: isValid,
    isFromEnv: Boolean(ENV_SUPABASE_URL && ENV_SUPABASE_ANON_KEY && !localUrl && !localKey),
  }
}

let supabaseInstance = null
let cachedSignature = ''

/**
 * Retourne le client Supabase initialisé (ou null si les clés ne sont pas encore renseignées).
 */
export function getSupabaseClient() {
  const { url, anonKey, isConfigured } = getSupabaseCredentials()
  const signature = `${url}:::${anonKey}`

  if (!isConfigured) {
    return null
  }

  if (supabaseInstance && cachedSignature === signature) {
    return supabaseInstance
  }

  try {
    supabaseInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    })
    cachedSignature = signature
    return supabaseInstance
  } catch (error) {
    console.error('Erreur lors de l\'initialisation du client Supabase:', error)
    return null
  }
}

/**
 * Instance exportée par défaut (peut être null si les credentials ne sont pas configurés).
 */
export const supabase = getSupabaseClient()

/**
 * Permet de définir ou mettre à jour les clés Supabase à chaud (ex: depuis une modale de réglages).
 */
export function configureSupabase(url, anonKey) {
  if (typeof window === 'undefined') return

  if (url && anonKey) {
    window.localStorage.setItem(STORAGE_KEY_URL, url.trim())
    window.localStorage.setItem(STORAGE_KEY_ANON, anonKey.trim())
  } else {
    window.localStorage.removeItem(STORAGE_KEY_URL)
    window.localStorage.removeItem(STORAGE_KEY_ANON)
  }

  supabaseInstance = null
  cachedSignature = ''
  window.dispatchEvent(new CustomEvent('supabase-auth-config-changed'))
}

/* ==========================================================================
   Méthodes d'authentification Supabase simplifiées et sécurisées
   ========================================================================== */

/**
 * Inscription avec Email et Mot de passe
 */
export async function signUp({ email, password, metadata = {} }) {
  const client = getSupabaseClient()
  if (!client) throw new Error('Supabase n\'est pas encore configuré (URL ou clé manquante).')

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
      emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    },
  })

  if (error) throw error
  return data
}

/**
 * Connexion avec Email et Mot de passe
 */
export async function signInWithPassword({ email, password }) {
  const client = getSupabaseClient()
  if (!client) throw new Error('Supabase n\'est pas encore configuré (URL ou clé manquante).')

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

/**
 * Connexion sans mot de passe via lien magique (Magic Link)
 */
export async function signInWithOtp(email) {
  const client = getSupabaseClient()
  if (!client) throw new Error('Supabase n\'est pas encore configuré.')

  const { data, error } = await client.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    },
  })

  if (error) throw error
  return data
}

/**
 * Connexion avec un fournisseur OAuth (Google, GitHub, etc.)
 */
export async function signInWithOAuth(provider) {
  const client = getSupabaseClient()
  if (!client) throw new Error('Supabase n\'est pas encore configuré.')

  const { data, error } = await client.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    },
  })

  if (error) throw error
  return data
}

/**
 * Déconnexion
 */
export async function signOut() {
  const client = getSupabaseClient()
  if (!client) return { error: null }

  const { error } = await client.auth.signOut()
  if (error) throw error
  return { success: true }
}

/**
 * Demande de réinitialisation de mot de passe par email
 */
export async function resetPasswordForEmail(email) {
  const client = getSupabaseClient()
  if (!client) throw new Error('Supabase n\'est pas encore configuré.')

  const { data, error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: typeof window !== 'undefined' ? `${window.location.origin}#reset-password` : undefined,
  })

  if (error) throw error
  return data
}

/**
 * Mise à jour du mot de passe utilisateur
 */
export async function updatePassword(newPassword) {
  const client = getSupabaseClient()
  if (!client) throw new Error('Supabase n\'est pas encore configuré.')

  const { data, error } = await client.auth.updateUser({
    password: newPassword,
  })

  if (error) throw error
  return data
}

/**
 * Récupération de la session active
 */
export async function getSession() {
  const client = getSupabaseClient()
  if (!client) return null

  const { data, error } = await client.auth.getSession()
  if (error) {
    console.warn('Erreur lors de la récupération de la session:', error)
    return null
  }
  return data.session
}

/**
 * Récupération de l'utilisateur actif
 */
export async function getCurrentUser() {
  const client = getSupabaseClient()
  if (!client) return null

  const { data, error } = await client.auth.getUser()
  if (error) return null
  return data.user
}

/**
 * Écouteur des changements d'état d'authentification (connexion, déconnexion, etc.)
 */
export function onAuthStateChange(callback) {
  const client = getSupabaseClient()
  if (!client) {
    return { data: { subscription: { unsubscribe: () => {} } } }
  }

  return client.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })
}

/* ==========================================================================
   Sauvegarde et synchronisation Cloud du CV (Table `resumes`)
   ========================================================================== */

/**
 * Sauvegarde le CV d'un utilisateur dans la base de données Supabase
 */
export async function saveUserResumeToCloud(userId, resumeData) {
  const client = getSupabaseClient()
  if (!client || !userId) return { success: false }

  try {
    const { data, error } = await client
      .from('resumes')
      .upsert(
        {
          user_id: userId,
          content: resumeData,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Erreur sauvegarde CV Supabase:', error)
    return { success: false, error }
  }
}

/**
 * Charge le CV d'un utilisateur depuis la base de données Supabase
 */
export async function loadUserResumeFromCloud(userId) {
  const client = getSupabaseClient()
  if (!client || !userId) return null

  try {
    const { data, error } = await client
      .from('resumes')
      .select('content, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .maybeSingle()

    if (error) throw error
    return data ? data.content : null
  } catch (error) {
    console.error('Erreur chargement CV Supabase:', error)
    return null
  }
}

/**
 * Sauvegarde le fichier PDF sur Supabase Storage (bucket 'resumes')
 * et enregistre les informations du CV dans la table SQL 'resumes'.
 */
export async function uploadPdfAndSaveResume({
  pdfBlob,
  fileName,
  resume,
  photo = null,
}) {
  const client = getSupabaseClient()
  if (!client) {
    console.warn('Supabase n\'est pas encore configuré.')
    return { success: false, reason: 'not_configured' }
  }

  try {
    const safeBaseName = (fileName || 'CV.pdf').replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `pdfs/${Date.now()}_${safeBaseName}`

    // 1. Upload vers le bucket Supabase Storage
    const { data: uploadData, error: uploadError } = await client.storage
      .from('resumes')
      .upload(storagePath, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      console.error('Erreur Supabase Storage upload:', uploadError)
      throw uploadError
    }

    // 2. URL publique du fichier hébergé
    const { data: urlData } = client.storage
      .from('resumes')
      .getPublicUrl(storagePath)

    const publicUrl = urlData?.publicUrl || ''

    // 3. Utilisateur courant (si connecté)
    const currentUser = await getCurrentUser()

    // 4. Récupérer l'adresse IP de l'appareil
    let ipAddress = null
    try {
      const ipRes = await fetch('https://api.ipify.org?format=json')
      if (ipRes.ok) {
        const ipData = await ipRes.json()
        ipAddress = ipData.ip || null
      }
    } catch {
      // Silently ignore - IP is best effort
    }

    // 5. Insertion dans la table SQL 'resumes'
    const { data: dbData, error: dbError } = await client
      .from('resumes')
      .insert([
        {
          user_id: currentUser?.id || null,
          first_name: resume?.firstName || '',
          last_name: resume?.lastName || '',
          role: resume?.role || '',
          email: resume?.email || '',
          phone: resume?.phone || '',
          city: resume?.city || '',
          linkedin: resume?.linkedin || '',
          summary: resume?.summary || '',
          photo_url: photo || null,
          content: resume,
          pdf_url: publicUrl,
          ip_address: ipAddress,
        },
      ])
      .select()

    if (dbError) {
      console.error('Erreur insertion base de données resumes:', dbError)
      throw dbError
    }

    return {
      success: true,
      publicUrl,
      record: dbData?.[0],
    }
  } catch (error) {
    console.error('Erreur lors de la sauvegarde cloud du PDF:', error)
    return { success: false, error }
  }
}


