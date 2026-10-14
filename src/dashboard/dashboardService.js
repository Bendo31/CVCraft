import { getSupabaseClient } from '../supabaseClient.js'

/**
 * Jeu de données de démonstration complet et réaliste pour tester
 * et visualiser le dashboard immédiatement avec des graphiques riches.
 */
export const DEMO_STATS = {
  total_users: 1420,
  free_users: 1184,
  pro_users: 168,
  gold_users: 68,
  premium_users: 236,
  total_revenue: 512000,
  revenue_pro: 252000,
  revenue_gold: 170000,
  revenue_templates: 90000,
  total_resumes: 1890,
  total_pdfs: 1640,
  conversion_rate: 16.6,
  average_basket: 2169,
  templates_usage: [
    { template_id: 'gratuit', name: 'Gratuit', count: 710, isPremium: false },
    { template_id: 'epure', name: 'Épuré', count: 480, isPremium: false },
    { template_id: 'sillage', name: 'Sillage', count: 215, isPremium: true },
    { template_id: 'signal', name: 'Signal', count: 185, isPremium: true },
    { template_id: 'horizon', name: 'Horizon', count: 110, isPremium: true },
    { template_id: 'orbite', name: 'Orbite', count: 75, isPremium: true },
    { template_id: 'impact', name: 'Impact', count: 52, isPremium: true },
    { template_id: 'zenith', name: 'Zénith', count: 38, isPremium: true },
    { template_id: 'aura', name: 'Aura', count: 25, isPremium: true },
  ],
  recent_payments: [
    {
      id: 'pay_79a1f4',
      product_id: 'tara_pro_cm_9921',
      user_id: 'usr_882',
      customer_name: 'Armel Mbarga',
      customer_phone: '+237 694 21 44 10',
      item_type: 'pro',
      label: 'Abonnement Pro (3 mois)',
      amount: 100,
      status: 'SUCCESS',
      created_at: new Date(Date.now() - 1000 * 60 * 32).toISOString(), // Il y a 32 min
      operator: 'Orange Money (CM)',
    },
    {
      id: 'pay_79a1f3',
      product_id: 'tara_gold_sn_3102',
      user_id: 'usr_881',
      customer_name: 'Aïssatou Diallo',
      customer_phone: '+221 77 554 12 80',
      item_type: 'gold',
      label: 'Abonnement Gold (1 mois)',
      amount: 100,
      status: 'SUCCESS',
      created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // Il y a 2h
      operator: 'Wave (SN)',
    },
    {
      id: 'pay_79a1f2',
      product_id: 'tara_tpl_ci_4401',
      user_id: 'usr_880',
      customer_name: 'Kouassi Jean-Marc',
      customer_phone: '+225 07 48 90 12 33',
      item_type: 'template:signal',
      label: 'Modèle Signal (Unitaire)',
      amount: 100,
      status: 'SUCCESS',
      created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
      operator: 'MTN MoMo (CI)',
    },
    {
      id: 'pay_79a1f1',
      product_id: 'tara_pro_cm_9918',
      user_id: 'usr_879',
      customer_name: 'Brice Ondoua',
      customer_phone: '+237 671 00 93 22',
      item_type: 'pro',
      label: 'Abonnement Pro (3 mois)',
      amount: 100,
      status: 'SUCCESS',
      created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
      operator: 'MTN MoMo (CM)',
    },
    {
      id: 'pay_79a1f0',
      product_id: 'tara_gold_cm_8109',
      user_id: 'usr_878',
      customer_name: 'Stéphanie Minka',
      customer_phone: '+237 699 12 04 88',
      item_type: 'gold',
      label: 'Abonnement Gold (1 mois)',
      amount: 100,
      status: 'PENDING',
      created_at: new Date(Date.now() - 1000 * 60 * 500).toISOString(),
      operator: 'Orange Money (CM)',
    },
    {
      id: 'pay_79a1ef',
      product_id: 'tara_tpl_cm_7112',
      user_id: 'usr_877',
      customer_name: 'Patrick Nkomo',
      customer_phone: '+237 677 44 20 19',
      item_type: 'template:sillage',
      label: 'Modèle Sillage (Unitaire)',
      amount: 100,
      status: 'SUCCESS',
      created_at: new Date(Date.now() - 1000 * 60 * 800).toISOString(),
      operator: 'MTN MoMo (CM)',
    },
    {
      id: 'pay_79a1ee',
      product_id: 'tara_pro_sn_2901',
      user_id: 'usr_876',
      customer_name: 'Mamadou Ba',
      customer_phone: '+221 78 200 44 11',
      item_type: 'pro',
      label: 'Abonnement Pro (3 mois)',
      amount: 100,
      status: 'FAILURE',
      created_at: new Date(Date.now() - 1000 * 60 * 1200).toISOString(),
      operator: 'Orange Money (SN)',
    },
  ],
  recent_users: [
    {
      user_id: 'usr_882',
      name: 'Armel Mbarga',
      email: 'armel.mbarga@gmail.com',
      phone: '+237 694 21 44 10',
      plan_id: 'pro',
      is_active: true,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      resumes_count: 1,
      total_spent: 100,
    },
    {
      user_id: 'usr_881',
      name: 'Aïssatou Diallo',
      email: 'aissatou.diallo@outlook.com',
      phone: '+221 77 554 12 80',
      plan_id: 'gold',
      is_active: true,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      resumes_count: 3,
      total_spent: 100,
    },
    {
      user_id: 'usr_880',
      name: 'Kouassi Jean-Marc',
      email: 'jm.kouassi@yahoo.fr',
      phone: '+225 07 48 90 12 33',
      plan_id: 'free',
      is_active: false,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString(),
      resumes_count: 1,
      total_spent: 100,
    },
    {
      user_id: 'usr_879',
      name: 'Brice Ondoua',
      email: 'brice.ondoua@gmail.com',
      phone: '+237 671 00 93 22',
      plan_id: 'pro',
      is_active: true,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 14).toISOString(),
      resumes_count: 1,
      total_spent: 100,
    },
    {
      user_id: 'usr_878',
      name: 'Stéphanie Minka',
      email: 'stephanie.minka@gmail.com',
      phone: '+237 699 12 04 88',
      plan_id: 'free',
      is_active: false,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
      resumes_count: 1,
      total_spent: 0,
    },
    {
      user_id: 'usr_877',
      name: 'Patrick Nkomo',
      email: 'p.nkomo@wanadoo.fr',
      phone: '+237 677 44 20 19',
      plan_id: 'free',
      is_active: false,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
      resumes_count: 1,
      total_spent: 100,
    },
  ],
}

/**
 * Récupère les statistiques réelles du dashboard depuis Supabase.
 * En cas d'échec ou d'absence de données réelles, fusionne intelligemment ou utilise la démo.
 */
export async function fetchDashboardData({ forceDemo = false, period = 'all' } = {}) {
  if (forceDemo) {
    return filterStatsByPeriod(DEMO_STATS, period, true)
  }

  const client = getSupabaseClient()
  if (!client) {
    return filterStatsByPeriod(DEMO_STATS, period, true, 'Supabase non configuré (Mode simulation actif)')
  }

  try {
    // 1. Essai de l'appel RPC dédié
    const { data: rpcData, error: rpcError } = await client.rpc('get_admin_dashboard_stats')

    if (!rpcError && rpcData && typeof rpcData === 'object') {
      const parsed = formatRawStats(rpcData)
      // Si la base est encore vide (0 utilisateurs), on peut proposer la démo ou les données à zéro
      if (parsed.total_users === 0 && parsed.total_revenue === 0) {
        return {
          ...filterStatsByPeriod(DEMO_STATS, period, true),
          isRealData: false,
          isEmptyDbNotice: 'Votre base Supabase est vide. Des données de démonstration sont affichées.',
        }
      }
      return filterStatsByPeriod(parsed, period, false)
    }

    // 2. Fallback manuel par requêtes directes si la fonction RPC n'a pas encore été créée
    const directStats = await fetchDirectTableStats(client)
    if (directStats) {
      if (directStats.total_users === 0 && directStats.total_revenue === 0) {
        return {
          ...filterStatsByPeriod(DEMO_STATS, period, true),
          isRealData: false,
          isEmptyDbNotice: 'Base de données vide. Données de démonstration affichées.',
        }
      }
      return filterStatsByPeriod(directStats, period, false)
    }

    return filterStatsByPeriod(DEMO_STATS, period, true, 'Affichage en mode démo (accès tables direct restreint)')
  } catch (err) {
    console.warn('Erreur récupération stats live:', err)
    return filterStatsByPeriod(DEMO_STATS, period, true, `Mode simulation : ${err.message || 'connexion'}`)
  }
}

/**
 * Calcul manuel via les tables si l'utilisateur y a accès
 */
async function fetchDirectTableStats(client) {
  try {
    const [resumesRes, subsRes, planPayRes, taraPayRes] = await Promise.all([
      client.from('resumes').select('id, user_id, first_name, last_name, email, phone, content, pdf_url, created_at'),
      client.from('cvcraft_subscriptions').select('user_id, plan_id, valid_until'),
      client.from('cvcraft_plan_payments').select('id, user_id, plan_id, amount, status, created_at, paid_at, product_id'),
      client.from('tara_payments').select('id, user_id, template_id, amount, status, created_at, paid_at, product_id'),
    ])

    const resumes = resumesRes.data || []
    const subs = subsRes.data || []
    const planPayments = planPayRes.data || []
    const taraPayments = taraPayRes.data || []

    const userIds = new Set([
      ...resumes.map((r) => r.user_id),
      ...subs.map((s) => s.user_id),
      ...planPayments.map((p) => p.user_id),
    ])

    const now = Date.now()
    let proCount = 0
    let goldCount = 0
    subs.forEach((s) => {
      if (new Date(s.valid_until).getTime() > now) {
        if (s.plan_id === 'gold') goldCount++
        else if (s.plan_id === 'pro') proCount++
      }
    })

    const totalUsers = userIds.size
    const premiumUsers = proCount + goldCount
    const freeUsers = Math.max(0, totalUsers - premiumUsers)

    let revPro = 0
    let revGold = 0
    let revTemplates = 0

    planPayments.forEach((p) => {
      if (p.status === 'SUCCESS') {
        if (p.plan_id === 'pro') revPro += p.amount || 0
        if (p.plan_id === 'gold') revGold += p.amount || 0
      }
    })

    taraPayments.forEach((p) => {
      if (p.status === 'SUCCESS') revTemplates += p.amount || 0
    })

    const totalRevenue = revPro + revGold + revTemplates

    // Templates breakdown
    const templateCounts = {}
    resumes.forEach((r) => {
      const t = r.content?.template || 'gratuit'
      templateCounts[t] = (templateCounts[t] || 0) + 1
    })

    const templates_usage = Object.entries(templateCounts)
      .map(([id, count]) => ({ template_id: id, count }))
      .sort((a, b) => b.count - a.count)

    // Fusion des paiements
    const allPayments = [
      ...planPayments.map((p) => ({
        id: p.id,
        user_id: p.user_id,
        item_type: p.plan_id,
        amount: p.amount,
        status: p.status,
        created_at: p.created_at,
        paid_at: p.paid_at,
        product_id: p.product_id,
      })),
      ...taraPayments.map((p) => ({
        id: p.id,
        user_id: p.user_id,
        item_type: `template:${p.template_id}`,
        amount: p.amount,
        status: p.status,
        created_at: p.created_at,
        paid_at: p.paid_at,
        product_id: p.product_id,
      })),
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    // Liste des utilisateurs récents
    const recent_users = resumes.slice(0, 25).map((r) => ({
      user_id: r.user_id,
      name: `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.email || 'Utilisateur',
      email: r.email || '',
      phone: r.phone || '',
      plan_id: subs.find((s) => s.user_id === r.user_id)?.plan_id || 'free',
      is_active: Boolean(subs.find((s) => s.user_id === r.user_id && new Date(s.valid_until).getTime() > now)),
      created_at: r.created_at,
    }))

    return formatRawStats({
      total_users: totalUsers,
      free_users: freeUsers,
      pro_users: proCount,
      gold_users: goldCount,
      premium_users: premiumUsers,
      total_revenue: totalRevenue,
      revenue_pro: revPro,
      revenue_gold: revGold,
      revenue_templates: revTemplates,
      total_resumes: resumes.length,
      total_pdfs: resumes.filter((r) => Boolean(r.pdf_url)).length,
      recent_payments: allPayments,
      recent_users,
      templates_usage,
    })
  } catch (e) {
    console.error('Erreur query tables directes:', e)
    return null
  }
}

/**
 * Normalise les statistiques avec les calculs dérivés
 */
function formatRawStats(data) {
  const totalUsers = Number(data.total_users || 0)
  const proUsers = Number(data.pro_users || 0)
  const goldUsers = Number(data.gold_users || 0)
  const premiumUsers = Number(data.premium_users || proUsers + goldUsers)
  const freeUsers = Number(data.free_users ?? Math.max(0, totalUsers - premiumUsers))
  const totalRevenue = Number(data.total_revenue || 0)
  const revPro = Number(data.revenue_pro || 0)
  const revGold = Number(data.revenue_gold || 0)
  const revTemplates = Number(data.revenue_templates || 0)

  const conversionRate = totalUsers > 0 ? ((premiumUsers / totalUsers) * 100).toFixed(1) : '0.0'
  const successfulPayments = (data.recent_payments || []).filter((p) => p.status === 'SUCCESS').length
  const averageBasket = successfulPayments > 0 ? Math.round(totalRevenue / successfulPayments) : 0

  return {
    total_users: totalUsers,
    free_users: freeUsers,
    pro_users: proUsers,
    gold_users: goldUsers,
    premium_users: premiumUsers,
    total_revenue: totalRevenue,
    revenue_pro: revPro,
    revenue_gold: revGold,
    revenue_templates: revTemplates,
    total_resumes: Number(data.total_resumes || 0),
    total_pdfs: Number(data.total_pdfs || 0),
    conversion_rate: Number(conversionRate),
    average_basket: averageBasket,
    templates_usage: data.templates_usage || [],
    recent_payments: data.recent_payments || [],
    recent_users: data.recent_users || [],
  }
}

/**
 * Filtre les données selon la période sélectionnée
 */
function filterStatsByPeriod(stats, period, isDemo = false, notice = null) {
  let filteredPayments = [...(stats.recent_payments || [])]
  let filteredUsers = [...(stats.recent_users || [])]
  const now = Date.now()

  if (period !== 'all') {
    const periodDays = period === 'today' ? 1 : period === '7d' ? 7 : 30
    const cutoff = now - periodDays * 24 * 60 * 60 * 1000

    filteredPayments = filteredPayments.filter((p) => {
      const t = new Date(p.created_at).getTime()
      return !isNaN(t) && t >= cutoff
    })

    filteredUsers = filteredUsers.filter((u) => {
      const t = new Date(u.created_at).getTime()
      return !isNaN(t) && t >= cutoff
    })
  }

  // Recalcul du CA sur la période pour les paiements filtrés si période restreinte
  let periodRevenue = stats.total_revenue
  if (period !== 'all') {
    periodRevenue = filteredPayments
      .filter((p) => p.status === 'SUCCESS')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  }

  return {
    ...stats,
    period,
    period_revenue: periodRevenue,
    recent_payments: filteredPayments,
    recent_users: filteredUsers,
    isRealData: !isDemo,
    notice,
    generatedAt: new Date().toISOString(),
  }
}

/**
 * Exportation du compte rendu au format CSV
 */
export function exportReportToCsv(data) {
  const lines = []

  // Entête
  lines.push(['RAPPORT CAPVERS - COMPTE RENDU DU SITE'].join(';'))
  lines.push([`Date de génération`, new Date().toLocaleString('fr-FR')].join(';'))
  lines.push([`Période`, data.period || 'Toutes les données'].join(';'))
  lines.push([])

  // Indicateurs clés
  lines.push(['INDICATEURS CLÉS', 'VALEUR', 'UNITÉ'].join(';'))
  lines.push(['Total Utilisateurs', data.total_users, 'clients'].join(';'))
  lines.push(['Clients Gratuits', data.free_users, 'clients'].join(';'))
  lines.push(['Clients Premium (Payants)', data.premium_users, 'clients'].join(';'))
  lines.push(['- Dont Abonnés Pro', data.pro_users, 'clients'].join(';'))
  lines.push(['- Dont Abonnés Gold', data.gold_users, 'clients'].join(';'))
  lines.push(['Taux de Conversion Payant', `${data.conversion_rate}%`, '%'].join(';'))
  lines.push(['Montant Total Encaissé', `${data.total_revenue.toLocaleString('fr-FR')} FCFA`, 'FCFA'].join(';'))
  lines.push(['- Chiffre d\'Affaires Pro', `${data.revenue_pro.toLocaleString('fr-FR')} FCFA`, 'FCFA'].join(';'))
  lines.push(['- Chiffre d\'Affaires Gold', `${data.revenue_gold.toLocaleString('fr-FR')} FCFA`, 'FCFA'].join(';'))
  lines.push(['- Ventes Modèles Unitaires', `${data.revenue_templates.toLocaleString('fr-FR')} FCFA`, 'FCFA'].join(';'))
  lines.push(['Total CVs Créés', data.total_resumes, 'CVs'].join(';'))
  lines.push(['Total Téléchargements PDF', data.total_pdfs, 'PDFs'].join(';'))
  lines.push([])

  // Journal des transactions
  lines.push(['JOURNAL DES PAIEMENTS ET TRANSACTIONS'].join(';'))
  lines.push(['Date', 'Référence', 'Produit / Offre', 'Montant (FCFA)', 'Statut', 'Client'].join(';'))
  
  ;(data.recent_payments || []).forEach((p) => {
    lines.push([
      p.created_at ? new Date(p.created_at).toLocaleString('fr-FR') : '-',
      p.product_id || p.id || '-',
      p.label || p.item_type || '-',
      p.amount || 0,
      p.status || '-',
      p.customer_name || p.user_id || '-',
    ].join(';'))
  })

  lines.push([])

  // Modèles
  lines.push(['POPULARITÉ DES MODÈLES'].join(';'))
  lines.push(['Modèle', 'Nombre d\'utilisations'].join(';'))
  ;(data.templates_usage || []).forEach((t) => {
    lines.push([t.template_id || t.name, t.count || 0].join(';'))
  })

  const csvContent = '\uFEFF' + lines.join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `capvers_rapport_${new Date().toISOString().slice(0, 10)}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
