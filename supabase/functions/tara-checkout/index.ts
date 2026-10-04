import { createClient } from 'npm:@supabase/supabase-js@2'

const TARA_API = 'https://www.dklo.co/api/tara'
const PRICE_XOF = 100
const PAID_TEMPLATES = new Map([
  ['sillage', 'Sillage'],
  ['atlas', 'Atlas'],
  ['signal', 'Signal'],
])

const allowedOrigins = (Deno.env.get('APP_ORIGIN') || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

function json(body: unknown, status = 200, origin = '') {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      Vary: 'Origin',
    },
  })
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Configuration serveur manquante : ${name}`)
  return value
}

async function getTaraStatus(productId: string) {
  const response = await fetch(`${TARA_API}/transactions/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey: requiredEnv('TARA_API_KEY'),
      businessId: requiredEnv('TARA_BUSINESS_ID'),
      productId,
    }),
  })

  if (!response.ok) throw new Error(`Vérification Tara Money refusée (${response.status}).`)
  const result = await response.json()
  if (result.productId !== productId || !['SUCCESS', 'FAILURE', 'PENDING'].includes(result.status)) {
    throw new Error('Réponse de vérification Tara Money invalide.')
  }
  return result.status as 'SUCCESS' | 'FAILURE' | 'PENDING'
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin') || ''
  const isWebhook = new URL(request.url).searchParams.get('hook') === '1'

  if (request.method === 'OPTIONS') {
    if (!allowedOrigins.includes(origin)) return new Response(null, { status: 403 })
    return json({}, 200, origin)
  }
  if (request.method !== 'POST') return json({ error: 'Méthode non autorisée.' }, 405, origin)
  if (!isWebhook && !allowedOrigins.includes(origin)) return json({ error: 'Origine non autorisée.' }, 403)

  try {
    const body = await request.json()
    const action = isWebhook ? 'webhook' : body.action
    const supabaseUrl = requiredEnv('SUPABASE_URL')
    const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY')
    const service = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    if (action === 'webhook') {
      const productId = typeof body.productId === 'string' ? body.productId : ''
      if (!productId) return json({ error: 'Identifiant de paiement absent.' }, 400)
      const { data: payment, error: lookupError } = await service
        .from('tara_payments')
        .select('id, status')
        .eq('product_id', productId)
        .maybeSingle()
      if (lookupError) throw lookupError
      if (!payment) return json({ error: 'Paiement inconnu.' }, 404)
      if (payment.status === 'SUCCESS') return json({ received: true })

      const status = await getTaraStatus(productId)
      const { error: updateError } = await service
        .from('tara_payments')
        .update({
          status,
          updated_at: new Date().toISOString(),
          paid_at: status === 'SUCCESS' ? new Date().toISOString() : null,
        })
        .eq('id', payment.id)
        .neq('status', 'SUCCESS')
      if (updateError) throw updateError
      return json({ received: true })
    }

    const authorization = request.headers.get('authorization') || ''
    if (!authorization.startsWith('Bearer ')) return json({ error: 'Connexion requise.' }, 401, origin)
    const anonKey = requiredEnv('SUPABASE_ANON_KEY')
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authorization } },
    })
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user) return json({ error: 'Session utilisateur invalide.' }, 401, origin)

    if (action === 'create') {
      const templateId = typeof body.templateId === 'string' ? body.templateId : ''
      const templateName = PAID_TEMPLATES.get(templateId)
      if (!templateName) return json({ error: 'Modèle payant invalide.' }, 400, origin)

      const productId = `cv-${crypto.randomUUID()}`
      const { data: payment, error: insertError } = await service
        .from('tara_payments')
        .insert({
          user_id: user.id,
          product_id: productId,
          template_id: templateId,
          amount: PRICE_XOF,
        })
        .select('id')
        .single()
      if (insertError) throw insertError

      const appUrl = requiredEnv('APP_ORIGIN').split(',')[0].trim().replace(/\/$/, '')
      const callbackUrl = new URL(appUrl)
      callbackUrl.searchParams.set('tara_payment', payment.id)
      const webhookUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/tara-checkout?hook=1`

      const taraResponse = await fetch(`${TARA_API}/paymentlinks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: requiredEnv('TARA_API_KEY'),
          businessId: requiredEnv('TARA_BUSINESS_ID'),
          productId,
          productName: `CV Craft — modèle ${templateName}`,
          productPrice: PRICE_XOF,
          productDescription: `Téléchargement d’un CV avec le modèle ${templateName}`,
          returnUrl: callbackUrl.toString(),
          webHookUrl: webhookUrl,
        }),
      })
      if (!taraResponse.ok) throw new Error(`Création du paiement Tara Money refusée (${taraResponse.status}).`)
      const taraData = await taraResponse.json()
      const paymentUrl = [taraData.paymentUrl, taraData.paymentLink, taraData.generalLink]
        .find((candidate) => typeof candidate === 'string' && candidate.length > 0)
      if (taraData.status && !['SUCCESS', 'success'].includes(taraData.status)) {
        throw new Error('Tara Money n’a pas pu créer le lien de paiement.')
      }
      if (!paymentUrl) throw new Error('Tara Money n’a pas retourné de lien de paiement.')

      const parsedPaymentUrl = new URL(paymentUrl)
      if (parsedPaymentUrl.protocol !== 'https:' || !/(^|\.)taramoney\.com$/i.test(parsedPaymentUrl.hostname)) {
        throw new Error('Le lien de paiement Tara Money n’est pas valide.')
      }

      const { error: updateError } = await service
        .from('tara_payments')
        .update({ payment_url: paymentUrl, updated_at: new Date().toISOString() })
        .eq('id', payment.id)
      if (updateError) throw updateError
      return json({ paymentId: payment.id, paymentUrl }, 200, origin)
    }

    if (action === 'verify') {
      const paymentId = typeof body.paymentId === 'string' ? body.paymentId : ''
      if (!paymentId) return json({ error: 'Identifiant de paiement absent.' }, 400, origin)
      const { data: payment, error: lookupError } = await service
        .from('tara_payments')
        .select('id, product_id, template_id, amount, status')
        .eq('id', paymentId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (lookupError) throw lookupError
      if (!payment) return json({ error: 'Paiement inconnu.' }, 404, origin)

      if (payment.status !== 'SUCCESS') {
        const status = await getTaraStatus(payment.product_id)
        const { error: updateError } = await service
          .from('tara_payments')
          .update({
            status,
            updated_at: new Date().toISOString(),
            paid_at: status === 'SUCCESS' ? new Date().toISOString() : null,
          })
          .eq('id', payment.id)
          .neq('status', 'SUCCESS')
        if (updateError) throw updateError
        payment.status = status
      }

      return json({
        status: payment.status,
        templateId: payment.template_id,
        amount: payment.amount,
      }, 200, origin)
    }

    return json({ error: 'Action inconnue.' }, 400, origin)
  } catch (error) {
    console.error('Erreur Tara Money:', error)
    return json({ error: error instanceof Error ? error.message : 'Erreur du service de paiement.' }, 500, origin)
  }
})
