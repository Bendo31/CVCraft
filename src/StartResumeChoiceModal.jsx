import React from 'react'

export function StartResumeChoiceModal({
  isOpen,
  onClose,
  onSelectBlank,
  onSelectImport,
}) {
  if (!isOpen) return null

  return (
    <div className="payment-backdrop choice-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="choice-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="choice-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="account-close"
          type="button"
          aria-label="Fermer"
          onClick={onClose}
        >
          ×
        </button>

        <div className="choice-modal-header">
          <span className="eyebrow"><span className="eyebrow-dot" /> Nouveau document</span>
          <h2 id="choice-modal-title">Comment souhaitez-vous créer votre CV ?</h2>
          <p className="choice-modal-subtitle">
            Gagnez du temps en important votre parcours existant ou concevez un document sur mesure à partir d'une page blanche.
          </p>
        </div>

        <div className="choice-cards-grid">
          {/* Option 1: Améliorer un CV existant (Recommandé) */}
          <div
            className="choice-card choice-card-featured"
            onClick={onSelectImport}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelectImport()
              }
            }}
          >
            <div className="choice-card-badge">⭐ Recommandé</div>
            <div className="choice-card-icon choice-card-icon-import">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            </div>
            <div className="choice-card-body">
              <h3>Améliorer un CV existant</h3>
              <p>
                Importez votre CV actuel en <strong>PDF</strong>, <strong>Word</strong> ou texte. Notre analyse extrait automatiquement vos coordonnées, expériences et compétences pour les intégrer dans nos modèles professionnels.
              </p>
              <div className="choice-card-tags">
                <span>PDF</span>
                <span>Word</span>
                <span>Texte</span>
                <span>Sublimé avec nos modèles</span>
              </div>
            </div>
            <button
              className="button button-dark choice-card-button"
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onSelectImport()
              }}
            >
              Importer mon CV existant <span aria-hidden="true">→</span>
            </button>
          </div>

          {/* Option 2: Partir de zéro */}
          <div
            className="choice-card"
            onClick={onSelectBlank}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelectBlank()
              }
            }}
          >
            <div className="choice-card-icon choice-card-icon-blank">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            <div className="choice-card-body">
              <h3>Partir d'une page blanche</h3>
              <p>
                Remplissez vos informations pas à pas avec notre formulaire intuitif. Choisissez votre mise en page, vos couleurs et prévisualisez le rendu en temps réel.
              </p>
              <div className="choice-card-tags">
                <span>Création libre</span>
                <span>Formulaire guidé</span>
                <span>Temps réel</span>
              </div>
            </div>
            <button
              className="button button-outline choice-card-button"
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onSelectBlank()
              }}
            >
              Créer de zéro <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
