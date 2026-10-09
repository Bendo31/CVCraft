import React, { useState, useRef } from 'react'
import { extractTextFromFile, parseResumeText } from './resumeParser'

export function ImportResumeModal({
  isOpen,
  onClose,
  onApplyResume,
  templates = [
    { id: 'sillage', name: 'Sillage', description: 'Éditorial', color: 'blue' },
    { id: 'atlas', name: 'Atlas', description: 'Structuré', color: 'lime' },
    { id: 'signal', name: 'Signal', description: 'Audacieux', color: 'orange' },
    { id: 'gratuit', name: 'Gratuit', description: 'Basique', color: 'gratuit' },
  ],
}) {
  const [activeTab, setActiveTab] = useState('file') // 'file' | 'paste'
  const [file, setFile] = useState(null)
  const [pastedText, setPastedText] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [parseError, setParseError] = useState('')
  const [parsedData, setParsedData] = useState(null)
  const [selectedTemplate, setSelectedTemplate] = useState('sillage')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  if (!isOpen) return null

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      setParseError('')
      runExtraction(selected)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      setFile(droppedFile)
      setParseError('')
      runExtraction(droppedFile)
    }
  }

  const runExtraction = async (inputFile) => {
    setIsParsing(true)
    setParseError('')
    try {
      const extractedText = await extractTextFromFile(inputFile)
      if (!extractedText || extractedText.trim().length < 20) {
        throw new Error('Le document semble vide ou contient uniquement des images scannées sans texte détectable.')
      }
      const data = parseResumeText(extractedText)
      setParsedData(data)
    } catch (err) {
      console.error('Erreur extraction CV:', err)
      setParseError(err.message || 'Impossible d’analyser le document. Essayez un autre fichier ou collez le texte directement.')
    } finally {
      setIsParsing(false)
    }
  }

  const handleParsePasted = () => {
    if (!pastedText.trim()) {
      setParseError('Veuillez coller le texte de votre CV.')
    }
    setIsParsing(true)
    setParseError('')
    try {
      const data = parseResumeText(pastedText)
      setParsedData(data)
    } catch (err) {
      setParseError(err.message || 'Erreur lors de l’analyse.')
    } finally {
      setIsParsing(false)
    }
  }

  const handleConfirm = () => {
    if (!parsedData) return
    onApplyResume({
      resumeData: parsedData,
      template: selectedTemplate,
      photo: parsedData.photo || '',
    })
    onClose()
  }

  const handleReset = () => {
    setParsedData(null)
    setFile(null)
    setPastedText('')
    setParseError('')
  }

  return (
    <div className="payment-backdrop import-backdrop" role="presentation" onClick={onClose}>
      <div
        className="import-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="change-plan-close" type="button" aria-label="Fermer" onClick={onClose}>
          ×
        </button>

        <div className="import-header">
          <span className="preview-kicker">Amélioration de CV existant</span>
          <h2 id="import-title">Importez et sublimez votre CV</h2>
          <p>
            Donnez une nouvelle dimension à votre profil. Importez votre ancien CV (PDF, Word, texte)
            pour le régénérer dans l'un de nos modèles de designers.
          </p>
        </div>

        {!parsedData ? (
          <>
            {/* Onglets de sélection du mode d'import */}
            <div className="import-tabs" role="tablist">
              <button
                type="button"
                className={`import-tab ${activeTab === 'file' ? 'is-active' : ''}`}
                onClick={() => { setActiveTab('file'); setParseError('') }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <polyline points="9 15 12 12 15 15" />
                </svg>
                <span>Fichier (PDF, TXT)</span>
              </button>

              <button
                type="button"
                className={`import-tab ${activeTab === 'paste' ? 'is-active' : ''}`}
                onClick={() => { setActiveTab('paste'); setParseError('') }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                </svg>
                <span>Copier / Coller</span>
              </button>
            </div>

            {/* Contenu de l'onglet Fichier */}
            {activeTab === 'file' && (
              <div
                className={`import-dropzone ${dragOver ? 'is-dragover' : ''} ${isParsing ? 'is-loading' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => !isParsing && fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,.txt,.json"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />

                {isParsing ? (
                  <div className="import-parsing-state">
                    <span className="import-spinner" aria-hidden="true" />
                    <strong>Analyse intelligente de votre CV en cours…</strong>
                    <p>Extraction des coordonnées, expériences et compétences</p>
                  </div>
                ) : (
                  <div className="import-dropzone-content">
                    <div className="import-icon-wrap">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                    <strong>Glissez votre CV ici ou cliquez pour parcourir</strong>
                    <p>Formats supportés : PDF, TXT, JSON (CV Word, Canva ou texte exportés)</p>
                    <span className="import-browse-badge">Choisir un fichier</span>
                  </div>
                )}
              </div>
            )}

            {/* Contenu de l'onglet Copier-Coller */}
            {activeTab === 'paste' && (
              <div className="import-paste-pane">
                <label htmlFor="import-pasted-text">Collez le texte brut de votre CV ou profil :</label>
                <textarea
                  id="import-pasted-text"
                  rows={8}
                  placeholder="Exemple :
Jean Dupont
Développeur Full-Stack
jean.dupont@email.com | +237 690 00 00 00

EXPÉRIENCES
• Développeur Web chez Digital Corp (2021 - 2024)...
• Développeur Junior chez StartApp (2019 - 2021)...

FORMATIONS
• Master Informatique - Université de Yaoundé (2019)

COMPÉTENCES
React, Node.js, SQL, TypeScript..."
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                />
                <button
                  type="button"
                  className="button button-dark"
                  disabled={isParsing || !pastedText.trim()}
                  onClick={handleParsePasted}
                >
                  {isParsing ? 'Analyse en cours…' : 'Analyser et extraire'}
                </button>
              </div>
            )}

            {parseError && <p className="account-error import-error" role="alert">{parseError}</p>}
          </>
        ) : (
          /* Étape 2 : Confirmation des données extraites et choix du modèle */
          <div className="import-success-view">
            <div className="import-summary-bar">
              <span className="import-check-icon">✓</span>
              <div>
                <strong>Informations extraites avec succès !</strong>
                <p>
                  {parsedData.firstName || parsedData.lastName ? `${parsedData.firstName} ${parsedData.lastName}` : 'Candidat'}
                  {parsedData.role ? ` · ${parsedData.role}` : ''}
                </p>
              </div>
              <button type="button" className="import-reselect-btn" onClick={handleReset}>
                Changer de fichier
              </button>
            </div>

            {/* Badges statistiques */}
            <div className="import-stats-row">
              <span className="import-stat-badge">
                💼 {parsedData.experiences?.length || 0} expérience{parsedData.experiences?.length > 1 ? 's' : ''}
              </span>
              <span className="import-stat-badge">
                🎓 {parsedData.educations?.length || 0} formation{parsedData.educations?.length > 1 ? 's' : ''}
              </span>
              <span className="import-stat-badge">
                ⚡ {parsedData.skills?.length || 0} compétence{parsedData.skills?.length > 1 ? 's' : ''}
              </span>
              {parsedData.languages?.length > 0 && (
                <span className="import-stat-badge">
                  🌐 {parsedData.languages.length} langue{parsedData.languages.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Choix du modèle de designer pour sublimer le CV */}
            <div className="import-template-picker">
              <span className="section-kicker">Étape 2 : Choisissez votre nouveau design</span>
              <h3>Quel modèle souhaitez-vous appliquer ?</h3>
              <p className="import-template-sub">Toutes vos informations seront directement formatées dans ce modèle.</p>

              <div className="import-templates-grid">
                {templates.map((tpl) => {
                  const isSelected = selectedTemplate === tpl.id
                  return (
                    <article
                      key={tpl.id}
                      className={`import-template-card ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => setSelectedTemplate(tpl.id)}
                    >
                      <div className="import-template-swatch">
                        <span className={`template-swatch swatch-${tpl.color}`}>
                          <i /><i /><i />
                        </span>
                      </div>
                      <div className="import-template-meta">
                        <strong>{tpl.name}</strong>
                        <small>{tpl.description}</small>
                      </div>
                      {isSelected && <span className="import-template-checked">✓</span>}
                    </article>
                  )
                })}
              </div>
            </div>

            <div className="import-actions">
              <button type="button" className="button button-outline" onClick={handleReset}>
                Recommencer
              </button>
              <button type="button" className="button button-dark button-enhance-cv" onClick={handleConfirm}>
                <span>Améliorer mon CV avec le modèle {templates.find((t) => t.id === selectedTemplate)?.name || ''}</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
