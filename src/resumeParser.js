import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url'

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl
}

/**
 * Extrait le texte brut d'un fichier PDF, TXT ou JSON.
 * @param {File} file 
 * @returns {Promise<string>} Texte extrait
 */
export async function extractTextFromFile(file) {
  if (!file) throw new Error('Aucun fichier fourni.')

  const fileType = file.type || ''
  const fileName = (file.name || '').toLowerCase()

  // 1. Fichiers Texte brut ou JSON
  if (fileType.includes('text') || fileName.endsWith('.txt') || fileName.endsWith('.json')) {
    const text = await file.text()
    if (fileName.endsWith('.json')) {
      try {
        const parsedJson = JSON.parse(text)
        return JSON.stringify(parsedJson, null, 2)
      } catch {
        return text
      }
    }
    return text
  }

  // 2. Fichiers PDF
  if (fileType.includes('pdf') || fileName.endsWith('.pdf')) {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
      const pdf = await loadingTask.promise
      const pagesText = []

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
        const page = await pdf.getPage(pageNum)
        const textContent = await page.getTextContent()

        let lastY = null
        let pageStr = ''
        for (const item of textContent.items) {
          if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
            pageStr += '\n'
          } else if (pageStr.length > 0 && !pageStr.endsWith(' ') && !pageStr.endsWith('\n')) {
            pageStr += ' '
          }
          pageStr += item.str
          lastY = item.transform[5]
        }
        pagesText.push(pageStr.trim())
      }

      const fullText = pagesText.join('\n\n').replace(/\u00a0/g, ' ')
      return fullText
    } catch (pdfErr) {
      console.error('Erreur lors de l’extraction PDF avec pdfjs:', pdfErr)
      throw new Error('Impossible de lire le document PDF. Vérifiez qu’il n’est pas protégé par un mot de passe.')
    }
  }

  throw new Error('Format de fichier non pris en charge. Veuillez importer un fichier PDF, TXT ou JSON.')
}

/**
 * Supprime les accents d'une chaîne pour la comparaison
 */
export function removeAccents(str) {
  if (!str) return ''
  return String(str).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/**
 * Calcule la distance de Levenshtein entre deux mots courts
 */
export function levenshteinDistance(a, b) {
  if (a === b) return 0
  if (!a) return b.length
  if (!b) return a.length
  const al = a.length
  const bl = b.length
  const matrix = Array.from({ length: bl + 1 }, () => new Array(al + 1).fill(0))

  for (let i = 0; i <= bl; i += 1) matrix[i][0] = i
  for (let j = 0; j <= al; j += 1) matrix[0][j] = j

  for (let i = 1; i <= bl; i += 1) {
    for (let j = 1; j <= al; j += 1) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  return matrix[bl][al]
}

/**
 * Nettoie une ligne pour tester si c'est un titre de rubrique
 */
export function cleanHeadingLine(line) {
  if (!line) return ''
  let cleaned = String(line).trim()

  // 1. Supprime les puces, emojis et symboles de début
  cleaned = cleaned.replace(/^[\s•●▪►▸▶︎★*✓✔·\-_~#/\\|()\[\]{}–—§]+/, '')

  // 2. Supprime la numérotation au début (ex: "1.", "1 -", "I.", "A)", "01.")
  cleaned = cleaned.replace(/^(?:[0-9]{1,2}|[IVXLCDM]{1,4}|[A-Z])[\.\)\-\/\:\s]+\s*/i, '')

  // 3. Supprime les séparateurs et ponctuations finales
  cleaned = cleaned.replace(/[\s\:\-–—\.\·\/\#\\|~]+$/, '')

  // 4. Harmonise les apostrophes et supprime les accents
  cleaned = cleaned.replace(/[’']/g, "'")
  cleaned = removeAccents(cleaned).toLowerCase().trim()

  // 5. Supprime les préfixes d'introduction courants
  cleaned = cleaned.replace(/^(?:mes|mon|nos|les|des|un|une)\s+(?:principaux|principales|propres)?\s*/i, '')

  // 6. Normalise les séparateurs intérieurs (&, +, /, |, et isolé)
  cleaned = cleaned.replace(/\s*(&|\+|\/|\|)\s*/g, ' ')
  cleaned = cleaned.replace(/\s+et\s+/g, ' ')

  // 7. Supprime les espaces superflus
  cleaned = cleaned.replace(/\s+/g, ' ').trim()

  return cleaned
}

/**
 * Ordre de priorité de classification pour lever les ambiguïtés
 */
export const SECTION_PRIORITY = ['skills', 'educations', 'experiences', 'languages', 'interests', 'summary']

/**
 * Dictionnaire complet de détection de rubriques avec expressions et mots-clés similaires
 */
export const SECTION_DEFINITIONS = {
  skills: {
    phrases: [
      'competences professionnelles',
      'competences techniques',
      'competence technique',
      'domaines de competences',
      'domaine de competence',
      'champs de competences',
      'competences cles',
      'competences principales',
      'competences et outils',
      'outils et competences',
      'outils et technologies',
      'technologies et outils',
      'savoir-faire et savoir-etre',
      'savoir faire',
      'savoir-faire',
      'aptitudes professionnelles',
      'aptitudes et competences',
      'expertises techniques',
      'domaines d expertise',
      'domaines d expertises',
      'environnement technique',
      'technologies maitrisees',
      'outils maitrises',
      'outils informatiques',
      'logiciels et outils',
      'logiciels maitrises',
      'connaissances techniques',
      'connaissances informatiques',
      'maitrise technique',
      'atouts et competences',
      'points forts',
      'qualites professionnelles',
      'hard skills',
      'soft skills',
      'technical skills',
      'core competencies',
      'key skills',
      'competences',
      'competence',
      'skills',
      'aptitudes',
      'aptitude',
      'expertises',
      'expertise',
      'technologies',
      'logiciels',
      'outils',
    ],
    stems: ['competenc', 'competan', 'skill', 'aptitud', 'expertise', 'savoir-fair', 'technolog', 'hard skill', 'soft skill'],
  },

  educations: {
    phrases: [
      'formation academique',
      'formations academiques',
      'cursus academique',
      'cursus scolaire',
      'cursus universitaire',
      'parcours academique',
      'parcours scolaire',
      'parcours universitaire',
      'formations et diplomes',
      'diplomes et formations',
      'etudes et diplomes',
      'diplomes et etudes',
      'titres et diplomes',
      'diplomes obtenus',
      'etudes superieures',
      'etudes universitaires',
      'scolarite et diplomes',
      'certifications et diplomes',
      'diplomes et certifications',
      'background academique',
      'academic background',
      'educational background',
      'formation continue',
      'formation initiale',
      'formations',
      'formation',
      'education',
      'etudes',
      'etude',
      'cursus',
      'diplomes',
      'diplome',
      'scolarite',
      'certifications',
      'certification',
      'certificats',
      'certificat',
      'qualifications',
      'qualification',
      'degrees',
      'studies',
    ],
    stems: ['formatio', 'diplom', 'educat', 'etud', 'cursus', 'scolar', 'certificat', 'academ'],
  },

  experiences: {
    phrases: [
      'experiences professionnelles',
      'experience professionnelle',
      'experiences de travail',
      'experience de travail',
      'parcours professionnel',
      'emplois et stages',
      'stages et emplois',
      'stages professionnels',
      'stages academiques',
      'emplois occupes',
      'postes occupes',
      'missions realisees',
      'missions professionnelles',
      'carrieres professionnelles',
      'historique professionnel',
      'antecedents professionnels',
      'activites professionnelles',
      'vie professionnelle',
      'experience acquise',
      'projets professionnels',
      'travaux professionnels',
      'fonctions occupees',
      'experiences pro',
      'parcours pro',
      'work experience',
      'professional experience',
      'employment history',
      'work history',
      'career history',
      'experiences',
      'experience',
      'emplois',
      'emploi',
      'postes',
      'poste',
      'stages',
      'stage',
      'missions',
      'mission',
      'carriere',
      'carrieres',
      'career',
      'jobs',
      'internships',
    ],
    stems: ['experienc', 'stage', 'emploi', 'carriere', 'mission', 'parcours pro', 'work'],
  },

  languages: {
    phrases: [
      'langues maitrisees',
      'langues parlees',
      'langues etrangeres',
      'langues pratiques',
      'connaissances linguistiques',
      'competences linguistiques',
      'pratique des langues',
      'langues et dialectes',
      'language skills',
      'language proficiency',
      'languages',
      'language',
      'langues',
      'langue',
      'linguistique',
      'idiomes',
    ],
    stems: ['langu', 'linguist'],
  },

  interests: {
    phrases: [
      'centres d interet',
      'centre d interet',
      'centres d interets',
      'centre d interets',
      'loisirs et passions',
      'passions et loisirs',
      'sports et loisirs',
      'loisirs et centres d interet',
      'activites extra-professionnelles',
      'activites extra professionnelles',
      'activites extrascolaires',
      'vie associative et loisirs',
      'vie associative',
      'engagements associatifs',
      'engagements personnels',
      'benevolat et associations',
      'hobbies and interests',
      'extracurricular activities',
      'leisure activities',
      'centres d interet et loisirs',
      'centres d interets et loisirs',
      'loisirs',
      'loisir',
      'hobbies',
      'hobby',
      'interets',
      'interet',
      'passions',
      'passion',
      'sports',
      'sport',
      'benevolat',
      'divers',
      'interests',
    ],
    stems: ['interet', 'loisir', 'hobbi', 'hobby', 'passion', 'benevol', 'associati'],
  },

  summary: {
    phrases: [
      'profil professionnel',
      'resume professionnel',
      'projet professionnel',
      'objectif professionnel',
      'objectif de carriere',
      'a propos de moi',
      'a propos',
      'qui suis-je',
      'qui suis je',
      'presentation generale',
      'presentation professionnelle',
      'synthese professionnelle',
      'resume de carriere',
      'mon profil',
      'a mon propos',
      'about me',
      'professional summary',
      'personal statement',
      'summary',
      'profil',
      'resume',
      'synthese',
      'presentation',
      'introduction',
      'biographie',
      'bio',
      'accroche',
      'objectif',
      'profile',
      'objective',
    ],
    stems: ['profil', 'propos', 'synthes', 'objecti', 'resum', 'presentat', 'biograph'],
  },
}

/**
 * Détecte si une ligne correspond à un titre de section par mots-clés exacts ou similaires.
 * @param {string} rawLine Ligne brute du document
 * @returns {string|null} Clé de la section ou null
 */
export function detectSectionHeading(rawLine) {
  if (!rawLine || typeof rawLine !== 'string') return null

  const trimmed = rawLine.trim()
  if (trimmed.length < 2 || trimmed.length > 55) return null

  // 1. Ne peut JAMAIS être un titre de section si :
  // - Contient des virgules ou points-virgules (liste d'éléments)
  if (/[,;]/.test(trimmed)) return null
  // - Contient deux-points suivis de contenu (ex: "Français : Langue maternelle", "Titre : Dev")
  if (/:\s*\S+/.test(trimmed)) return null
  // - Contient un email ou une URL
  if (trimmed.includes('@') || /https?:\/\/|www\./i.test(trimmed)) return null
  // - Contient une plage de dates
  if (/\b(?:19|20)\d{2}\s*[-–—àto/]\s*(?:(?:19|20)\d{2}|présent|present|actuel)/i.test(trimmed)) return null

  const cleaned = cleanHeadingLine(rawLine)
  if (!cleaned || cleaned.length < 2) return null

  const words = cleaned.split(/\s+/).filter(Boolean)
  if (words.length > 5) return null // Un titre de rubrique fait au plus 5 mots

  // 2. Recherche prioritaire par correspondance exacte ou inclusion de phrases clés
  for (const sectionKey of SECTION_PRIORITY) {
    const def = SECTION_DEFINITIONS[sectionKey]
    for (const phrase of def.phrases) {
      if (cleaned === phrase) return sectionKey
      if (cleaned.startsWith(`${phrase} `) || cleaned.endsWith(` ${phrase}`)) return sectionKey
      if (cleaned.includes(` ${phrase} `)) return sectionKey
    }
  }

  // 3. Détection rapide pour les lignes courtes (<= 4 mots) commençant par un mot de rubrique
  if (words.length <= 4) {
    const first = words[0]
    if (first.startsWith('competenc') || first.startsWith('competan') || first.startsWith('skill')) return 'skills'
    if (first.startsWith('formatio') || first.startsWith('diplom') || first.startsWith('etud') || first.startsWith('cursus') || first.startsWith('scolar')) return 'educations'
    if (first.startsWith('experienc') || first.startsWith('stage') || first.startsWith('emploi') || first.startsWith('carriere') || first.startsWith('mission')) return 'experiences'
    if (first.startsWith('langu')) return 'languages'
    if (first.startsWith('interet') || first.startsWith('loisir') || first.startsWith('hobbi') || first.startsWith('passion') || first.startsWith('centre')) return 'interests'
    if (first.startsWith('profil') || first.startsWith('resum') || first.startsWith('synthes') || first.startsWith('propos') || first.startsWith('objecti')) return 'summary'
  }

  // 4. Recherche par racines (stems) au début des mots (uniquement pour titres très courts <= 3 mots)
  if (words.length <= 3) {
    for (const sectionKey of SECTION_PRIORITY) {
      const def = SECTION_DEFINITIONS[sectionKey]
      for (const stem of def.stems) {
        if (words.some((w) => w.startsWith(stem))) {
          return sectionKey
        }
      }
    }
  }

  // 4. Recherche floue (Fuzzy Matching par Levenshtein) pour tolérer les fautes de frappe
  for (const sectionKey of SECTION_PRIORITY) {
    const def = SECTION_DEFINITIONS[sectionKey]
    for (const phrase of def.phrases) {
      const phraseWords = phrase.split(' ')
      if (words.length === phraseWords.length && words.length <= 4) {
        let isMatch = true
        for (let i = 0; i < words.length; i += 1) {
          const w = words[i]
          const pw = phraseWords[i]
          const maxDist = pw.length > 5 ? 2 : 1
          if (levenshteinDistance(w, pw) > maxDist) {
            isMatch = false
            break
          }
        }
        if (isMatch) return sectionKey
      }
    }
  }

  return null
}

export function normalizeDateToIso(str) {
  if (!str) return ''
  const trimmed = String(str).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  if (/^\d{4}-\d{2}$/.test(trimmed)) return `${trimmed}-01`
  if (/^\d{4}$/.test(trimmed)) return `${trimmed}-01-01`

  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{4})$/)
  if (slashMatch) {
    const month = slashMatch[1].padStart(2, '0')
    const year = slashMatch[2]
    return `${year}-${month}-01`
  }

  const fullSlashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (fullSlashMatch) {
    const day = fullSlashMatch[1].padStart(2, '0')
    const month = fullSlashMatch[2].padStart(2, '0')
    const year = fullSlashMatch[3]
    return `${year}-${month}-${day}`
  }

  const monthMap = {
    jan: '01', fév: '02', fev: '02', mar: '03', avr: '04', apr: '04',
    mai: '05', may: '05', juin: '06', jun: '06', juil: '07', jul: '07',
    aoû: '08', aou: '08', aug: '08', sep: '09', oct: '10', nov: '11', déc: '12', dec: '12',
  }
  const yearMatch = trimmed.match(/\b(19\d{2}|20\d{2})\b/)
  if (yearMatch) {
    const year = yearMatch[1]
    const lower = trimmed.toLowerCase()
    let foundMonth = '01'
    for (const [key, val] of Object.entries(monthMap)) {
      if (lower.includes(key)) {
        foundMonth = val
        break
      }
    }
    return `${year}-${foundMonth}-01`
  }
  return ''
}

export function parseDateRange(text) {
  if (!text) return { startDate: '', endDate: '', matchedText: '' }

  const rangeMatch = text.match(/(?:(?:19|20)\d{2}|janv?|févr?|fevr?|mars?|avr|mai|juin|juil|août|aout|sept?|oct|nov|déc|dec|\d{1,2}\/\d{4})[^\-–—àa/]*?(?:[-–—à]|au|\bto\b|\bà\b)\s*?(?:(?:19|20)\d{2}|janv?|févr?|fevr?|mars?|avr|mai|juin|juil|août|aout|sept?|oct|nov|déc|dec|\d{1,2}\/\d{4}|présent|present|actuel|aujourd'hui|en cours)/i)

  if (rangeMatch) {
    const rawRange = rangeMatch[0]
    const parts = rawRange.split(/[-–—]|(?:\s+à\s+)|\bau\b|\bto\b|\bà\b/i)
    const startPart = parts[0]?.trim() || ''
    const endPart = parts[1]?.trim() || ''
    const isCurrent = /présent|present|actuel|aujourd'hui|en cours/i.test(endPart)
    return {
      startDate: normalizeDateToIso(startPart),
      endDate: isCurrent ? '' : normalizeDateToIso(endPart),
      matchedText: rawRange,
    }
  }

  // Format "Depuis 2021" ou "Depuis Mars 2020"
  const sinceMatch = text.match(/(?:depuis|since)\s+((?:(?:19|20)\d{2}|janv?|févr?|mars?|avr|mai|juin|juil|août|sept?|oct|nov|déc|\d{1,2}\/\d{4}))/i)
  if (sinceMatch) {
    return {
      startDate: normalizeDateToIso(sinceMatch[1]),
      endDate: '',
      matchedText: sinceMatch[0],
    }
  }

  // Année unique
  const singleMatch = text.match(/\b(19\d{2}|20\d{2})\b/)
  if (singleMatch) {
    return {
      startDate: `${singleMatch[1]}-01-01`,
      endDate: '',
      matchedText: singleMatch[0],
    }
  }

  return { startDate: '', endDate: '', matchedText: '' }
}

/**
 * Normalise et extrait les informations d'un CV existant depuis du texte brut.
 * @param {string} rawText 
 * @returns {object} Données de CV structurées
 */
export function parseResumeText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return {
      firstName: '',
      lastName: '',
      role: '',
      email: '',
      phone: '',
      city: '',
      website: '',
      linkedin: '',
      summary: '',
      experiences: [],
      educations: [],
      skills: [],
      languages: [],
      interests: [],
    }
  }

  // 0. Format JSON exporté préalable
  try {
    const jsonCandidate = JSON.parse(rawText)
    if (jsonCandidate.resume || jsonCandidate.firstName || jsonCandidate.email) {
      const r = jsonCandidate.resume || jsonCandidate
      return {
        firstName: r.firstName || '',
        lastName: r.lastName || '',
        role: r.role || '',
        email: r.email || '',
        phone: r.phone || '',
        city: r.city || '',
        website: r.website || '',
        linkedin: r.linkedin || '',
        facebook: r.facebook || '',
        x: r.x || '',
        threads: r.threads || '',
        summary: r.summary || '',
        experiences: Array.isArray(r.experiences) ? r.experiences : [],
        educations: Array.isArray(r.educations) ? r.educations : [],
        skills: Array.isArray(r.skills) ? r.skills : [],
        languages: Array.isArray(r.languages) ? r.languages : [],
        interests: Array.isArray(r.interests) ? r.interests : [],
      }
    }
  } catch {
    // Continue avec l'analyse heuristique du texte
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  const text = rawText.replace(/\r\n/g, '\n')

  // 1. Extraction d'adresse email
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
  const email = emailMatch ? emailMatch[0].trim() : ''

  // 2. Extraction du numéro de téléphone
  const phoneMatch = text.match(/(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{2,4}[\s.-]?\d{2,4}[\s.-]?\d{2,4}/)
  const phone = phoneMatch && phoneMatch[0].replace(/\D/g, '').length >= 8 ? phoneMatch[0].trim() : ''

  // 3. Extraction de liens sociaux (LinkedIn, site web, etc.)
  const linkedinMatch = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i)
  const linkedin = linkedinMatch ? `https://linkedin.com/in/${linkedinMatch[1]}` : ''

  const websiteMatch = text.match(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.(?:com|org|io|dev|fr|net|me|africa|cm|ci|sn)[^\s]*)/i)
  const website = websiteMatch && !websiteMatch[0].includes('linkedin') ? websiteMatch[0].trim() : ''

  // 4. Détection de ville / pays (dans les premières lignes d'en-tête)
  let city = ''
  for (let i = 0; i < Math.min(10, lines.length); i += 1) {
    const line = lines[i]
    if (/^[•\-\*▪►]/.test(line) || /\b(?:19|20)\d{2}\b/.test(line)) continue
    const parts = line.split(/[|·•/]/).map((p) => p.trim())
    for (const part of parts) {
      if (part.includes('@') || /^\+?\d{6,}/.test(part) || part.length > 50) continue
      const cityMatch = part.match(/\b(Douala|Yaoundé|Yaounde|Abidjan|Dakar|Libreville|Brazzaville|Lomé|Lome|Cotonou|Kinshasa|Bamako|Ouagadougou|Niamey|N'Djamena|Paris|Lyon|Marseille|Bruxelles|Montréal|Montreal|Genève|Geneve|Casablanca|Rabat|Tunis|Alger|Cameroun|Sénégal|Senegal|Côte d'Ivoire|Cote d'Ivoire|France|Belgique|Canada)\b/i)
      if (cityMatch) {
        city = part.replace(/^(adresse|ville|localisation|domicile|residence)\s*[:\-]\s*/i, '').trim().slice(0, 45)
        break
      }
    }
    if (city) break
  }

  // 5. Détection du Nom et Prénom sur les premières lignes
  let firstName = ''
  let lastName = ''
  let role = ''

  const bannedHeadingWords = ['curriculum', 'vitae', 'cv', 'resume', 'profil', 'contact', 'telephone', 'email']
  const candidateNameLines = lines.slice(0, 8).filter((line) => {
    const l = line.toLowerCase()
    if (bannedHeadingWords.some((w) => l === w || l === `cv ${w}`)) return false
    if (l.includes('@') || l.includes('http') || l.includes('.com')) return false
    if (/^\+?\d[\d\s.-]+$/.test(line)) return false
    if (line === city) return false
    if (/^[•\-\*▪►]/.test(line)) return false
    return line.length > 2 && line.length < 50
  })

  if (candidateNameLines.length > 0) {
    const nameWords = candidateNameLines[0].split(/\s+/).filter(Boolean)
    if (nameWords.length >= 2) {
      firstName = nameWords[0]
      lastName = nameWords.slice(1).join(' ')
    } else if (nameWords.length === 1) {
      firstName = nameWords[0]
      if (candidateNameLines.length > 1 && candidateNameLines[1].split(/\s+/).length <= 2) {
        lastName = candidateNameLines[1]
      }
    }

    if (candidateNameLines.length > 1) {
      const potentialRole = candidateNameLines[1]
      if (potentialRole !== lastName && !potentialRole.includes('@')) {
        role = potentialRole
      }
    }
  }

  // 6. Découpage intelligent par sections du CV
  const sectionIndices = []
  lines.forEach((line, index) => {
    if (index < 2) return // L'en-tête (nom & rôle) n'est jamais un titre de section
    const detectedKey = detectSectionHeading(line)
    if (detectedKey) {
      sectionIndices.push({ section: detectedKey, lineIndex: index, rawLine: line })
    }
  })

  // Trie par ordre d'apparition
  sectionIndices.sort((a, b) => a.lineIndex - b.lineIndex)

  // Construction des blocs de chaque section
  const sectionBlocks = {}
  for (let i = 0; i < sectionIndices.length; i += 1) {
    const current = sectionIndices[i]
    const next = sectionIndices[i + 1]
    const start = current.lineIndex + 1
    const end = next ? next.lineIndex : lines.length
    const sectionContent = lines.slice(start, end)
    if (!sectionBlocks[current.section]) {
      sectionBlocks[current.section] = []
    }
    sectionBlocks[current.section].push(...sectionContent)
  }

  // 7. Extraction du résumé / description
  let summary = ''
  if (sectionBlocks.summary && sectionBlocks.summary.length > 0) {
    summary = sectionBlocks.summary.join(' ').slice(0, 600)
  }

  // 8. Extraction des expériences professionnelles
  const experiences = []
  if (sectionBlocks.experiences && sectionBlocks.experiences.length > 0) {
    const expLines = sectionBlocks.experiences
    let currentExp = null

    for (let i = 0; i < expLines.length; i += 1) {
      const line = expLines[i]
      const dateMatch = line.match(/(?:(?:19|20)\d{2}|jan|fév|fev|mar|avr|mai|juin|juil|août|aout|sept|oct|nov|déc|dec|\d{2}\/\d{4}).*?(?:(?:19|20)\d{2}|présent|present|actuel|aujourd'hui|en cours|\d{2}\/\d{4})/i)
        || line.match(/\b(19\d{2}|20\d{2})\b/)

      const isBullet = /^[•\-\*▪►]\s*/.test(line)

      if (dateMatch || (!currentExp && !isBullet)) {
        if (currentExp && (currentExp.company || currentExp.jobTitle)) {
          experiences.push(currentExp)
        }
        currentExp = {
          company: '',
          jobTitle: '',
          startDate: '',
          endDate: '',
          tasks: '',
        }

        if (dateMatch) {
          const parts = line.split(dateMatch[0])
          const titleCompanyPart = (parts[0] || parts[1] || '').trim()
          if (titleCompanyPart) {
            const splitted = titleCompanyPart.split(/[-–—|@·]|(?:\s+chez\s+)|\s+at\s+|(?:\s+à\s+)/i)
            if (splitted.length >= 2) {
              currentExp.jobTitle = splitted[0].replace(/^[•\-\*▪►\s]+|[\(\)\[\]\:\-–—\s]+$/g, '').trim()
              currentExp.company = splitted[1].replace(/^[•\-\*▪►\s]+|[\(\)\[\]\:\-–—\s]+$/g, '').trim()
            } else {
              currentExp.jobTitle = titleCompanyPart.replace(/^[•\-\*▪►\s]+|[\(\)\[\]\:\-–—\s]+$/g, '').trim()
            }
          }
          const range = parseDateRange(dateMatch[0])
          currentExp.startDate = range.startDate
          currentExp.endDate = range.endDate
        } else {
          // Ligne sans date évidente
          const splitted = line.split(/[-–—|@·]|(?:\s+chez\s+)|\s+at\s+|(?:\s+à\s+)/i)
          if (splitted.length >= 2) {
            currentExp.jobTitle = splitted[0].replace(/^[•\-\*▪►\s]+|[\(\)\[\]\:\-–—\s]+$/g, '').trim()
            currentExp.company = splitted[1].replace(/^[•\-\*▪►\s]+|[\(\)\[\]\:\-–—\s]+$/g, '').trim()
          } else {
            currentExp.jobTitle = line.replace(/^[•\-\*▪►\s]+|[\(\)\[\]\:\-–—\s]+$/g, '').trim()
          }
        }
      } else if (currentExp) {
        if (!currentExp.company && line.length < 55 && !isBullet) {
          currentExp.company = line.replace(/^[•\-\*▪►\s]+|[\(\)\[\]\:\-–—\s]+$/g, '').trim()
        } else {
          const cleanTask = line.replace(/^[•\-\*▪►]\s*/, '').trim()
          if (cleanTask) {
            currentExp.tasks = currentExp.tasks ? `${currentExp.tasks}\n${cleanTask}` : cleanTask
          }
        }
      }
    }

    if (currentExp && (currentExp.company || currentExp.jobTitle)) {
      experiences.push(currentExp)
    }
  }

  // 9. Extraction des formations
  const educations = []
  if (sectionBlocks.educations && sectionBlocks.educations.length > 0) {
    const eduLines = sectionBlocks.educations
    let currentEdu = null

    for (let i = 0; i < eduLines.length; i += 1) {
      const line = eduLines[i]
      const dateMatch = line.match(/(?:(?:19|20)\d{2}|jan|fév|fev|mar|avr|mai|juin|juil|août|aout|sept|oct|nov|déc|dec|\d{2}\/\d{4}).*?(?:(?:19|20)\d{2}|présent|present|actuel|aujourd'hui|\d{2}\/\d{4})/i)
        || line.match(/\b(19\d{2}|20\d{2})\b/)

      const isBullet = /^[•\-\*▪►]\s*/.test(line)

      if (dateMatch || (!currentEdu && !isBullet)) {
        if (currentEdu && (currentEdu.school || currentEdu.degree)) {
          educations.push(currentEdu)
        }
        currentEdu = {
          school: '',
          degree: '',
          startDate: '',
          endDate: '',
        }

        const dateStr = dateMatch ? dateMatch[0] : ''
        const lineWithoutDate = dateStr ? line.replace(dateStr, '').trim() : line
        const splitted = lineWithoutDate.split(/[-–—|@·,]|(?:\s+à\s+)|\s+at\s+/i)
        if (splitted.length >= 2) {
          currentEdu.degree = splitted[0].replace(/^[•\-\*▪►\s]+|[\(\)\[\]\:\-–—\s]+$/g, '').trim()
          currentEdu.school = splitted[1].replace(/^[•\-\*▪►\s]+|[\(\)\[\]\:\-–—\s]+$/g, '').trim()
        } else {
          currentEdu.degree = lineWithoutDate.replace(/^[•\-\*▪►\s]+|[\(\)\[\]\:\-–—\s]+$/g, '').trim()
        }
        if (dateStr) {
          const range = parseDateRange(dateStr)
          currentEdu.startDate = range.startDate
          currentEdu.endDate = range.endDate
        }
      } else if (currentEdu) {
        if (!currentEdu.school && line.length < 65 && !isBullet) {
          currentEdu.school = line.replace(/^[•\-\*▪►\s]+|[\(\)\[\]\:\-–—\s]+$/g, '').trim()
        }
      }
    }

    if (currentEdu && (currentEdu.school || currentEdu.degree)) {
      educations.push(currentEdu)
    }
  }

  // 10. Extraction des compétences
  const skills = []
  if (sectionBlocks.skills && sectionBlocks.skills.length > 0) {
    sectionBlocks.skills.forEach((line) => {
      // Évite d'ingérer par erreur des coordonnées
      if (line.includes('@') || /^\+?\d{8,}/.test(line)) return
      // Si la ligne commence par "Technologies : React, Node", on retire le préfixe
      const cleanedCategoryLine = line.replace(/^[^:]+:\s*/, '')
      const tokens = (cleanedCategoryLine || line)
        .split(/[,;•·|\/\\]/)
        .map((s) => s.replace(/^[•\-\*▪►]\s*/, '').trim())
        .filter((s) => s.length > 1 && s.length < 45 && !s.includes('@') && !/^\+?\d/.test(s))
      skills.push(...tokens)
    })
  }

  // 11. Extraction des langues
  const languages = []
  if (sectionBlocks.languages && sectionBlocks.languages.length > 0) {
    sectionBlocks.languages.forEach((line) => {
      const tokens = line.split(/[,;•·|]/).map((s) => s.trim()).filter(Boolean)
      tokens.forEach((t) => {
        const parts = t.split(/[-:()]/)
        const name = parts[0].replace(/^[•\-\*▪►\s]+/, '').trim()
        const levelStr = (parts[1] ? parts[1].replace(/[()]/g, '').trim() : '').toLowerCase()
        let level = 5
        if (levelStr.includes('bilingue') || levelStr.includes('natif') || levelStr.includes('maternelle')) {
          level = 5
        } else if (levelStr.includes('courant') || levelStr.includes('c1') || levelStr.includes('c2') || levelStr.includes('avancé') || levelStr.includes('avance')) {
          level = 4
        } else if (levelStr.includes('intermédiaire') || levelStr.includes('intermediaire') || levelStr.includes('b1') || levelStr.includes('b2') || levelStr.includes('pro')) {
          level = 3
        } else if (levelStr.includes('notion') || levelStr.includes('débutant') || levelStr.includes('debutant') || levelStr.includes('a1') || levelStr.includes('a2')) {
          level = 2
        }
        if (name && name.length < 35 && !/langue/i.test(name)) {
          languages.push({ name, level })
        }
      })
    })
  }

  // 12. Centres d'intérêt
  const interests = []
  if (sectionBlocks.interests && sectionBlocks.interests.length > 0) {
    sectionBlocks.interests.forEach((line) => {
      const tokens = line
        .split(/[,;•·|]/)
        .map((s) => s.replace(/^[•\-\*▪►\s]+/, '').trim())
        .filter((s) => s.length > 2 && s.length < 40)
      interests.push(...tokens)
    })
  }

  // 13. Fallback heuristique si aucune section formelle n'a été trouvée
  if (experiences.length === 0 && educations.length === 0 && skills.length === 0) {
    lines.forEach((line) => {
      const dateMatch = line.match(/\b(19\d{2}|20\d{2})\b/)
      if (dateMatch && line.length < 80) {
        if (/diplome|bac|licence|master|ecole|universite|institut|formation/i.test(line)) {
          educations.push({
            school: '',
            degree: line.replace(/^[•\-\*▪►\s]+/, '').trim(),
            startDate: `${dateMatch[1]}-01-01`,
            endDate: '',
          })
        } else {
          experiences.push({
            company: '',
            jobTitle: line.replace(/^[•\-\*▪►\s]+/, '').trim(),
            startDate: `${dateMatch[1]}-01-01`,
            endDate: '',
            tasks: '',
          })
        }
      }
    })
  }

  return {
    firstName: firstName || '',
    lastName: lastName || '',
    role: role || (experiences[0]?.jobTitle || ''),
    email,
    phone,
    city: city || '',
    website,
    linkedin,
    summary,
    experiences: experiences.slice(0, 10),
    educations: educations.slice(0, 8),
    skills: Array.from(new Set(skills)).slice(0, 20),
    languages: languages.slice(0, 8),
    interests: Array.from(new Set(interests)).slice(0, 10),
  }
}
