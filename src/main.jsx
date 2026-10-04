import { StrictMode, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { ResumeDocument } from './ResumeDocument.jsx'
import {
  createTaraCheckout,
  getSession,
  loadUserResumeFromCloud,
  onAuthStateChange,
  resetPasswordForEmail,
  resendSignupOtp,
  saveUserResumeToCloud,
  signInWithPassword,
  signInWithOtp,
  signInWithOAuth,
  signOut,
  signUp,
  uploadPdfAndSaveResume,
  updatePassword,
  verifyTaraPayment,
  verifyEmailOtp,
} from './supabaseClient.js'
import './styles.css'


const CROP_VIEW_SIZE = 280
const CROP_OUTPUT_SIZE = 512
const OAUTH_INTENT_KEY = 'cvcraft-oauth-intent'

function clampPhotoOffset(offset, naturalWidth, naturalHeight, zoom) {
  if (!naturalWidth || !naturalHeight) return { x: 0, y: 0 }
  const baseScale = Math.max(CROP_VIEW_SIZE / naturalWidth, CROP_VIEW_SIZE / naturalHeight)
  const displayWidth = naturalWidth * baseScale * zoom
  const displayHeight = naturalHeight * baseScale * zoom
  const maxX = Math.max(0, (displayWidth - CROP_VIEW_SIZE) / 2)
  const maxY = Math.max(0, (displayHeight - CROP_VIEW_SIZE) / 2)
  return {
    x: Math.min(maxX, Math.max(-maxX, offset.x)),
    y: Math.min(maxY, Math.max(-maxY, offset.y)),
  }
}

function cropPhotoToDataUrl(image, offset, zoom) {
  const baseScale = Math.max(CROP_VIEW_SIZE / image.naturalWidth, CROP_VIEW_SIZE / image.naturalHeight)
  const displayWidth = image.naturalWidth * baseScale * zoom
  const displayHeight = image.naturalHeight * baseScale * zoom
  const imageLeft = (CROP_VIEW_SIZE - displayWidth) / 2 + offset.x
  const imageTop = (CROP_VIEW_SIZE - displayHeight) / 2 + offset.y
  const scale = image.naturalWidth / displayWidth
  const sourceX = Math.max(0, -imageLeft * scale)
  const sourceY = Math.max(0, -imageTop * scale)
  const sourceSize = Math.min(image.naturalWidth - sourceX, image.naturalHeight - sourceY, CROP_VIEW_SIZE * scale)

  const canvas = document.createElement('canvas')
  canvas.width = CROP_OUTPUT_SIZE
  canvas.height = CROP_OUTPUT_SIZE
  const context = canvas.getContext('2d')
  context.fillStyle = '#fffef9'
  context.fillRect(0, 0, CROP_OUTPUT_SIZE, CROP_OUTPUT_SIZE)
  context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, CROP_OUTPUT_SIZE, CROP_OUTPUT_SIZE)
  return canvas.toDataURL('image/jpeg', 0.92)
}

function PhotoCropModal({ imageSrc, onCancel, onConfirm }) {
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 })
  const imageRef = useRef(null)
  const dragRef = useRef(null)

  const baseScale = naturalSize.width
    ? Math.max(CROP_VIEW_SIZE / naturalSize.width, CROP_VIEW_SIZE / naturalSize.height)
    : 1
  const displayWidth = naturalSize.width * baseScale * zoom
  const displayHeight = naturalSize.height * baseScale * zoom

  const handleImageLoad = (event) => {
    const { naturalWidth, naturalHeight } = event.currentTarget
    setNaturalSize({ width: naturalWidth, height: naturalHeight })
    setOffset({ x: 0, y: 0 })
    setZoom(1)
  }

  const updateZoom = (nextZoom) => {
    const clampedZoom = Math.min(3, Math.max(1, nextZoom))
    setZoom(clampedZoom)
    setOffset((current) => clampPhotoOffset(current, naturalSize.width, naturalSize.height, clampedZoom))
  }

  const startDrag = (clientX, clientY) => {
    dragRef.current = { startX: clientX, startY: clientY, origin: offset }
  }

  const moveDrag = (clientX, clientY) => {
    if (!dragRef.current) return
    const next = {
      x: dragRef.current.origin.x + (clientX - dragRef.current.startX),
      y: dragRef.current.origin.y + (clientY - dragRef.current.startY),
    }
    setOffset(clampPhotoOffset(next, naturalSize.width, naturalSize.height, zoom))
  }

  const endDrag = () => {
    dragRef.current = null
  }

  const handleConfirm = () => {
    const image = imageRef.current
    if (!image?.naturalWidth) return
    onConfirm(cropPhotoToDataUrl(image, offset, zoom))
  }

  return (
    <div className="payment-backdrop crop-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="crop-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="crop-title"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="preview-kicker">Portrait CV</span>
        <h2 id="crop-title">Recadrer la photo</h2>
        <p>Déplacez et zoomez pour cadrer le visage dans le cercle.</p>

        <div
          className="crop-stage"
          style={{ width: CROP_VIEW_SIZE, height: CROP_VIEW_SIZE }}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId)
            startDrag(event.clientX, event.clientY)
          }}
          onPointerMove={(event) => moveDrag(event.clientX, event.clientY)}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <img
            ref={imageRef}
            src={imageSrc}
            alt="Photo à recadrer"
            draggable={false}
            onLoad={handleImageLoad}
            style={{
              width: displayWidth || 'auto',
              height: displayHeight || 'auto',
              transform: `translate(${(CROP_VIEW_SIZE - displayWidth) / 2 + offset.x}px, ${(CROP_VIEW_SIZE - displayHeight) / 2 + offset.y}px)`,
            }}
          />
          <div className="crop-mask" aria-hidden="true" />
        </div>

        <label className="crop-zoom">
          <span>Zoom</span>
          <input
            type="range"
            min="1"
            max="3"
            step="0.01"
            value={zoom}
            onChange={(event) => updateZoom(Number(event.target.value))}
          />
        </label>

        <div className="payment-actions">
          <button className="button-outline" type="button" onClick={onCancel}>Annuler</button>
          <button className="button-dark" type="button" onClick={handleConfirm}>Valider le cadrage</button>
        </div>
      </div>
    </div>
  )
}

const steps = [
  { number: '01', title: 'Choisissez votre style', text: 'Partez d’un modèle pensé par des designers et adaptez-le à votre personnalité.' },
  { number: '02', title: 'Racontez votre parcours', text: 'Notre éditeur vous guide pour transformer chaque expérience en argument fort.' },
  { number: '03', title: 'Faites la différence', text: 'Exportez un CV impeccable, prêt à envoyer en PDF ou à partager par lien.' },
]

const plans = [
  { name: 'Free', price: '0€', suffix: 'pour toujours', description: 'Les essentiels pour démarrer sereinement.', features: ['1 modèle Gratuit', 'Export PDF', 'Conseils de rédaction'], action: 'Commencer gratuitement' },
  { name: 'Pro', price: '9€', suffix: 'par mois', description: 'Tout ce qu’il faut pour décrocher plus d’entretiens.', features: ['Tous les modèles premium', 'CV et lettres illimités', 'Analyse ATS intelligente'], action: 'Essayer Pro', featured: true },
  { name: 'Gold', price: '19€', suffix: 'par mois', description: 'L’accompagnement complet pour accélérer votre carrière.', features: ['Tout dans Pro', 'Relecture par un expert', 'Support prioritaire 7j/7'], action: 'Passer en Gold' },
]

const resumeTemplates = [
  { id: 'sillage', name: 'Sillage', description: 'Éditorial', color: 'blue' },
  { id: 'atlas', name: 'Atlas', description: 'Structuré', color: 'lime' },
  { id: 'signal', name: 'Signal', description: 'Audacieux', color: 'orange' },
  { id: 'gratuit', name: 'Gratuit', description: 'Basique', color: 'gratuit' },
]

const legacyResumeKeys = [
  'cvcraft-resume',
  'cvcraft-resume-photo',
  'cvcraft-template',
  'cvcraft-base-color',
  'cvcraft-signal-color',
  'cvcraft-resume-font',
]
const GUEST_RESUME_KEY = 'cvcraft-free-resume-v1'

function loadGuestResume() {
  const storedResume = window.localStorage.getItem(GUEST_RESUME_KEY)
  if (storedResume) {
    try {
      const savedData = JSON.parse(storedResume)
      return {
        resume: {
          ...defaultResume,
          ...savedData.resume,
          sectionVisibility: {
            ...defaultResume.sectionVisibility,
            ...savedData.resume?.sectionVisibility,
            personal: savedData.resume?.sectionVisibility?.personal
              ?? (savedData.resume?.sectionVisibility?.contact !== false && savedData.resume?.sectionVisibility?.summary !== false),
          },
        },
        photo: savedData.photo || '',
        template: savedData.template || 'gratuit',
        baseColor: savedData.baseColor || '#e49a68',
        resumeFont: savedData.resumeFont || 'classic',
      }
    } catch (error) {
      console.error('Les données locales du CV gratuit sont illisibles:', error)
      throw new Error('Impossible de lire le CV enregistré sur cet appareil.')
    }
  }

  const legacyData = readLegacyResume()
  if (!legacyData) return null
  return {
    ...legacyData,
    resume: {
      ...defaultResume,
      ...legacyData.resume,
      sectionVisibility: {
        ...defaultResume.sectionVisibility,
        ...legacyData.resume.sectionVisibility,
        personal: legacyData.resume.sectionVisibility?.personal
          ?? (legacyData.resume.sectionVisibility?.contact !== false && legacyData.resume.sectionVisibility?.summary !== false),
      },
    },
  }
}

function saveGuestResume(draft) {
  window.localStorage.setItem(GUEST_RESUME_KEY, JSON.stringify(draft))
}

function readLegacyResume() {
  const storedValues = Object.fromEntries(
    legacyResumeKeys.map((key) => [key, window.localStorage.getItem(key)])
  )
  legacyResumeKeys.forEach((key) => window.localStorage.removeItem(key))

  if (!legacyResumeKeys.some((key) => storedValues[key])) return null

  let resume = {}
  try {
    resume = JSON.parse(storedValues['cvcraft-resume'] || '{}')
  } catch (error) {
    console.warn('Les anciennes données locales du CV sont illisibles.', error)
  }

  return {
    resume,
    photo: storedValues['cvcraft-resume-photo'] || '',
    template: storedValues['cvcraft-template'] || 'sillage',
    baseColor: storedValues['cvcraft-base-color'] || storedValues['cvcraft-signal-color'] || '#e49a68',
    resumeFont: storedValues['cvcraft-resume-font'] || 'classic',
  }
}

const baseColors = [
  { id: 'ink', name: 'Encre', value: '#17191a' },
  { id: 'ocean', name: 'Océan', value: '#3d6fa8' },
  { id: 'terracotta', name: 'Terracotta', value: '#e49a68' },
  { id: 'forest', name: 'Forêt', value: '#5f7d3b' },
  { id: 'bordeaux', name: 'Bordeaux', value: '#8b3a4a' },
]

const resumeFonts = [
  { id: 'classic', name: 'Classique', family: "'DM Sans', sans-serif", display: "'Fraunces', Georgia, serif" },
  { id: 'editorial', name: 'Éditoriale', family: "'Libre Baskerville', Georgia, serif", display: "'Libre Baskerville', Georgia, serif" },
  { id: 'modern', name: 'Moderne', family: "'Space Grotesk', sans-serif", display: "'Space Grotesk', sans-serif" },
  { id: 'elegant', name: 'Élégante', family: "'Cormorant Garamond', Georgia, serif", display: "'Cormorant Garamond', Georgia, serif" },
  { id: 'clear', name: 'Claire', family: "'Source Sans 3', sans-serif", display: "'Source Sans 3', sans-serif" },
]

const defaultResume = {
  firstName: '',
  lastName: '',
  role: '',
  email: '',
  phone: '',
  city: '',
  website: '',
  linkedin: '',
  facebook: '',
  x: '',
  threads: '',
  summary: '',
  sectionVisibility: {
    personal: true,
    experiences: true,
    educations: true,
    skills: true,
    languages: true,
    projects: true,
    certifications: true,
    interests: true,
    references: true,
  },
  experiences: [],
  educations: [],
  skills: [],
  languages: [],
  projects: [],
  references: [],
  certifications: [],
  interests: [],
}

function PremiumCrown() {
  return <svg className="premium-crown" viewBox="0 0 20 20" role="img" aria-label="Fonctionnalité Premium" focusable="false"><path d="M3.1 7.3 6.5 10l3.5-5 3.5 5 3.4-2.7-1.5 7.2H4.6L3.1 7.3Z" /><path d="M4.9 16.3h10.2" /></svg>
}

function SectionHeading({ number, title, enabled, onToggle, onReset, locked = false }) {
  return (
    <div className="builder-section-heading">
      <div className="builder-section-title section-spaced"><span>{number}</span><h2>{title}</h2>{locked && <PremiumCrown />}</div>
      <div className="section-actions">
        <button
          className="section-toggle"
          type="button"
          role="switch"
          aria-label={`Activer ${title}`}
          aria-checked={enabled}
          title={locked ? 'Disponible avec un modèle Premium' : enabled ? 'Rubrique activée' : 'Rubrique désactivée'}
          disabled={locked}
          onClick={onToggle}
        >
          <span className="section-toggle-thumb" />
        </button>
        <button type="button" aria-label={`Réinitialiser ${title}`} title={locked ? 'Disponible avec un modèle Premium' : 'Réinitialiser la rubrique'} disabled={locked} onClick={onReset}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8" /><path d="M3 3v5h5" /></svg>
        </button>
      </div>
    </div>
  )
}

function ResumeBuilder({
  userId,
  initialTemplate,
  preferInitialTemplate,
  downloadAfterPayment,
  onAutoDownloadComplete,
  onHome,
  onRequestUnlock,
  showNotice,
  notice,
}) {
  const [photo, setPhoto] = useState('')
  const [template, setTemplate] = useState(initialTemplate)
  const isFreeModel = template === 'gratuit'
  const [baseColor, setBaseColor] = useState('#e49a68')
  const [resumeFont, setResumeFont] = useState('classic')
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentSubmitting, setPaymentSubmitting] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [templateChooserOpen, setTemplateChooserOpen] = useState(false)
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false)
  const [cropSource, setCropSource] = useState('')
  const [resume, setResume] = useState(defaultResume)
  const [resumeLoaded, setResumeLoaded] = useState(false)
  const [resumeLoadError, setResumeLoadError] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [saveStatus, setSaveStatus] = useState('saved')
  const [loadRetry, setLoadRetry] = useState(0)
  const [saveRetry, setSaveRetry] = useState(0)
  const editVersion = useRef(0)
  const autoDownloadStarted = useRef(false)
  const guestMigrationPending = useRef(false)

  useEffect(() => {
    let active = true

    if (!userId) {
      try {
        const guestResume = loadGuestResume()
        if (guestResume) {
          saveGuestResume(guestResume)
          setResume(guestResume.resume)
          setPhoto(guestResume.photo)
          setTemplate(guestResume.template)
          setBaseColor(guestResume.baseColor)
          setResumeFont(guestResume.resumeFont)
        } else {
          setTemplate(initialTemplate)
        }
        setResumeLoaded(true)
      } catch (error) {
        console.error('Erreur lors du chargement ou de la migration locale du CV gratuit:', error)
        setResumeLoadError(error.message)
      }
      return () => {
        active = false
      }
    }

    loadUserResumeFromCloud(userId).then((savedData) => {
      if (!active) return

      const guestData = savedData ? null : loadGuestResume()
      if (savedData) {
        window.localStorage.removeItem(GUEST_RESUME_KEY)
        const savedResume = savedData.resume || savedData
        setResume({
          ...defaultResume,
          ...savedResume,
          sectionVisibility: {
            ...defaultResume.sectionVisibility,
            ...savedResume.sectionVisibility,
            personal: savedResume.sectionVisibility?.personal
              ?? (savedResume.sectionVisibility?.contact !== false && savedResume.sectionVisibility?.summary !== false),
          },
        })
        setPhoto(savedData.resume ? savedData.photo || '' : '')
        const resolvedTemplate = preferInitialTemplate
          ? initialTemplate
          : resumeTemplates.some((item) => item.id === savedData.template)
            ? savedData.template
            : initialTemplate
        setTemplate(resolvedTemplate)
        setBaseColor(savedData.baseColor || '#e49a68')
        setResumeFont(savedData.resumeFont || 'classic')
        if (preferInitialTemplate && resolvedTemplate !== savedData.template) {
          editVersion.current += 1
          setIsDirty(true)
          setSaveStatus('saving')
        }
      } else if (guestData) {
        setResume(guestData.resume)
        setPhoto(guestData.photo)
        setTemplate(preferInitialTemplate ? initialTemplate : guestData.template)
        setBaseColor(guestData.baseColor)
        setResumeFont(guestData.resumeFont)
        guestMigrationPending.current = true
        editVersion.current += 1
        setIsDirty(true)
        setSaveStatus('saving')
      } else {
        const legacyData = readLegacyResume()
        if (legacyData) {
          setResume({
            ...defaultResume,
            ...legacyData.resume,
            sectionVisibility: {
              ...defaultResume.sectionVisibility,
              ...legacyData.resume.sectionVisibility,
              personal: legacyData.resume.sectionVisibility?.personal
                ?? (legacyData.resume.sectionVisibility?.contact !== false && legacyData.resume.sectionVisibility?.summary !== false),
            },
          })
          setPhoto(legacyData.photo)
          setTemplate(
            !preferInitialTemplate && resumeTemplates.some((item) => item.id === legacyData.template)
              ? legacyData.template
              : initialTemplate
          )
          setBaseColor(legacyData.baseColor)
          setResumeFont(legacyData.resumeFont)
          editVersion.current += 1
          setIsDirty(true)
          setSaveStatus('saving')
        } else {
          setTemplate(initialTemplate)
          editVersion.current += 1
          setIsDirty(true)
          setSaveStatus('saving')
        }
      }

      setResumeLoaded(true)
    }).catch((error) => {
      console.error('Erreur lors du chargement du CV depuis le serveur:', error)
      if (active) setResumeLoadError(error.message || 'Impossible de charger votre CV depuis le serveur.')
    })

    return () => {
      active = false
    }
  }, [initialTemplate, loadRetry, preferInitialTemplate, userId])

  const markEdited = () => {
    editVersion.current += 1
    setIsDirty(true)
    setSaveStatus('saving')
  }

  const saveBeforeNavigation = async (navigate) => {
    if (!isDirty) {
      navigate()
      return
    }

    const version = editVersion.current
    try {
      const draft = {
        resume,
        photo,
        template,
        baseColor,
        resumeFont,
      }
      if (userId) {
        await saveUserResumeToCloud(userId, draft)
        if (guestMigrationPending.current && editVersion.current === version) {
          window.localStorage.removeItem(GUEST_RESUME_KEY)
          guestMigrationPending.current = false
        }
      } else {
        saveGuestResume(draft)
      }
      setIsDirty(false)
      setSaveStatus(userId ? 'saved' : 'guest')
      navigate()
    } catch (error) {
      console.error(userId ? 'Erreur lors de la sauvegarde du CV avant de quitter:' : 'Erreur lors de la sauvegarde locale avant de quitter:', error)
      setSaveStatus('error')
      showNotice(userId ? 'Votre CV n’a pas pu être enregistré. Réessayez avant de quitter.' : 'Votre CV n’a pas pu être sauvegardé sur cet appareil.')
    }
  }

  useEffect(() => {
    if (!resumeLoaded || !isDirty) return undefined

    const version = editVersion.current
    const timeout = window.setTimeout(async () => {
      try {
        const draft = {
          resume,
          photo,
          template,
          baseColor,
          resumeFont,
        }
        if (userId) {
          await saveUserResumeToCloud(userId, draft)
        } else {
          saveGuestResume(draft)
        }
        if (editVersion.current === version) {
          setIsDirty(false)
          setSaveStatus(userId ? 'saved' : 'guest')
        }
      } catch (error) {
        console.error(userId ? 'Erreur lors de la sauvegarde du CV sur le serveur:' : 'Erreur lors de la sauvegarde locale du CV gratuit:', error)
        if (editVersion.current === version) {
          setSaveStatus('error')
          if (!userId) showNotice('Le CV n’a pas pu être sauvegardé localement. Libérez de l’espace puis réessayez.')
        }
      }
    }, 700)

    return () => window.clearTimeout(timeout)
  }, [baseColor, isDirty, photo, resume, resumeFont, resumeLoaded, saveRetry, showNotice, template, userId])

  const updateResume = (field, value) => {
    markEdited()
    setResume((current) => ({ ...current, [field]: value }))
  }
  const updateListItem = (field, index, key, value) => {
    markEdited()
    setResume((current) => ({ ...current, [field]: current[field].map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item) }))
  }
  const addListItem = (field, item) => {
    markEdited()
    setResume((current) => ({ ...current, [field]: [...current[field], item] }))
  }
  const updateSkill = (index, value) => {
    markEdited()
    setResume((current) => ({ ...current, skills: current.skills.map((skill, skillIndex) => skillIndex === index ? value : skill) }))
  }
  const updateStringListItem = (section, index, value) => {
    markEdited()
    setResume((current) => ({ ...current, [section]: current[section].map((item, itemIndex) => itemIndex === index ? value : item) }))
  }
  const sectionEnabled = (section) => resume.sectionVisibility?.[section] !== false
  const isSectionLocked = (section) => isFreeModel && !['personal', 'experiences', 'educations', 'skills', 'languages'].includes(section)
  const toggleSection = (section) => {
    markEdited()
    setResume((current) => ({
      ...current,
      sectionVisibility: {
        ...defaultResume.sectionVisibility,
        ...current.sectionVisibility,
        [section]: current.sectionVisibility?.[section] === false,
      },
    }))
  }
  const updateSection = (section, value) => {
    markEdited()
    setResume((current) => ({ ...current, [section]: value }))
  }
  const resetSection = (section) => {
    if (section === 'personal') {
      markEdited()
      setPhoto('')
      setResume((current) => ({
        ...current,
        firstName: '',
        lastName: '',
        role: '',
        email: '',
        phone: '',
        city: '',
        website: '',
        linkedin: '',
        facebook: '',
        x: '',
        threads: '',
        summary: '',
        sectionVisibility: { ...defaultResume.sectionVisibility, ...current.sectionVisibility, [section]: true },
      }))
      return
    }
    markEdited()
    setResume((current) => ({
      ...current,
      [section]: JSON.parse(JSON.stringify(defaultResume[section])),
      sectionVisibility: { ...defaultResume.sectionVisibility, ...current.sectionVisibility, [section]: true },
    }))
  }
  const formatDate = (value) => {
    if (!value) return 'Aujourd’hui'
    return new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`)).replace('.', '')
  }
  const formatDateRange = (startDate, endDate) => `${formatDate(startDate)} — ${formatDate(endDate)}`
  const handlePhoto = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setCropSource(String(reader.result || ''))
    reader.readAsDataURL(file)
    event.target.value = ''
  }
  const openRecrop = () => {
    if (photo) setCropSource(photo)
  }
  const selectTemplate = (templateId) => {
    const selected = resumeTemplates.find((item) => item.id === templateId)
    if (!selected) return
    markEdited()
    setTemplate(templateId)
    setTemplateChooserOpen(false)
  }
  const unlockTemplate = (templateId) => {
    onRequestUnlock(templateId, { resume, photo, template, baseColor, resumeFont })
  }
  const selectBaseColor = (color) => {
    markEdited()
    setBaseColor(color)
  }
  const selectResumeFont = (fontId) => {
    markEdited()
    setResumeFont(fontId)
  }
  const selectedFont = resumeFonts.find((item) => item.id === resumeFont) || resumeFonts[0]

  const downloadPdf = async () => {
    const sheets = document.querySelectorAll('#resume-preview .resume-sheet')
    if (!sheets.length) return

    document.body.classList.add('pdf-exporting')
    await new Promise((resolve) => window.requestAnimationFrame(resolve))
    const exportRoot = document.createElement('div')
    exportRoot.className = 'pdf-export-root'
    document.body.appendChild(exportRoot)
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()

      for (let index = 0; index < sheets.length; index += 1) {
        const sheet = sheets[index].cloneNode(true)
        sheet.style.width = '650px'
        sheet.style.height = '919px'
        sheet.style.minHeight = '0'
        sheet.style.aspectRatio = 'auto'
        sheet.style.transform = 'none'
        sheet.style.zoom = '1'
        exportRoot.replaceChildren(sheet)
        const canvas = await html2canvas(sheet, {
          scale: 2.5,
          useCORS: true,
          backgroundColor: '#fffef9',
          width: 650,
          height: 919,
          windowWidth: 650,
          windowHeight: 919,
        })
        if (index > 0) pdf.addPage()
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pageWidth, pageHeight)
      }

      const fileName = `${resume.lastName.trim()} ${resume.firstName.trim()} CvCraft.pdf`.trim()
      pdf.save(fileName)

      if (userId) {
        const pdfBlob = pdf.output('blob')
        uploadPdfAndSaveResume({
          pdfBlob,
          fileName,
          resume,
          photo,
          resumeData: { resume, photo, template, baseColor, resumeFont },
        }).catch((uploadError) => {
          console.warn('La sauvegarde cloud du CV a échoué:', uploadError)
          showNotice('Le PDF est téléchargé, mais sa sauvegarde sur le serveur a échoué.')
        })
      }
    } catch (err) {
      console.error('Erreur lors de la génération ou sauvegarde du PDF:', err)
    } finally {
      exportRoot.remove()
      document.body.classList.remove('pdf-exporting')
    }
  }

  useEffect(() => {
    if (!downloadAfterPayment || !resumeLoaded || autoDownloadStarted.current) return
    const timeout = window.setTimeout(() => {
      if (autoDownloadStarted.current) return
      autoDownloadStarted.current = true
      downloadPdf().finally(onAutoDownloadComplete)
    }, 100)
    return () => window.clearTimeout(timeout)
  }, [downloadAfterPayment, resumeLoaded])

  const beginPaidDownload = async () => {
    setPaymentSubmitting(true)
    setPaymentError('')
    try {
      await saveUserResumeToCloud(userId, {
        resume,
        photo,
        template,
        baseColor,
        resumeFont,
      })
      const checkout = await createTaraCheckout(template)
      window.location.assign(checkout.paymentUrl)
    } catch (error) {
      console.error('Impossible de démarrer le paiement Tara Money:', error)
      setPaymentError(error.message || 'Le paiement ne peut pas être démarré pour le moment.')
      setPaymentSubmitting(false)
    }
  }

  const handleExport = () => {
    if (template === 'gratuit') {
      if (!userId) {
        onRequestUnlock(template, { resume, photo, template, baseColor, resumeFont }, { downloadAfterAuth: true })
        return
      }
      downloadPdf()
      return
    }
    if (!userId) {
      onRequestUnlock(template, { resume, photo, template, baseColor, resumeFont })
      return
    }
    setPaymentError('')
    setPaymentOpen(true)
  }

  if (!resumeLoaded) {
    return (
      <div className="account-page">
        <div className="account-dialog" role="status">
          {resumeLoadError ? (
            <>
              <h1>Chargement impossible</h1>
              <p>{resumeLoadError}</p>
              <button className="button button-dark" type="button" onClick={() => {
                setResumeLoadError('')
                setLoadRetry((current) => current + 1)
              }}>Réessayer</button>
            </>
          ) : <p>Chargement de votre CV depuis le serveur…</p>}
        </div>
      </div>
    )
  }

  return (
    <div className={`builder-page ${mobilePreviewOpen ? 'mobile-preview-open' : ''}`}>
      <header className="builder-header">
        <button className="brand builder-brand" onClick={() => saveBeforeNavigation(onHome)} aria-label="Retour à l'accueil"><span className="brand-mark">c</span><span>CVcraft</span></button>
        <div className={`builder-header-center save-status-${userId ? saveStatus : 'guest'}`} role="status">
          <span className="save-dot" />
          {!userId ? saveStatus === 'saving' ? 'Sauvegarde locale…' : saveStatus === 'error' ? (
            <button type="button" onClick={() => {
              setSaveStatus('saving')
              setSaveRetry((current) => current + 1)
              if (!isDirty) {
                editVersion.current += 1
                setIsDirty(true)
              }
            }}>Échec de sauvegarde locale — Réessayer</button>
          ) : 'CV gratuit · sauvegarde locale automatique' : saveStatus === 'saving' ? 'Enregistrement sur le serveur…' : saveStatus === 'error' ? (
            <button type="button" onClick={() => {
              setSaveStatus('saving')
              setSaveRetry((current) => current + 1)
              if (!isDirty) {
                editVersion.current += 1
                setIsDirty(true)
              }
            }}>Échec de sauvegarde — Réessayer</button>
          ) : 'CV enregistré sur le serveur'}
        </div>
        <div className="builder-user"><button className="mobile-change-template" onClick={() => setTemplateChooserOpen(true)}>Changer de modèle</button><button onClick={() => saveBeforeNavigation(onHome)}>Quitter</button></div>
      </header>
      <main className="builder-main">
        <aside className="builder-sidebar">
          <div className="builder-sidebar-heading"><div><span className="section-kicker">Mon espace</span><h1>Construire<br /><em>mon CV.</em></h1></div><span className="builder-step">01 / 03</span></div>
          <div className="builder-progress"><span className="active" /><span /><span /></div>
          <p className="builder-help">Commencez par vos informations essentielles. Vous pourrez tout modifier ensuite.</p>
          <div className="builder-form">
            <SectionHeading number="01" title="Informations personnelles" enabled={sectionEnabled('personal')} onToggle={() => toggleSection('personal')} onReset={() => resetSection('personal')} />
            <div className="photo-field">
              <div className="photo-thumb">{photo && !isFreeModel ? <img src={photo} alt="Portrait du CV" /> : <span>+</span>}</div>
              <div className="photo-actions">
                <label className={`photo-upload ${isFreeModel ? 'premium-disabled-label' : ''}`}>Photo {isFreeModel && <PremiumCrown />}<input type="file" accept="image/*" disabled={isFreeModel} onChange={handlePhoto} /><span>{photo ? 'Changer la photo' : 'Ajouter une photo'}</span></label>
                {photo && <button className="photo-recrop" type="button" disabled={isFreeModel} onClick={openRecrop}>Recadrer {isFreeModel && <PremiumCrown />}</button>}
              </div>
            </div>
            <div className="field-row"><label>Prénom<input value={resume.firstName} onChange={(event) => updateResume('firstName', event.target.value)} /></label><label>Nom<input value={resume.lastName} onChange={(event) => updateResume('lastName', event.target.value)} /></label></div>
            <label>Intitulé du poste<input value={resume.role} onChange={(event) => updateResume('role', event.target.value)} /></label>
            <div className="field-row"><label>Adresse mail<input type="email" value={resume.email} onChange={(event) => updateResume('email', event.target.value)} /></label><label>Numéro de téléphone<input value={resume.phone} onChange={(event) => updateResume('phone', event.target.value)} /></label></div>
            <div className="field-row">
              <label className={isFreeModel ? 'premium-disabled-label' : ''}>Ville {isFreeModel && <PremiumCrown />}<input disabled={isFreeModel} value={resume.city} onChange={(event) => updateResume('city', event.target.value)} /></label>
              <label className={isFreeModel ? 'premium-disabled-label' : ''}>LinkedIn <span className="optional-label">(optionnel)</span>{isFreeModel && <PremiumCrown />}<input disabled={isFreeModel} value={resume.linkedin} onChange={(event) => updateResume('linkedin', event.target.value)} /></label>
            </div>
            <label className={isFreeModel ? 'premium-disabled-label' : ''}>Site web ou portfolio <span className="optional-label">(optionnel)</span>{isFreeModel && <PremiumCrown />}<input disabled={isFreeModel} value={resume.website || ''} onChange={(event) => updateResume('website', event.target.value)} /></label>
            <div className="field-row">
              <label className={isFreeModel ? 'premium-disabled-label' : ''}>Facebook <span className="optional-label">(optionnel)</span>{isFreeModel && <PremiumCrown />}<input type="url" disabled={isFreeModel} value={resume.facebook || ''} onChange={(event) => updateResume('facebook', event.target.value)} placeholder="https://facebook.com/…" /></label>
              <label className={isFreeModel ? 'premium-disabled-label' : ''}>X <span className="optional-label">(optionnel)</span>{isFreeModel && <PremiumCrown />}<input type="url" disabled={isFreeModel} value={resume.x || ''} onChange={(event) => updateResume('x', event.target.value)} placeholder="https://x.com/…" /></label>
            </div>
            <label className={isFreeModel ? 'premium-disabled-label' : ''}>Threads <span className="optional-label">(optionnel)</span>{isFreeModel && <PremiumCrown />}<input type="url" disabled={isFreeModel} value={resume.threads || ''} onChange={(event) => updateResume('threads', event.target.value)} placeholder="https://threads.net/@…" /></label>
            <label>Description<textarea value={resume.summary} onChange={(event) => updateResume('summary', event.target.value)} rows="4" /></label>
            {!sectionEnabled('personal') && <p className="section-hidden-note">Ces informations sont masquées dans le CV.</p>}
            <SectionHeading number="02" title="Expérience professionnelle" enabled={sectionEnabled('experiences')} onToggle={() => toggleSection('experiences')} onReset={() => resetSection('experiences')} />
            {resume.experiences.slice(0, isFreeModel ? 3 : undefined).map((experience, index) => <div className="repeatable-block" key={`experience-${index}`}><div className="repeatable-heading"><span>Expérience {index + 1}</span></div><label>Entreprise<input value={experience.company} onChange={(event) => updateListItem('experiences', index, 'company', event.target.value)} /></label><label>Poste<input value={experience.jobTitle} onChange={(event) => updateListItem('experiences', index, 'jobTitle', event.target.value)} /></label><div className="field-row date-fields"><label>Date de début<input type="date" value={experience.startDate} onChange={(event) => updateListItem('experiences', index, 'startDate', event.target.value)} /></label><label>Date de fin<input type="date" value={experience.endDate} onChange={(event) => updateListItem('experiences', index, 'endDate', event.target.value)} /></label></div><label>Tâches effectuées <span className="optional-label">(facultatif)</span><textarea rows="3" placeholder="Décrivez vos principales responsabilités et réalisations" value={experience.tasks} onChange={(event) => updateListItem('experiences', index, 'tasks', event.target.value)} /></label></div>)}
            <button className="add-entry" disabled={isFreeModel && resume.experiences.length >= 3} onClick={() => addListItem('experiences', { company: '', jobTitle: '', startDate: '', endDate: '', tasks: '' })}>+ Ajouter une expérience {isFreeModel && resume.experiences.length >= 3 && <PremiumCrown />}</button>
            {!sectionEnabled('experiences') && <p className="section-hidden-note">Cette rubrique est masquée dans le CV.</p>}
            <SectionHeading number="03" title="Formation académique" enabled={sectionEnabled('educations')} onToggle={() => toggleSection('educations')} onReset={() => resetSection('educations')} locked={isSectionLocked('educations')} />
            <fieldset className="premium-fieldset" disabled={isSectionLocked('educations')}>
            {resume.educations.map((education, index) => <div className="repeatable-block" key={`education-${index}`}><div className="repeatable-heading"><span>Formation {index + 1}</span></div><label>Établissement<input value={education.school} onChange={(event) => updateListItem('educations', index, 'school', event.target.value)} /></label><label>Diplôme<input value={education.degree} onChange={(event) => updateListItem('educations', index, 'degree', event.target.value)} /></label><div className="field-row date-fields"><label>Date de début<input type="date" value={education.startDate} onChange={(event) => updateListItem('educations', index, 'startDate', event.target.value)} /></label><label>Date de fin<input type="date" value={education.endDate} onChange={(event) => updateListItem('educations', index, 'endDate', event.target.value)} /></label></div></div>)}
            <button className="add-entry" onClick={() => addListItem('educations', { school: '', degree: '', startDate: '', endDate: '' })}>+ Ajouter une formation {isSectionLocked('educations') && <PremiumCrown />}</button>
            </fieldset>
            {!sectionEnabled('educations') && <p className="section-hidden-note">Cette rubrique est masquée dans le CV.</p>}
            <SectionHeading number="04" title="Compétences" enabled={sectionEnabled('skills')} onToggle={() => toggleSection('skills')} onReset={() => resetSection('skills')} locked={isSectionLocked('skills')} />
            <fieldset className="premium-fieldset" disabled={isSectionLocked('skills')}>
            <div className="skill-fields">{resume.skills.map((skill, index) => <input key={`skill-${index}`} value={skill} placeholder="Ex. Photoshop" onChange={(event) => updateSkill(index, event.target.value)} />)}</div><button className="add-entry" onClick={() => addListItem('skills', '')}>+ Ajouter une compétence {isSectionLocked('skills') && <PremiumCrown />}</button>
            </fieldset>
            {!sectionEnabled('skills') && <p className="section-hidden-note">Cette rubrique est masquée dans le CV.</p>}
            <SectionHeading number="05" title="Langues" enabled={sectionEnabled('languages')} onToggle={() => toggleSection('languages')} onReset={() => resetSection('languages')} locked={isSectionLocked('languages')} />
            <fieldset className="premium-fieldset" disabled={isSectionLocked('languages')}>
            {resume.languages.map((language, index) => <div className="repeatable-block" key={`language-${index}`}><div className="repeatable-heading"><span>Langue {index + 1}</span></div><div className="field-row"><label>Langue<input value={language.name} onChange={(event) => updateListItem('languages', index, 'name', event.target.value)} /></label><label>Niveau<select value={Math.min(5, Math.max(1, Number(language.level) || 1))} onChange={(event) => updateListItem('languages', index, 'level', Number(event.target.value))}>{[1, 2, 3, 4, 5].map((level) => <option key={level} value={level}>{level} / 5</option>)}</select></label></div></div>)}
            <button className="add-entry" onClick={() => addListItem('languages', { name: '', level: 1 })}>+ Ajouter une langue {isSectionLocked('languages') && <PremiumCrown />}</button>
            </fieldset>
            {!sectionEnabled('languages') && <p className="section-hidden-note">Cette rubrique est masquée dans le CV.</p>}
            <SectionHeading number="06" title="Projets et réalisations" enabled={sectionEnabled('projects')} onToggle={() => toggleSection('projects')} onReset={() => resetSection('projects')} locked={isSectionLocked('projects')} />
            <fieldset className="premium-fieldset" disabled={isSectionLocked('projects')}>
            {resume.projects.map((project, index) => <div className="repeatable-block" key={`project-${index}`}><div className="repeatable-heading"><span>Projet {index + 1}</span></div><label>Nom du projet<input value={project.name} onChange={(event) => updateListItem('projects', index, 'name', event.target.value)} /></label><label>Description<textarea rows="2" value={project.description} onChange={(event) => updateListItem('projects', index, 'description', event.target.value)} /></label><div className="field-row"><label>Lien <span className="optional-label">(facultatif)</span><input value={project.link} onChange={(event) => updateListItem('projects', index, 'link', event.target.value)} /></label><label>Année<input value={project.year} onChange={(event) => updateListItem('projects', index, 'year', event.target.value)} /></label></div></div>)}
            <button className="add-entry" onClick={() => addListItem('projects', { name: '', description: '', link: '', year: '' })}>+ Ajouter un projet {isSectionLocked('projects') && <PremiumCrown />}</button>
            </fieldset>
            {!sectionEnabled('projects') && <p className="section-hidden-note">Cette rubrique est masquée dans le CV.</p>}
            <SectionHeading number="07" title="Certifications" enabled={sectionEnabled('certifications')} onToggle={() => toggleSection('certifications')} onReset={() => resetSection('certifications')} locked={isSectionLocked('certifications')} />
            <fieldset className="premium-fieldset" disabled={isSectionLocked('certifications')}>
            {resume.certifications.map((certification, index) => <div className="repeatable-block" key={`certification-${index}`}><div className="repeatable-heading"><span>Certification {index + 1}</span></div><label>Nom de la certification<input value={certification.name} onChange={(event) => updateListItem('certifications', index, 'name', event.target.value)} /></label><div className="field-row"><label>Organisme<input value={certification.issuer} onChange={(event) => updateListItem('certifications', index, 'issuer', event.target.value)} /></label><label>Année<input value={certification.year} onChange={(event) => updateListItem('certifications', index, 'year', event.target.value)} /></label></div></div>)}
            <button className="add-entry" onClick={() => addListItem('certifications', { name: '', issuer: '', year: '' })}>+ Ajouter une certification {isSectionLocked('certifications') && <PremiumCrown />}</button>
            </fieldset>
            {!sectionEnabled('certifications') && <p className="section-hidden-note">Cette rubrique est masquée dans le CV.</p>}
            <SectionHeading number="08" title="Centres d’intérêt" enabled={sectionEnabled('interests')} onToggle={() => toggleSection('interests')} onReset={() => resetSection('interests')} locked={isSectionLocked('interests')} />
            <fieldset className="premium-fieldset" disabled={isSectionLocked('interests')}>
            <div className="skill-fields">{resume.interests.map((interest, index) => <input key={`interest-${index}`} value={interest} placeholder="Ex. photographie" onChange={(event) => updateStringListItem('interests', index, event.target.value)} />)}</div>
            <button className="add-entry" onClick={() => addListItem('interests', '')}>+ Ajouter un centre d’intérêt {isSectionLocked('interests') && <PremiumCrown />}</button>
            </fieldset>
            {!sectionEnabled('interests') && <p className="section-hidden-note">Cette rubrique est masquée dans le CV.</p>}
            <SectionHeading number="09" title="Références" enabled={sectionEnabled('references')} onToggle={() => toggleSection('references')} onReset={() => resetSection('references')} locked={isSectionLocked('references')} />
            <fieldset className="premium-fieldset" disabled={isSectionLocked('references')}>
            {resume.references.map((reference, index) => <div className="repeatable-block" key={`reference-${index}`}><div className="repeatable-heading"><span>Référence {index + 1}</span></div><label>Nom<input value={reference.name} onChange={(event) => updateListItem('references', index, 'name', event.target.value)} /></label><label>Fonction<input value={reference.role} onChange={(event) => updateListItem('references', index, 'role', event.target.value)} /></label><label>Email ou téléphone<input value={reference.contact} onChange={(event) => updateListItem('references', index, 'contact', event.target.value)} /></label></div>)}
            <button className="add-entry" onClick={() => addListItem('references', { name: '', role: '', contact: '' })}>+ Ajouter une référence {isSectionLocked('references') && <PremiumCrown />}</button>
            </fieldset>
            {!sectionEnabled('references') && <p className="section-hidden-note">Cette rubrique est masquée dans le CV.</p>}
          </div>
        </aside>
        <section className="builder-preview-area">
          <div className="preview-toolbar"><div><span className="preview-kicker">Aperçu en direct</span><strong>Modèle {resumeTemplates.find((item) => item.id === template)?.name}</strong></div><div className="preview-actions"><button title="Réduire">−</button><span>85%</span><button title="Agrandir">+</button><button className="preview-export" disabled={!userId && template !== 'gratuit'} title={!userId && template !== 'gratuit' ? 'Cliquez sur Débloquer pour continuer' : undefined} onClick={handleExport}>Exporter en PDF <span>↗</span></button></div></div>
          <ResumeDocument
            resume={resume}
            photo={photo}
            template={template}
            sectionVisibility={resume.sectionVisibility}
            baseColor={baseColor}
            selectedFont={selectedFont}
            formatDateRange={formatDateRange}
          />
        </section>
        <aside className="builder-design-panel" aria-label="Personnalisation du CV">
          <div className="design-panel-heading">
            <span className="section-kicker">Personnalisation</span>
            <h2>Style<br /><em>du CV.</em></h2>
          </div>

          <section className="design-group">
            <div className="design-group-title"><span>01</span><h3>Structure</h3></div>
            <div className="design-template-list">
              {resumeTemplates.map((item) => (
                <div className="design-template-item" key={item.id}>
                  <button
                    className={`design-template-option ${template === item.id ? 'selected' : ''} ${!userId && item.id !== 'gratuit' ? 'locked' : ''}`}
                    type="button"
                    aria-pressed={template === item.id}
                    onClick={() => selectTemplate(item.id)}
                  >
                    <span className={`template-swatch swatch-${item.color}`}><i /><i /><i /></span>
                    <span><b>{item.name}</b><small>{item.description}</small></span>
                    {userId && template === item.id && <em>✓</em>}
                  </button>
                  {!userId && item.id !== 'gratuit' && (
                    <button className="template-unlock" type="button" onClick={() => unlockTemplate(item.id)}>
                    <PremiumCrown /> Débloquer
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="design-group">
            <div className="design-group-title"><span>02</span><h3>Couleur de base</h3></div>
            <div className="design-color-list" role="listbox" aria-label="Couleurs de base">
              {baseColors.map((color) => (
                <button
                  className={`design-color-option ${baseColor === color.value ? 'selected' : ''}`}
                  key={color.id}
                  type="button"
                  title={color.name}
                  aria-label={color.name}
                  aria-selected={baseColor === color.value}
                  style={{ '--swatch': color.value }}
                  onClick={() => selectBaseColor(color.value)}
                >
                  <span className="design-color-swatch" />
                  <small>{color.name}</small>
                </button>
              ))}
            </div>
          </section>

          <section className="design-group">
            <div className="design-group-title"><span>03</span><h3>Typographie</h3></div>
            <div className="design-font-list">
              {resumeFonts.map((font) => (
                <button
                  className={`design-font-option ${resumeFont === font.id ? 'selected' : ''}`}
                  key={font.id}
                  type="button"
                  onClick={() => selectResumeFont(font.id)}
                  style={{ fontFamily: font.family }}
                >
                  <b>{font.name}</b>
                  <span>Aa Bb Cc</span>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </main>
      <button className="mobile-preview-toggle" onClick={() => setMobilePreviewOpen((current) => !current)} aria-label={mobilePreviewOpen ? 'Modifier le CV' : 'Prévisualiser le CV'}>{mobilePreviewOpen ? 'Modifier' : 'Prévisualiser'} <span aria-hidden="true">↗</span></button>
      {mobilePreviewOpen && <div className="mobile-preview-actions">{!userId && template !== 'gratuit' && <button className="button-outline" onClick={() => unlockTemplate(template)}><PremiumCrown /> Débloquer</button>}<button className="button-dark" disabled={!userId && template !== 'gratuit'} title={!userId && template !== 'gratuit' ? 'Cliquez sur Débloquer pour continuer' : undefined} onClick={handleExport}>Télécharger <span aria-hidden="true">↓</span></button></div>}
      {notice && <div className="toast" role="status">{notice}</div>}
      {cropSource && (
        <PhotoCropModal
          imageSrc={cropSource}
          onCancel={() => setCropSource('')}
          onConfirm={(croppedPhoto) => {
            markEdited()
            setPhoto(croppedPhoto)
            setCropSource('')
            showNotice('Photo recadrée et enregistrée.')
          }}
        />
      )}
      {paymentOpen && <div className="payment-backdrop" role="presentation"><div className="payment-dialog" role="dialog" aria-modal="true" aria-labelledby="payment-title"><span className="preview-kicker">Paiement sécurisé par Tara Money</span><h2 id="payment-title">Télécharger le modèle {resumeTemplates.find((item) => item.id === template)?.name}</h2><p>Le paiement de <strong>100 FCFA</strong> est requis avant le téléchargement du CV.</p>{paymentError && <p className="account-error" role="alert">{paymentError}</p>}<div className="payment-actions"><button className="button-outline" disabled={paymentSubmitting} onClick={() => setPaymentOpen(false)}>Annuler</button><button className="button-dark" disabled={paymentSubmitting} onClick={beginPaidDownload}>{paymentSubmitting ? 'Préparation du paiement…' : 'Payer avec Tara Money · 100 FCFA'}</button></div></div></div>}
      {templateChooserOpen && (
        <div className="mobile-template-overlay">
          <MobileTemplateSelection
            currentTemplate={template}
            isAuthenticated={Boolean(userId)}
            onSelect={selectTemplate}
            onUnlock={(templateId) => {
              setTemplateChooserOpen(false)
              unlockTemplate(templateId)
            }}
            onHome={() => setTemplateChooserOpen(false)}
          />
        </div>
      )}
    </div>
  )
}

function MobileTemplateSelection({ currentTemplate, isAuthenticated, onSelect, onUnlock, onHome }) {
  const [selectedIndex, setSelectedIndex] = useState(
    Math.max(0, resumeTemplates.findIndex((item) => item.id === currentTemplate))
  )
  const selectedTemplate = resumeTemplates[selectedIndex]
  const isLocked = !isAuthenticated && selectedTemplate.id !== 'gratuit'
  const previousTemplate = () => setSelectedIndex((current) => (current - 1 + resumeTemplates.length) % resumeTemplates.length)
  const nextTemplate = () => setSelectedIndex((current) => (current + 1) % resumeTemplates.length)

  return (
    <div className="mobile-template-page">
      <header className="builder-header"><button className="brand builder-brand" onClick={onHome} aria-label="Retour à l'accueil"><span className="brand-mark">c</span><span>CVcraft</span></button><button className="builder-user-button" onClick={onHome}>Quitter</button></header>
      <main className="mobile-template-main"><span className="eyebrow"><span className="eyebrow-dot" /> Première étape</span><h1>Choisissez<br /><em>votre modèle.</em></h1><p>Faites défiler les modèles et prévisualisez celui qui vous ressemble.</p><div className="mobile-template-carousel"><button className="carousel-arrow" onClick={previousTemplate} aria-label="Modèle précédent">←</button><div className={`mobile-template-preview resume-template-${selectedTemplate.id}`}><div className="mobile-preview-head"><span className="mobile-preview-name">Marie<br /><strong>Lambert.</strong></span><span className="mobile-preview-role">DIRECTRICE<br />ARTISTIQUE</span></div><div className="mobile-preview-contact">marie@craft.fr · Paris · 06 12 34 56 78</div><div className="mobile-preview-body"><div><span className="mobile-preview-label">Profil</span><p>Directrice artistique qui crée des identités visuelles singulières.</p><span className="mobile-preview-label">Compétences</span><p>Direction artistique<br />Branding<br />Figma</p><span className="mobile-preview-label">Références</span><p>Claire Martin<br />Fondatrice, Studio Sillage</p></div><div><span className="mobile-preview-label">Expérience professionnelle</span><div className="mobile-preview-entry"><strong>Studio Sillage</strong><small>Direction artistique · 2021 — Aujourd’hui</small><p>Identités visuelles et campagnes digitales.</p></div><div className="mobile-preview-entry"><strong>Maison Lune</strong><small>Brand designer · 2018 — 2021</small></div><span className="mobile-preview-label">Formation</span><div className="mobile-preview-entry"><strong>École Estienne</strong><small>Design graphique · 2015 — 2018</small></div></div></div><div className="mobile-preview-footer">Aperçu {selectedTemplate.name}</div></div><button className="carousel-arrow" onClick={nextTemplate} aria-label="Modèle suivant">→</button></div><div className="mobile-template-meta"><strong>{selectedTemplate.name}</strong><small>{selectedTemplate.description}</small><span>{selectedIndex + 1} / {resumeTemplates.length}</span></div><div className="mobile-template-actions"><button className="button button-dark mobile-template-continue" onClick={() => onSelect(selectedTemplate.id)}>{isLocked ? 'Prévisualiser mon CV' : 'Choisir le modèle'} <span aria-hidden="true">↗</span></button>{isLocked && <button className="button-outline mobile-template-unlock" onClick={() => onUnlock(selectedTemplate.id)}><PremiumCrown /> Débloquer</button>}</div></main>
    </div>
  )
}

function AccountModal({ mode, onModeChange, onClose, onAuthenticated, onOAuthStart }) {
  const [flowMode, setFlowMode] = useState(mode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [otpType, setOtpType] = useState('email')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    setFlowMode(mode)
    setError('')
    setMessage('')
  }, [mode])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setIsSubmitting(true)
    try {
      if (flowMode === 'reset') {
        await resetPasswordForEmail(email)
        setMessage('Si un compte correspond à cette adresse, un lien de réinitialisation vous sera envoyé.')
        return
      }
      if (flowMode === 'update') {
        await updatePassword(password)
        setPassword('')
        setMessage('Votre mot de passe a été modifié.')
        return
      }
      if (flowMode === 'otp') {
        const result = await verifyEmailOtp(email, otp.trim(), otpType)
        if (!result.session?.user) {
          throw new Error('Le code est accepté, mais aucune session n’a été créée. Réessayez ou reconnectez-vous.')
        }
        await onAuthenticated(result.session.user)
        return
      }

      if (flowMode === 'signup') {
        const result = await signUp({ email, password })
        if (result.session?.user) {
          await signOut()
          await signInWithOtp(email)
          setOtpType('email')
        } else {
          setOtpType('signup')
        }
      } else {
        await signInWithPassword({ email, password })
        await signOut()
        await signInWithOtp(email)
        setOtpType('email')
      }
      setOtp('')
      setFlowMode('otp')
      setMessage(`Un code de validation a été demandé pour ${email}. Vérifiez aussi vos courriers indésirables. S’il n’arrive pas, utilisez « Renvoyer un code ».`)
    } catch (submitError) {
      console.error('Erreur d’authentification Supabase:', submitError)
      setError(submitError.message || 'La connexion au serveur a échoué.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOAuth = async (provider) => {
    setError('')
    setMessage('')
    setIsSubmitting(true)
    try {
      onOAuthStart(flowMode)
      await signInWithOAuth(provider)
    } catch (oauthError) {
      window.sessionStorage.removeItem(OAUTH_INTENT_KEY)
      console.error(`Erreur de connexion avec ${provider}:`, oauthError)
      setError(oauthError.message || `La connexion avec ${provider} a échoué.`)
      setIsSubmitting(false)
    }
  }

  const resendOtp = async () => {
    setError('')
    setMessage('')
    setIsSubmitting(true)
    try {
      if (otpType === 'signup') {
        await resendSignupOtp(email)
      } else {
        await signInWithOtp(email)
      }
      setMessage(`Un nouveau code de validation a été envoyé à ${email}.`)
    } catch (resendError) {
      console.error('Erreur lors du renvoi du code OTP:', resendError)
      setError(resendError.message || 'Le code n’a pas pu être renvoyé.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="payment-backdrop account-backdrop" role="presentation" onClick={onClose}>
      <div className="account-dialog" role="dialog" aria-modal="true" aria-labelledby="account-title" onClick={(event) => event.stopPropagation()}>
        <section className="account-visual" aria-label="Illustration de la création d’un CV">
          <a className="brand account-brand" href="#top" aria-label="CVcraft, accueil" onClick={onClose}><span className="brand-mark">c</span><span>CVcraft</span></a>
          <div className="account-visual-copy">
            <span className="eyebrow"><span className="eyebrow-dot" /> Votre prochain chapitre</span>
            <h2>Votre parcours<br /><em>mérite sa place.</em></h2>
            <p>Quelques étapes suffisent pour transformer votre expérience en un CV professionnel, prêt à faire la différence.</p>
          </div>
          <div className="account-resume-art" aria-hidden="true">
            <div className="account-resume-sheet">
              <div className="account-resume-heading"><span><b>Marie</b><br /><strong>Lambert.</strong></span><small>DIRECTRICE<br />ARTISTIQUE</small></div>
              <div className="account-resume-rule" />
              <div className="account-resume-columns">
                <div><i /><i /><i className="short" /><b>PROFIL</b><i /><i className="short" /><b>COMPÉTENCES</b><i /><i /></div>
                <div><b>EXPÉRIENCE</b><i /><i className="short" /><i /><i /><i className="short" /><b>FORMATION</b><i /><i className="short" /></div>
              </div>
              <div className="account-resume-footer"><span>CVCRAFT</span><span>01 / 01</span></div>
            </div>
            <span className="account-art-note">Un CV à votre image <b>✳</b></span>
            <span className="account-art-stamp">PRÊT<br />À ENVOYER</span>
          </div>
          <span className="account-visual-caption">Clair, professionnel, et vraiment vous.</span>
        </section>
        <section className="account-auth-panel">
          <button className="account-close" type="button" aria-label="Fermer" onClick={onClose}>×</button>
          <div className="account-auth-content">
            <span className="preview-kicker">Votre espace CVcraft</span>
            <h1 id="account-title">{flowMode === 'signup' ? 'Créer mon compte' : flowMode === 'reset' ? 'Réinitialiser le mot de passe' : flowMode === 'update' ? 'Choisir un nouveau mot de passe' : flowMode === 'otp' ? otpType === 'signup' ? 'Valider mon compte' : 'Valider mon e-mail' : 'Bon retour parmi nous'}</h1>
            <p>{flowMode === 'reset' ? 'Saisissez l’adresse e-mail de votre compte pour recevoir un lien de réinitialisation.' : flowMode === 'update' ? 'Saisissez votre nouveau mot de passe pour sécuriser votre compte.' : flowMode === 'otp' ? `Saisissez le code à 6 chiffres envoyé à ${email}.` : 'Enregistrez votre CV et retrouvez-le à tout moment.'}</p>
            {flowMode !== 'reset' && flowMode !== 'update' && flowMode !== 'otp' && (
              <>
                <div className="account-providers">
                  <button type="button" className="account-provider" disabled={isSubmitting} onClick={() => handleOAuth('google')}>
                    <span className="provider-google-mark" aria-hidden="true">G</span>
                    Continuer avec Google
                  </button>
                  <button type="button" className="account-provider" disabled={isSubmitting} onClick={() => handleOAuth('linkedin_oidc')}>
                    <span className="provider-linkedin-mark" aria-hidden="true">in</span>
                    Continuer avec LinkedIn
                  </button>
                </div>
                <div className="account-divider"><span>ou par e-mail</span></div>
              </>
            )}
            <form className="account-form" onSubmit={handleSubmit}>
              {flowMode !== 'update' && flowMode !== 'otp' && <label>Adresse e-mail<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>}
              {(flowMode === 'signup' || flowMode === 'signin') && <label>Mot de passe<input type="password" autoComplete={flowMode === 'signin' ? 'current-password' : 'new-password'} minLength="6" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>}
              {flowMode === 'signup' && <p className="account-otp-hint">Un code à usage unique sera envoyé à cette adresse e-mail pour valider votre compte.</p>}
              {flowMode === 'signin' && <p className="account-otp-hint">Après vérification de votre mot de passe, nous vous enverrons un code à usage unique par e-mail.</p>}
              {flowMode === 'otp' && (
                <label>Code de validation<input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength="6"
                  required
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                /></label>
              )}
              {flowMode === 'update' && <label>Nouveau mot de passe<input type="password" autoComplete="new-password" minLength="6" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>}
              {error && <p className="account-error" role="alert">{error}</p>}
              {message && <p className="account-message" role="status">{message}</p>}
              <button className="button button-dark" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Veuillez patienter…' : flowMode === 'signup' ? 'Créer mon compte' : flowMode === 'reset' ? 'Envoyer le lien' : flowMode === 'update' ? 'Enregistrer le nouveau mot de passe' : flowMode === 'otp' ? 'Valider le code' : 'Recevoir mon code'}
              </button>
            </form>
            {flowMode === 'otp' && <div className="account-otp-actions">
              <button type="button" disabled={isSubmitting} onClick={resendOtp}>Renvoyer un code</button>
              <button type="button" onClick={() => {
                setError('')
                setMessage('')
                setOtp('')
                setFlowMode(otpType === 'signup' ? 'signup' : 'signin')
              }}>Changer d’adresse e-mail</button>
            </div>}
            {flowMode === 'signin' && <button className="account-forgot" type="button" onClick={() => {
              setError('')
              setMessage('')
              setFlowMode('reset')
            }}>Réinitialiser le mot de passe</button>}
            {flowMode === 'otp' ? (
              <button className="account-switch" type="button" onClick={() => {
                setError('')
                setMessage('')
                setOtp('')
                setFlowMode(otpType === 'signup' ? 'signup' : 'signin')
              }}>Retour</button>
            ) : flowMode === 'reset' ? (
              <button className="account-switch" type="button" onClick={() => {
                setError('')
                setMessage('')
                setFlowMode('signin')
              }}>Retour à la connexion</button>
            ) : flowMode !== 'update' && (
              <button className="account-switch" type="button" onClick={() => {
                setError('')
                setMessage('')
                const nextMode = flowMode === 'signup' ? 'signin' : 'signup'
                setFlowMode(nextMode)
                onModeChange(nextMode)
              }}>
                {flowMode === 'signup' ? 'Déjà un compte ? Se connecter' : 'Pas encore de compte ? Créer un compte'}
              </button>
            )}
          </div>
          <span className="account-legal">En continuant, vous acceptez nos conditions d’utilisation.</span>
        </section>
      </div>
    </div>
  )
}

function App() {
  const [notice, setNotice] = useState('')
  const [view, setView] = useState('landing')
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('signup')
  const [selectedTemplate, setSelectedTemplate] = useState('gratuit')
  const [templateSelectionMade, setTemplateSelectionMade] = useState(false)
  const [downloadAfterPayment, setDownloadAfterPayment] = useState(false)
  const [paymentVerifyAttempt, setPaymentVerifyAttempt] = useState(0)
  const [paymentReturnStatus, setPaymentReturnStatus] = useState(() => {
    const paymentId = new URLSearchParams(window.location.search).get('tara_payment')
    return paymentId ? { state: 'checking' } : null
  })
  const paymentReturnId = useRef(new URLSearchParams(window.location.search).get('tara_payment')).current
  const pendingTemplateRef = useRef(null)
  const pendingDraftRef = useRef(null)
  const pendingDownloadRef = useRef(false)

  const prepareOAuth = (mode) => {
    if (pendingDraftRef.current) saveGuestResume(pendingDraftRef.current)
    window.sessionStorage.setItem(OAUTH_INTENT_KEY, JSON.stringify({
      templateId: pendingTemplateRef.current,
      downloadAfterAuth: pendingDownloadRef.current,
      mode,
    }))
  }

  const resumeOAuth = (session) => {
    const storedIntent = window.sessionStorage.getItem(OAUTH_INTENT_KEY)
    if (!storedIntent) return

    try {
      const intent = JSON.parse(storedIntent)
      if (!session?.user) {
        const hashParams = new URLSearchParams(window.location.hash.slice(1))
        const errorDescription = new URLSearchParams(window.location.search).get('error_description')
          || hashParams.get('error_description')
          || new URLSearchParams(window.location.search).get('error')
          || hashParams.get('error')
        if (errorDescription) {
          window.sessionStorage.removeItem(OAUTH_INTENT_KEY)
          setAuthMode(intent.mode === 'signin' ? 'signin' : 'signup')
          setAuthOpen(true)
          setNotice(`Connexion Google impossible : ${errorDescription}. Vérifiez que Google est activé dans Supabase Auth et que les URL de redirection sont autorisées.`)
        }
        return
      }

      window.sessionStorage.removeItem(OAUTH_INTENT_KEY)
      const templateId = resumeTemplates.some((item) => item.id === intent.templateId)
        ? intent.templateId
        : null
      setSelectedTemplate(templateId || 'gratuit')
      setTemplateSelectionMade(Boolean(templateId))
      setDownloadAfterPayment(Boolean(intent.downloadAfterAuth))
      setAuthOpen(false)
      setView('builder')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      window.sessionStorage.removeItem(OAUTH_INTENT_KEY)
      console.error('Impossible de reprendre le parcours après la connexion Google:', error)
      showNotice('Connexion réussie, mais le parcours précédent n’a pas pu être restauré.')
    }
  }

  useEffect(() => {
    let active = true
    getSession().then((session) => {
      if (active) {
        setUser(session?.user || null)
        setAuthReady(true)
        resumeOAuth(session)
      }
    }).catch((error) => {
      console.error('Erreur lors de la vérification de la session:', error)
      if (active) setAuthReady(true)
    })

    const { data: { subscription } } = onAuthStateChange((event, session) => {
      setUser(session?.user || null)
      setAuthReady(true)
      resumeOAuth(session)
      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('update')
        setAuthOpen(true)
      }
    })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!paymentReturnId) return undefined
    if (!authReady) return undefined
    if (!user) {
      setPaymentReturnStatus({ state: 'auth' })
      setAuthMode('signin')
      setAuthOpen(true)
      return undefined
    }

    let active = true
    const verify = async () => {
      setPaymentReturnStatus({ state: 'checking' })
      try {
        for (let attempt = 0; attempt < 6; attempt += 1) {
          const result = await verifyTaraPayment(paymentReturnId)
          if (!active) return

          if (result.status === 'SUCCESS') {
            if (!resumeTemplates.some((item) => item.id === result.templateId && item.id !== 'gratuit')) {
              throw new Error('Le modèle associé au paiement est invalide.')
            }
            const nextUrl = new URL(window.location.href)
            nextUrl.searchParams.delete('tara_payment')
            window.history.replaceState({}, '', nextUrl)
            setSelectedTemplate(result.templateId)
            setTemplateSelectionMade(true)
            setDownloadAfterPayment(true)
            setPaymentReturnStatus(null)
            setView('builder')
            return
          }
          if (result.status === 'FAILURE') {
            setPaymentReturnStatus({ state: 'failure' })
            return
          }
          await new Promise((resolve) => window.setTimeout(resolve, 3000))
        }
        if (active) setPaymentReturnStatus({ state: 'pending' })
      } catch (error) {
        console.error('Erreur lors de la vérification du paiement Tara Money:', error)
        if (active) setPaymentReturnStatus({ state: 'error', message: error.message })
      }
    }

    verify()
    return () => {
      active = false
    }
  }, [authReady, paymentVerifyAttempt, paymentReturnId, user?.id])

  const showNotice = (message) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2800)
  }

  const goHome = () => setView('landing')
  const startBuilder = () => {
    setTemplateSelectionMade(false)
    setSelectedTemplate('gratuit')
    setView('builder')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const requestUnlock = (templateId, draft, { downloadAfterAuth = false } = {}) => {
    pendingTemplateRef.current = templateId
    pendingDraftRef.current = draft
    pendingDownloadRef.current = downloadAfterAuth
    setAuthMode('signup')
    setAuthOpen(true)
  }
  const handleAuthenticated = async (authenticatedUser, draft) => {
    const requestedTemplate = pendingTemplateRef.current
    let resumeDraft = draft || pendingDraftRef.current
    let templateToSave = requestedTemplate
    if (!resumeDraft) {
      const guestDraft = loadGuestResume()
      if (guestDraft) {
        const cloudResume = await loadUserResumeFromCloud(authenticatedUser.id)
        if (cloudResume) {
          window.localStorage.removeItem(GUEST_RESUME_KEY)
        } else {
          resumeDraft = guestDraft
          templateToSave = 'gratuit'
        }
      }
    }
    if (resumeDraft && templateToSave) {
      await saveUserResumeToCloud(authenticatedUser.id, {
        ...resumeDraft,
        template: templateToSave,
      })
      window.localStorage.removeItem(GUEST_RESUME_KEY)
    }
    setUser(authenticatedUser)
    setAuthOpen(false)
    setSelectedTemplate(templateToSave || 'gratuit')
    setTemplateSelectionMade(Boolean(templateToSave))
    setDownloadAfterPayment(pendingDownloadRef.current)
    pendingTemplateRef.current = null
    pendingDraftRef.current = null
    pendingDownloadRef.current = false
    setView('builder')
    if (paymentReturnId) setPaymentVerifyAttempt((current) => current + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (paymentReturnStatus && view !== 'builder') {
    const paymentMessage = paymentReturnStatus.state === 'checking'
      ? 'Vérification du paiement auprès de Tara Money…'
      : paymentReturnStatus.state === 'auth'
        ? 'Connectez-vous au compte ayant effectué le paiement.'
        : paymentReturnStatus.state === 'pending'
          ? 'Le paiement est toujours en cours de confirmation.'
          : paymentReturnStatus.state === 'failure'
            ? 'Le paiement n’a pas été confirmé. Aucun téléchargement n’a été effectué.'
            : paymentReturnStatus.message || 'La vérification du paiement a échoué.'
    return (
      <div className="account-page">
        <div className="account-dialog" role="status">
          <span className="preview-kicker">Tara Money</span>
          <h1>{paymentReturnStatus.state === 'checking' ? 'Vérification en cours' : 'Statut du paiement'}</h1>
          <p>{paymentMessage}</p>
          {['pending', 'failure', 'error'].includes(paymentReturnStatus.state) && (
            <button className="button button-dark" type="button" onClick={() => setPaymentVerifyAttempt((current) => current + 1)}>Vérifier à nouveau</button>
          )}
        </div>
        {authOpen && (
          <AccountModal
            mode={authMode}
            onModeChange={setAuthMode}
            onClose={() => setAuthOpen(false)}
            onAuthenticated={handleAuthenticated}
            onOAuthStart={prepareOAuth}
          />
        )}
      </div>
    )
  }

  if (view === 'builder') {
    return (
      <>
        <ResumeBuilder
          userId={user?.id}
          initialTemplate={selectedTemplate}
          preferInitialTemplate={templateSelectionMade}
          downloadAfterPayment={downloadAfterPayment}
          onAutoDownloadComplete={() => setDownloadAfterPayment(false)}
          onHome={goHome}
          onRequestUnlock={requestUnlock}
          showNotice={showNotice}
          notice={notice}
        />
        {authOpen && (
          <AccountModal
            mode={authMode}
            onModeChange={setAuthMode}
            onClose={() => {
              setAuthOpen(false)
              pendingTemplateRef.current = null
              pendingDraftRef.current = null
              pendingDownloadRef.current = false
            }}
            onAuthenticated={handleAuthenticated}
            onOAuthStart={prepareOAuth}
          />
        )}
      </>
    )
  }

  return (
    <>
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="CVcraft, accueil"><span className="brand-mark">c</span><span>CVcraft</span></a>
        <nav className="main-nav" aria-label="Navigation principale">
          <a href="#process">Comment ça marche</a>
          <a href="#pricing">Tarifs</a>
          <a href="#templates">Modèles</a>
        </nav>
        <div className="header-actions">
          <button className="button button-outline button-small" onClick={() => {
            setAuthMode('signup')
            setAuthOpen(true)
          }}>Créer mon compte</button>
          <button className="button button-dark button-small" onClick={startBuilder}>Créer mon CV <span aria-hidden="true">↗</span></button>
        </div>
      </header>

      <main id="top">
        <section className="hero section-wrap">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> Le studio CV nouvelle génération</div>
            <h1>Un CV qui ouvre<br /><em>des portes.</em></h1>
            <p className="hero-lede">Concevez un CV clair, singulier et mémorable. CVcraft vous aide à transformer votre parcours en prochaine opportunité.</p>
            <div className="hero-actions">
              <button className="button button-dark" onClick={startBuilder}>Créer mon CV <span aria-hidden="true">↗</span></button>
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

      <footer className="site-footer"><div className="footer-top"><a className="brand brand-light" href="#top"><span className="brand-mark">c</span><span>CVcraft</span></a><p>Faites de votre parcours<br /><em>votre meilleur atout.</em></p><button className="button button-yellow" onClick={startBuilder}>Créer mon CV <span aria-hidden="true">↗</span></button></div><div className="footer-bottom"><span>© 2024 CVcraft Studio</span><div><a href="#top">Mentions légales</a><a href="#top">Confidentialité</a><a href="#top">Instagram</a></div></div></footer>
      {notice && <div className="toast" role="status">{notice}</div>}
    </div>
      {authOpen && (
        <AccountModal
          mode={authMode}
          onModeChange={setAuthMode}
          onClose={() => {
            setAuthOpen(false)
            pendingTemplateRef.current = null
            pendingDraftRef.current = null
            pendingDownloadRef.current = false
          }}
          onAuthenticated={handleAuthenticated}
          onOAuthStart={prepareOAuth}
        />
      )}
    </>
  )
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
