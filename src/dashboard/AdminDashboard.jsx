import React, { useState, useEffect, useMemo } from 'react'
import { fetchDashboardData, exportReportToCsv } from './dashboardService.js'
import './dashboard.css'

export default function AdminDashboard({ onBack = () => {}, user = null }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [period, setPeriod] = useState('all')
  const [forceDemo, setForceDemo] = useState(false)
  const [activeTab, setActiveTab] = useState('transactions') // 'transactions' | 'clients' | 'summary'

  // Filtres de recherche pour les tableaux
  const [paymentSearch, setPaymentSearch] = useState('')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL') // 'ALL' | 'SUCCESS' | 'PENDING' | 'FAILURE'

  const [clientSearch, setClientSearch] = useState('')
  const [clientPlanFilter, setClientPlanFilter] = useState('ALL') // 'ALL' | 'free' | 'pro' | 'gold'

  const [toastMessage, setToastMessage] = useState('')

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3000)
  }

  // Chargement des données
  const loadStats = async (isDemo = forceDemo, p = period) => {
    setLoading(true)
    try {
      const result = await fetchDashboardData({ forceDemo: isDemo, period: p })
      setData(result)
    } catch (e) {
      console.error('Erreur chargement dashboard:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats(forceDemo, period)
  }, [forceDemo, period])

  // Filtrage des paiements
  const filteredPayments = useMemo(() => {
    if (!data?.recent_payments) return []
    return data.recent_payments.filter((p) => {
      const matchStatus = paymentStatusFilter === 'ALL' || p.status === paymentStatusFilter
      const query = paymentSearch.toLowerCase().trim()
      if (!query) return matchStatus

      const searchContent = [
        p.id,
        p.product_id,
        p.label,
        p.item_type,
        p.customer_name,
        p.customer_phone,
        p.operator,
        String(p.amount),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return matchStatus && searchContent.includes(query)
    })
  }, [data?.recent_payments, paymentSearch, paymentStatusFilter])

  // Filtrage des clients
  const filteredClients = useMemo(() => {
    if (!data?.recent_users) return []
    return data.recent_users.filter((u) => {
      const matchPlan = clientPlanFilter === 'ALL' || u.plan_id === clientPlanFilter
      const query = clientSearch.toLowerCase().trim()
      if (!query) return matchPlan

      const searchContent = [u.name, u.email, u.phone, u.plan_id].filter(Boolean).join(' ').toLowerCase()
      return matchPlan && searchContent.includes(query)
    })
  }, [data?.recent_users, clientSearch, clientPlanFilter])

  // Calculs de pourcentages et ratios
  const stats = data || {}
  const totalRevenue = stats.period_revenue ?? stats.total_revenue ?? 0
  const revPro = stats.revenue_pro || 0
  const revGold = stats.revenue_gold || 0
  const revTemplates = stats.revenue_templates || 0

  const pctPro = totalRevenue > 0 ? Math.round((revPro / totalRevenue) * 100) : 0
  const pctGold = totalRevenue > 0 ? Math.round((revGold / totalRevenue) * 100) : 0
  const pctTemplates = totalRevenue > 0 ? Math.round((revTemplates / totalRevenue) * 100) : 0

  const totalUsers = stats.total_users || 0
  const freeUsers = stats.free_users || 0
  const premiumUsers = stats.premium_users || 0
  const pctFree = totalUsers > 0 ? Math.round((freeUsers / totalUsers) * 100) : 0
  const pctPremium = totalUsers > 0 ? Math.round((premiumUsers / totalUsers) * 100) : 0

  return (
    <div className="admin-dashboard-root">
      {/* Toast d'information */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: '#17191a',
            color: '#d7f76b',
            padding: '12px 20px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '13px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
            zIndex: 9999,
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Header administrateur */}
      <header className="admin-header">
        <div className="admin-header-inner">
          <div className="admin-brand">
            <div className="admin-brand-icon" aria-hidden="true">📊</div>
            <div className="admin-brand-title">
              <h1>CVcraft · Compte Rendu du Site</h1>
              <span>Tableau de bord de pilotage &amp; statistiques financières</span>
            </div>
          </div>

          <div className="admin-header-actions">
            {/* Bascule mode Réel / Démo */}
            <div className="mode-toggle-group" title="Basculer entre les données de la base Supabase et la simulation de test">
              <button
                type="button"
                className={`mode-toggle-btn ${!forceDemo ? 'active real' : ''}`}
                onClick={() => {
                  setForceDemo(false)
                  showToast('Mode Données Réelles activé.')
                }}
              >
                ● Données Réelles
              </button>
              <button
                type="button"
                className={`mode-toggle-btn ${forceDemo ? 'active' : ''}`}
                onClick={() => {
                  setForceDemo(true)
                  showToast('Mode Simulation / Démo activé.')
                }}
              >
                ✨ Simulation
              </button>
            </div>

            <button
              type="button"
              className="admin-btn"
              onClick={() => {
                loadStats(forceDemo, period)
                showToast('Données actualisées avec succès.')
              }}
              title="Rafraîchir les statistiques"
            >
              🔄 Actualiser
            </button>

            <button
              type="button"
              className="admin-btn admin-btn-accent"
              onClick={() => {
                if (data) {
                  exportReportToCsv(data)
                  showToast('Fichier CSV exporté.')
                }
              }}
              title="Exporter les chiffres et transactions au format CSV"
            >
              📥 Exporter CSV
            </button>

            <button
              type="button"
              className="admin-btn"
              onClick={() => window.print()}
              title="Imprimer ou enregistrer en PDF le compte-rendu"
            >
              🖨️ Imprimer PDF
            </button>

            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={onBack}
              title="Quitter le dashboard et revenir sur CVcraft"
            >
              ← Retour au site
            </button>
          </div>
        </div>
      </header>

      <main className="admin-container">
        {/* Notice si la base est vide ou en mode simulation */}
        {stats.notice && (
          <div className="admin-notice-banner">
            <div>
              <span className="banner-icon">ℹ️</span>
              <strong>Information : </strong>
              <span>{stats.notice}</span>
            </div>
            {!forceDemo && (
              <button
                type="button"
                className="admin-btn"
                style={{ padding: '4px 8px', fontSize: '11px' }}
                onClick={() => setForceDemo(true)}
              >
                Voir la simulation complète
              </button>
            )}
          </div>
        )}

        {/* Barre de filtre de période */}
        <div className="admin-period-bar">
          <div className="period-pills">
            {[
              { id: 'all', label: 'Tout l’historique' },
              { id: '30d', label: '30 derniers jours' },
              { id: '7d', label: '7 derniers jours' },
              { id: 'today', label: 'Aujourd’hui' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                className={`period-pill ${period === p.id ? 'active' : ''}`}
                onClick={() => setPeriod(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="last-sync-badge">
            <span className={`sync-dot ${!stats.isRealData ? 'demo' : ''}`} />
            <span>
              {stats.isRealData ? 'Synchronisé avec Supabase en direct' : 'Mode Démonstration / Simulation'} · Maj à{' '}
              {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* GRILLE DES 6 INDICATEURS CLÉS (KPIS) */}
        <section className="kpi-grid" aria-label="Indicateurs de performance">
          {/* 1. Montant encaissé */}
          <article className="kpi-card kpi-revenue">
            <div className="kpi-card-header">
              <span className="kpi-title">Montant Encaissé</span>
              <div className="kpi-icon-wrap">💰</div>
            </div>
            <div className="kpi-value">
              {totalRevenue.toLocaleString('fr-FR')} <small>FCFA</small>
            </div>
            <div className="kpi-footer">
              <span>Chiffre d’affaires total validé</span>
              <span className="kpi-badge badge-green">Mobile Money</span>
            </div>
          </article>

          {/* 2. Clients Gratuits */}
          <article className="kpi-card kpi-free">
            <div className="kpi-card-header">
              <span className="kpi-title">Clients Gratuits</span>
              <div className="kpi-icon-wrap">🌱</div>
            </div>
            <div className="kpi-value">
              {freeUsers.toLocaleString('fr-FR')} <small>utilisateurs</small>
            </div>
            <div className="kpi-footer">
              <span>{pctFree}% des inscrits</span>
              <span className="kpi-badge badge-blue">Offre Free</span>
            </div>
          </article>

          {/* 3. Clients Premium */}
          <article className="kpi-card kpi-premium">
            <div className="kpi-card-header">
              <span className="kpi-title">Clients Premium</span>
              <div className="kpi-icon-wrap">👑</div>
            </div>
            <div className="kpi-value">
              {premiumUsers.toLocaleString('fr-FR')} <small>abonnés</small>
            </div>
            <div className="kpi-footer">
              <span>Pro ({stats.pro_users || 0}) · Gold ({stats.gold_users || 0})</span>
              <span className="kpi-badge badge-gold">{pctPremium}% du total</span>
            </div>
          </article>

          {/* 4. Total Utilisateurs */}
          <article className="kpi-card kpi-users">
            <div className="kpi-card-header">
              <span className="kpi-title">Total Utilisateurs</span>
              <div className="kpi-icon-wrap">👥</div>
            </div>
            <div className="kpi-value">
              {totalUsers.toLocaleString('fr-FR')} <small>comptes</small>
            </div>
            <div className="kpi-footer">
              <span>Base globale de clients</span>
              <span className="kpi-badge">Actifs</span>
            </div>
          </article>

          {/* 5. CVs Générés */}
          <article className="kpi-card kpi-resumes">
            <div className="kpi-card-header">
              <span className="kpi-title">CVs &amp; Exports PDF</span>
              <div className="kpi-icon-wrap">📄</div>
            </div>
            <div className="kpi-value">
              {(stats.total_resumes || 0).toLocaleString('fr-FR')} <small>CVs créés</small>
            </div>
            <div className="kpi-footer">
              <span>{(stats.total_pdfs || 0).toLocaleString('fr-FR')} PDFs téléchargés</span>
              <span className="kpi-badge badge-green">87% exportés</span>
            </div>
          </article>

          {/* 6. Taux de Conversion */}
          <article className="kpi-card kpi-conversion">
            <div className="kpi-card-header">
              <span className="kpi-title">Taux de Conversion</span>
              <div className="kpi-icon-wrap">🎯</div>
            </div>
            <div className="kpi-value">
              {stats.conversion_rate || 0}%
            </div>
            <div className="kpi-footer">
              <span>Gratuit ➔ Offre payante</span>
              <span className="kpi-badge badge-gold">Panier : {(stats.average_basket || 0).toLocaleString('fr-FR')} F</span>
            </div>
          </article>
        </section>

        {/* SECTION DES ANALYSES VISUELLES (FINANCES & POPULARITÉ MODÈLES) */}
        <section className="analytics-section-grid">
          {/* Répartition Financière par Produit */}
          <div className="analytics-card">
            <div className="analytics-card-title">
              <h3>Répartition des Encaissements par Offre</h3>
              <span>Total : {totalRevenue.toLocaleString('fr-FR')} FCFA</span>
            </div>

            <div className="revenue-breakdown-list">
              {/* Offre Pro */}
              <div className="breakdown-row">
                <div className="breakdown-meta">
                  <span className="breakdown-label">
                    <span className="breakdown-color-tag" style={{ background: '#3b82f6' }} />
                    Offre Pro (1 500 FCFA / 3 mois)
                  </span>
                  <span className="breakdown-value">
                    {revPro.toLocaleString('fr-FR')} FCFA <small style={{ color: '#777' }}>({pctPro}%)</small>
                  </span>
                </div>
                <div className="breakdown-bar-track">
                  <div className="breakdown-bar-fill" style={{ width: `${pctPro}%`, background: '#3b82f6' }} />
                </div>
              </div>

              {/* Offre Gold */}
              <div className="breakdown-row">
                <div className="breakdown-meta">
                  <span className="breakdown-label">
                    <span className="breakdown-color-tag" style={{ background: '#eab308' }} />
                    Offre Gold (2 500 FCFA / 1 mois)
                  </span>
                  <span className="breakdown-value">
                    {revGold.toLocaleString('fr-FR')} FCFA <small style={{ color: '#777' }}>({pctGold}%)</small>
                  </span>
                </div>
                <div className="breakdown-bar-track">
                  <div className="breakdown-bar-fill" style={{ width: `${pctGold}%`, background: '#eab308' }} />
                </div>
              </div>

              {/* Modèles Unitaires */}
              <div className="breakdown-row">
                <div className="breakdown-meta">
                  <span className="breakdown-label">
                    <span className="breakdown-color-tag" style={{ background: '#10b981' }} />
                    Ventes de Modèles Unitaires (100 FCFA)
                  </span>
                  <span className="breakdown-value">
                    {revTemplates.toLocaleString('fr-FR')} FCFA <small style={{ color: '#777' }}>({pctTemplates}%)</small>
                  </span>
                </div>
                <div className="breakdown-bar-track">
                  <div className="breakdown-bar-fill" style={{ width: `${pctTemplates}%`, background: '#10b981' }} />
                </div>
              </div>
            </div>

            <div style={{ marginTop: '20px', padding: '12px 14px', background: '#faf9f5', borderRadius: '8px', fontSize: '11.5px', color: '#686f63' }}>
              💡 <strong>Observation :</strong> L’offre <strong>Pro</strong> génère la majorité des encaissements récurrents, tandis que les micro-paiements de modèles offrent un point d’entrée idéal pour convertir les utilisateurs réticents à l’abonnement.
            </div>
          </div>

          {/* Popularité des Modèles de CV */}
          <div className="analytics-card">
            <div className="analytics-card-title">
              <h3>Modèles les Plus Utilisés</h3>
              <span>Total : {stats.total_resumes || 0} créations</span>
            </div>

            <div className="template-rank-list">
              {(stats.templates_usage || []).slice(0, 5).map((tpl, idx) => {
                const totalTpl = stats.total_resumes || 1
                const pct = Math.round(((tpl.count || 0) / totalTpl) * 100)
                const isFree = tpl.template_id === 'gratuit' || tpl.template_id === 'epure'
                return (
                  <div className="template-rank-row" key={tpl.template_id || idx}>
                    <div className="template-rank-left">
                      <span className="template-rank-num">#{idx + 1}</span>
                      <span className="template-rank-name">{tpl.name || tpl.template_id}</span>
                      <span className={`template-rank-tag ${isFree ? 'free' : 'pro'}`}>
                        {isFree ? 'Gratuit' : 'Premium'}
                      </span>
                    </div>
                    <div className="template-rank-right">
                      <span className="template-rank-count">{tpl.count}</span>
                      <span className="template-rank-pct">{pct}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* NAVIGATION PAR ONGLETS : TRANSACTIONS, CLIENTS, RAPPORT EXÉCUTIF */}
        <nav className="admin-tabs-nav" aria-label="Onglets du compte rendu">
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            💳 Journal des Transactions <span className="tab-badge">{filteredPayments.length}</span>
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'clients' ? 'active' : ''}`}
            onClick={() => setActiveTab('clients')}
          >
            👤 Répertoire des Clients <span className="tab-badge">{filteredClients.length}</span>
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            📋 Synthèse Exécutive &amp; Rapport
          </button>
        </nav>

        {/* CONTENU ONGLETS */}

        {/* 1. JOURNAL DES TRANSACTIONS */}
        {activeTab === 'transactions' && (
          <section aria-labelledby="heading-transactions">
            <div className="table-filter-bar">
              <div className="table-search-box">
                <span className="table-search-icon" aria-hidden="true">🔍</span>
                <input
                  type="text"
                  placeholder="Rechercher par référence, client, téléphone, montant…"
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                />
              </div>

              <div className="table-status-filter">
                {[
                  { id: 'ALL', label: 'Toutes les transactions' },
                  { id: 'SUCCESS', label: '✓ Succès' },
                  { id: 'PENDING', label: '⏳ En attente' },
                  { id: 'FAILURE', label: '✕ Échecs' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`filter-chip ${paymentStatusFilter === f.id ? 'active' : ''}`}
                    onClick={() => setPaymentStatusFilter(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="admin-table-card">
              <div className="admin-table-container">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Date &amp; Heure</th>
                      <th>Référence / Transaction</th>
                      <th>Produit / Offre</th>
                      <th>Client / Numéro</th>
                      <th>Opérateur</th>
                      <th>Montant</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.length ? (
                      filteredPayments.map((p) => {
                        const dateStr = p.created_at
                          ? new Date(p.created_at).toLocaleString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'

                        const statusClass =
                          p.status === 'SUCCESS' ? 'success' : p.status === 'PENDING' ? 'pending' : 'failure'

                        const statusLabel =
                          p.status === 'SUCCESS' ? 'Payé' : p.status === 'PENDING' ? 'En cours' : 'Échoué'

                        return (
                          <tr key={p.id}>
                            <td style={{ whiteSpace: 'nowrap', color: '#555b51' }}>{dateStr}</td>
                            <td>
                              <code style={{ fontSize: '11px', background: '#f0eee5', padding: '2px 5px', borderRadius: '4px' }}>
                                {p.product_id || p.id}
                              </code>
                            </td>
                            <td>
                              <strong>{p.label || (p.item_type?.startsWith('template:') ? `Modèle ${p.item_type.split(':')[1]}` : `Offre ${p.item_type?.toUpperCase()}`)}</strong>
                            </td>
                            <td>
                              <div>{p.customer_name || 'Utilisateur'}</div>
                              <small style={{ color: '#777d73' }}>{p.customer_phone || p.user_id}</small>
                            </td>
                            <td>{p.operator || 'Mobile Money'}</td>
                            <td>
                              <strong style={{ fontSize: '13px' }}>
                                {(p.amount || 0).toLocaleString('fr-FR')} FCFA
                              </strong>
                            </td>
                            <td>
                              <span className={`status-pill ${statusClass}`}>
                                {statusClass === 'success' && '✓'}
                                {statusClass === 'pending' && '⏳'}
                                {statusClass === 'failure' && '✕'} {statusLabel}
                              </span>
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan="7">
                          <div className="table-empty-state">
                            <span>🔍 Aucun paiement correspondant à votre recherche.</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* 2. RÉPERTOIRE DES CLIENTS */}
        {activeTab === 'clients' && (
          <section aria-labelledby="heading-clients">
            <div className="table-filter-bar">
              <div className="table-search-box">
                <span className="table-search-icon" aria-hidden="true">🔍</span>
                <input
                  type="text"
                  placeholder="Rechercher par nom, email, téléphone…"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                />
              </div>

              <div className="table-status-filter">
                {[
                  { id: 'ALL', label: 'Tous les clients' },
                  { id: 'free', label: 'Gratuit' },
                  { id: 'pro', label: 'Pro' },
                  { id: 'gold', label: 'Gold' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`filter-chip ${clientPlanFilter === f.id ? 'active' : ''}`}
                    onClick={() => setClientPlanFilter(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="admin-table-card">
              <div className="admin-table-container">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Contact (Email / Tél)</th>
                      <th>Offre Active</th>
                      <th>Statut Abonnement</th>
                      <th>Inscrit le</th>
                      <th>Dépenses Totales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.length ? (
                      filteredClients.map((u, i) => {
                        const dateStr = u.created_at
                          ? new Date(u.created_at).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '-'

                        const plan = u.plan_id || 'free'
                        return (
                          <tr key={u.user_id || i}>
                            <td>
                              <strong>{u.name || 'Candidat'}</strong>
                            </td>
                            <td>
                              <div>{u.email || '-'}</div>
                              <small style={{ color: '#777d73' }}>{u.phone || '-'}</small>
                            </td>
                            <td>
                              <span className={`plan-pill ${plan}`}>
                                {plan === 'gold' ? '👑 Gold' : plan === 'pro' ? '⭐ Pro' : 'Free'}
                              </span>
                            </td>
                            <td>
                              {plan === 'free' ? (
                                <span style={{ color: '#666' }}>Accès standard</span>
                              ) : u.is_active ? (
                                <span className="status-pill success">✓ Actif</span>
                              ) : (
                                <span className="status-pill pending">Expiré</span>
                              )}
                            </td>
                            <td style={{ color: '#555b51' }}>{dateStr}</td>
                            <td>
                              <strong>
                                {(u.total_spent || (plan === 'gold' ? 2500 : plan === 'pro' ? 1500 : 0)).toLocaleString(
                                  'fr-FR'
                                )}{' '}
                                FCFA
                              </strong>
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan="6">
                          <div className="table-empty-state">
                            <span>🔍 Aucun client ne correspond au filtre sélectionné.</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* 3. SYNTHÈSE EXÉCUTIVE */}
        {activeTab === 'summary' && (
          <article className="executive-summary-card">
            <div className="summary-headline">
              <h2>Compte Rendu d’Activité · Synthèse Opérationnelle</h2>
              <p>Rapport consolidé des performances commerciales, de conversion et d’engagement de CVcraft.</p>
            </div>

            <div className="summary-points-grid">
              <div className="summary-point-box">
                <h4>💵 Santé Financière &amp; Encaissements</h4>
                <p>
                  Avec un chiffre d’affaires encaissé de <strong>{totalRevenue.toLocaleString('fr-FR')} FCFA</strong>, l’intégration de Tara Mobile Money valide l’appétence des utilisateurs locaux pour les solutions de paiement sans carte bancaire.
                </p>
              </div>

              <div className="summary-point-box">
                <h4>👑 Adoption des Formules Premium</h4>
                <p>
                  <strong>{premiumUsers} clients payants</strong> (soit {stats.conversion_rate || 0}% de conversion), répartis entre l’offre Pro (3 mois) et Gold (1 mois avec 3 CVs multi-postes).
                </p>
              </div>

              <div className="summary-point-box">
                <h4>🎯 Utilisation &amp; Rétention</h4>
                <p>
                  <strong>{stats.total_resumes || 0} CVs créés</strong> et <strong>{stats.total_pdfs || 0} téléchargements PDF</strong>. Le modèle gratuit classique sert de tremplin naturel vers l’acquisition.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="admin-btn admin-btn-accent"
                onClick={() => exportReportToCsv(data)}
              >
                📥 Télécharger le rapport CSV complet
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={() => window.print()}
              >
                🖨️ Imprimer la synthèse
              </button>
            </div>
          </article>
        )}
      </main>
    </div>
  )
}
