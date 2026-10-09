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
 * Envoi d’un code OTP pour confirmer une connexion par e-mail
 */
export async function signInWithOtp(email, { shouldCreateUser = false } = {}) {
  const client = getSupabaseClient()
  if (!client) throw new Error('Supabase n\'est pas encore configuré.')

  const { data, error } = await client.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser,
      emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    },
  })

  if (error) throw error
  return data
}

export async function verifyEmailOtp(email, token, type) {
  const client = getSupabaseClient()
  if (!client) throw new Error('Supabase n\'est pas encore configuré.')

  const { data, error } = await client.auth.verifyOtp({ email, token, type })
  if (error) throw error
  return data
}

export async function resendSignupOtp(email) {
  const client = getSupabaseClient()
  if (!client) throw new Error('Supabase n\'est pas encore configuré.')

  const { data, error } = await client.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    },
  })
  if (error) throw error
  return data
}

/**
 * Connexion avec un fournisseur OAuth (Google, etc.)
 */
export async function signInWithOAuth(provider, customOptions = {}) {
  const client = getSupabaseClient()
  if (!client) throw new Error('Supabase n\'est pas encore configuré.')

  const { data, error } = await client.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      ...customOptions,
    },
  })

  if (error) {
    const msg = (error.message || error.msg || '').toLowerCase()
    if (msg.includes('provider is not enabled') || msg.includes('unsupported provider')) {
      const providerLabel = provider === 'google' ? 'Google' : provider
      throw new Error(
        `La connexion ${providerLabel} n'est pas activée dans votre projet Supabase.`
      )
    }
    throw error
  }
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

async function saveResumeRecord(client, userId, resumeRecord, resumeId = null) {
  const query = resumeId
    ? client.from('resumes').update(resumeRecord).eq('user_id', userId).eq('id', resumeId)
    : client.from('resumes').insert(resumeRecord)
  const { data, error } = await query.select()

  if (error) throw error
  if (resumeId && !data?.length) throw new Error('Le CV à modifier est introuvable.')
  return data
}

/**
 * Sauvegarde le CV d'un utilisateur dans la base de données Supabase
 */
export async function saveUserResumeToCloud(userId, resumeData, resumeId = null) {
  const client = getSupabaseClient()
  if (!client || !userId) throw new Error('Une session serveur est requise pour enregistrer le CV.')

  const resume = resumeData.resume || resumeData
  const templateId = resumeData.template || resumeData.templateId || 'gratuit'
  const modelStatus = resumeData.modelStatus || (templateId === 'gratuit' ? 'free' : 'pending_payment')
  const content = { ...resumeData, template: templateId, modelStatus }
  const data = await saveResumeRecord(client, userId, {
    user_id: userId,
    first_name: resume.firstName || '',
    last_name: resume.lastName || '',
    role: resume.role || '',
    email: resume.email || '',
    phone: resume.phone || '',
    city: resume.city || '',
    linkedin: resume.linkedin || '',
    summary: resume.summary || '',
    photo_url: resumeData.photo || null,
    content,
    updated_at: new Date().toISOString(),
  }, resumeId)
  return { success: true, data, resumeId: data?.[0]?.id || resumeId }
}

export async function updateResumeModelStatus(userId, templateId, modelStatus, resumeId = null) {
  const client = getSupabaseClient()
  if (!client || !userId) throw new Error('Une session serveur est requise pour mettre à jour le statut du modèle.')
  if (!['free', 'pending_payment', 'paid'].includes(modelStatus)) {
    throw new Error('Le statut du modèle est invalide.')
  }

  const loadQuery = resumeId
    ? client.from('resumes').select('id, content').eq('user_id', userId).eq('id', resumeId).maybeSingle()
    : client.from('resumes').select('id, content').eq('user_id', userId).order('updated_at', { ascending: false }).limit(1).maybeSingle()
  const { data: resumeRecord, error: loadError } = await loadQuery

  if (loadError) throw loadError
  if (!resumeRecord) throw new Error('Aucun CV enregistré pour ce compte.')

  let updateQuery = client
    .from('resumes')
    .update({
      content: { ...resumeRecord.content, template: templateId, modelStatus },
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('id', resumeRecord.id)

  const { error } = await updateQuery

  if (error) throw error
  return { success: true }
}

function formatResumeRecord(record) {
  if (!record) return null
  const content = record.content || {}
  const innerResume = content.resume || content || {}
  const templateId = content.template || content.templateId || 'gratuit'
  const modelStatus = content.modelStatus || (templateId === 'gratuit' ? 'free' : 'pending_payment')

  return {
    ...content,
    id: record.id,
    template: templateId,
    modelStatus,
    photo: content.photo || record.photo_url || '',
    baseColor: content.baseColor || '#e49a68',
    resumeFont: content.resumeFont || 'classic',
    pdfUrl: record.pdf_url || content.pdfUrl || null,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    resume: {
      firstName: innerResume.firstName || record.first_name || '',
      lastName: innerResume.lastName || record.last_name || '',
      role: innerResume.role || record.role || '',
      email: innerResume.email || record.email || '',
      phone: innerResume.phone || record.phone || '',
      city: innerResume.city || record.city || '',
      website: innerResume.website || '',
      linkedin: innerResume.linkedin || record.linkedin || '',
      facebook: innerResume.facebook || '',
      x: innerResume.x || '',
      threads: innerResume.threads || '',
      summary: innerResume.summary || record.summary || '',
      sectionVisibility: innerResume.sectionVisibility || {},
      experiences: Array.isArray(innerResume.experiences) ? innerResume.experiences : [],
      educations: Array.isArray(innerResume.educations) ? innerResume.educations : [],
      skills: Array.isArray(innerResume.skills) ? innerResume.skills : [],
      languages: Array.isArray(innerResume.languages) ? innerResume.languages : [],
      projects: Array.isArray(innerResume.projects) ? innerResume.projects : [],
      references: Array.isArray(innerResume.references) ? innerResume.references : [],
      certifications: Array.isArray(innerResume.certifications) ? innerResume.certifications : [],
      interests: Array.isArray(innerResume.interests) ? innerResume.interests : [],
    },
  }
}

export async function loadUserResumesFromCloud(userId) {
  const client = getSupabaseClient()
  if (!client || !userId) throw new Error('Une session serveur est requise pour charger les CV.')

  const { data, error } = await client
    .from('resumes')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .order('id', { ascending: false })

  if (error) throw error
  return (data || []).map(formatResumeRecord)
}

export async function getUserResumePlan(userId) {
  const client = getSupabaseClient()
  if (!client || !userId) throw new Error('Une session serveur est requise pour consulter l’offre.')

  const { data, error } = await client
    .from('cvcraft_subscriptions')
    .select('plan_id, valid_until')
    .eq('user_id', userId)
    .maybeSingle()

  if (error?.code === 'PGRST205' && error.message?.includes('cvcraft_subscriptions')) {
    console.warn('La table cvcraft_subscriptions est absente du cache Supabase. Offre limitée à Free jusqu’à l’application des migrations.')
    return {
      planId: 'free',
      active: true,
      validUntil: null,
      schemaWarning: 'Les offres Pro et Gold sont temporairement indisponibles car le schéma des abonnements n’est pas déployé sur Supabase. Appliquez les migrations puis rechargez le dashboard.',
    }
  }
  if (error) throw error
  if (!data) return { planId: 'free', active: true, validUntil: null }

  const active = new Date(data.valid_until).getTime() > Date.now()
  return {
    planId: active ? data.plan_id : 'free',
    previousPlanId: active ? null : data.plan_id,
    active,
    validUntil: data.valid_until,
  }
}

export async function deleteUserResumeFromCloud(userId, resumeId) {
  const client = getSupabaseClient()
  if (!client || !userId || !resumeId) throw new Error('Une session serveur est requise pour supprimer le CV.')

  const { error } = await client
    .from('resumes')
    .delete()
    .eq('user_id', userId)
    .eq('id', resumeId)

  if (error) throw error
  return { success: true }
}

async function handleEdgeFunctionError(error) {
  if (!error) return
  if (error.context) {
    try {
      const body = await error.context.json()
      if (body?.error) throw new Error(body.error)
      if (body?.message) throw new Error(body.message)
    } catch (e) {
      if (e.message && e.message !== error.message) throw e
    }
  }
  throw error
}

export async function createTaraPlanCheckout(planId, phoneNumber) {
  const client = getSupabaseClient()
  if (!client) throw new Error('Supabase n’est pas encore configuré.')
  if (!['pro', 'gold'].includes(planId)) throw new Error('L’offre payante sélectionnée est invalide.')

  const { data, error } = await client.functions.invoke('tara-checkout', {
    body: { action: 'create-plan', planId, phoneNumber },
  })
  if (error) await handleEdgeFunctionError(error)
  if (!data?.paymentId || data.status !== 'PENDING') {
    throw new Error('Tara Money n’a pas retourné un paiement MobilePay valide.')
  }
  return data
}

/*
 * Retourne un seul CV pour les parcours qui n’ont pas besoin de la liste.
 */
export async function loadUserResumeFromCloud(userId, resumeId = null) {
  if (resumeId) {
    const client = getSupabaseClient()
    if (!client || !userId) throw new Error('Une session serveur est requise pour charger le CV.')
    const { data, error } = await client
      .from('resumes')
      .select('*')
      .eq('user_id', userId)
      .eq('id', resumeId)
      .maybeSingle()
    if (error) throw error
    if (!data) return null
    return formatResumeRecord(data)
  }

  const resumes = await loadUserResumesFromCloud(userId)
  return resumes[0] || null
}

export async function createTaraCheckout(templateId, phoneNumber, resumeId = null) {
  const client = getSupabaseClient()
  if (!client) throw new Error('Supabase n\'est pas encore configuré.')

  const { data, error } = await client.functions.invoke('tara-checkout', {
    body: { action: 'create', templateId, resumeId, phoneNumber },
  })
  if (error) await handleEdgeFunctionError(error)
  if (!data?.paymentId || data.status !== 'PENDING') {
    throw new Error('Tara Money n’a pas retourné un paiement MobilePay valide.')
  }
  return data
}

export async function verifyTaraPayment(paymentId) {
  const client = getSupabaseClient()
  if (!client) throw new Error('Supabase n\'est pas encore configuré.')

  const { data, error } = await client.functions.invoke('tara-checkout', {
    body: { action: 'verify', paymentId },
  })
  if (error) await handleEdgeFunctionError(error)
  return data
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
  resumeData = { resume, photo },
  resumeId = null,
}) {
  const client = getSupabaseClient()
  if (!client) {
    throw new Error('Supabase n\'est pas encore configuré.')
  }

  try {
    const templateId = resumeData.template || resumeData.templateId || 'gratuit'
    const modelStatus = resumeData.modelStatus || (templateId === 'gratuit' ? 'free' : 'pending_payment')
    const content = { ...resumeData, template: templateId, modelStatus }
    const safeBaseName = (fileName || 'CV.pdf').replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `pdfs/${Date.now()}_${safeBaseName}`

    // 1. Upload vers le bucket Supabase Storage
    const { error: uploadError } = await client.storage
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

    // 3. Utilisateur courant
    const currentUser = await getCurrentUser()
    if (!currentUser) throw new Error('Une session est requise pour enregistrer le PDF.')

    // 4. Mise à jour du CV serveur avec le lien PDF exporté
    const dbData = await saveResumeRecord(client, currentUser.id, {
      user_id: currentUser.id,
      first_name: resume?.firstName || '',
      last_name: resume?.lastName || '',
      role: resume?.role || '',
      email: resume?.email || '',
      phone: resume?.phone || '',
      city: resume?.city || '',
      linkedin: resume?.linkedin || '',
      summary: resume?.summary || '',
      photo_url: photo || null,
      content,
      pdf_url: publicUrl,
      updated_at: new Date().toISOString(),
    }, resumeId)

    return {
      success: true,
      publicUrl,
      record: dbData?.[0],
      resumeId: dbData?.[0]?.id || resumeId,
    }
  } catch (error) {
    console.error('Erreur lors de la sauvegarde cloud du PDF:', error)
    throw error
  }
}
