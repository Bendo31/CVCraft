import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import './styles.css'

const steps = [
  { number: '01', title: 'Choisissez votre style', text: 'Partez d’un modèle pensé par des designers et adaptez-le à votre personnalité.' },
  { number: '02', title: 'Racontez votre parcours', text: 'Notre éditeur vous guide pour transformer chaque expérience en argument fort.' },
  { number: '03', title: 'Faites la différence', text: 'Exportez un CV impeccable, prêt à envoyer en PDF ou à partager par lien.' },
]

const plans = [
  { name: 'Free', price: '0€', suffix: 'pour toujours', description: 'Les essentiels pour démarrer sereinement.', features: ['1 modèle classique', 'Export PDF', 'Conseils de rédaction'], action: 'Commencer gratuitement' },
  { name: 'Pro', price: '9€', suffix: 'par mois', description: 'Tout ce qu’il faut pour décrocher plus d’entretiens.', features: ['Tous les modèles premium', 'CV et lettres illimités', 'Analyse ATS intelligente'], action: 'Essayer Pro', featured: true },
  { name: 'Gold', price: '19€', suffix: 'par mois', description: 'L’accompagnement complet pour accélérer votre carrière.', features: ['Tout dans Pro', 'Relecture par un expert', 'Support prioritaire 7j/7'], action: 'Passer en Gold' },
]

const resumeTemplates = [
  { id: 'sillage', name: 'Sillage', description: 'Éditorial', color: 'blue' },
  { id: 'atlas', name: 'Atlas', description: 'Structuré', color: 'lime' },
  { id: 'signal', name: 'Signal', description: 'Audacieux', color: 'orange' },
]

const defaultResume = {
  firstName: 'Marie',
  lastName: 'Lambert',
  role: 'Directrice artistique',
  email: 'marie@craft.fr',
  phone: '+33 6 12 34 56 78',
  city: 'Paris, France',
  website: 'marielambert.fr',
  linkedin: 'linkedin.com/in/marielambert',
  summary: 'Créer des identités qui ont du sens et des expériences qui restent.',
  experiences: [{ company: 'Studio Sillage', jobTitle: 'Direction artistique', startDate: '2021-01-01', endDate: '', tasks: '' }],
  educations: [{ school: 'École Estienne', degree: 'Design graphique', startDate: '2015-09-01', endDate: '2018-06-30' }],
  skills: ['Direction artistique', 'Branding', 'Figma'],
  references: [{ name: 'Claire Martin', role: 'Fondatrice, Studio Sillage', contact: 'claire@studio-sillage.fr' }],
  certifications: [],
}

function ResumeBuilder({ onLogout, onChangeTemplate, showNotice, notice }) {
  const [photo, setPhoto] = useState(() => window.localStorage.getItem('cvcraft-resume-photo') || '')
  const [template, setTemplate] = useState(() => window.localStorage.getItem('cvcraft-template') || 'sillage')
  const [signalColor, setSignalColor] = useState(() => window.localStorage.getItem('cvcraft-signal-color') || '#e49a68')
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false)
  const [resume, setResume] = useState(() => {
    try {
      return { ...defaultResume, ...JSON.parse(window.localStorage.getItem('cvcraft-resume') || '{}') }
    } catch {
      return defaultResume
    }
  })

  useEffect(() => {
    window.localStorage.setItem('cvcraft-resume', JSON.stringify(resume))
  }, [resume])

  useEffect(() => {
    if (photo) window.localStorage.setItem('cvcraft-resume-photo', photo)
  }, [photo])

  const updateResume = (field, value) => setResume((current) => ({ ...current, [field]: value }))
  const updateListItem = (field, index, key, value) => setResume((current) => ({ ...current, [field]: current[field].map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item) }))
  const addListItem = (field, item) => setResume((current) => ({ ...current, [field]: [...current[field], item] }))
  const updateSkill = (index, value) => setResume((current) => ({ ...current, skills: current.skills.map((skill, skillIndex) => skillIndex === index ? value : skill) }))
  const formatDate = (value) => {
    if (!value) return 'Aujourd’hui'
    return new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`)).replace('.', '')
  }
  const formatDateRange = (startDate, endDate) => `${formatDate(startDate)} — ${formatDate(endDate)}`
  const handlePhoto = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setPhoto(reader.result)
    reader.readAsDataURL(file)
  }
  const selectTemplate = (templateId) => {
    setTemplate(templateId)
    window.localStorage.setItem('cvcraft-template', templateId)
  }
  const selectSignalColor = (color) => {
    setSignalColor(color)
    window.localStorage.setItem('cvcraft-signal-color', color)
  }

  const downloadPdf = async () => {
    const resumeElement = document.getElementById('resume-preview')
    if (!resumeElement) return

    showNotice('Préparation de votre CV PDF...')
    document.body.classList.add('pdf-exporting')
    await new Promise((resolve) => window.requestAnimationFrame(resolve))
    try {
      const canvas = await html2canvas(resumeElement, { scale: 2.5, useCORS: true, backgroundColor: '#fffef9' })
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imageHeight = (canvas.height * pageWidth) / canvas.width
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, Math.min(imageHeight, pageHeight))
      const fileName = `${resume.lastName.trim()} ${resume.firstName.trim()} CvCraft.pdf`.trim()
      pdf.save(fileName)
      showNotice(`CV exporté : ${fileName}`)
    } finally {
      document.body.classList.remove('pdf-exporting')
    }
  }

  const handleExport = () => setPaymentOpen(true)

  return (
    <div className={`builder-page ${mobilePreviewOpen ? 'mobile-preview-open' : ''}`}>
      <header className="builder-header">
        <button className="brand builder-brand" onClick={onLogout} aria-label="Retour à l'accueil"><span className="brand-mark">c</span><span>CVcraft</span></button>
        <div className="builder-header-center"><span className="save-dot" /> Toutes les modifications sont enregistrées</div>
        <div className="builder-user"><button className="mobile-change-template" onClick={onChangeTemplate}>Changer de modèle</button><span className="builder-avatar">ML</span><button onClick={onLogout}>Quitter</button></div>
      </header>
      <main className="builder-main">
        <aside className="builder-sidebar">
          <div className="builder-sidebar-heading"><div><span className="auth-kicker">Mon espace</span><h1>Construire<br /><em>mon CV.</em></h1></div><span className="builder-step">01 / 03</span></div>
          <div className="builder-progress"><span className="active" /><span /><span /></div>
          <p className="builder-help">Commencez par vos informations essentielles. Vous pourrez tout modifier ensuite.</p>
          <div className="builder-form">
            <div className="builder-section-title"><span>01</span><h2>Identité</h2></div>
            <div className="photo-field"><div className="photo-thumb">{photo ? <img src={photo} alt="Portrait du CV" /> : <span>+</span>}</div><label className="photo-upload">Photo<input type="file" accept="image/*" onChange={handlePhoto} /><span>Ajouter une photo</span></label></div>
            <div className="field-row"><label>Prénom<input value={resume.firstName} onChange={(event) => updateResume('firstName', event.target.value)} /></label><label>Nom<input value={resume.lastName} onChange={(event) => updateResume('lastName', event.target.value)} /></label></div>
            <label>Intitulé du poste<input value={resume.role} onChange={(event) => updateResume('role', event.target.value)} /></label>
            <div className="field-row"><label>Adresse mail<input type="email" value={resume.email} onChange={(event) => updateResume('email', event.target.value)} /></label><label>Numéro de téléphone<input value={resume.phone} onChange={(event) => updateResume('phone', event.target.value)} /></label></div>
            <div className="field-row"><label>Ville<input value={resume.city} onChange={(event) => updateResume('city', event.target.value)} /></label><label>LinkedIn <span className="optional-label">(optionnel)</span><input value={resume.linkedin} onChange={(event) => updateResume('linkedin', event.target.value)} /></label></div>
            <div className="builder-section-title section-spaced"><span>02</span><h2>Profil</h2></div>
            <label>Quelques mots sur vous<textarea value={resume.summary} onChange={(event) => updateResume('summary', event.target.value)} rows="4" /></label>
            <div className="builder-section-title section-spaced"><span>03</span><h2>Expérience</h2></div>
            {resume.experiences.map((experience, index) => <div className="repeatable-block" key={`experience-${index}`}><div className="repeatable-heading"><span>Expérience {index + 1}</span></div><label>Entreprise<input value={experience.company} onChange={(event) => updateListItem('experiences', index, 'company', event.target.value)} /></label><label>Poste<input value={experience.jobTitle} onChange={(event) => updateListItem('experiences', index, 'jobTitle', event.target.value)} /></label><div className="field-row date-fields"><label>Date de début<input type="date" value={experience.startDate} onChange={(event) => updateListItem('experiences', index, 'startDate', event.target.value)} /></label><label>Date de fin<input type="date" value={experience.endDate} onChange={(event) => updateListItem('experiences', index, 'endDate', event.target.value)} /></label></div><label>Tâches effectuées <span className="optional-label">(facultatif)</span><textarea rows="3" placeholder="Décrivez vos principales responsabilités et réalisations" value={experience.tasks} onChange={(event) => updateListItem('experiences', index, 'tasks', event.target.value)} /></label></div>)}
            <button className="add-entry" onClick={() => addListItem('experiences', { company: '', jobTitle: '', startDate: '', endDate: '', tasks: '' })}>+ Ajouter une expérience</button>
            <div className="builder-section-title section-spaced"><span>04</span><h2>Formation académique</h2></div>
            {resume.educations.map((education, index) => <div className="repeatable-block" key={`education-${index}`}><div className="repeatable-heading"><span>Formation {index + 1}</span></div><label>Établissement<input value={education.school} onChange={(event) => updateListItem('educations', index, 'school', event.target.value)} /></label><label>Diplôme<input value={education.degree} onChange={(event) => updateListItem('educations', index, 'degree', event.target.value)} /></label><div className="field-row date-fields"><label>Date de début<input type="date" value={education.startDate} onChange={(event) => updateListItem('educations', index, 'startDate', event.target.value)} /></label><label>Date de fin<input type="date" value={education.endDate} onChange={(event) => updateListItem('educations', index, 'endDate', event.target.value)} /></label></div></div>)}
            <button className="add-entry" onClick={() => addListItem('educations', { school: '', degree: '', startDate: '', endDate: '' })}>+ Ajouter une formation</button>
            <div className="builder-section-title section-spaced"><span>05</span><h2>Compétences</h2></div>
            <div className="skill-fields">{resume.skills.map((skill, index) => <input key={`skill-${index}`} value={skill} placeholder="Ex. Photoshop" onChange={(event) => updateSkill(index, event.target.value)} />)}</div><button className="add-entry" onClick={() => addListItem('skills', '')}>+ Ajouter une compétence</button>
            <div className="builder-section-title section-spaced"><span>06</span><h2>Références</h2></div>
            {resume.references.map((reference, index) => <div className="repeatable-block" key={`reference-${index}`}><div className="repeatable-heading"><span>Référence {index + 1}</span></div><label>Nom<input value={reference.name} onChange={(event) => updateListItem('references', index, 'name', event.target.value)} /></label><label>Fonction<input value={reference.role} onChange={(event) => updateListItem('references', index, 'role', event.target.value)} /></label><label>Email ou téléphone<input value={reference.contact} onChange={(event) => updateListItem('references', index, 'contact', event.target.value)} /></label></div>)}
            <button className="add-entry" onClick={() => addListItem('references', { name: '', role: '', contact: '' })}>+ Ajouter une référence</button>
            <div className="builder-section-title section-spaced"><span>07</span><h2>Certifications <span className="optional-label">(facultatif)</span></h2></div>
            {resume.certifications.map((certification, index) => <div className="repeatable-block" key={`certification-${index}`}><div className="repeatable-heading"><span>Certification {index + 1}</span></div><label>Nom de la certification<input value={certification.name} onChange={(event) => updateListItem('certifications', index, 'name', event.target.value)} /></label><div className="field-row"><label>Organisme<input value={certification.issuer} onChange={(event) => updateListItem('certifications', index, 'issuer', event.target.value)} /></label><label>Année<input value={certification.year} onChange={(event) => updateListItem('certifications', index, 'year', event.target.value)} /></label></div></div>)}
            <button className="add-entry" onClick={() => addListItem('certifications', { name: '', issuer: '', year: '' })}>+ Ajouter une certification</button>
          </div>
        </aside>
        <section className="builder-preview-area">
          <div className="preview-toolbar"><div><span className="preview-kicker">Aperçu en direct</span><strong>Modèle {resumeTemplates.find((item) => item.id === template)?.name}</strong></div><div className="preview-actions"><button title="Réduire">−</button><span>85%</span><button title="Agrandir">+</button><button className="preview-export" onClick={handleExport}>Exporter en PDF <span>↗</span></button></div></div>
          <div className="template-picker"><div><span className="preview-kicker">Choisir sa structure</span><strong>Un design qui vous ressemble</strong></div><div className="template-options">{resumeTemplates.map((item) => <button className={`template-option ${template === item.id ? 'selected' : ''}`} key={item.id} onClick={() => selectTemplate(item.id)}><span className={`template-swatch swatch-${item.color}`}><i /><i /><i /></span><span><b>{item.name}</b><small>{item.description}</small></span>{template === item.id && <em>✓</em>}</button>)}{template === 'signal' && <label className="signal-color-picker">Couleur<input type="color" value={signalColor} onChange={(event) => selectSignalColor(event.target.value)} /></label>}</div></div>
          <div className={`resume-sheet resume-template-${template}`} style={{ '--signal-color': signalColor }} id="resume-preview"><div className="resume-sheet-top"><div className="resume-identity">{photo && <img className="resume-photo" src={photo} alt="Portrait" />}<div><h2>{resume.firstName}{template === 'signal' ? ' ' : <br />}<strong>{resume.lastName}.</strong></h2><span>{resume.role.toUpperCase()}</span></div></div><div className="resume-contact"><span>{resume.email}</span><span>{resume.phone}</span><span>{resume.city}</span>{resume.linkedin && <span>{resume.linkedin}</span>}</div></div><div className="resume-rule" /><div className="resume-content"><div className="resume-left"><div className="resume-block"><span className="resume-label">Profil</span><p>{resume.summary}</p></div>{template !== 'signal' && <div className="resume-block"><span className="resume-label">Contact</span><p>{resume.email}<br />{resume.phone}<br />{resume.city}<br />{resume.linkedin}</p></div>}<div className="resume-block"><span className="resume-label">Compétences</span><p>{resume.skills.filter(Boolean).map((skill, index) => <span className="resume-skill" key={`${skill}-${index}`}><i aria-hidden="true">{['✦', '◌', '↗', '◇'][index % 4]}</i>{skill}</span>)}</p></div>{resume.certifications.length > 0 && <div className="resume-block"><span className="resume-label">Certifications</span>{resume.certifications.map((certification, index) => <div className="resume-entry resume-certification" key={`preview-certification-${index}`}><strong>{certification.name}</strong><p><span>{certification.issuer}</span><b>{certification.year}</b></p></div>)}</div>}<div className="resume-block"><span className="resume-label">Références</span>{resume.references.map((reference, index) => <p className="resume-reference" key={`preview-reference-${index}`}><strong>{reference.name}</strong><br />{reference.role}<br />{reference.contact}</p>)}</div></div><div className="resume-right"><div className="resume-block"><span className="resume-label">Expérience</span>{resume.experiences.map((experience, index) => <div className="resume-entry" key={`preview-experience-${index}`}><strong>{experience.company}</strong><p><span>{experience.jobTitle}</span><b>{formatDateRange(experience.startDate, experience.endDate)}</b></p>{experience.tasks && <div className="resume-tasks">{experience.tasks.split(/\r?\n/).filter(Boolean).map((task, taskIndex) => <div className="resume-task-line" key={`task-${index}-${taskIndex}`}>{task}</div>)}</div>}</div>)}</div><div className="resume-block"><span className="resume-label">Formation académique</span>{resume.educations.map((education, index) => <div className="resume-entry" key={`preview-education-${index}`}><strong>{education.school}</strong><p><span>{education.degree}</span><b>{formatDateRange(education.startDate, education.endDate)}</b></p></div>)}</div></div></div><div className="resume-sheet-footer"><span>Made With Love By CVcraft</span><span>01 / 01</span></div></div>
        </section>
      </main>
      <button className="mobile-preview-toggle" onClick={() => setMobilePreviewOpen((current) => !current)} aria-label={mobilePreviewOpen ? 'Modifier le CV' : 'Prévisualiser le CV'}>{mobilePreviewOpen ? 'Modifier' : 'Prévisualiser'} <span aria-hidden="true">↗</span></button>
      {mobilePreviewOpen && <div className="mobile-preview-actions"><button className="button-dark" onClick={handleExport}>Télécharger <span aria-hidden="true">↓</span></button></div>}
      {notice && <div className="toast" role="status">{notice}</div>}
      {paymentOpen && <div className="payment-backdrop" role="presentation"><div className="payment-dialog" role="dialog" aria-modal="true" aria-labelledby="payment-title"><span className="preview-kicker">Checkout simulé</span><h2 id="payment-title">Débloquer votre PDF</h2><p>Montant à payer : <strong>100 FCFA</strong></p><div className="payment-actions"><button className="button-outline" onClick={() => setPaymentOpen(false)}>Annuler</button><button className="button-dark" onClick={() => { setPaymentOpen(false); downloadPdf() }}>Simuler le paiement</button></div></div></div>}
    </div>
  )
}

function MobileTemplateSelection({ onSelect, onLogout }) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const selectedTemplate = resumeTemplates[selectedIndex]
  const previousTemplate = () => setSelectedIndex((current) => (current - 1 + resumeTemplates.length) % resumeTemplates.length)
  const nextTemplate = () => setSelectedIndex((current) => (current + 1) % resumeTemplates.length)

  return (
    <div className="mobile-template-page">
      <header className="builder-header"><button className="brand builder-brand" onClick={onLogout} aria-label="Quitter"><span className="brand-mark">c</span><span>CVcraft</span></button><button className="builder-user-button" onClick={onLogout}>Quitter</button></header>
      <main className="mobile-template-main"><span className="eyebrow"><span className="eyebrow-dot" /> Première étape</span><h1>Choisissez<br /><em>votre modèle.</em></h1><p>Faites défiler les modèles et prévisualisez celui qui vous ressemble.</p><div className="mobile-template-carousel"><button className="carousel-arrow" onClick={previousTemplate} aria-label="Modèle précédent">←</button><div className={`mobile-template-preview resume-template-${selectedTemplate.id}`}><div className="mobile-preview-head"><span className="mobile-preview-name">Marie<br /><strong>Lambert.</strong></span><span className="mobile-preview-role">DIRECTRICE<br />ARTISTIQUE</span></div><div className="mobile-preview-contact">marie@craft.fr · Paris · 06 12 34 56 78</div><div className="mobile-preview-body"><div><span className="mobile-preview-label">Profil</span><p>Directrice artistique qui crée des identités visuelles singulières.</p><span className="mobile-preview-label">Compétences</span><p>Direction artistique<br />Branding<br />Figma</p><span className="mobile-preview-label">Références</span><p>Claire Martin<br />Fondatrice, Studio Sillage</p></div><div><span className="mobile-preview-label">Expérience professionnelle</span><div className="mobile-preview-entry"><strong>Studio Sillage</strong><small>Direction artistique · 2021 — Aujourd’hui</small><p>Identités visuelles et campagnes digitales.</p></div><div className="mobile-preview-entry"><strong>Maison Lune</strong><small>Brand designer · 2018 — 2021</small></div><span className="mobile-preview-label">Formation</span><div className="mobile-preview-entry"><strong>École Estienne</strong><small>Design graphique · 2015 — 2018</small></div></div></div><div className="mobile-preview-footer">Aperçu {selectedTemplate.name}</div></div><button className="carousel-arrow" onClick={nextTemplate} aria-label="Modèle suivant">→</button></div><div className="mobile-template-meta"><strong>{selectedTemplate.name}</strong><small>{selectedTemplate.description}</small><span>{selectedIndex + 1} / {resumeTemplates.length}</span></div><button className="button button-dark mobile-template-continue" onClick={() => onSelect(selectedTemplate.id)}>Choisir le modèle <span aria-hidden="true">↗</span></button></main>
    </div>
  )
}

function App() {
  const [notice, setNotice] = useState('')
  const [authMode, setAuthMode] = useState(null)
  const [view, setView] = useState(() => window.localStorage.getItem('cvcraft-authenticated') === 'true' && window.matchMedia('(max-width: 800px)').matches ? 'mobile-templates' : window.localStorage.getItem('cvcraft-authenticated') === 'true' ? 'builder' : 'landing')
  const [mobileTemplateStep, setMobileTemplateStep] = useState(() => window.localStorage.getItem('cvcraft-authenticated') === 'true' && window.matchMedia('(max-width: 800px)').matches ? 'templates' : null)
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  const showNotice = (message) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2800)
  }

  const openAuth = (mode) => {
    setAuthMode(mode)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleGoogleSuccess = () => {
    window.localStorage.setItem('cvcraft-authenticated', 'true')
    window.localStorage.setItem('cvcraft-auth-provider', 'google')
    setView(window.matchMedia('(max-width: 800px)').matches ? 'mobile-templates' : 'builder')
    setMobileTemplateStep(window.matchMedia('(max-width: 800px)').matches ? 'templates' : null)
    setAuthMode(null)
  }

  const handleAuthSubmit = (event, isSignUp) => {
    event.preventDefault()
    window.localStorage.setItem('cvcraft-authenticated', 'true')
    window.localStorage.setItem('cvcraft-auth-provider', 'email')
    setView(window.matchMedia('(max-width: 800px)').matches ? 'mobile-templates' : 'builder')
    setMobileTemplateStep(window.matchMedia('(max-width: 800px)').matches ? 'templates' : null)
    setAuthMode(null)
    showNotice(isSignUp ? 'Compte créé. Bienvenue chez CVcraft !' : 'Connexion réussie. Bienvenue !')
  }

  const handleLogout = () => { window.localStorage.removeItem('cvcraft-authenticated'); window.localStorage.removeItem('cvcraft-auth-provider'); setView('landing'); setMobileTemplateStep(null) }
  const handleMobileTemplate = (selectedTemplate) => { window.localStorage.setItem('cvcraft-template', selectedTemplate); setMobileTemplateStep(null); setView('builder') }

  if (view === 'mobile-templates') return <MobileTemplateSelection onSelect={handleMobileTemplate} onLogout={handleLogout} />
  if (view === 'builder') return <ResumeBuilder onLogout={handleLogout} onChangeTemplate={() => { setMobileTemplateStep('templates'); setView('mobile-templates') }} showNotice={showNotice} notice={notice} />

  if (authMode) {
    const isSignUp = authMode === 'signup'

    return (
      <div className="auth-page">
        <header className="auth-header">
          <button className="brand auth-brand" onClick={() => setAuthMode(null)} aria-label="Retour à l'accueil"><span className="brand-mark">c</span><span>CVcraft</span></button>
          <button className="auth-back" onClick={() => setAuthMode(null)}>← Retour à l'accueil</button>
        </header>
        <main className="auth-layout">
          <div className="auth-intro">
            <div className="eyebrow"><span className="eyebrow-dot" /> Votre espace CV</div>
            <h1>{isSignUp ? <>Donnez vie à<br /><em>votre parcours.</em></> : <>Bon retour<br /><em>chez CVcraft.</em></>}</h1>
            <p>{isSignUp ? 'Créez votre compte en quelques secondes et commencez à construire le CV dont vous serez fier.' : 'Retrouvez vos modèles, vos candidatures et votre prochaine opportunité.'}</p>
            <div className="auth-stamp"><span>✳</span><strong>Simple.<br />Singulier.<br />Vous.</strong></div>
          </div>
          <section className="auth-card" aria-labelledby="auth-title">
            <div className="auth-card-heading"><span className="auth-kicker">{isSignUp ? 'Nouveau départ' : 'Ravi de vous revoir'}</span><h2 id="auth-title">{isSignUp ? 'Créer un compte' : 'Se connecter'}</h2><p>{isSignUp ? 'Choisissez votre méthode préférée.' : 'Connectez-vous pour retrouver votre espace.'}</p></div>
            <div className="social-buttons">
              {googleClientId ? <div className="google-login-wrap"><GoogleLogin onSuccess={handleGoogleSuccess} onError={() => showNotice('La connexion Google a été annulée.')} text="continue_with" shape="rectangular" size="large" width="350" /></div> : <button className="social-button" onClick={() => showNotice('Ajoutez VITE_GOOGLE_CLIENT_ID pour activer Google.') }><span className="social-icon google-icon">G</span>Continuer avec Google</button>}
              <button className="social-button" onClick={() => { setView('builder'); setAuthMode(null) }}><span className="social-icon linkedin-icon">in</span>Continuer avec LinkedIn</button>
            </div>
            <div className="auth-divider"><span>ou avec votre adresse email</span></div>
            <form className="auth-form" onSubmit={(event) => handleAuthSubmit(event, isSignUp)}>
              {isSignUp && <label>Nom complet<input type="text" placeholder="Marie Lambert" required /></label>}
              <label>Adresse email<input type="email" placeholder="vous@exemple.com" required /></label>
              <label>Mot de passe<input type="password" placeholder="••••••••" minLength="6" required /></label>
              {!isSignUp && <a className="forgot-link" href="#auth" onClick={(event) => { event.preventDefault(); showNotice('Un lien de réinitialisation vous sera envoyé.') }}>Mot de passe oublié ?</a>}
              <button className="button button-dark auth-submit" type="submit">{isSignUp ? 'Créer mon compte' : 'Se connecter'} <span aria-hidden="true">↗</span></button>
            </form>
            <p className="auth-switch">{isSignUp ? 'Vous avez déjà un compte ?' : 'Vous n’avez pas encore de compte ?'} <button onClick={() => setAuthMode(isSignUp ? 'login' : 'signup')}>{isSignUp ? 'Se connecter' : 'Créer un compte'}</button></p>
          </section>
        </main>
        {notice && <div className="toast" role="status">{notice}</div>}
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="CVcraft, accueil"><span className="brand-mark">c</span><span>CVcraft</span></a>
        <nav className="main-nav" aria-label="Navigation principale">
          <a href="#process">Comment ça marche</a>
          <a href="#pricing">Tarifs</a>
          <a href="#templates">Modèles</a>
        </nav>
        <div className="header-actions">
          <button className="login-link" onClick={() => openAuth('login')}>Se connecter</button>
          <button className="button button-dark button-small" onClick={() => openAuth('signup')}>Créer mon CV <span aria-hidden="true">↗</span></button>
        </div>
      </header>

      <main id="top">
        <section className="hero section-wrap">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> Le studio CV nouvelle génération</div>
            <h1>Un CV qui ouvre<br /><em>des portes.</em></h1>
            <p className="hero-lede">Concevez un CV clair, singulier et mémorable. CVcraft vous aide à transformer votre parcours en prochaine opportunité.</p>
            <div className="hero-actions">
              <button className="button button-dark" onClick={() => openAuth('signup')}>Créer mon CV <span aria-hidden="true">↗</span></button>
              <a className="text-link" href="#process">Découvrir comment ça marche <span aria-hidden="true">↓</span></a>
            </div>
            <div className="hero-proof"><div className="avatar-stack"><span>ML</span><span>AD</span><span>SK</span><span>+</span></div><span>Déjà adopté par <strong>12 000+</strong> candidats</span></div>
          </div>
          <div className="hero-visual" id="templates" aria-label="Aperçu de modèles de CV">
            <div className="visual-note note-top"><span className="note-star">✳</span><span>Design qui<br /><strong>vous ressemble</strong></span></div>
            <div className="paper paper-back paper-blue"><div className="paper-lines" /><span className="paper-tag">CV.02</span></div>
            <div className="paper paper-back paper-yellow"><div className="paper-lines" /><span className="paper-tag">CV.04</span></div>
            <div className="paper paper-front"><div className="cv-top"><span className="cv-name">Marie<br /><b>Lambert.</b></span><span className="cv-role">DIRECTRICE<br />ARTISTIQUE</span></div><div className="cv-rule" /><div className="cv-grid"><div><span className="cv-label">Profil</span><p>Créer des identités<br />qui ont du sens.</p><span className="cv-label cv-label-space">Contact</span><p>Paris, France<br />marie@craft.fr</p></div><div><span className="cv-label">Expérience</span><div className="cv-entry"><b>2021 — Aujourd’hui</b><br />Studio Sillage<br /><small>Direction artistique</small></div><div className="cv-entry"><b>2018 — 2021</b><br />Maison Lune<br /><small>Brand designer</small></div></div></div><div className="cv-footer"><span>marielambert.fr</span><span>01 / 03</span></div></div>
            <div className="visual-note note-bottom"><span className="note-arrow">↘</span><span>PDF net.<br /><strong>Prêt à envoyer.</strong></span></div>
          </div>
        </section>

        <section className="marquee" aria-label="Promesse CVcraft"><div className="marquee-track"><span>Votre parcours mérite mieux qu’un modèle banal.</span><span className="marquee-star">✳</span><span>Votre parcours mérite mieux qu’un modèle banal.</span><span className="marquee-star">✳</span></div></section>

        <section className="process section-wrap" id="process">
          <div className="section-heading"><div><div className="eyebrow">Simple comme bonjour</div><h2>De l’idée au<br /><em>oui.</em></h2></div><p>Pas de jargon, pas de mise en page qui casse. Juste les bons outils pour donner à votre histoire la place qu’elle mérite.</p></div>
          <div className="step-grid">{steps.map((step) => <article className="step" key={step.number}><span className="step-number">{step.number}</span><h3>{step.title}</h3><p>{step.text}</p><span className="step-arrow" aria-hidden="true">↗</span></article>)}</div>
        </section>

        <section className="pricing section-wrap" id="pricing">
          <div className="pricing-heading"><div className="eyebrow">Investissez en vous</div><h2>Le bon plan pour<br /><em>chaque étape.</em></h2><p>Commencez gratuitement, passez à la vitesse supérieure quand vous êtes prêt.</p></div>
          <div className="plans">{plans.map((plan) => <article className={`plan ${plan.featured ? 'plan-featured' : ''}`} key={plan.name}>{plan.featured && <div className="popular">Le plus choisi</div>}<div className="plan-top"><span className="plan-name">{plan.name}</span><span className="plan-symbol">{plan.name === 'Gold' ? '✦' : plan.name === 'Pro' ? '◆' : '○'}</span></div><div className="plan-price">{plan.price}<small> / {plan.suffix}</small></div><p>{plan.description}</p><ul>{plan.features.map((feature) => <li key={feature}><span>✓</span>{feature}</li>)}</ul><button className={`button ${plan.featured ? 'button-light' : 'button-outline'}`} onClick={() => showNotice(`${plan.name} sélectionné. Votre espace arrive bientôt.`)}>{plan.action}<span aria-hidden="true">↗</span></button></article>)}</div>
        </section>
      </main>

      <footer className="site-footer"><div className="footer-top"><a className="brand brand-light" href="#top"><span className="brand-mark">c</span><span>CVcraft</span></a><p>Faites de votre parcours<br /><em>votre meilleur atout.</em></p><button className="button button-yellow" onClick={() => openAuth('signup')}>Créer mon CV <span aria-hidden="true">↗</span></button></div><div className="footer-bottom"><span>© 2024 CVcraft Studio</span><div><a href="#top">Mentions légales</a><a href="#top">Confidentialité</a><a href="#top">Instagram</a></div></div></footer>
      {notice && <div className="toast" role="status">{notice}</div>}
    </div>
  )
}

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

createRoot(document.getElementById('root')).render(<StrictMode><GoogleOAuthProvider clientId={googleClientId || 'google-client-id-not-configured'}><App /></GoogleOAuthProvider></StrictMode>)
