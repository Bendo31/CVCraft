import { StrictMode, useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { ResumeDocument } from './ResumeDocument.jsx'
import {
  createTaraCheckout,
  createTaraPlanCheckout,
  deleteUserResumeFromCloud,
  getUserResumePlan,
  getSession,
  loadUserResumeFromCloud,
  loadUserResumesFromCloud,
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
  updateResumeModelStatus,
} from './supabaseClient.js'
import './styles.css'
import { ImportResumeModal } from './ImportResumeModal.jsx'
import { StartResumeChoiceModal } from './StartResumeChoiceModal.jsx'


const CROP_VIEW_SIZE = 280
const CROP_OUTPUT_SIZE = 512
const OAUTH_INTENT_KEY = 'cvcraft-oauth-intent'

const FRANCOPHONE_AFRICA_COUNTRIES = [
  {
    code: 'CM',
    name: 'Cameroun',
    dialCode: '237',
    flag: '🇨🇲',
    placeholder: '6XX XX XX XX',
    operators: [
      { id: 'mtn', name: 'MTN MoMo', regex: /^6(7\d|8\d|5[0-4])/ },
      { id: 'orange', name: 'Orange Money', regex: /^6(9\d|5[5-9])/ },
      { id: 'nexttel', name: 'Nexttel', regex: /^66/ },
      { id: 'camtel', name: 'Camtel', regex: /^(2\d|62)/ },
    ],
  },
  {
    code: 'CI',
    name: "Côte d'Ivoire",
    dialCode: '225',
    flag: '🇨🇮',
    placeholder: '07 XX XX XX XX',
    operators: [
      { id: 'orange', name: 'Orange Money', regex: /^0?[789]/ },
      { id: 'mtn', name: 'MTN MoMo', regex: /^0?[456]/ },
      { id: 'moov', name: 'Moov Money', regex: /^0?[123]/ },
    ],
  },
  {
    code: 'SN',
    name: 'Sénégal',
    dialCode: '221',
    flag: '🇸🇳',
    placeholder: '77 XXX XX XX',
    operators: [
      { id: 'orange', name: 'Orange Money', regex: /^7[78]/ },
      { id: 'free', name: 'Free Money', regex: /^76/ },
      { id: 'expresso', name: 'Expresso', regex: /^70/ },
    ],
  },
  {
    code: 'BJ',
    name: 'Bénin',
    dialCode: '229',
    flag: '🇧🇯',
    placeholder: '97 XX XX XX',
    operators: [
      { id: 'mtn', name: 'MTN MoMo', regex: /^(01)?(5[1-4]|6[12679]|9[0167])/ },
      { id: 'moov', name: 'Moov Money', regex: /^(02)?(6[45]|9[4589])/ },
      { id: 'celtiis', name: 'Celtiis Cash', regex: /^(03)?4[0-4]/ },
    ],
  },
  {
    code: 'TG',
    name: 'Togo',
    dialCode: '228',
    flag: '🇹🇬',
    placeholder: '90 XX XX XX',
    operators: [
      { id: 'tmoney', name: 'T-Money', regex: /^(9[0-3]|70)/ },
      { id: 'moov', name: 'Moov Flooz', regex: /^9[6-9]/ },
    ],
  },
  {
    code: 'ML',
    name: 'Mali',
    dialCode: '223',
    flag: '🇲🇱',
    placeholder: '7X XX XX XX',
    operators: [
      { id: 'orange', name: 'Orange Money', regex: /^([78]|9[0-2])/ },
      { id: 'moov', name: 'Moov Money', regex: /^([56]|9[5-9])/ },
    ],
  },
  {
    code: 'BF',
    name: 'Burkina Faso',
    dialCode: '226',
    flag: '🇧🇫',
    placeholder: '76 XX XX XX',
    operators: [
      { id: 'orange', name: 'Orange Money', regex: /^(7[4-7]|5[4-7]|0[4-7])/ },
      { id: 'moov', name: 'Moov Money', regex: /^(7[0-3]|5[0-3]|0[1-3])/ },
      { id: 'telecel', name: 'Telecel', regex: /^(7[89]|5[89]|6[89])/ },
    ],
  },
  {
    code: 'CG',
    name: 'Congo-Brazzaville',
    dialCode: '242',
    flag: '🇨🇬',
    placeholder: '06 XXX XX XX',
    operators: [
      { id: 'mtn', name: 'MTN MoMo', regex: /^0?6/ },
      { id: 'airtel', name: 'Airtel Money', regex: /^0?[45]/ },
    ],
  },
  {
    code: 'CD',
    name: 'RD Congo',
    dialCode: '243',
    flag: '🇨🇩',
    placeholder: '84 XXX XX XX',
    operators: [
      { id: 'orange', name: 'Orange Money', regex: /^8[459]/ },
      { id: 'vodacom', name: 'M-Pesa', regex: /^8[12]/ },
      { id: 'airtel', name: 'Airtel Money', regex: /^9[7-9]/ },
    ],
  },
  {
    code: 'GA',
    name: 'Gabon',
    dialCode: '241',
    flag: '🇬🇦',
    placeholder: '07 XX XX XX',
    operators: [
      { id: 'airtel', name: 'Airtel Money', regex: /^0?[47]/ },
      { id: 'moov', name: 'Moov Money', regex: /^0?6/ },
    ],
  },
  {
    code: 'GN',
    name: 'Guinée',
    dialCode: '224',
    flag: '🇬🇳',
    placeholder: '62X XX XX XX',
    operators: [
      { id: 'orange', name: 'Orange Money', regex: /^6[12]/ },
      { id: 'mtn', name: 'MTN MoMo', regex: /^6[56]/ },
    ],
  },
  {
    code: 'NE',
    name: 'Niger',
    dialCode: '227',
    flag: '🇳🇪',
    placeholder: '96 XX XX XX',
    operators: [
      { id: 'orange', name: 'Orange Money', regex: /^(9[67]|8[89]|70)/ },
      { id: 'airtel', name: 'Airtel Money', regex: /^9[0-2]/ },
      { id: 'moov', name: 'Moov Flooz', regex: /^9[4589]/ },
    ],
  },
  {
    code: 'TD',
    name: 'Tchad',
    dialCode: '235',
    flag: '🇹🇩',
    placeholder: '66 XX XX XX',
    operators: [
      { id: 'airtel', name: 'Airtel Money', regex: /^6[2356]/ },
      { id: 'moov', name: 'Moov Money', regex: /^9[0159]/ },
    ],
  },
]

const TIMEZONE_TO_COUNTRY = {
  'Africa/Douala': 'CM',
  'Africa/Abidjan': 'CI',
  'Africa/Dakar': 'SN',
  'Africa/Porto-Novo': 'BJ',
  'Africa/Cotonou': 'BJ',
  'Africa/Lome': 'TG',
  'Africa/Bamako': 'ML',
  'Africa/Ouagadougou': 'BF',
  'Africa/Brazzaville': 'CG',
  'Africa/Kinshasa': 'CD',
  'Africa/Lubumbashi': 'CD',
  'Africa/Libreville': 'GA',
  'Africa/Conakry': 'GN',
  'Africa/Niamey': 'NE',
  'Africa/Ndjamena': 'TD',
}

function detectUserCountryCode() {
  if (typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem('cvcraft_user_country')
      if (saved && FRANCOPHONE_AFRICA_COUNTRIES.some((c) => c.code === saved)) {
        return saved
      }
    } catch {}
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (tz && TIMEZONE_TO_COUNTRY[tz]) {
        return TIMEZONE_TO_COUNTRY[tz]
      }
    } catch {}
  }
  return 'CM'
}

function detectOperator(countryCode, localNumber) {
  const digits = String(localNumber || '').replace(/\D/g, '')
  if (!digits || digits.length < 2) return null
  const country = FRANCOPHONE_AFRICA_COUNTRIES.find((c) => c.code === countryCode) || FRANCOPHONE_AFRICA_COUNTRIES[0]

  let cleanDigits = digits
  if (cleanDigits.startsWith(country.dialCode) && cleanDigits.length > country.dialCode.length + 2) {
    cleanDigits = cleanDigits.slice(country.dialCode.length)
  }

  for (const op of country.operators) {
    if (op.regex.test(cleanDigits)) {
      return op
    }
  }
  return null
}

function normalizeAfricanPhoneNumber(countryCode, value) {
  const country = FRANCOPHONE_AFRICA_COUNTRIES.find((c) => c.code === countryCode) || FRANCOPHONE_AFRICA_COUNTRIES[0]
  let digits = String(value || '').trim().replace(/\D/g, '')

  if (digits.startsWith(country.dialCode) && digits.length > country.dialCode.length + 5) {
    digits = digits.slice(country.dialCode.length)
  }

  if (!digits) {
    throw new Error('Saisissez votre numéro de téléphone mobile.')
  }

  const fullNumber = `${country.dialCode}${digits}`
  if (!/^(237|225|221|229|228|223|226|242|243|241|224|227|235)\d{7,10}$/.test(fullNumber)) {
    throw new Error(`Saisissez un numéro mobile valide pour ${country.name} (ex. ${country.placeholder}).`)
  }

  return fullNumber
}

function normalizeCameroonPhoneNumber(value) {
  return normalizeAfricanPhoneNumber('CM', value)
}

function MobileMoneyPhoneInput({
  id = 'payment-phone-input',
  country = 'CM',
  onCountryChange,
  value = '',
  onChange,
}) {
  const activeCountry = FRANCOPHONE_AFRICA_COUNTRIES.find((c) => c.code === country) || FRANCOPHONE_AFRICA_COUNTRIES[0]
  const operator = detectOperator(activeCountry.code, value)

  const handleCountrySelect = (e) => {
    const nextCode = e.target.value
    if (onCountryChange) onCountryChange(nextCode)
    try {
      window.localStorage.setItem('cvcraft_user_country', nextCode)
    } catch {}
  }

  const handlePhoneInput = (e) => {
    let raw = e.target.value
    const digitsOnly = raw.replace(/\D/g, '')
    for (const c of FRANCOPHONE_AFRICA_COUNTRIES) {
      if (raw.trim().startsWith(`+${c.dialCode}`) || (digitsOnly.startsWith(c.dialCode) && digitsOnly.length > c.dialCode.length + 5)) {
        if (c.code !== activeCountry.code && onCountryChange) {
          onCountryChange(c.code)
        }
        raw = digitsOnly.slice(c.dialCode.length)
        break
      }
    }
    onChange(raw)
  }

  return (
    <div className="phone-composite-wrap">
      <div className="country-picker-btn" title={`Pays : ${activeCountry.name} (+${activeCountry.dialCode})`}>
        <span className="country-flag" aria-hidden="true">{activeCountry.flag}</span>
        <span className="country-dial">+{activeCountry.dialCode}</span>
        <span className="country-arrow" aria-hidden="true">▾</span>
        <select
          className="country-native-select"
          aria-label="Sélectionner l'indicatif du pays"
          value={activeCountry.code}
          onChange={handleCountrySelect}
        >
          {FRANCOPHONE_AFRICA_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.name} (+{c.dialCode})
            </option>
          ))}
        </select>
      </div>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        className="phone-composite-input"
        placeholder={activeCountry.placeholder}
        value={value}
        onChange={handlePhoneInput}
        required
      />
      {operator && (
        <span
          className={`operator-badge is-${operator.id}`}
          aria-live="polite"
          title={`Opérateur détecté : ${operator.name}`}
        >
          <span className="operator-dot" aria-hidden="true" />
          <span className="operator-name">{operator.name}</span>
        </span>
      )}
    </div>
  )
}

function formatRelativeDate(value) {
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return null

  const elapsed = timestamp - Date.now()
  const units = [
    ['year', 365 * 24 * 60 * 60],
    ['month', 30 * 24 * 60 * 60],
    ['day', 24 * 60 * 60],
    ['hour', 60 * 60],
    ['minute', 60],
    ['second', 1],
  ]
  const [unit, seconds] = units.find(([, unitSeconds]) => Math.abs(elapsed) >= unitSeconds * 1000) || units[units.length - 1]
  return new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' }).format(Math.round(elapsed / (seconds * 1000)), unit)
}

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
  { id: 'free', name: 'Gratuit', price: '0', suffix: 'sans limite de durée', description: 'Pour tester CV Craft.', features: ['1 CV', '1 template gratuit', 'Téléchargement PDF', 'Sauvegarde'], action: 'Commencer gratuitement' },
  { id: 'pro', name: 'Pro', price: '100', suffix: 'pour 3 mois (test)', description: 'Pour créer un CV professionnel.', features: ['1 CV', 'Modèles premium', 'PDF sans logo', 'Modifications illimitées', 'Réactivation à payer après 3 mois'], action: 'Choisir Pro', featured: true },
  { id: 'gold', name: 'Gold', price: '100', suffix: 'par mois (test)', description: 'Pour les chercheurs d’emploi actifs.', features: ['Jusqu’à 3 CV', 'Templates premium', 'Optimisation ATS · bientôt', 'Historique des versions · bientôt', 'Lien public · bientôt'], action: 'Choisir Gold' },
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

function normalizeResumeData(inputResume) {
  const r = inputResume || {}
  return {
    ...defaultResume,
    ...r,
    sectionVisibility: {
      ...defaultResume.sectionVisibility,
      ...(r.sectionVisibility || {}),
      personal: r.sectionVisibility?.personal
        ?? (r.sectionVisibility?.contact !== false && r.sectionVisibility?.summary !== false),
    },
    experiences: Array.isArray(r.experiences) ? r.experiences : defaultResume.experiences,
    educations: Array.isArray(r.educations) ? r.educations : defaultResume.educations,
    skills: Array.isArray(r.skills) ? r.skills : defaultResume.skills,
    languages: Array.isArray(r.languages) ? r.languages : defaultResume.languages,
    projects: Array.isArray(r.projects) ? r.projects : defaultResume.projects,
    references: Array.isArray(r.references) ? r.references : defaultResume.references,
    certifications: Array.isArray(r.certifications) ? r.certifications : defaultResume.certifications,
    interests: Array.isArray(r.interests) ? r.interests : defaultResume.interests,
  }
}

function clearLocalResumeData() {
  legacyResumeKeys.forEach((key) => window.localStorage.removeItem(key))
  window.localStorage.removeItem(GUEST_RESUME_KEY)
  window.sessionStorage.removeItem(OAUTH_INTENT_KEY)
}

function loadGuestResume() {
  const storedResume = window.localStorage.getItem(GUEST_RESUME_KEY)
  if (storedResume) {
    try {
      const savedData = JSON.parse(storedResume)
      return {
        resume: normalizeResumeData(savedData.resume || savedData),
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
    resume: normalizeResumeData(legacyData.resume),
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
  user,
  userId,
  initialResumeId,
  createNewResume,
  accountPlan,
  onReactivatePlan,
  initialTemplate,
  preferInitialTemplate,
  downloadAfterPayment,
  downloadRequested,
  onDownloadRequestComplete,
  onAutoDownloadComplete,
  onHome,
  onDashboard,
  onLogout,
  onRequestUnlock,
  onPaymentStarted,
  paymentStatus,
  onRetryPayment,
  onSwitchResume,
  onCreateResume,
  onImportResume,
  showNotice,
  notice,
}) {
  const [photo, setPhoto] = useState('')
  const [template, setTemplate] = useState(initialTemplate)
  const isFreeModel = template === 'gratuit'
  const isPlanActive = Boolean(accountPlan?.active && ['pro', 'gold'].includes(accountPlan?.planId))
  const [modelStatus, setModelStatus] = useState(isFreeModel || isPlanActive ? (isPlanActive ? 'paid' : 'free') : 'pending_payment')
  const [baseColor, setBaseColor] = useState('#e49a68')
  const [resumeFont, setResumeFont] = useState('classic')
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentSubmitting, setPaymentSubmitting] = useState(false)
  const [paymentCountry, setPaymentCountry] = useState(() => detectUserCountryCode())
  const [paymentPhone, setPaymentPhone] = useState('')
  const [templateChooserOpen, setTemplateChooserOpen] = useState(false)
  const [changePlanOpen, setChangePlanOpen] = useState(false)
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false)
  const [cropSource, setCropSource] = useState('')
  const [resume, setResume] = useState(defaultResume)
  const [resumeId, setResumeId] = useState(initialResumeId || null)
  const resumeIdRef = useRef(initialResumeId || null)
  const [resumeLoaded, setResumeLoaded] = useState(false)
  const [resumeLoadError, setResumeLoadError] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [saveStatus, setSaveStatus] = useState('saved')
  const [saveError, setSaveError] = useState('')
  const [loadRetry, setLoadRetry] = useState(0)
  const [saveRetry, setSaveRetry] = useState(0)
  const [userResumes, setUserResumes] = useState([])
  const [resumesLoading, setResumesLoading] = useState(false)
  const editVersion = useRef(0)
  const cloudSaveQueue = useRef(Promise.resolve())
  const autoDownloadStarted = useRef(false)
  const dashboardDownloadStarted = useRef(false)
  const guestMigrationPending = useRef(false)

  useEffect(() => {
    if (!userId) {
      setUserResumes([])
      return undefined
    }
    let active = true
    setResumesLoading(true)
    loadUserResumesFromCloud(userId)
      .then((list) => {
        if (active) setUserResumes(Array.isArray(list) ? list : [])
      })
      .catch((err) => {
        console.warn('Erreur chargement des CV pour le rail:', err)
      })
      .finally(() => {
        if (active) setResumesLoading(false)
      })
    return () => {
      active = false
    }
  }, [userId, resumeId, saveStatus])

  const saveCloudDraft = (draft) => {
    const save = cloudSaveQueue.current.then(async () => {
      const result = await saveUserResumeToCloud(userId, draft, resumeIdRef.current)
      if (result.resumeId) {
        resumeIdRef.current = result.resumeId
        setResumeId(result.resumeId)
      }
      return result
    })
    cloudSaveQueue.current = save.catch(() => {})
    return save
  }

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
          setModelStatus(guestResume.modelStatus || (guestResume.template === 'gratuit' ? 'free' : 'pending_payment'))
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

    if (createNewResume) {
      setResume(defaultResume)
      setPhoto('')
      setTemplate(initialTemplate)
      setModelStatus(initialTemplate === 'gratuit' ? 'free' : 'pending_payment')
      setBaseColor('#e49a68')
      setResumeFont('classic')
      setResumeId(null)
      resumeIdRef.current = null
      editVersion.current += 1
      setIsDirty(true)
      setSaveStatus('saving')
      setResumeLoaded(true)
      return () => {
        active = false
      }
    }

    loadUserResumeFromCloud(userId, initialResumeId).then((savedData) => {
      if (!active) return

      const guestData = savedData ? null : loadGuestResume()
      if (savedData) {
        setResumeId(savedData.id || null)
        resumeIdRef.current = savedData.id || null
        window.localStorage.removeItem(GUEST_RESUME_KEY)
        const savedResume = savedData.resume || savedData || {}
        setResume({
          ...defaultResume,
          ...savedResume,
          sectionVisibility: {
            ...defaultResume.sectionVisibility,
            ...(savedResume.sectionVisibility || {}),
            personal: savedResume.sectionVisibility?.personal
              ?? (savedResume.sectionVisibility?.contact !== false && savedResume.sectionVisibility?.summary !== false),
          },
          experiences: Array.isArray(savedResume.experiences) ? savedResume.experiences : defaultResume.experiences,
          educations: Array.isArray(savedResume.educations) ? savedResume.educations : defaultResume.educations,
          skills: Array.isArray(savedResume.skills) ? savedResume.skills : defaultResume.skills,
          languages: Array.isArray(savedResume.languages) ? savedResume.languages : defaultResume.languages,
          projects: Array.isArray(savedResume.projects) ? savedResume.projects : defaultResume.projects,
          references: Array.isArray(savedResume.references) ? savedResume.references : defaultResume.references,
          certifications: Array.isArray(savedResume.certifications) ? savedResume.certifications : defaultResume.certifications,
          interests: Array.isArray(savedResume.interests) ? savedResume.interests : defaultResume.interests,
        })
        setPhoto(savedData.photo || savedResume.photo || '')
        const resolvedTemplate = preferInitialTemplate
          ? initialTemplate
          : resumeTemplates.some((item) => item.id === savedData.template)
            ? savedData.template
            : initialTemplate
        setTemplate(resolvedTemplate)
        setModelStatus(isPlanActive ? 'paid' : (resolvedTemplate === savedData.template
          ? savedData.modelStatus || (resolvedTemplate === 'gratuit' ? 'free' : 'pending_payment')
          : resolvedTemplate === 'gratuit' ? 'free' : 'pending_payment'))
        setBaseColor(savedData.baseColor || '#e49a68')
        setResumeFont(savedData.resumeFont || 'classic')
        if (preferInitialTemplate && resolvedTemplate !== savedData.template) {
          editVersion.current += 1
          setIsDirty(true)
          setSaveStatus('saving')
        }
      } else if (guestData) {
        setResumeId(null)
        resumeIdRef.current = null
        setResume(guestData.resume)
        setPhoto(guestData.photo)
        const guestTemplate = preferInitialTemplate ? initialTemplate : guestData.template
        setTemplate(guestTemplate)
        setModelStatus(guestTemplate === 'gratuit' || isPlanActive ? (isPlanActive ? 'paid' : 'free') : 'pending_payment')
        setBaseColor(guestData.baseColor)
        setResumeFont(guestData.resumeFont)
        guestMigrationPending.current = true
        editVersion.current += 1
        setIsDirty(true)
        setSaveStatus('saving')
      } else {
        setResumeId(null)
        resumeIdRef.current = null
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
          const legacyTemplate = !preferInitialTemplate && resumeTemplates.some((item) => item.id === legacyData.template)
            ? legacyData.template
            : initialTemplate
          setTemplate(legacyTemplate)
          setModelStatus(legacyTemplate === 'gratuit' || isPlanActive ? (isPlanActive ? 'paid' : 'free') : 'pending_payment')
          setBaseColor(legacyData.baseColor)
          setResumeFont(legacyData.resumeFont)
          editVersion.current += 1
          setIsDirty(true)
          setSaveStatus('saving')
        } else {
          setTemplate(initialTemplate)
          setModelStatus(initialTemplate === 'gratuit' || isPlanActive ? (isPlanActive ? 'paid' : 'free') : 'pending_payment')
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
  }, [createNewResume, initialResumeId, initialTemplate, loadRetry, preferInitialTemplate, userId])

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
        modelStatus,
        baseColor,
        resumeFont,
      }
      if (userId) {
        const saved = await saveCloudDraft(draft)
        if (saved.resumeId) setResumeId(saved.resumeId)
        if (guestMigrationPending.current && editVersion.current === version) {
          window.localStorage.removeItem(GUEST_RESUME_KEY)
          guestMigrationPending.current = false
        }
      } else {
        saveGuestResume(draft)
      }
      setIsDirty(false)
      setSaveError('')
      setSaveStatus(userId ? 'saved' : 'guest')
      navigate()
    } catch (error) {
      console.error(userId ? 'Erreur lors de la sauvegarde du CV avant de quitter:' : 'Erreur lors de la sauvegarde locale avant de quitter:', error)
      setSaveError(error.message || 'Erreur inconnue')
      setSaveStatus('error')
    }
  }

  const handleLogout = () => saveBeforeNavigation(async () => {
    try {
      await onLogout()
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error)
      showNotice('La déconnexion a échoué. Votre session est toujours active.')
    }
  })

  const resumeQuota = accountPlan?.planId === 'gold' ? 3 : 1

  const getResumeItemTitle = (item) => {
    const name = `${item.resume?.firstName || ''} ${item.resume?.lastName || ''}`.trim()
    return item.name || (name ? `CV de ${name}` : 'Mon CV')
  }

  const handleSelectResume = (item) => {
    if (item.id === resumeId) return
    saveBeforeNavigation(() => {
      if (onSwitchResume) {
        onSwitchResume(item.id, item.template)
      } else {
        setResumeId(item.id)
        resumeIdRef.current = item.id
        setLoadRetry((current) => current + 1)
      }
    })
  }

  const handleCreateResume = () => {
    if (userResumes.length >= resumeQuota) {
      showNotice(
        accountPlan?.planId === 'gold'
          ? 'Limite de 3 CV atteinte pour l’offre Gold.'
          : 'Limite de 1 CV atteinte. Passez à l’offre Gold pour créer plusieurs CV.'
      )
      return
    }
    saveBeforeNavigation(() => {
      if (onCreateResume) {
        onCreateResume()
      } else {
        setResumeId(null)
        resumeIdRef.current = null
        setResume(defaultResume)
        setPhoto('')
        setTemplate('gratuit')
        setModelStatus('free')
        editVersion.current += 1
        setIsDirty(true)
        setSaveStatus('saving')
      }
    })
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
          modelStatus,
          baseColor,
          resumeFont,
        }
        if (userId) {
          const saved = await saveCloudDraft(draft)
          if (saved.resumeId) setResumeId(saved.resumeId)
        } else {
          saveGuestResume(draft)
        }
        if (editVersion.current === version) {
          setIsDirty(false)
          setSaveError('')
          setSaveStatus(userId ? 'saved' : 'guest')
        }
      } catch (error) {
        console.error(userId ? 'Erreur lors de la sauvegarde du CV sur le serveur:' : 'Erreur lors de la sauvegarde locale du CV gratuit:', error)
        if (editVersion.current === version) {
          setSaveError(error.message || 'Erreur inconnue')
          setSaveStatus('error')
        }
      }
    }, 500)

    return () => window.clearTimeout(timeout)
  }, [baseColor, isDirty, modelStatus, photo, resume, resumeFont, resumeLoaded, saveRetry, template, userId])

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
    setModelStatus(templateId === 'gratuit' || isPlanActive ? (isPlanActive ? 'paid' : 'free') : templateId === template && modelStatus === 'paid' ? 'paid' : 'pending_payment')
    setTemplateChooserOpen(false)
  }
  const unlockTemplate = (templateId) => {
    onRequestUnlock(templateId, { resume, photo, template, baseColor, resumeFont, resumeId })
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
    // Laisser le temps à React et ResumeDocument de stabiliser le DOM et la pagination
    await new Promise((resolve) => window.setTimeout(resolve, 350))
    const sheets = document.querySelectorAll('#resume-preview .resume-sheet')
    if (!sheets.length) {
      console.warn('downloadPdf: aucune feuille #resume-preview .resume-sheet trouvée.')
      return false
    }

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

      const fullName = `${(resume.lastName || '').trim()} ${(resume.firstName || '').trim()}`.trim()
      const fileName = `${fullName ? fullName + ' ' : ''}CvCraft.pdf`
      pdf.save(fileName)

      if (userId) {
        const pdfBlob = pdf.output('blob')
        uploadPdfAndSaveResume({
          pdfBlob,
          fileName,
          resume,
          photo,
          resumeData: { resume, photo, template, modelStatus, baseColor, resumeFont },
          resumeId,
        }).catch((uploadError) => {
          console.warn('La sauvegarde cloud du CV a échoué:', uploadError)
          showNotice('Le PDF est téléchargé, mais sa sauvegarde sur le serveur a échoué.')
        })
      }
      return true
    } catch (err) {
      console.error('Erreur lors de la génération ou sauvegarde du PDF:', err)
      showNotice('Le téléchargement du PDF a échoué. Réessayez.')
      return false
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
      downloadPdf().then((downloaded) => {
        if (downloaded) showNotice('Merci ! Votre CV est téléchargé. Vous pouvez continuer à le modifier ici.')
      }).finally(onAutoDownloadComplete)
    }, 100)
    return () => window.clearTimeout(timeout)
  }, [downloadAfterPayment, resumeLoaded])

  const beginPaidDownload = async () => {
    setPaymentSubmitting(true)
    setPaymentError('')
    try {
      const phoneNumber = normalizeAfricanPhoneNumber(paymentCountry, paymentPhone)
      await saveUserResumeToCloud(userId, {
        resume,
        photo,
        template,
        modelStatus: 'pending_payment',
        baseColor,
        resumeFont,
      }, resumeId)
      setModelStatus('pending_payment')
      const checkout = await createTaraCheckout(template, phoneNumber, resumeId)
      setPaymentOpen(false)
      onPaymentStarted(checkout.paymentId)
      showNotice('Demande envoyée. Validez le paiement sur votre téléphone.')
    } catch (error) {
      console.error('Impossible de démarrer le paiement Tara Money:', error)
      setPaymentError(error.message || 'Le paiement ne peut pas être démarré pour le moment.')
    } finally {
      setPaymentSubmitting(false)
    }
  }

  const handleExport = () => {
    if (accountPlan?.active && ['pro', 'gold'].includes(accountPlan.planId)) {
      downloadPdf()
      return
    }
    if (template === 'gratuit') {
      if (!userId) {
        onRequestUnlock(template, { resume, photo, template, baseColor, resumeFont, resumeId }, { downloadAfterAuth: true })
        return
      }
      downloadPdf()
      return
    }
    if (!userId) {
      onRequestUnlock(template, { resume, photo, template, baseColor, resumeFont, resumeId })
      return
    }
    if (modelStatus === 'paid') {
      downloadPdf()
      return
    }
    setPaymentError('')
    setPaymentPhone('237')
    setPaymentOpen(true)
  }

  useEffect(() => {
    if (!downloadRequested) {
      dashboardDownloadStarted.current = false
      return
    }
    if (!resumeLoaded || dashboardDownloadStarted.current) return
    dashboardDownloadStarted.current = true
    const download = template === 'gratuit' || modelStatus === 'paid' || accountPlan?.active && ['pro', 'gold'].includes(accountPlan.planId)
      ? downloadPdf()
      : Promise.resolve(handleExport())
    Promise.resolve(download).finally(onDownloadRequestComplete)
  }, [accountPlan, downloadRequested, resumeLoaded, handleExport, onDownloadRequestComplete])

  if (!resumeLoaded) {
    return (
      <div className="account-page">
        <div className="account-dialog" aria-busy="true">
          {resumeLoadError ? (
            <>
              <h1>Chargement impossible</h1>
              <p>{resumeLoadError}</p>
              <button className="button button-dark" type="button" onClick={() => {
                setResumeLoadError('')
                setLoadRetry((current) => current + 1)
              }}>Réessayer</button>
            </>
          ) : <span className="loading-indicator" aria-hidden="true" />}
        </div>
      </div>
    )
  }

  const experiences = Array.isArray(resume?.experiences) ? resume.experiences : []
  const educations = Array.isArray(resume?.educations) ? resume.educations : []
  const skills = Array.isArray(resume?.skills) ? resume.skills : []
  const languages = Array.isArray(resume?.languages) ? resume.languages : []
  const projects = Array.isArray(resume?.projects) ? resume.projects : []
  const certifications = Array.isArray(resume?.certifications) ? resume.certifications : []
  const interests = Array.isArray(resume?.interests) ? resume.interests : []
  const references = Array.isArray(resume?.references) ? resume.references : []

  return (
    <div className={`builder-page ${mobilePreviewOpen ? 'mobile-preview-open' : ''}`}>
      <aside className="builder-nav-rail" aria-label="Menu de navigation">
        {/* LOGO CVcraft (sans bouton accueil) */}
        <div className="nav-rail-top">
          <div className="nav-rail-brand" title="CVcraft Studio">
            <span className="brand-mark">c</span>
            <span className="nav-rail-text brand-text">CVcraft</span>
          </div>
        </div>

        {/* RUBRIQUE MES CV (directement après le logo) */}
        <div className="nav-rail-section nav-rail-resumes-section">
          <div className="nav-rail-section-header" title="Mes CV">
            <div className="nav-rail-icon-wrap">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-rail-icon">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              {userId && userResumes.length > 0 && (
                <span className="nav-rail-badge">{userResumes.length}</span>
              )}
            </div>
            <div className="nav-rail-text nav-rail-section-meta">
              <span className="nav-rail-section-title">Mes CV</span>
              {userId && (
                <span className="nav-rail-quota-pill">
                  {userResumes.length}/{resumeQuota}
                </span>
              )}
            </div>
          </div>

          <div className="nav-rail-text nav-rail-cv-list-wrap">
            {userId ? (
              <div className="nav-rail-cv-list">
                {userResumes.length > 0 ? (
                  userResumes.map((item) => {
                    const isActive = item.id === resumeId
                    const title = getResumeItemTitle(item)
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`nav-rail-cv-item ${isActive ? 'is-active' : ''}`}
                        onClick={() => handleSelectResume(item)}
                        title={isActive ? `${title} (actuellement ouvert)` : `Basculer vers ${title}`}
                      >
                        <span className="nav-rail-cv-bullet" />
                        <div className="nav-rail-cv-info">
                          <strong className="nav-rail-cv-title">{title}</strong>
                          <span className="nav-rail-cv-sub">
                            Modèle {item.template || 'gratuit'}
                          </span>
                        </div>
                        {isActive && <span className="nav-rail-active-pill">Actif</span>}
                      </button>
                    )
                  })
                ) : (
                  <div className="nav-rail-cv-empty">
                    <span>1 CV en cours</span>
                  </div>
                )}

                {userResumes.length < resumeQuota && (
                  <button
                    type="button"
                    className="nav-rail-add-cv-btn"
                    onClick={handleCreateResume}
                    title="Créer un nouveau CV"
                  >
                    <span className="add-cv-icon">＋</span>
                    <span>Nouveau CV</span>
                  </button>
                )}

                <button
                  type="button"
                  className="nav-rail-add-cv-btn nav-rail-import-btn"
                  onClick={onImportResume}
                  title="Importer et améliorer un CV existant (PDF, Word, texte)"
                >
                  <span className="add-cv-icon">📄</span>
                  <span>Importer un CV</span>
                </button>
              </div>
            ) : (
              <div className="nav-rail-guest-hint">
                <span className="nav-rail-cv-title">Mon CV (invité)</span>
                <button
                  type="button"
                  className="nav-rail-signin-link"
                  onClick={() => onRequestUnlock('gratuit', { resume, photo, template, baseColor, resumeFont })}
                >
                  Connectez-vous pour plusieurs CV
                </button>
                <button
                  type="button"
                  className="nav-rail-signin-link"
                  style={{ marginTop: '5px', color: '#f8f7f2' }}
                  onClick={onImportResume}
                >
                  📄 Importer un CV existant
                </button>
              </div>
            )}
          </div>
        </div>

        {/* EN BAS : PROFIL ET FORFAITS */}
        <div className="nav-rail-bottom">
          {/* Statut de sauvegarde discret */}
          <div
            className={`nav-rail-save-status ${saveStatus === 'error' ? 'is-error' : saveStatus === 'saving' ? 'is-saving' : 'is-saved'}`}
            title={saveStatus === 'error' ? saveError || 'Erreur de sauvegarde' : saveStatus === 'saving' ? 'Sauvegarde en cours…' : 'Modifications enregistrées'}
            onClick={() => {
              if (saveStatus === 'error') {
                setSaveStatus('saving')
                setSaveRetry((current) => current + 1)
                if (!isDirty) {
                  editVersion.current += 1
                  setIsDirty(true)
                }
              }
            }}
            style={{ cursor: saveStatus === 'error' ? 'pointer' : 'default' }}
          >
            <div className="nav-rail-icon-wrap">
              <span className={`save-dot ${saveStatus === 'error' ? 'is-error' : ''}`} />
            </div>
            <span className="nav-rail-text save-status-text">
              {saveStatus === 'saving'
                ? 'Sauvegarde…'
                : saveStatus === 'error'
                  ? 'Erreur — Réessayer'
                  : 'Sauvegardé'}
            </span>
          </div>

          {/* Bouton Profil */}
          {userId ? (
            <button
              type="button"
              className="nav-rail-item nav-rail-profile"
              onClick={() => saveBeforeNavigation(onDashboard)}
              title={`Profil (${user?.email || ''})`}
            >
              <div className="nav-rail-icon-wrap">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-rail-icon">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                {accountPlan?.active && ['pro', 'gold'].includes(accountPlan?.planId) && (
                  <span className="nav-rail-crown-badge">
                    <PremiumCrown />
                  </span>
                )}
              </div>
              <div className="nav-rail-text nav-rail-profile-info">
                <div className="nav-rail-profile-row">
                  <span className="nav-rail-profile-name">Profil</span>
                  {accountPlan?.active && ['pro', 'gold'].includes(accountPlan?.planId) && (
                    <span className="user-pro-crown" title={`Abonnement ${accountPlan?.planId === 'gold' ? 'Gold' : 'Pro'} actif`}>
                      <PremiumCrown />
                    </span>
                  )}
                </div>
                {user?.email && (
                  <span className="nav-rail-profile-email">{user.email}</span>
                )}
              </div>
            </button>
          ) : (
            <button
              type="button"
              className="nav-rail-item nav-rail-profile"
              onClick={() => onRequestUnlock('gratuit', { resume, photo, template, baseColor, resumeFont })}
              title="Profil / Se connecter"
            >
              <div className="nav-rail-icon-wrap">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-rail-icon">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <span className="nav-rail-text">Profil</span>
            </button>
          )}

          {/* Bouton Forfaits */}
          <button
            type="button"
            className="nav-rail-item nav-rail-plans"
            onClick={() => setChangePlanOpen(true)}
            title="Consulter ou changer de forfait"
          >
            <div className="nav-rail-icon-wrap">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-rail-icon">
                <polygon points="6 3 18 3 22 9 12 22 2 9 6 3" />
                <line x1="12" y1="22" x2="12" y2="9" />
                <line x1="2" y1="9" x2="22" y2="9" />
                <line x1="10" y1="3" x2="8" y2="9" />
                <line x1="14" y1="3" x2="16" y2="9" />
              </svg>
            </div>
            <div className="nav-rail-text nav-rail-plans-info">
              <span className="nav-rail-plans-name">Forfaits</span>
              <span className={`nav-rail-plans-badge ${accountPlan?.active && ['pro', 'gold'].includes(accountPlan?.planId) ? 'is-premium' : ''}`}>
                {accountPlan?.active && accountPlan?.planId === 'gold'
                  ? 'Gold'
                  : accountPlan?.active && accountPlan?.planId === 'pro'
                    ? 'Pro'
                    : 'Gratuit'}
              </span>
            </div>
          </button>
        </div>
      </aside>
      <main className="builder-main">
        <aside className="builder-sidebar">
          <div className="builder-sidebar-heading"><div><span className="section-kicker">Mon espace</span><h1>Construire<br /><em>mon CV.</em></h1></div><span className="builder-step">01 / 03</span></div>
          <div className="builder-progress"><span className="active" /><span /><span /></div>
          <p className="builder-help">Commencez par vos informations essentielles. Vous pourrez tout modifier ensuite.</p>
          <div className="builder-quick-imports">
            <button
              type="button"
              className="builder-quick-import-btn"
              onClick={onImportResume}
              title="Importer un CV existant (PDF, Word, texte) pour l'améliorer"
            >
              <span className="quick-import-icon">📄</span>
              <span>Améliorer un CV existant</span>
            </button>
          </div>
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
            {experiences.slice(0, isFreeModel ? 3 : undefined).map((experience, index) => <div className="repeatable-block" key={`experience-${index}`}><div className="repeatable-heading"><span>Expérience {index + 1}</span></div><label>Entreprise<input value={experience.company} onChange={(event) => updateListItem('experiences', index, 'company', event.target.value)} /></label><label>Poste<input value={experience.jobTitle} onChange={(event) => updateListItem('experiences', index, 'jobTitle', event.target.value)} /></label><div className="field-row date-fields"><label>Date de début<input type="date" value={experience.startDate} onChange={(event) => updateListItem('experiences', index, 'startDate', event.target.value)} /></label><label>Date de fin<input type="date" value={experience.endDate} onChange={(event) => updateListItem('experiences', index, 'endDate', event.target.value)} /></label></div><label>Tâches effectuées <span className="optional-label">(facultatif)</span><textarea rows="3" placeholder="Décrivez vos principales responsabilités et réalisations" value={experience.tasks} onChange={(event) => updateListItem('experiences', index, 'tasks', event.target.value)} /></label></div>)}
            <button className="add-entry" disabled={isFreeModel && experiences.length >= 3} onClick={() => addListItem('experiences', { company: '', jobTitle: '', startDate: '', endDate: '', tasks: '' })}>+ Ajouter une expérience {isFreeModel && experiences.length >= 3 && <PremiumCrown />}</button>
            {!sectionEnabled('experiences') && <p className="section-hidden-note">Cette rubrique est masquée dans le CV.</p>}
            <SectionHeading number="03" title="Formation académique" enabled={sectionEnabled('educations')} onToggle={() => toggleSection('educations')} onReset={() => resetSection('educations')} locked={isSectionLocked('educations')} />
            <fieldset className="premium-fieldset" disabled={isSectionLocked('educations')}>
            {educations.map((education, index) => <div className="repeatable-block" key={`education-${index}`}><div className="repeatable-heading"><span>Formation {index + 1}</span></div><label>Établissement<input value={education.school} onChange={(event) => updateListItem('educations', index, 'school', event.target.value)} /></label><label>Diplôme<input value={education.degree} onChange={(event) => updateListItem('educations', index, 'degree', event.target.value)} /></label><div className="field-row date-fields"><label>Date de début<input type="date" value={education.startDate} onChange={(event) => updateListItem('educations', index, 'startDate', event.target.value)} /></label><label>Date de fin<input type="date" value={education.endDate} onChange={(event) => updateListItem('educations', index, 'endDate', event.target.value)} /></label></div></div>)}
            <button className="add-entry" onClick={() => addListItem('educations', { school: '', degree: '', startDate: '', endDate: '' })}>+ Ajouter une formation {isSectionLocked('educations') && <PremiumCrown />}</button>
            </fieldset>
            {!sectionEnabled('educations') && <p className="section-hidden-note">Cette rubrique est masquée dans le CV.</p>}
            <SectionHeading number="04" title="Compétences" enabled={sectionEnabled('skills')} onToggle={() => toggleSection('skills')} onReset={() => resetSection('skills')} locked={isSectionLocked('skills')} />
            <fieldset className="premium-fieldset" disabled={isSectionLocked('skills')}>
            <div className="skill-fields">{skills.map((skill, index) => <input key={`skill-${index}`} value={skill} placeholder="Ex. Photoshop" onChange={(event) => updateSkill(index, event.target.value)} />)}</div><button className="add-entry" onClick={() => addListItem('skills', '')}>+ Ajouter une compétence {isSectionLocked('skills') && <PremiumCrown />}</button>
            </fieldset>
            {!sectionEnabled('skills') && <p className="section-hidden-note">Cette rubrique est masquée dans le CV.</p>}
            <SectionHeading number="05" title="Langues" enabled={sectionEnabled('languages')} onToggle={() => toggleSection('languages')} onReset={() => resetSection('languages')} locked={isSectionLocked('languages')} />
            <fieldset className="premium-fieldset" disabled={isSectionLocked('languages')}>
            {languages.map((language, index) => <div className="repeatable-block" key={`language-${index}`}><div className="repeatable-heading"><span>Langue {index + 1}</span></div><div className="field-row"><label>Langue<input value={language.name} onChange={(event) => updateListItem('languages', index, 'name', event.target.value)} /></label><label>Niveau<select value={Math.min(5, Math.max(1, Number(language.level) || 1))} onChange={(event) => updateListItem('languages', index, 'level', Number(event.target.value))}>{[1, 2, 3, 4, 5].map((level) => <option key={level} value={level}>{level} / 5</option>)}</select></label></div></div>)}
            <button className="add-entry" onClick={() => addListItem('languages', { name: '', level: 1 })}>+ Ajouter une langue {isSectionLocked('languages') && <PremiumCrown />}</button>
            </fieldset>
            {!sectionEnabled('languages') && <p className="section-hidden-note">Cette rubrique est masquée dans le CV.</p>}
            <SectionHeading number="06" title="Projets et réalisations" enabled={sectionEnabled('projects')} onToggle={() => toggleSection('projects')} onReset={() => resetSection('projects')} locked={isSectionLocked('projects')} />
            <fieldset className="premium-fieldset" disabled={isSectionLocked('projects')}>
            {projects.map((project, index) => <div className="repeatable-block" key={`project-${index}`}><div className="repeatable-heading"><span>Projet {index + 1}</span></div><label>Nom du projet<input value={project.name} onChange={(event) => updateListItem('projects', index, 'name', event.target.value)} /></label><label>Description<textarea rows="2" value={project.description} onChange={(event) => updateListItem('projects', index, 'description', event.target.value)} /></label><div className="field-row"><label>Lien <span className="optional-label">(facultatif)</span><input value={project.link} onChange={(event) => updateListItem('projects', index, 'link', event.target.value)} /></label><label>Année<input value={project.year} onChange={(event) => updateListItem('projects', index, 'year', event.target.value)} /></label></div></div>)}
            <button className="add-entry" onClick={() => addListItem('projects', { name: '', description: '', link: '', year: '' })}>+ Ajouter un projet {isSectionLocked('projects') && <PremiumCrown />}</button>
            </fieldset>
            {!sectionEnabled('projects') && <p className="section-hidden-note">Cette rubrique est masquée dans le CV.</p>}
            <SectionHeading number="07" title="Certifications" enabled={sectionEnabled('certifications')} onToggle={() => toggleSection('certifications')} onReset={() => resetSection('certifications')} locked={isSectionLocked('certifications')} />
            <fieldset className="premium-fieldset" disabled={isSectionLocked('certifications')}>
            {certifications.map((certification, index) => <div className="repeatable-block" key={`certification-${index}`}><div className="repeatable-heading"><span>Certification {index + 1}</span></div><label>Nom de la certification<input value={certification.name} onChange={(event) => updateListItem('certifications', index, 'name', event.target.value)} /></label><div className="field-row"><label>Organisme<input value={certification.issuer} onChange={(event) => updateListItem('certifications', index, 'issuer', event.target.value)} /></label><label>Année<input value={certification.year} onChange={(event) => updateListItem('certifications', index, 'year', event.target.value)} /></label></div></div>)}
            <button className="add-entry" onClick={() => addListItem('certifications', { name: '', issuer: '', year: '' })}>+ Ajouter une certification {isSectionLocked('certifications') && <PremiumCrown />}</button>
            </fieldset>
            {!sectionEnabled('certifications') && <p className="section-hidden-note">Cette rubrique est masquée dans le CV.</p>}
            <SectionHeading number="08" title="Centres d’intérêt" enabled={sectionEnabled('interests')} onToggle={() => toggleSection('interests')} onReset={() => resetSection('interests')} locked={isSectionLocked('interests')} />
            <fieldset className="premium-fieldset" disabled={isSectionLocked('interests')}>
            <div className="skill-fields">{interests.map((interest, index) => <input key={`interest-${index}`} value={interest} placeholder="Ex. photographie" onChange={(event) => updateStringListItem('interests', index, event.target.value)} />)}</div>
            <button className="add-entry" onClick={() => addListItem('interests', '')}>+ Ajouter un centre d’intérêt {isSectionLocked('interests') && <PremiumCrown />}</button>
            </fieldset>
            {!sectionEnabled('interests') && <p className="section-hidden-note">Cette rubrique est masquée dans le CV.</p>}
            <SectionHeading number="09" title="Références" enabled={sectionEnabled('references')} onToggle={() => toggleSection('references')} onReset={() => resetSection('references')} locked={isSectionLocked('references')} />
            <fieldset className="premium-fieldset" disabled={isSectionLocked('references')}>
            {references.map((reference, index) => <div className="repeatable-block" key={`reference-${index}`}><div className="repeatable-heading"><span>Référence {index + 1}</span></div><label>Nom<input value={reference.name} onChange={(event) => updateListItem('references', index, 'name', event.target.value)} /></label><label>Fonction<input value={reference.role} onChange={(event) => updateListItem('references', index, 'role', event.target.value)} /></label><label>Email ou téléphone<input value={reference.contact} onChange={(event) => updateListItem('references', index, 'contact', event.target.value)} /></label></div>)}
            <button className="add-entry" onClick={() => addListItem('references', { name: '', role: '', contact: '' })}>+ Ajouter une référence {isSectionLocked('references') && <PremiumCrown />}</button>
            </fieldset>
            {!sectionEnabled('references') && <p className="section-hidden-note">Cette rubrique est masquée dans le CV.</p>}
          </div>
        </aside>
        <section className="builder-preview-area">
          <div className="preview-floating-actions">
            <button
              type="button"
              className="preview-floating-export"
              disabled={!userId && template !== 'gratuit'}
              onClick={handleExport}
              title={!userId && template !== 'gratuit' ? 'Débloquez ce modèle pour télécharger' : 'Télécharger le CV en PDF'}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="floating-export-icon">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Télécharger PDF</span>
            </button>
          </div>
          <ResumeDocument
            resume={resume}
            photo={photo}
            template={template}
            sectionVisibility={resume.sectionVisibility}
            baseColor={baseColor}
            selectedFont={selectedFont}
            formatDateRange={formatDateRange}
            showBranding={!(modelStatus === 'paid' || accountPlan?.active && ['pro', 'gold'].includes(accountPlan.planId))}
          />
        </section>
        <aside className="builder-design-panel" aria-label="Personnalisation du CV">
          <div className="design-panel-heading">
            <span className="section-kicker">Personnalisation</span>
            <h2>Style<br /><em>du CV.</em></h2>
          </div>

          <section className="design-group">
            <div className="design-group-title"><span>01</span><h3>Structure</h3></div>
            <div className="template-tiers">
              <div className="template-tier template-tier-pro">
                <div className="template-tier-heading"><PremiumCrown /><span>Modèles Pro</span></div>
                <div className="design-template-list">
                  {resumeTemplates.filter((item) => item.id !== 'gratuit').map((item) => (
                    <div className="design-template-item" key={item.id}>
                      <button
                        className={`design-template-option ${template === item.id ? 'selected' : ''} ${!userId ? 'locked' : ''}`}
                        type="button"
                        aria-pressed={template === item.id}
                        onClick={() => selectTemplate(item.id)}
                      >
                        <span className={`template-swatch swatch-${item.color}`}><i /><i /><i /></span>
                        <span><b>{item.name}</b><small>{item.description}</small></span>
                        <PremiumCrown />
                        {userId && template === item.id && <em>✓</em>}
                      </button>
                      {!userId && (
                        <button className="template-unlock" type="button" onClick={() => unlockTemplate(item.id)}>
                          <PremiumCrown /> Débloquer
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="template-tier template-tier-free">
                <div className="template-tier-heading"><span>Accès libre</span></div>
                <div className="design-template-list">
                  {resumeTemplates.filter((item) => item.id === 'gratuit').map((item) => (
                    <div className="design-template-item" key={item.id}>
                      <button
                        className={`design-template-option ${template === item.id ? 'selected' : ''}`}
                        type="button"
                        aria-pressed={template === item.id}
                        onClick={() => selectTemplate(item.id)}
                      >
                        <span className={`template-swatch swatch-${item.color}`}><i /><i /><i /></span>
                        <span><b>{item.name}</b><small>{item.description}</small></span>
                        {userId && template === item.id && <em>✓</em>}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
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
      {paymentStatus && (
        <div className="builder-payment-status" role={paymentStatus === 'failure' || paymentStatus === 'error' ? 'alert' : 'status'}>
          {(paymentStatus === 'checking' || paymentStatus === 'pending') && (
            <span className="builder-spinner" aria-hidden="true" />
          )}
          <span>
            {paymentStatus === 'checking'
              ? 'Vérification automatique en cours…'
              : 'En attente de paiement : validez la demande sur votre téléphone.'}
          </span>
          {(paymentStatus === 'pending' || paymentStatus === 'checking') && (
            <button
              type="button"
              disabled={paymentStatus === 'checking'}
              onClick={onRetryPayment}
            >
              {paymentStatus === 'checking' ? 'Vérification…' : 'Vérifier'}
            </button>
          )}
        </div>
      )}
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
      {paymentOpen && (
        <div className="payment-backdrop" role="presentation">
          <form className="payment-dialog" role="dialog" aria-modal="true" aria-labelledby="payment-title" onSubmit={(event) => { event.preventDefault(); beginPaidDownload() }}>
            <span className="preview-kicker">Paiement Mobile Money par Tara</span>
            <h2 id="payment-title">Télécharger le modèle {resumeTemplates.find((item) => item.id === template)?.name}</h2>
            <p>Le paiement de <strong>100 FCFA</strong> est requis. Tara détectera automatiquement votre opérateur Mobile Money (MTN, Orange...).</p>
            <label className="payment-phone-label" htmlFor="template-payment-phone">Numéro mobile</label>
            <MobileMoneyPhoneInput
              id="template-payment-phone"
              country={paymentCountry}
              onCountryChange={setPaymentCountry}
              value={paymentPhone}
              onChange={setPaymentPhone}
            />
            {paymentError && <p className="account-error" role="alert">{paymentError}</p>}
            <div className="payment-actions">
              <button className="button-outline" type="button" disabled={paymentSubmitting} onClick={() => setPaymentOpen(false)}>Annuler</button>
              <button className="button-dark" type="submit" disabled={paymentSubmitting}>{paymentSubmitting ? 'Envoi…' : 'Payer · 100 FCFA'}</button>
            </div>
          </form>
        </div>
      )}
      {changePlanOpen && (
        <div className="payment-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setChangePlanOpen(false)
        }}>
          <section className="change-plan-dialog" role="dialog" aria-modal="true" aria-labelledby="builder-plan-title">
            <button className="change-plan-close" type="button" aria-label="Fermer" onClick={() => setChangePlanOpen(false)}>×</button>
            <span className="preview-kicker">Forfaits & Abonnements</span>
            <h2 id="builder-plan-title">Nos forfaits</h2>
            <p>Débloquez tous les modèles premium, téléchargez sans filigrane et gérez plusieurs CV.</p>
            {accountPlan?.schemaWarning && <p className="change-plan-warning" role="status">Les offres payantes seront disponibles dès que la configuration Supabase sera mise à jour.</p>}
            <div className="change-plan-options">
              {plans.map((option) => {
                const isCurrent = (option.id === 'free' && (!accountPlan?.active || accountPlan?.planId === 'free')) ||
                  (accountPlan?.active && accountPlan?.planId === option.id)
                return (
                  <article className={`change-plan-option ${option.featured ? 'featured' : ''} ${isCurrent ? 'is-current' : ''}`} key={option.id}>
                    <div>
                      <strong>{option.name}</strong>
                      <span>{option.price === '0' ? 'Gratuit' : `${option.price} FCFA`} · {option.suffix}</span>
                    </div>
                    <p>{option.description}</p>
                    <small>{option.features.slice(0, 4).join(' · ')}</small>
                    {isCurrent ? (
                      <button type="button" disabled className="current-plan-btn">Forfait actuel</button>
                    ) : option.id === 'free' ? (
                      <button type="button" disabled>Inclus</button>
                    ) : (
                      <button
                        type="button"
                        disabled={Boolean(accountPlan?.schemaWarning)}
                        onClick={() => {
                          setChangePlanOpen(false)
                          if (!userId) {
                            onRequestUnlock('gratuit', { resume, photo, template, baseColor, resumeFont })
                          } else {
                            onReactivatePlan(option.id)
                          }
                        }}
                      >
                        {option.action}
                      </button>
                    )}
                  </article>
                )
              })}
            </div>
          </section>
        </div>
      )}
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

const dummyResume = {
  firstName: 'Marie', lastName: 'Lambert', role: 'DIRECTRICE\nARTISTIQUE',
  email: 'marie@craft.fr', phone: '06 12 34 56 78', city: 'Paris', website: 'marielambert.fr',
  summary: 'Directrice artistique créant des identités visuelles singulières.',
  experiences: [
    { id: '1', title: 'Direction artistique', company: 'Studio Sillage', startDate: '2021', endDate: 'Aujourd\'hui', description: 'Identités visuelles et campagnes digitales.' },
    { id: '2', title: 'Brand designer', company: 'Maison Lune', startDate: '2018', endDate: '2021', description: '' }
  ],
  educations: [
    { id: '1', degree: 'Design graphique', school: 'École Estienne', startDate: '2015', endDate: '2018', description: '' }
  ],
  skills: [
    'Direction artistique', 'Branding', 'Figma'
  ],
  languages: [], projects: [], certifications: [], hobbies: [], interests: [],
  references: [
    { id: '1', name: 'Claire Martin', company: 'Studio Sillage', contact: 'Fondatrice' }
  ],
  sectionVisibility: { personal: true, experiences: true, educations: true, skills: true, languages: false, projects: false, certifications: false, hobbies: false, references: true }
}

const dummySelectedFont = { family: "'Inter', sans-serif", display: "'Fraunces', Georgia, serif" }
const dummyFormatDateRange = (start, end) => `${start} — ${end || "Aujourd'hui"}`

function TemplateMiniPreview({ template }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#fff', containerType: 'inline-size' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '794px', transform: 'scale(calc(100cqw / 794))', transformOrigin: 'top left', pointerEvents: 'none' }}>
        <ResumeDocument resume={dummyResume} template={template.id} selectedFont={dummySelectedFont} formatDateRange={dummyFormatDateRange} baseColor="#17191a" />
      </div>
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
      <div className="mobile-template-top-bar"><button type="button" className="mobile-template-close-btn" onClick={onHome} aria-label="Fermer">✕</button></div>
      <main className="mobile-template-main"><span className="eyebrow"><span className="eyebrow-dot" /> Première étape</span><h1>Choisissez<br /><em>votre modèle.</em></h1><p>Faites défiler les modèles et prévisualisez celui qui vous ressemble.</p><div className="mobile-template-carousel"><button className="carousel-arrow" onClick={previousTemplate} aria-label="Modèle précédent">←</button><TemplateMiniPreview template={selectedTemplate} /><button className="carousel-arrow" onClick={nextTemplate} aria-label="Modèle suivant">→</button></div><div className="mobile-template-meta"><strong>{selectedTemplate.name}</strong><small>{selectedTemplate.description}</small><span>{selectedIndex + 1} / {resumeTemplates.length}</span></div><div className="mobile-template-actions"><button className="button button-dark mobile-template-continue" onClick={() => onSelect(selectedTemplate.id)}>{isLocked ? 'Prévisualiser mon CV' : 'Choisir le modèle'} <span aria-hidden="true">↗</span></button>{isLocked && <button className="button-outline mobile-template-unlock" onClick={() => onUnlock(selectedTemplate.id)}><PremiumCrown /> Débloquer</button>}</div></main>
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
                    <span className="provider-google-mark" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="18" height="18">
                        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
                        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z" />
                        <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15Z" />
                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z" />
                      </svg>
                    </span>
                    Continuer avec Google
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
                {flowMode === 'signup' ? 'Créer mon compte' : flowMode === 'reset' ? 'Envoyer le lien' : flowMode === 'update' ? 'Enregistrer le nouveau mot de passe' : flowMode === 'otp' ? 'Valider le code' : 'Recevoir mon code'}
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

function ResumeDashboard({
  user,
  accountPlan,
  onPlanUpdate,
  onHome,
  onCreateResume,
  onImportResume,
  onOpenResume,
  onDownloadResume,
  onPurchasePlan,
  onLogout,
  showNotice,
  downloadInProgressId,
}) {
  const [resumes, setResumes] = useState([])
  const [plan, setPlan] = useState(() => accountPlan || { planId: 'free', active: true, validUntil: null })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [actionsOpen, setActionsOpen] = useState(null)
  const [changeOfferOpen, setChangeOfferOpen] = useState(false)
  const guestMigrationRef = useRef(null)

  useEffect(() => {
    if (accountPlan && (accountPlan.ready || accountPlan.validUntil || accountPlan.planId !== 'free')) {
      setPlan(accountPlan)
    }
  }, [accountPlan])

  useEffect(() => {
    let active = true
    const loadResume = async () => {
      setIsLoading(true)
      setError('')
      try {
        let [loadedResumes, loadedPlan] = await Promise.all([
          loadUserResumesFromCloud(user.id),
          getUserResumePlan(user.id),
        ])
        if (loadedResumes.length) {
          window.localStorage.removeItem(GUEST_RESUME_KEY)
        } else {
          const guestDraft = loadGuestResume()
          if (guestDraft) {
            if (!guestMigrationRef.current) {
              guestMigrationRef.current = saveUserResumeToCloud(user.id, guestDraft)
            }
            try {
              await guestMigrationRef.current
            } catch (migrationError) {
              guestMigrationRef.current = null
              throw migrationError
            }
            window.localStorage.removeItem(GUEST_RESUME_KEY)
            loadedResumes = await loadUserResumesFromCloud(user.id)
          }
        }
        if (!active) return
        setResumes(loadedResumes)
        setPlan(loadedPlan)
        if (onPlanUpdate) onPlanUpdate(loadedPlan)
      } catch (loadError) {
        console.error('Erreur lors du chargement des CV du tableau de bord:', loadError)
        if (!active) return
        setError(loadError.message || 'Impossible de charger vos CV.')
      } finally {
        if (active) setIsLoading(false)
      }
    }
    loadResume()

    return () => {
      active = false
    }
  }, [retry, user.id])

  const resumeQuota = plan.planId === 'gold' ? 3 : 1
  const freeQuotaReached = resumes.length >= resumeQuota
  const formatDate = (value) => value
    ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value))
    : '—'
  const getResumeTitle = (resume) => {
    const name = `${resume.resume?.firstName || ''} ${resume.resume?.lastName || ''}`.trim()
    return resume.name || (name ? `CV de ${name}` : 'Mon CV')
  }
  const handleDeleteResume = async (resume) => {
    const title = getResumeTitle(resume)
    if (!window.confirm(`Supprimer définitivement « ${title} » de votre compte et de la base de données ?`)) return
    try {
      await deleteUserResumeFromCloud(user.id, resume.id)
      setResumes((current) => current.filter((item) => item.id !== resume.id))
      setActionsOpen(null)
      setError('')
      if (showNotice) showNotice(`Le CV « ${title} » a été supprimé de la base de données.`)
    } catch (deleteError) {
      console.error('Erreur lors de la suppression du CV:', deleteError)
      setError(deleteError.message || 'Impossible de supprimer ce CV.')
    }
  }
  const handleDuplicateResume = async (resume) => {
    if (plan.planId !== 'gold' || !plan.active || resumes.length >= 3) return
    const title = getResumeTitle(resume)
    try {
      await saveUserResumeToCloud(user.id, {
        ...resume,
        id: undefined,
        name: `${title} (copie)`,
      })
      setActionsOpen(null)
      setRetry((current) => current + 1)
    } catch (duplicateError) {
      console.error('Erreur lors de la duplication du CV:', duplicateError)
      setError(duplicateError.message || 'Impossible de dupliquer ce CV.')
    }
  }

  const handleToggleActions = (event, resume) => {
    event.stopPropagation()
    if (actionsOpen?.resume?.id === resume.id) {
      setActionsOpen(null)
      return
    }
    const rect = event.currentTarget.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const openUpwards = spaceBelow < 165
    setActionsOpen({
      resume,
      openUpwards,
      top: openUpwards ? undefined : Math.round(rect.bottom + 6),
      bottom: openUpwards ? Math.round(window.innerHeight - rect.top + 6) : undefined,
      right: Math.max(12, Math.round(window.innerWidth - rect.right)),
    })
  }

  useEffect(() => {
    if (!actionsOpen) return undefined
    const handleClose = () => setActionsOpen(null)
    window.addEventListener('scroll', handleClose, true)
    window.addEventListener('resize', handleClose)
    return () => {
      window.removeEventListener('scroll', handleClose, true)
      window.removeEventListener('resize', handleClose)
    }
  }, [actionsOpen])

  const activeMenuResumeIndex = actionsOpen
    ? resumes.findIndex((item) => item.id === actionsOpen.resume.id)
    : -1
  const canDuplicateActiveResume = Boolean(
    actionsOpen &&
    activeMenuResumeIndex !== -1 &&
    activeMenuResumeIndex < resumeQuota &&
    plan.active &&
    plan.planId === 'gold' &&
    resumes.length < 3
  )
  const duplicateDisabledReason = !plan.active
    ? 'Offre expirée — réactivez votre offre Gold pour dupliquer'
    : plan.planId !== 'gold'
      ? 'La duplication est réservée aux abonnés Gold'
      : resumes.length >= 3
        ? 'Limite de 3 CV atteinte pour l’offre Gold'
        : activeMenuResumeIndex >= resumeQuota
          ? 'Ce CV dépasse le quota actif de votre offre.'
          : undefined

  const isPlanExpired = Boolean(!plan.active && (plan.previousPlanId || plan.validUntil))
  const expiredPlanName = plan.previousPlanId === 'gold' ? 'Gold' : 'Pro'
  const currentPlanLabel = isPlanExpired
    ? `Free (${expiredPlanName} expiré)`
    : plan.planId === 'gold' ? 'Gold' : plan.planId === 'pro' ? 'Pro' : 'Free'

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <button className="brand dashboard-brand" type="button" onClick={onHome} aria-label="Tableau de bord CVcraft"><span className="brand-mark">c</span><span>CVcraft</span></button>
        <div className="dashboard-user">
          <span className="dashboard-user-email">
            {user?.email || ''}
            {plan.active && ['pro', 'gold'].includes(plan.planId) && (
              <span className="user-pro-crown" title={`Abonnement ${plan.planId === 'gold' ? 'Gold' : 'Pro'} actif`}>
                <PremiumCrown />
              </span>
            )}
          </span>
          <button className="dashboard-home-link" type="button" onClick={onHome}>Accueil</button>
          <button type="button" onClick={onLogout}>Déconnexion</button>
        </div>
      </header>
      <div className="dashboard-content">
        <section className="dashboard-documents" aria-labelledby="dashboard-documents-title" aria-busy={isLoading}>
          <div className="dashboard-documents-heading">
            <div>
              <h1 id="dashboard-documents-title">Documents</h1>
              <p>Tous les documents <span>·</span> Offre {currentPlanLabel} : {resumes.length} / {resumeQuota} CV utilisé{resumes.length === 1 ? '' : 's'}</p>
            </div>
            <div className="dashboard-heading-actions">
              {plan.planId === 'free' && <button className="dashboard-change-plan-button" type="button" onClick={() => setChangeOfferOpen(true)}>{isPlanExpired ? 'Renouveler mon offre' : 'Changer mon offre'}</button>}
              <button
                className="dashboard-import-button"
                type="button"
                disabled={isLoading || freeQuotaReached}
                onClick={onImportResume}
                title="Importer et améliorer un CV existant (PDF, Word, texte)"
              >
                <span aria-hidden="true">📄</span> Importer un CV
              </button>
              <button className="dashboard-create-button" type="button" disabled={isLoading || freeQuotaReached} title={freeQuotaReached ? (isPlanExpired ? 'Votre offre a expiré et la limite de CV est atteinte. Réactivez votre offre pour créer d’autres CV.' : 'La limite de CV de votre offre est atteinte.') : undefined} onClick={onCreateResume}>
                <span aria-hidden="true">＋</span> Créer
              </button>
            </div>
          </div>
          {isPlanExpired && <div className="dashboard-expired-plan" role="alert">
            <div className="dashboard-expired-plan-info">
              <span className="dashboard-expired-badge">Offre expirée</span>
              <p>Votre offre {expiredPlanName} a expiré{plan.validUntil ? ` le ${formatDate(plan.validUntil)}` : ''}. Vos CV sont conservés et modifiables. Réactivez votre offre pour profiter de tous les avantages premium (modèles exclusifs, téléchargements sans filigrane).</p>
            </div>
            <button type="button" onClick={() => onPurchasePlan(plan.previousPlanId || 'pro')}>Réactiver l’offre {expiredPlanName}</button>
          </div>}
          {plan.schemaWarning && <div className="dashboard-schema-warning" role="alert">{plan.schemaWarning}</div>}
          {isLoading ? <div className="dashboard-state" aria-hidden="true"><span className="loading-indicator" /></div> : error ? (
            <div className="dashboard-state" role="alert">
              <p>{error}</p>
              <button className="button button-outline" type="button" onClick={() => setRetry((current) => current + 1)}>Réessayer</button>
            </div>
          ) : resumes.length ? (
            <div className="dashboard-table-scroll">
              <table className="dashboard-document-table">
                <caption className="visually-hidden">Documents enregistrés sur votre compte</caption>
                <thead>
                  <tr>
                    <th scope="col">Nom</th>
                    <th scope="col">Emploi</th>
                    <th scope="col">Type</th>
                    <th scope="col">Créé le</th>
                    <th scope="col">Dernière modification <span aria-hidden="true">↓</span></th>
                    <th scope="col"><span className="visually-hidden">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {resumes.map((resume, resumeIndex) => {
                    const resumeTitle = getResumeTitle(resume)
                    const selectedTemplate = resumeTemplates.find((item) => item.id === resume.template)
                    const resumeWithinQuota = resumeIndex < resumeQuota
                    const canDuplicate = resumeWithinQuota && plan.active && plan.planId === 'gold' && resumes.length < 3
                    const isDownloadingThis = downloadInProgressId === resume.id
                    return <tr key={resume.id}>
                    <td>
                      <button className="dashboard-document-name" type="button" onClick={() => onOpenResume(resume)}>
                        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 2.5h7l3 3v12H5z" /><path d="M12 2.5v4h3M7.5 10h5M7.5 13h5" /></svg>
                        <span>{resumeTitle}</span>
                      </button>
                    </td>
                    <td>
                      <button className={`dashboard-job-link ${resume.resume?.role ? 'has-job' : ''}`} type="button" onClick={() => onOpenResume(resume)}>
                        {!resume.resume?.role && <span aria-hidden="true">＋</span>}
                        {resume.resume?.role || 'Ajouter'}
                      </button>
                    </td>
                    <td>
                      <span className="dashboard-document-type">CV</span>
                      <small className="dashboard-document-model">{selectedTemplate?.name || 'Gratuit'}</small>
                      {!resumeWithinQuota && plan.active && <small className="dashboard-document-payment">Hors quota actif</small>}
                      {resume.modelStatus === 'pending_payment' && <small className="dashboard-document-payment">Paiement requis</small>}
                      {resume.modelStatus === 'paid' && <small className="dashboard-document-paid">Payé</small>}
                    </td>
                    <td>{formatDate(resume.createdAt)}</td>
                    <td>{formatRelativeDate(resume.updatedAt) || '—'}</td>
                    <td>
                      <div className="dashboard-document-actions">
                        <button
                          className={`dashboard-icon-button ${isDownloadingThis ? 'is-downloading' : ''}`}
                          type="button"
                          aria-label={`Télécharger ${resumeTitle}`}
                          title={isDownloadingThis ? 'Téléchargement en cours...' : !resumeWithinQuota ? 'Ce CV dépasse le quota actif de votre offre.' : 'Télécharger le CV'}
                          disabled={!resumeWithinQuota || isDownloadingThis}
                          onClick={() => onDownloadResume(resume)}
                        >
                          {isDownloadingThis ? (
                            <span className="download-spinner" aria-hidden="true" />
                          ) : (
                            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.5v9m0 0 3.5-3.5M10 11.5 6.5 8M3 13v3.5h14V13" /></svg>
                          )}
                        </button>
                        <div className="dashboard-more-wrap">
                          <button
                            className="dashboard-icon-button"
                            type="button"
                            aria-label={`Plus d’actions pour ${resumeTitle}`}
                            aria-expanded={actionsOpen?.resume?.id === resume.id}
                            onClick={(event) => handleToggleActions(event, resume)}
                          >
                            <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="4" cy="10" r="1" /><circle cx="10" cy="10" r="1" /><circle cx="16" cy="10" r="1" /></svg>
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="dashboard-welcome-banner">
              <div className="dashboard-welcome-info">
                <h2>Bienvenue sur votre espace CVCraft !</h2>
                <p>Prêt à créer votre CV ? Améliorez un document existant (PDF, Word, texte) avec nos modèles professionnels ou débutez sur une page blanche.</p>
              </div>
              <div className="dashboard-welcome-actions">
                <button
                  className="button button-dark"
                  type="button"
                  disabled={isLoading || freeQuotaReached}
                  onClick={onImportResume}
                >
                  📄 Améliorer un CV existant
                </button>
                <button
                  className="button button-outline"
                  type="button"
                  disabled={isLoading || freeQuotaReached}
                  onClick={onCreateResume}
                >
                  ＋ Partir de zéro
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
      {actionsOpen && (
        <>
          <div
            className="dashboard-actions-backdrop"
            aria-hidden="true"
            onClick={() => setActionsOpen(null)}
          />
          <div
            className="dashboard-actions-menu"
            role="menu"
            style={{
              top: actionsOpen.top !== undefined ? `${actionsOpen.top}px` : 'auto',
              bottom: actionsOpen.bottom !== undefined ? `${actionsOpen.bottom}px` : 'auto',
              right: `${actionsOpen.right}px`,
            }}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                const target = actionsOpen.resume
                setActionsOpen(null)
                onOpenResume(target)
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              <span>Modifier</span>
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={downloadInProgressId === actionsOpen.resume.id}
              onClick={() => {
                const target = actionsOpen.resume
                setActionsOpen(null)
                onDownloadResume(target)
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Télécharger en PDF</span>
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={!canDuplicateActiveResume}
              title={duplicateDisabledReason}
              onClick={() => {
                const target = actionsOpen.resume
                setActionsOpen(null)
                handleDuplicateResume(target)
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span style={{ flex: 1 }}>Dupliquer</span>
              {(!plan.active || plan.planId !== 'gold') && <PremiumCrown />}
            </button>
            <button
              className="dashboard-delete-action"
              type="button"
              role="menuitem"
              onClick={() => {
                const target = actionsOpen.resume
                setActionsOpen(null)
                handleDeleteResume(target)
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
              <span>Supprimer</span>
            </button>
          </div>
        </>
      )}
      {changeOfferOpen && <div className="payment-backdrop" role="presentation" onMouseDown={(event) => {
        if (event.target === event.currentTarget) setChangeOfferOpen(false)
      }}>
        <section className="change-plan-dialog" role="dialog" aria-modal="true" aria-labelledby="change-plan-title">
          <button className="change-plan-close" type="button" aria-label="Fermer" onClick={() => setChangeOfferOpen(false)}>×</button>
          <span className="preview-kicker">Votre espace CVcraft</span>
          <h2 id="change-plan-title">Changer mon offre</h2>
          <p>Choisissez l’offre qui correspond à vos besoins. Le paiement se fait par Mobile Money.</p>
          {plan.schemaWarning && <p className="change-plan-warning" role="status">Les offres payantes seront disponibles dès que la configuration Supabase sera mise à jour.</p>}
          <div className="change-plan-options">
            {plans.filter((option) => option.id !== 'free').map((option) => (
              <article className={`change-plan-option ${option.featured ? 'featured' : ''}`} key={option.id}>
                <div><strong>{option.name}</strong><span>{option.price} FCFA · {option.suffix}</span></div>
                <p>{option.description}</p>
                <small>{option.features.slice(0, 3).join(' · ')}</small>
                <button type="button" disabled={Boolean(plan.schemaWarning)} onClick={() => {
                  setChangeOfferOpen(false)
                  onPurchasePlan(option.id)
                }}>{option.action}</button>
              </article>
            ))}
          </div>
        </section>
      </div>}
    </main>
  )
}

function PlanMobilePayDialog({
  planId,
  country,
  onCountryChange,
  phone,
  onPhoneChange,
  error,
  submitting,
  onCancel,
  onSubmit,
}) {
  const planName = planId === 'gold' ? 'Gold' : 'Pro'
  const amount = 100
  return (
    <div className="payment-backdrop" role="presentation">
      <form className="payment-dialog" role="dialog" aria-modal="true" aria-labelledby="plan-payment-title" onSubmit={onSubmit}>
        <span className="preview-kicker">Paiement Mobile Money par Tara</span>
        <h2 id="plan-payment-title">Activer l’offre {planName}</h2>
        <p>Le paiement de <strong>{amount.toLocaleString('fr-FR')} FCFA</strong> sera demandé sur votre téléphone. Tara détectera automatiquement votre opérateur Mobile Money (MTN, Orange...).</p>
        <label className="payment-phone-label" htmlFor="plan-payment-phone">Numéro mobile</label>
        <MobileMoneyPhoneInput
          id="plan-payment-phone"
          country={country}
          onCountryChange={onCountryChange}
          value={phone}
          onChange={onPhoneChange}
        />
        {error && <p className="account-error" role="alert">{error}</p>}
        <div className="payment-actions">
          <button className="button-outline" type="button" disabled={submitting} onClick={onCancel}>Annuler</button>
          <button className="button-dark" type="submit" disabled={submitting}>{submitting ? 'Envoi…' : `Payer · ${amount.toLocaleString('fr-FR')} FCFA`}</button>
        </div>
      </form>
    </div>
  )
}

function hasPersistedSupabaseSession() {
  if (typeof window === 'undefined') return false
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const item = window.localStorage.getItem(key)
        if (item && item.includes('access_token')) return true
      }
    }
  } catch {
    return false
  }
  return false
}

function App() {
  const [notice, setNotice] = useState('')
  const [view, setView] = useState(() => {
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
    if (params?.get('view') === 'builder') return 'builder'
    return hasPersistedSupabaseSession() ? 'dashboard' : 'landing'
  })
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [accountPlan, setAccountPlan] = useState({ planId: 'free', active: true, validUntil: null, ready: false })
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('signup')
  const [selectedTemplate, setSelectedTemplate] = useState('gratuit')
  const [selectedResumeId, setSelectedResumeId] = useState(null)
  const [createNewResume, setCreateNewResume] = useState(false)
  const [templateSelectionMade, setTemplateSelectionMade] = useState(false)
  const [downloadAfterPayment, setDownloadAfterPayment] = useState(false)
  const [dashboardDownloadRequested, setDashboardDownloadRequested] = useState(false)
  const [downloadingResumeId, setDownloadingResumeId] = useState(null)
  const [paymentVerifyAttempt, setPaymentVerifyAttempt] = useState(0)
  const [mobilePayPlan, setMobilePayPlan] = useState(null)
  const [mobilePayCountry, setMobilePayCountry] = useState(() => detectUserCountryCode())
  const [mobilePayPhone, setMobilePayPhone] = useState('')
  const [mobilePayError, setMobilePayError] = useState('')
  const [mobilePaySubmitting, setMobilePaySubmitting] = useState(false)
  const [paymentReturnStatus, setPaymentReturnStatus] = useState(() => {
    const paymentId = new URLSearchParams(window.location.search).get('tara_payment')
    return paymentId ? { state: 'checking' } : null
  })
  const [paymentReturnId, setPaymentReturnId] = useState(() => new URLSearchParams(window.location.search).get('tara_payment'))
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [startChoiceModalOpen, setStartChoiceModalOpen] = useState(false)
  const [pendingTemplateChoice, setPendingTemplateChoice] = useState(null)
  const pendingTemplateRef = useRef(null)
  const pendingDraftRef = useRef(null)
  const pendingDownloadRef = useRef(false)
  const pendingAuthDestinationRef = useRef(null)
  const pendingPlanRef = useRef(null)

  const handleRequestCreateResume = (templateChoice = null) => {
    setPendingTemplateChoice(templateChoice)
    setStartChoiceModalOpen(true)
  }

  const handleApplyImportedResume = ({ resumeData, template, photo }) => {
    const templateToApply = resumeTemplates.some((item) => item.id === template) ? template : 'sillage'
    setSelectedTemplate(templateToApply)
    setSelectedResumeId(null)
    setCreateNewResume(true)
    setTemplateSelectionMade(true)
    setDownloadAfterPayment(false)
    saveGuestResume({
      resume: resumeData,
      photo: photo || '',
      template: templateToApply,
      modelStatus: templateToApply === 'gratuit' ? 'free' : 'pending_payment',
      baseColor: '#e49a68',
      resumeFont: 'classic',
    })
    setView('builder')
    showNotice(`Votre CV a été importé avec succès dans le modèle ${templateToApply} !`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const prepareOAuth = (mode) => {
    if (pendingDraftRef.current) saveGuestResume(pendingDraftRef.current)
    window.sessionStorage.setItem(OAUTH_INTENT_KEY, JSON.stringify({
      templateId: pendingTemplateRef.current,
      downloadAfterAuth: pendingDownloadRef.current,
      destination: pendingAuthDestinationRef.current,
      planId: pendingPlanRef.current,
      resumeId: selectedResumeId,
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
          setNotice(`Connexion impossible : ${errorDescription}. Vérifiez la configuration du fournisseur dans Supabase Auth.`)
        }
        return
      }

      window.sessionStorage.removeItem(OAUTH_INTENT_KEY)
      const templateId = resumeTemplates.some((item) => item.id === intent.templateId)
        ? intent.templateId
        : null
      setSelectedTemplate(templateId || 'gratuit')
      setTemplateSelectionMade(Boolean(templateId))
      setSelectedResumeId(intent.resumeId || null)
      setCreateNewResume(false)
      setDownloadAfterPayment(Boolean(intent.downloadAfterAuth))
      setUser(session.user)
      setAuthOpen(false)

      if (['pro', 'gold'].includes(intent.planId)) {
        setMobilePayPhone('')
        setMobilePayError('')
        setMobilePayPlan(intent.planId)
        setView('dashboard')
          return
      }
      setView(intent.destination === 'dashboard' && !templateId ? 'dashboard' : 'builder')
      pendingAuthDestinationRef.current = null
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      window.sessionStorage.removeItem(OAUTH_INTENT_KEY)
      console.error('Impossible de reprendre le parcours après la connexion:', error)
      showNotice('Connexion réussie, mais le parcours précédent n’a pas pu être restauré.')
    }
  }

  useEffect(() => {
    let active = true
    getSession().then((session) => {
      if (active) {
        const currentUser = session?.user || null
        setUser(currentUser)
        setAuthReady(true)
        resumeOAuth(session)
        if (currentUser && !window.sessionStorage.getItem(OAUTH_INTENT_KEY)) {
          setView((current) => current === 'landing' ? 'dashboard' : current)
        } else if (!currentUser) {
          setView((current) => current === 'dashboard' ? 'landing' : current)
        }
      }
    }).catch((error) => {
      console.error('Erreur lors de la vérification de la session:', error)
      if (active) {
        setAuthReady(true)
        setView((current) => current === 'dashboard' ? 'landing' : current)
      }
    })

    const { data: { subscription } } = onAuthStateChange((event, session) => {
      const currentUser = session?.user || null
      if (event !== 'SIGNED_IN') setUser(currentUser)
      setAuthReady(true)
      resumeOAuth(session)
      if (event === 'SIGNED_IN' && currentUser && !window.sessionStorage.getItem(OAUTH_INTENT_KEY)) {
        setView((current) => current === 'landing' ? 'dashboard' : current)
      }
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setView('landing')
      }
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
    if (!user?.id) {
      setAccountPlan({ planId: 'free', active: true, validUntil: null, ready: true })
      return undefined
    }
    let active = true
    setAccountPlan((current) => ({ ...current, ready: false }))
    getUserResumePlan(user.id).then((loadedPlan) => {
      if (active) setAccountPlan({ ...loadedPlan, ready: true })
    }).catch((error) => {
      console.error('Erreur lors du chargement de l’offre du compte:', error)
      if (active) setAccountPlan({ planId: 'free', previousPlanId: null, active: false, validUntil: null, ready: true })
    })
    return () => {
      active = false
    }
  }, [user?.id])

  useEffect(() => {
    if (!accountPlan.ready || !accountPlan.active || !accountPlan.validUntil || !accountPlan.planId) return undefined
    const delay = new Date(accountPlan.validUntil).getTime() - Date.now()
    if (delay <= 0) {
      setAccountPlan((current) => ({
        ...current,
        planId: 'free',
        previousPlanId: current.planId,
        active: false,
      }))
      return undefined
    }
    const checkExpiry = () => {
      if (Date.now() < new Date(accountPlan.validUntil).getTime()) return
      setAccountPlan((current) => ({
        ...current,
        planId: 'free',
        previousPlanId: current.planId,
        active: false,
      }))
    }
    const interval = window.setInterval(checkExpiry, Math.min(delay + 20, 60_000))
    return () => window.clearInterval(interval)
  }, [accountPlan])

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
    let isVerifying = false

    const checkPayment = async () => {
      if (!active || isVerifying) return
      isVerifying = true
      try {
        const result = await verifyTaraPayment(paymentReturnId)
        if (!active) return

        if (result.status === 'SUCCESS') {
          if (result.productType === 'plan') {
            if (!['pro', 'gold'].includes(result.planId)) {
              throw new Error('L’offre associée au paiement est invalide.')
            }
            const activePlan = {
              planId: result.planId,
              previousPlanId: null,
              active: true,
              validUntil: result.validUntil,
              ready: true,
            }
            setAccountPlan(activePlan)
            try {
              const loadedPlan = await getUserResumePlan(user.id)
              if (active && loadedPlan?.active) setAccountPlan(loadedPlan)
            } catch (err) {
              console.warn('Sync plan error:', err)
            }
            const nextUrl = new URL(window.location.href)
            nextUrl.searchParams.delete('tara_payment')
            window.history.replaceState({}, '', nextUrl)
            setPaymentReturnId(null)
            setPaymentReturnStatus(null)
            setView('dashboard')
            const planName = result.planId === 'gold' ? 'Gold' : 'Pro'
            showNotice(`Félicitations ! Votre offre ${planName} est désormais active avec toutes ses fonctionnalités.`)
            return
          }
          if (!resumeTemplates.some((item) => item.id === result.templateId && item.id !== 'gratuit')) {
            throw new Error('Le modèle associé au paiement est invalide.')
          }
          const paidResumeId = result.resumeId || selectedResumeId
          await updateResumeModelStatus(user.id, result.templateId, 'paid', paidResumeId)
          if (!active) return
          const nextUrl = new URL(window.location.href)
          nextUrl.searchParams.delete('tara_payment')
          window.history.replaceState({}, '', nextUrl)
          setPaymentReturnId(null)
          setSelectedTemplate(result.templateId)
          setSelectedResumeId(paidResumeId)
          setCreateNewResume(false)
          setTemplateSelectionMade(true)
          setDownloadAfterPayment(true)
          setPaymentReturnStatus(null)
          setView('builder')
          showNotice('Paiement confirmé ! Votre modèle est prêt.')
          return
        }

        // Pendant l'attente de validation Tara
        if (active) {
          setPaymentReturnStatus({ state: 'pending', lastChecked: Date.now() })
        }
      } catch (error) {
        // En cas de délai réseau ou vérification en cours, on reste en attente de paiement
        console.warn('Vérification en arrière-plan du paiement Tara:', error.message)
        if (active) {
          setPaymentReturnStatus({ state: 'pending', lastChecked: Date.now() })
        }
      } finally {
        isVerifying = false
      }
    }

    // État initial : en attente de paiement avec vérification immédiate
    setPaymentReturnStatus({ state: 'pending', lastChecked: Date.now() })
    checkPayment()

    // Vérification automatique continue toutes les 3,5 secondes
    const interval = window.setInterval(checkPayment, 3500)

    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [authReady, paymentVerifyAttempt, paymentReturnId, selectedResumeId, user?.id])

  const showNotice = (message) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2800)
  }

  const goHome = () => {
    if (user) {
      setView('dashboard')
    } else {
      setView('landing')
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const goDashboard = () => {
    if (!user) {
      setAuthMode('signin')
      setAuthOpen(true)
      return
    }
    setView('dashboard')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const logout = async () => {
    await signOut()
    clearLocalResumeData()
    setUser(null)
    setSelectedTemplate('gratuit')
    setSelectedResumeId(null)
    setAccountPlan({ planId: 'free', active: true, validUntil: null })
    setTemplateSelectionMade(false)
    setView('landing')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const startBuilder = async (templateChoice) => {
    const chosenTemplate = typeof templateChoice === 'string' && resumeTemplates.some((item) => item.id === templateChoice)
      ? templateChoice
      : null
    if (user) {
      try {
        const [currentPlan, currentResumes] = await Promise.all([
          getUserResumePlan(user.id),
          loadUserResumesFromCloud(user.id),
        ])
        const limit = currentPlan.planId === 'gold' ? 3 : 1
        setAccountPlan({ ...currentPlan, ready: true })
        if (currentResumes.length >= limit) {
          showNotice(!currentPlan.active ? 'Votre offre a expiré et votre quota de CV Free est atteint. Réactivez votre offre pour créer d’autres CV.' : 'La limite de CV de votre offre est atteinte.')
          return
        }
      } catch (error) {
        console.error('Impossible de vérifier le quota de CV:', error)
        showNotice(error.message || 'Impossible de vérifier votre offre.')
        return
      }
    }
    setSelectedResumeId(null)
    setCreateNewResume(true)
    setTemplateSelectionMade(Boolean(chosenTemplate))
    setSelectedTemplate(chosenTemplate || 'gratuit')
    setView('builder')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const requestUnlock = (templateId, draft, { downloadAfterAuth = false } = {}) => {
    pendingTemplateRef.current = templateId
    pendingDraftRef.current = draft
    pendingDownloadRef.current = downloadAfterAuth
    pendingAuthDestinationRef.current = null
    pendingPlanRef.current = null
    setAuthMode('signup')
    setAuthOpen(true)
  }
  const requestPlanCheckout = (planId) => {
    if (!['pro', 'gold'].includes(planId)) return
    if (accountPlan.schemaWarning) {
      showNotice('Les paiements d’offres sont indisponibles tant que les migrations Supabase ne sont pas appliquées.')
      return
    }
    if (!user) {
      pendingPlanRef.current = planId
      pendingAuthDestinationRef.current = null
      setAuthMode('signup')
      setAuthOpen(true)
      return
    }
    setMobilePayError('')
    setMobilePayPhone('')
    setMobilePayPlan(planId)
  }
  const beginPlanMobilePay = async (event) => {
    event.preventDefault()
    if (!mobilePayPlan || mobilePaySubmitting) return
    setMobilePaySubmitting(true)
    setMobilePayError('')
    try {
      const phoneNumber = normalizeAfricanPhoneNumber(mobilePayCountry, mobilePayPhone)
      const checkout = await createTaraPlanCheckout(mobilePayPlan, phoneNumber)
      setMobilePayPlan(null)
      trackMobilePay(checkout.paymentId)
      setView('dashboard')
      showNotice('Demande envoyée. Validez le paiement sur votre téléphone.')
    } catch (error) {
      console.error(`Impossible de démarrer le paiement de l’offre ${mobilePayPlan}:`, error)
      setMobilePayError(error.message || 'Le paiement de l’offre n’a pas pu être démarré.')
    } finally {
      setMobilePaySubmitting(false)
    }
  }
  const trackMobilePay = (paymentId) => {
    const nextUrl = new URL(window.location.href)
    nextUrl.searchParams.set('tara_payment', paymentId)
    window.history.replaceState({}, '', nextUrl)
    setPaymentReturnStatus({ state: 'checking' })
    setPaymentReturnId(paymentId)
  }
  const dismissPaymentReturn = () => {
    const nextUrl = new URL(window.location.href)
    nextUrl.searchParams.delete('tara_payment')
    window.history.replaceState({}, '', nextUrl)
    setPaymentReturnId(null)
    setPaymentReturnStatus(null)
  }
  const handleMobilePayStarted = (paymentId) => {
    trackMobilePay(paymentId)
  }
  const planMobilePayDialog = mobilePayPlan && (
    <PlanMobilePayDialog
      planId={mobilePayPlan}
      country={mobilePayCountry}
      onCountryChange={setMobilePayCountry}
      phone={mobilePayPhone}
      onPhoneChange={setMobilePayPhone}
      error={mobilePayError}
      submitting={mobilePaySubmitting}
      onCancel={() => setMobilePayPlan(null)}
      onSubmit={beginPlanMobilePay}
    />
  )
  const closeAuth = () => {
    setAuthOpen(false)
    pendingTemplateRef.current = null
    pendingDraftRef.current = null
    pendingDownloadRef.current = false
    pendingAuthDestinationRef.current = null
    pendingPlanRef.current = null
  }
  const handleAuthenticated = async (authenticatedUser, draft) => {
    const requestedTemplate = pendingTemplateRef.current
    const requestedPlan = pendingPlanRef.current
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
      const saved = await saveUserResumeToCloud(authenticatedUser.id, {
        ...resumeDraft,
        template: templateToSave,
      }, resumeDraft.resumeId || null)
      setSelectedResumeId(saved.resumeId || null)
      setCreateNewResume(false)
      window.localStorage.removeItem(GUEST_RESUME_KEY)
    }
    setUser(authenticatedUser)
    setAuthOpen(false)
    if (requestedPlan) {
      pendingPlanRef.current = null
      pendingTemplateRef.current = null
      pendingDraftRef.current = null
      pendingDownloadRef.current = false
      setMobilePayPhone('')
      setMobilePayError('')
      setMobilePayPlan(requestedPlan)
      setView('dashboard')
      return
    }
    setSelectedTemplate(templateToSave || 'gratuit')
    setTemplateSelectionMade(Boolean(templateToSave))
    setDownloadAfterPayment(pendingDownloadRef.current)
    pendingTemplateRef.current = null
    pendingDraftRef.current = null
    pendingDownloadRef.current = false
    setView((requestedTemplate || resumeDraft) ? 'builder' : 'dashboard')
    pendingAuthDestinationRef.current = null
    if (paymentReturnId) setPaymentVerifyAttempt((current) => current + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openDashboardResume = (savedResume) => {
    const resumeTemplate = resumeTemplates.some((item) => item.id === savedResume.template)
      ? savedResume.template
      : 'gratuit'
    setSelectedTemplate(resumeTemplate)
    setSelectedResumeId(savedResume.id)
    setCreateNewResume(false)
    setTemplateSelectionMade(true)
    setDownloadAfterPayment(false)
    setView('builder')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const downloadDashboardResume = async (savedResume) => {
    const resumeTemplate = resumeTemplates.some((item) => item.id === savedResume.template)
      ? savedResume.template
      : 'gratuit'

    if (resumeTemplate !== 'gratuit' && savedResume.modelStatus !== 'paid' && !(accountPlan.active && ['pro', 'gold'].includes(accountPlan.planId))) {
      setSelectedTemplate(resumeTemplate)
      setSelectedResumeId(savedResume.id)
      setCreateNewResume(false)
      setTemplateSelectionMade(true)
      setView('builder')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    if (savedResume.pdfUrl) {
      const fileName = `${(savedResume.resume?.lastName || '').trim()} ${(savedResume.resume?.firstName || '').trim()} CvCraft.pdf`.trim() || 'CV.pdf'
      try {
        setDownloadingResumeId(savedResume.id)
        showNotice('Téléchargement du CV en cours...')
        const response = await fetch(savedResume.pdfUrl)
        if (response.ok) {
          const blob = await response.blob()
          const blobUrl = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = blobUrl
          a.download = fileName
          document.body.appendChild(a)
          a.click()
          a.remove()
          window.URL.revokeObjectURL(blobUrl)
          showNotice('CV téléchargé avec succès !')
          setDownloadingResumeId(null)
          return
        }
      } catch (err) {
        console.warn('Téléchargement direct du PDF échoué, génération dynamique...', err)
      }
    }

    setSelectedTemplate(resumeTemplate)
    setSelectedResumeId(savedResume.id)
    setCreateNewResume(false)
    setTemplateSelectionMade(true)
    setDownloadingResumeId(savedResume.id)
    setDashboardDownloadRequested(true)
    showNotice('Génération du CV en cours...')
  }

  const handleDashboardDownloadComplete = () => {
    setDashboardDownloadRequested(false)
    setDownloadingResumeId(null)
  }

  if (paymentReturnStatus && view !== 'builder') {
    if (paymentReturnStatus.state === 'auth') {
      return (
        <div className="account-page">
          <div className="account-dialog">
            <span className="preview-kicker">Tara Money</span>
            <h2>Connexion requise</h2>
            <p>Connectez-vous pour finaliser la validation automatique de votre paiement.</p>
            <div className="payment-verify-actions">
              <button
                className="button button-dark button-verify-payment"
                type="button"
                onClick={() => {
                  setAuthMode('signin')
                  setAuthOpen(true)
                }}
              >
                <span>Se connecter</span>
              </button>
              <button className="button-dismiss-payment" type="button" onClick={dismissPaymentReturn}>
                Retour
              </button>
            </div>
          </div>
          {authOpen && (
            <AccountModal
              mode={authMode}
              onModeChange={setAuthMode}
              onClose={closeAuth}
              onAuthenticated={handleAuthenticated}
              onOAuthStart={prepareOAuth}
            />
          )}
          {planMobilePayDialog}
        </div>
      )
    }

    return (
      <div className="account-page">
        <div className="account-dialog" aria-busy="true">
          <div className="payment-waiting-box">
            <span className="payment-status-badge is-checking">
              <span className="badge-dot" />
              Vérification automatique en cours
            </span>

            <div className="payment-loading-animation" aria-hidden="true">
              <span className="payment-loading-pulse" />
              <span className="payment-loading-spinner" />
              <span className="payment-loading-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
              </span>
            </div>

            <h2>En attente de paiement</h2>
            <p>
              Une demande de paiement Tara Money a été envoyée sur votre téléphone.<br />
              Veuillez <strong>confirmer la transaction</strong> avec votre code secret PIN (MTN ou Orange Money).<br />
              <small style={{ display: 'inline-block', marginTop: '8px', color: 'var(--muted)' }}>
                La détection s'effectue automatiquement en arrière-plan sans recharger la page.
              </small>
            </p>

            <div className="payment-verify-actions">
              <button
                className="button button-dark button-verify-payment is-loading"
                type="button"
                onClick={() => setPaymentVerifyAttempt((current) => current + 1)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                </svg>
                <span>Vérifier maintenant</span>
              </button>
              <button className="button-dismiss-payment" type="button" onClick={dismissPaymentReturn}>
                Annuler / Vérifier plus tard
              </button>
            </div>
          </div>
        </div>
        {authOpen && (
          <AccountModal
            mode={authMode}
            onModeChange={setAuthMode}
            onClose={closeAuth}
            onAuthenticated={handleAuthenticated}
            onOAuthStart={prepareOAuth}
          />
        )}
        {planMobilePayDialog}
      </div>
    )
  }


  if (!authReady && hasPersistedSupabaseSession()) {
    return (
      <div className="account-page">
        <div className="account-dialog" aria-busy="true">
          <span className="loading-indicator" aria-hidden="true" />
        </div>
      </div>
    )
  }

  const switchBuilderResume = (resumeId, template) => {
    const resumeTemplate = resumeTemplates.some((item) => item.id === template)
      ? template
      : 'gratuit'
    setSelectedTemplate(resumeTemplate)
    setSelectedResumeId(resumeId)
    setCreateNewResume(false)
    setTemplateSelectionMade(true)
    setDownloadAfterPayment(false)
    setView('builder')
  }

  const createBuilderResume = () => {
    startBuilder('gratuit')
  }

  if (view === 'builder') {
    return (
      <>
        <ResumeBuilder
          key={selectedResumeId || 'new'}
          user={user}
          userId={user?.id}
          initialResumeId={selectedResumeId}
          createNewResume={createNewResume}
          accountPlan={accountPlan}
          onReactivatePlan={requestPlanCheckout}
          initialTemplate={selectedTemplate}
          preferInitialTemplate={templateSelectionMade}
          downloadAfterPayment={downloadAfterPayment}
          downloadRequested={dashboardDownloadRequested}
          onDownloadRequestComplete={() => setDashboardDownloadRequested(false)}
          onAutoDownloadComplete={() => setDownloadAfterPayment(false)}
          onHome={goHome}
          onDashboard={goDashboard}
          onLogout={logout}
          onRequestUnlock={requestUnlock}
          onPaymentStarted={handleMobilePayStarted}
          paymentStatus={paymentReturnStatus?.state}
          onRetryPayment={() => setPaymentVerifyAttempt((current) => current + 1)}
          onSwitchResume={switchBuilderResume}
          onCreateResume={createBuilderResume}
          onImportResume={() => setImportModalOpen(true)}
          showNotice={showNotice}
          notice={notice}
        />
        <StartResumeChoiceModal
          isOpen={startChoiceModalOpen}
          onClose={() => setStartChoiceModalOpen(false)}
          onSelectBlank={() => {
            setStartChoiceModalOpen(false)
            startBuilder(pendingTemplateChoice)
          }}
          onSelectImport={() => {
            setStartChoiceModalOpen(false)
            setImportModalOpen(true)
          }}
        />
        <ImportResumeModal
          isOpen={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          onApplyResume={handleApplyImportedResume}
          templates={resumeTemplates}
        />
        {authOpen && (
          <AccountModal
            mode={authMode}
            onModeChange={setAuthMode}
            onClose={closeAuth}
            onAuthenticated={handleAuthenticated}
            onOAuthStart={prepareOAuth}
          />
        )}
        {planMobilePayDialog}
      </>
    )
  }

  if (user || view === 'dashboard') {
    return (
      <>
        <ResumeDashboard
          user={user}
          accountPlan={accountPlan}
          onPlanUpdate={(plan) => setAccountPlan({ ...plan, ready: true })}
          onHome={goHome}
          onCreateResume={() => handleRequestCreateResume()}
          onImportResume={() => setImportModalOpen(true)}
          onOpenResume={openDashboardResume}
          onDownloadResume={downloadDashboardResume}
          onPurchasePlan={requestPlanCheckout}
          onLogout={logout}
          showNotice={showNotice}
          downloadInProgressId={downloadingResumeId}
        />
        <StartResumeChoiceModal
          isOpen={startChoiceModalOpen}
          onClose={() => setStartChoiceModalOpen(false)}
          onSelectBlank={() => {
            setStartChoiceModalOpen(false)
            startBuilder(pendingTemplateChoice)
          }}
          onSelectImport={() => {
            setStartChoiceModalOpen(false)
            setImportModalOpen(true)
          }}
        />
        <ImportResumeModal
          isOpen={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          onApplyResume={handleApplyImportedResume}
          templates={resumeTemplates}
        />
        {notice && <div className="toast" role="status">{notice}</div>}
        {dashboardDownloadRequested && (
          <div className="dashboard-download-host" aria-hidden="true">
            <ResumeBuilder
              key={`download-${selectedResumeId}`}
              user={user}
              userId={user.id}
              initialResumeId={selectedResumeId}
              createNewResume={false}
              accountPlan={accountPlan}
              onReactivatePlan={requestPlanCheckout}
              initialTemplate={selectedTemplate}
              preferInitialTemplate={templateSelectionMade}
              downloadAfterPayment={false}
              downloadRequested
              onDownloadRequestComplete={handleDashboardDownloadComplete}
              onAutoDownloadComplete={() => {}}
              onHome={goHome}
              onDashboard={goDashboard}
              onLogout={logout}
              onRequestUnlock={requestUnlock}
              onPaymentStarted={handleMobilePayStarted}
              paymentStatus={null}
              onRetryPayment={() => {}}
              showNotice={showNotice}
              notice=""
            />
          </div>
        )}
        {planMobilePayDialog}
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
          <a href="#modeles">Modèles</a>
          <a href="#features">Fonctionnalités</a>
          <a href="#pricing">Tarifs</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="header-actions">
          {user && <button className="header-link" onClick={goDashboard}>Mes CV</button>}
          <button className="header-link" onClick={() => {
            pendingAuthDestinationRef.current = 'dashboard'
            setAuthMode('signup')
            setAuthOpen(true)
          }}><u>Créer mon compte</u></button>
          <button className="button button-dark button-small button-pill" onClick={() => handleRequestCreateResume()}>Créer mon CV <span className="button-arrow" aria-hidden="true">→</span></button>
        </div>
      </header>

      <main id="top">
        <section className="hero section-wrap">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> Le studio CV nouvelle génération</div>
            <h1 style={{ display: 'flex', flexDirection: 'column' }}><span style={{ whiteSpace: 'nowrap' }}>Un CV qui ouvre</span><em>des portes.</em></h1>
            <p className="hero-lede">Concevez un CV clair, singulier et mémorable. CVcraft vous aide à transformer votre parcours en prochaine opportunité.</p>
            <div className="hero-actions">
              <button className="button button-dark button-pill" onClick={() => handleRequestCreateResume()}>Créer mon CV gratuitement <span className="button-arrow" aria-hidden="true">→</span></button>
              <a className="button button-ghost" href="#modeles">Voir les modèles</a>
            </div>
            <div className="hero-proof"><div className="avatar-stack"><span>ML</span><span>AD</span><span>SK</span><span>+</span></div><span>Déjà adopté par <strong>12 000+</strong> candidats</span></div>
          </div>
          <div className="hero-visual" aria-label="Aperçu du tableau de bord">
            <div style={{ width: '100%', height: '400px', backgroundColor: '#eeece3', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 48px rgba(0,0,0,0.15)', border: '1px solid #d7d7ce', transform: 'rotate(2deg)' }}>
              <div style={{ height: '40px', backgroundColor: '#fffef9', borderBottom: '1px solid #d7d7ce', display: 'flex', alignItems: 'center', padding: '0 16px', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ff5f56' }}></div>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ffbd2e' }}></div>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#27c93f' }}></div>
                <div style={{ marginLeft: 'auto', fontWeight: 'bold', fontSize: '12px', color: '#17191a' }}>CVcraft Studio</div>
              </div>
              <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                <div style={{ width: '40%', backgroundColor: '#fffef9', borderRight: '1px solid #d7d7ce', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ width: '60%', height: '16px', backgroundColor: '#e3e2da', borderRadius: '4px' }}></div>
                  <div style={{ width: '100%', height: '24px', backgroundColor: '#e3e2da', borderRadius: '4px' }}></div>
                  <div style={{ width: '100%', height: '24px', backgroundColor: '#e3e2da', borderRadius: '4px' }}></div>
                  <div style={{ width: '80%', height: '24px', backgroundColor: '#e3e2da', borderRadius: '4px' }}></div>
                  <div style={{ marginTop: 'auto', width: '100%', height: '32px', backgroundColor: '#17191a', borderRadius: '50px' }}></div>
                </div>
                <div style={{ width: '60%', backgroundColor: '#e3e2da', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                  <div style={{ width: '100%', height: '100%', backgroundColor: '#fffef9', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ width: '40%', height: '12px', backgroundColor: '#17191a', borderRadius: '2px' }}></div>
                    <div style={{ width: '30%', height: '8px', backgroundColor: '#8b918a', borderRadius: '2px' }}></div>
                    <div style={{ width: '100%', height: '1px', backgroundColor: '#d7d7ce', margin: '4px 0' }}></div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: '#e3e2da', borderRadius: '2px' }}></div>
                    <div style={{ width: '90%', height: '8px', backgroundColor: '#e3e2da', borderRadius: '2px' }}></div>
                    <div style={{ width: '95%', height: '8px', backgroundColor: '#e3e2da', borderRadius: '2px' }}></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="visual-note note-top" style={{ zIndex: 10 }}><span className="note-star">✳</span><span>Édition<br /><strong>en temps réel</strong></span></div>
          </div>
        </section>

        <section className="marquee" aria-label="Promesse CVcraft"><div className="marquee-track"><span>Votre parcours mérite mieux qu’un modèle banal.</span><span className="marquee-star">✳</span><span>Votre parcours mérite mieux qu’un modèle banal.</span><span className="marquee-star">✳</span></div></section>

        <section className="process section-wrap" id="process">
          <div className="section-heading"><div><div className="eyebrow">Simple comme bonjour</div><h2>De l’idée au<br /><em>oui.</em></h2></div><p>Pas de jargon, pas de mise en page qui casse. Juste les bons outils pour donner à votre histoire la place qu’elle mérite.</p></div>
          <div className="step-grid">{steps.map((step) => <article className="step" key={step.number}><span className="step-number">{step.number}</span><h3>{step.title}</h3><p>{step.text}</p><span className="step-arrow" aria-hidden="true">↗</span></article>)}</div>
        </section>

        {/* ── SECTION MODÈLES ── */}
        <section className="templates-section section-wrap" id="modeles" aria-labelledby="modeles-title">
          <div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-dot" /> Nos modèles</div><h2 id="modeles-title">Trouvez le style<br /><em>qui vous ressemble.</em></h2></div><p>Quatre modèles pensés pour les recruteurs. Prévisualisez-les, choisissez-en un et commencez à remplir votre CV.</p></div>
          <div style={{ position: 'relative' }}>
            <button className="carousel-nav carousel-nav-prev" onClick={() => document.getElementById('templates-carousel').scrollBy({ left: -320, behavior: 'smooth' })} aria-label="Modèles précédents">←</button>
            <button className="carousel-nav carousel-nav-next" onClick={() => document.getElementById('templates-carousel').scrollBy({ left: 320, behavior: 'smooth' })} aria-label="Modèles suivants">→</button>
            <div className="templates-grid" id="templates-carousel">
              {resumeTemplates.map((item) => (
                <article className="template-card" key={item.id} onClick={() => setSelectedTemplate(item.id)} style={{ cursor: 'pointer' }}>
                  <div className="template-card-frame" style={{ position: 'relative', border: selectedTemplate === item.id ? '2px solid var(--ink)' : '2px solid transparent', backgroundColor: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.06)', transition: 'border-color 0.2s', padding: 0 }}>
                    {item.id !== 'gratuit' && (
                      <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10, background: '#fff', borderRadius: '50%', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                        <PremiumCrown />
                      </div>
                    )}
                    <TemplateMiniPreview template={item} />
                  </div>
                  <div className="template-card-meta" style={{ marginTop: '16px', textAlign: 'center', display: 'block' }}>
                    <div><strong>{item.name}</strong><br /><small>{item.description}</small></div>
                  </div>
                </article>
              ))}
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <button className="button button-dark button-pill" onClick={() => {
              if (user) {
                handleRequestCreateResume(selectedTemplate)
              } else {
                pendingAuthDestinationRef.current = 'builder'
                pendingTemplateRef.current = selectedTemplate
                setAuthMode('signup')
                setAuthOpen(true)
              }
            }}>Utiliser le modèle sélectionné</button>
          </div>
        </section>

        {/* ── SECTION FEATURES ── */}
        <section className="features-section section-wrap" id="features" aria-label="Fonctionnalités CVcraft">
          <div className="features-heading">
            <div className="eyebrow"><span className="eyebrow-dot" /> Ce qui nous distingue</div>
            <h2>Tout ce qu'il vous faut<br /><em>pour décrocher le job.</em></h2>
          </div>
          <div className="features-grid">
            <article className="feature-card">
              <div className="feature-icon" aria-hidden="true">⚡</div>
              <h3>Créez en 5 minutes</h3>
              <p>Un formulaire guidé, clair et rapide. Votre CV est prêt avant même la fin de votre café.</p>
            </article>
            <article className="feature-card">
              <div className="feature-icon" aria-hidden="true">📱</div>
              <h3>100 % mobile</h3>
              <p>Conçu pour fonctionner parfaitement sur téléphone. Créez et exportez depuis n'importe où.</p>
            </article>
            <article className="feature-card">
              <div className="feature-icon" aria-hidden="true">🎨</div>
              <h3>Modèles élégants</h3>
              <p>Des templates pensés par des designers, adaptés aux recruteurs africains et internationaux.</p>
            </article>
            <article className="feature-card">
              <div className="feature-icon" aria-hidden="true">📄</div>
              <h3>Export PDF net</h3>
              <p>Un PDF haute qualité, prêt à envoyer par email ou à déposer sur une plateforme RH.</p>
            </article>
            <article className="feature-card">
              <div className="feature-icon" aria-hidden="true">☁️</div>
              <h3>Sauvegarde cloud</h3>
              <p>Vos CV sont enregistrés en ligne. Reprenez votre travail sur n'importe quel appareil.</p>
            </article>
            <article className="feature-card">
              <div className="feature-icon" aria-hidden="true">🔒</div>
              <h3>Paiement sécurisé</h3>
              <p>Mobile Money MTN &amp; Orange intégré via Tara. Simple, rapide et sans carte bancaire.</p>
            </article>
          </div>
        </section>

        <section className="pricing section-wrap" id="pricing">
          <div className="pricing-heading"><div className="eyebrow">Investissez en vous</div><h2>Le bon plan pour<br /><em>chaque étape.</em></h2><p>Commencez gratuitement, passez à la vitesse supérieure quand vous êtes prêt.</p></div>
          <div className="plans">{plans.map((plan) => <article className={`plan ${plan.featured ? 'plan-featured' : ''}`} key={plan.id}>{plan.featured && <div className="popular">Le plus choisi</div>}<div className="plan-top"><span className="plan-name">{plan.name}</span><span className="plan-symbol">{plan.id === 'gold' ? '✦' : plan.id === 'pro' ? '◆' : '○'}</span></div><div className="plan-price">{plan.price}<small> FCFA / {plan.suffix}</small></div><p>{plan.description}</p><ul>{plan.features.map((feature) => <li key={feature}><span>✓</span>{feature}</li>)}</ul><button className={`button ${plan.featured ? 'button-light' : 'button-outline'}`} onClick={() => plan.id === 'free' ? handleRequestCreateResume() : requestPlanCheckout(plan.id)}>{plan.action}<span aria-hidden="true">↗</span></button></article>)}</div>
        </section>

        {/* ── SECTION TÉMOIGNAGES ── */}
        <section className="testimonials-section" id="testimonials" aria-label="Témoignages clients">
          <div className="testimonials-inner section-wrap">
            <div className="testimonials-heading">
              <div className="eyebrow"><span className="eyebrow-dot" /> Ils nous font confiance</div>
              <h2>Ce que disent<br /><em>nos utilisateurs.</em></h2>
            </div>
            <div className="testimonials-grid">
              <blockquote className="testimonial-card testimonial-featured">
                <p>"J'ai créé mon CV en moins de 10 minutes depuis mon téléphone. Le lendemain, j'avais un entretien. CVcraft a changé la donne pour moi."</p>
                <footer>
                  <div className="testimonial-avatar">AM</div>
                  <div>
                    <strong>Aminata M.</strong>
                    <span>Étudiante en Master, Dakar</span>
                  </div>
                </footer>
              </blockquote>
              <blockquote className="testimonial-card">
                <p>"Le design est vraiment professionnel. Mes recruteurs ont commenté la qualité de mon CV. Je le recommande à tous mes amis."</p>
                <footer>
                  <div className="testimonial-avatar">KD</div>
                  <div>
                    <strong>Kofi D.</strong>
                    <span>Développeur, Abidjan</span>
                  </div>
                </footer>
              </blockquote>
              <blockquote className="testimonial-card">
                <p>"Enfin un outil pensé pour l'Afrique. Le paiement par Mobile Money, c'est exactement ce qu'il nous fallait. Simple et efficace."</p>
                <footer>
                  <div className="testimonial-avatar">NB</div>
                  <div>
                    <strong>Nadia B.</strong>
                    <span>Freelance RH, Douala</span>
                  </div>
                </footer>
              </blockquote>
              <blockquote className="testimonial-card">
                <p>"Interface super intuitive. J'ai pu aider ma sœur à créer son premier CV. Elle a décroché son stage la semaine suivante !"</p>
                <footer>
                  <div className="testimonial-avatar">JT</div>
                  <div>
                    <strong>Jean-Paul T.</strong>
                    <span>Ingénieur, Yaoundé</span>
                  </div>
                </footer>
              </blockquote>
            </div>
          </div>
        </section>

        {/* ── SECTION FAQ ── */}
        <section className="faq-section section-wrap" id="faq" aria-label="Questions fréquentes">
          <div className="faq-heading">
            <div className="eyebrow"><span className="eyebrow-dot" /> Questions fréquentes</div>
            <h2>On répond à<br /><em>vos questions.</em></h2>
          </div>
          <div className="faq-list">
            {[
              { q: 'CVcraft est-il vraiment gratuit ?', a: 'Oui ! Le plan gratuit vous permet de créer un CV complet et de le télécharger en PDF. Les plans payants débloquent des modèles premium et des fonctionnalités avancées.' },
              { q: 'Comment fonctionne le paiement Mobile Money ?', a: 'Nous utilisons Tara Money pour les paiements. Sélectionnez votre pays, entrez votre numéro mobile (MTN, Orange...) et validez la demande sur votre téléphone. Simple, rapide et sécurisé.' },
              { q: 'Puis-je créer plusieurs CV ?', a: 'Avec le plan Pro, vous pouvez créer jusqu\'à 3 CV différents. Le plan Gold vous offre des CV illimités, parfait si vous postulez à plusieurs types de postes.' },
              { q: 'Mon CV est-il sauvegardé automatiquement ?', a: 'Oui, avec un compte CVcraft, votre travail est sauvegardé en temps réel dans le cloud. Vous pouvez reprendre depuis n\'importe quel appareil.' },
              { q: 'Quelle est la qualité du PDF exporté ?', a: 'Nos PDF sont générés en haute résolution et formatés pour l\'impression A4. Ils sont compatibles avec toutes les plateformes de dépôt de candidature.' },
            ].map((item, index) => (
              <details className="faq-item" key={index}>
                <summary className="faq-question">{item.q}<span className="faq-arrow" aria-hidden="true">↓</span></summary>
                <p className="faq-answer">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── SECTION CTA FINAL ── */}
        <section className="cta-section" id="cta" aria-label="Appel à l'action">
          <div className="cta-inner section-wrap">
            <div className="cta-content">
              <div className="eyebrow cta-eyebrow"><span className="eyebrow-dot" /> Prêt à commencer ?</div>
              <h2>Votre prochain emploi<br /><em>commence ici.</em></h2>
              <p>Rejoignez 12 000+ candidats qui ont déjà transformé leur parcours en opportunité. Créez votre CV professionnel en moins de 5 minutes, gratuitement.</p>
              <div className="cta-actions">
                <button className="button button-dark cta-btn" onClick={() => handleRequestCreateResume()}>Créer mon CV gratuitement <span aria-hidden="true">↗</span></button>
                <a className="text-link" href="#pricing">Voir les tarifs <span aria-hidden="true">↓</span></a>
              </div>
              <div className="cta-badges">
                <span className="cta-badge">✓ Sans carte bancaire</span>
                <span className="cta-badge">✓ CV en 5 minutes</span>
                <span className="cta-badge">✓ Mobile Money accepté</span>
              </div>
            </div>
            <div className="cta-visual" aria-hidden="true">
              <div className="cta-stat">
                <span className="cta-stat-number">12k+</span>
                <span className="cta-stat-label">Candidats actifs</span>
              </div>
              <div className="cta-stat">
                <span className="cta-stat-number">98%</span>
                <span className="cta-stat-label">Satisfaction</span>
              </div>
              <div className="cta-stat">
                <span className="cta-stat-number">5min</span>
                <span className="cta-stat-label">Pour un CV complet</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer"><div className="footer-top"><a className="brand brand-light" href="#top"><span className="brand-mark">c</span><span>CVcraft</span></a><p>Faites de votre parcours<br /><em>votre meilleur atout.</em></p><button className="button button-yellow" onClick={() => handleRequestCreateResume()}>Créer mon CV <span aria-hidden="true">↗</span></button></div><div className="footer-bottom"><span>© 2026 CVcraft Studio</span><div><a href="#top">Mentions légales</a><a href="#top">Confidentialité</a><a href="#top">Instagram</a></div></div></footer>
      {notice && <div className="toast" role="status">{notice}</div>}
    </div>
      <StartResumeChoiceModal
        isOpen={startChoiceModalOpen}
        onClose={() => setStartChoiceModalOpen(false)}
        onSelectBlank={() => {
          setStartChoiceModalOpen(false)
          startBuilder(pendingTemplateChoice)
        }}
        onSelectImport={() => {
          setStartChoiceModalOpen(false)
          setImportModalOpen(true)
        }}
      />
      <ImportResumeModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onApplyResume={handleApplyImportedResume}
        templates={resumeTemplates}
      />
      {planMobilePayDialog}
      {authOpen && (
        <AccountModal
          mode={authMode}
          onModeChange={setAuthMode}
          onClose={closeAuth}
          onAuthenticated={handleAuthenticated}
          onOAuthStart={prepareOAuth}
        />
      )}
    </>
  )
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
