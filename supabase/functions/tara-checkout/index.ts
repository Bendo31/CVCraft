import { createClient } from 'npm:@supabase/supabase-js@2'

const TARA_API = 'https://www.dklo.co/api/tara'
const PRICE_XOF = 100
const PAID_TEMPLATES = new Map([
  ['sillage', 'Sillage'],
  ['atlas', 'Atlas'],
  ['signal', 'Signal'],
])
const PAID_PLANS = new Map([
  ['pro', { name: 'Pro', amount: 1500, durationMonths: 3 }],
  ['gold', { name: 'Gold', amount: 2500, durationMonths: 1 }],
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

async function startMobilePay(productId: string, productName: string, productPrice: number, phoneNumber: string) {
  const webhookUrl = new URL(`${requiredEnv('SUPABASE_URL').replace(/\/$/, '')}/functions/v1/tara-checkout`)
  webhookUrl.searchParams.set('hook', '1')
  webhookUrl.searchParams.set('productId', productId)

  const response = await fetch(`${TARA_API}/mobilepay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey: requiredEnv('TARA_API_KEY'),
      businessId: requiredEnv('TARA_BUSINESS_ID'),
      productId,
      productName,
      productPrice,
      phoneNumber,
      webHookUrl: webhookUrl.toString(),
    }),
    signal: AbortSignal.timeout(60_000),
  })

  const result = await response.json()
  if (!response.ok || result.status === 'FAILURE') {
    throw new Error(typeof result.message === 'string' ? result.message : `Paiement MobilePay refusé (${response.status}).`)
  }
  if (result.status !== 'SUCCESS') {
    throw new Error('Tara Money n’a pas confirmé le démarrage du paiement MobilePay.')
  }
  return typeof result.vendor === 'string' ? result.vendor : null
}

function isCameroonMobileNumber(value: unknown): value is string {
  return typeof value === 'string' && /^2376\d{8}$/.test(value)
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
      const productId = typeof body.productId === 'string' && body.productId
        ? body.productId
        : new URL(request.url).searchParams.get('productId') || ''
      if (!productId) return json({ error: 'Identifiant de paiement absent.' }, 400)
      const { data: templatePayment, error: templateLookupError } = await service
        .from('tara_payments')
        .select('id, status')
        .eq('product_id', productId)
        .maybeSingle()
      if (templateLookupError) throw templateLookupError
      const table = templatePayment ? 'tara_payments' : 'cvcraft_plan_payments'
      let payment = templatePayment
      if (!payment) {
        const { data, error } = await service
          .from('cvcraft_plan_payments')
          .select('id, status')
          .eq('product_id', productId)
          .maybeSingle()
        if (error) throw error
        payment = data
      }
      if (!payment) return json({ error: 'Paiement inconnu.' }, 404)
      if (payment.status === 'SUCCESS') return json({ received: true })

      const status = await getTaraStatus(productId)
      const { error: updateError } = await service
        .from(table)
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
      const resumeId = typeof body.resumeId === 'string' ? body.resumeId : null
      const phoneNumber = typeof body.phoneNumber === 'string' ? body.phoneNumber : ''
      const templateName = PAID_TEMPLATES.get(templateId)
      if (!templateName) return json({ error: 'Modèle payant invalide.' }, 400, origin)
      if (!isCameroonMobileNumber(phoneNumber)) return json({ error: 'Saisissez un numéro mobile camerounais au format 2376XXXXXXXX.' }, 400, origin)
      if (resumeId) {
        const { data: resume, error: resumeError } = await service
          .from('resumes')
          .select('id')
          .eq('id', resumeId)
          .eq('user_id', user.id)
          .maybeSingle()
        if (resumeError) throw resumeError
        if (!resume) return json({ error: 'CV introuvable pour ce compte.' }, 404, origin)
      }

      const productId = `cv-${crypto.randomUUID()}`
      const { data: payment, error: insertError } = await service
        .from('tara_payments')
        .insert({
          user_id: user.id,
          product_id: productId,
          template_id: templateId,
          resume_id: resumeId,
          amount: PRICE_XOF,
        })
        .select('id')
        .single()
      if (insertError) throw insertError

      const vendor = await startMobilePay(productId, `CV Craft — modèle ${templateName}`, PRICE_XOF, phoneNumber)
      return json({ paymentId: payment.id, status: 'PENDING', vendor }, 200, origin)
    }

    if (action === 'create-plan') {
      const planId = typeof body.planId === 'string' ? body.planId : ''
      const phoneNumber = typeof body.phoneNumber === 'string' ? body.phoneNumber : ''
      const plan = PAID_PLANS.get(planId)
      if (!plan) return json({ error: 'Offre payante invalide.' }, 400, origin)
      if (!isCameroonMobileNumber(phoneNumber)) return json({ error: 'Saisissez un numéro mobile camerounais au format 2376XXXXXXXX.' }, 400, origin)

      const productId = `cv-plan-${crypto.randomUUID()}`
      const { data: payment, error: insertError } = await service
        .from('cvcraft_plan_payments')
        .insert({
          user_id: user.id,
          product_id: productId,
          plan_id: planId,
          amount: plan.amount,
        })
        .select('id')
        .single()
      if (insertError) throw insertError

      const vendor = await startMobilePay(
        productId,
        `CV Craft — offre ${plan.name}`,
        plan.amount,
        phoneNumber,
      )
      return json({ paymentId: payment.id, status: 'PENDING', vendor }, 200, origin)
    }

    if (action === 'verify') {
      const paymentId = typeof body.paymentId === 'string' ? body.paymentId : ''
      if (!paymentId) return json({ error: 'Identifiant de paiement absent.' }, 400, origin)
      const { data: payment, error: lookupError } = await service
        .from('tara_payments')
        .select('id, product_id, template_id, resume_id, amount, status')
        .eq('id', paymentId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (lookupError) throw lookupError
      if (!payment) {
        const { data: planPayment, error: planLookupError } = await service
          .from('cvcraft_plan_payments')
          .select('id, product_id, plan_id, amount, status')
          .eq('id', paymentId)
          .eq('user_id', user.id)
          .maybeSingle()
        if (planLookupError) throw planLookupError
        if (!planPayment) return json({ error: 'Paiement inconnu.' }, 404, origin)

        if (planPayment.status !== 'SUCCESS') {
          const status = await getTaraStatus(planPayment.product_id)
          const { error: updateError } = await service
            .from('cvcraft_plan_payments')
            .update({
              status,
              updated_at: new Date().toISOString(),
              paid_at: status === 'SUCCESS' ? new Date().toISOString() : null,
            })
            .eq('id', planPayment.id)
            .neq('status', 'SUCCESS')
          if (updateError) throw updateError
          planPayment.status = status
        }

        let validUntil: string | null = null
        if (planPayment.status === 'SUCCESS') {
          const { data: activation, error: activationError } = await service
            .rpc('activate_cvcraft_plan_payment', { p_payment_id: planPayment.id })
            .single()
          if (activationError) throw activationError
          validUntil = activation.valid_until
        }

        return json({
          status: planPayment.status,
          productType: 'plan',
          planId: planPayment.plan_id,
          amount: planPayment.amount,
          validUntil,
        }, 200, origin)
      }

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
        resumeId: payment.resume_id,
        amount: payment.amount,
      }, 200, origin)
    }

    return json({ error: 'Action inconnue.' }, 400, origin)
  } catch (error) {
    console.error('Erreur Tara Money:', error)
    return json({ error: error instanceof Error ? error.message : 'Erreur du service de paiement.' }, 500, origin)
  }
})
