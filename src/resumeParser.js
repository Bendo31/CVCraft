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

      return pagesText.join('\n\n')
    } catch (pdfErr) {
      console.error('Erreur lors de l’extraction PDF avec pdfjs:', pdfErr)
      throw new Error('Impossible de lire le document PDF. Vérifiez qu’il n’est pas protégé par un mot de passe.')
    }
  }

  throw new Error('Format de fichier non pris en charge. Veuillez importer un fichier PDF, TXT ou JSON.')
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
  const rangeMatch = text.match(/(?:(?:19|20)\d{2}|janv?|févr?|fevr?|mars?|avr|mai|juin|juil|août|aout|sept?|oct|nov|déc|dec|\d{1,2}\/\d{4})[^\-–—àa/]*?(?:[-–—à]|au|\bto\b)\s*?(?:(?:19|20)\d{2}|janv?|févr?|fevr?|mars?|avr|mai|juin|juil|août|aout|sept?|oct|nov|déc|dec|\d{1,2}\/\d{4}|présent|present|actuel|aujourd'hui)/i)

  if (rangeMatch) {
    const rawRange = rangeMatch[0]
    const parts = rawRange.split(/[-–—]|(?:\s+à\s+)|\bau\b|\bto\b/i)
    const startPart = parts[0]?.trim() || ''
    const endPart = parts[1]?.trim() || ''
    const isCurrent = /présent|present|actuel|aujourd'hui/i.test(endPart)
    return {
      startDate: normalizeDateToIso(startPart),
      endDate: isCurrent ? '' : normalizeDateToIso(endPart),
      matchedText: rawRange,
    }
  }

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

  // Si c'est un format JSON exporté
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

  // 4. Détection de ville / localisation
  let city = ''
  const locationRegex = /(?:à\s+|adresse\s*:\s*|ville\s*:\s*|localisation\s*:\s*)?([A-ZÀ-ÿ][a-zà-ÿ\-]+(?:\s*,\s*[A-ZÀ-ÿ][a-zà-ÿ\-]+)?)/
  const cityCandidates = lines.slice(0, 10).filter((line) => {
    if (line.includes('@') || line.includes('http') || /^\+?\d/.test(line)) return false
    return /\b(Douala|Yaoundé|Abidjan|Dakar|Libreville|Brazzaville|Lomé|Cotonou|Kinshasa|Bamako|Ouagadougou|Niamey|N'Djamena|Paris|Lyon|Marseille|Bruxelles|Montréal|Genève|Casablanca|Rabat|Tunis|Alger|Cameroun|Sénégal|Côte d'Ivoire|France|Belgique|Canada)\b/i.test(line)
  })
  if (cityCandidates.length > 0) {
    city = cityCandidates[0].replace(/^(adresse|ville|localisation|domicile)\s*[:\-]\s*/i, '').trim().slice(0, 50)
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

    // Le titre/rôle est souvent sur la 2e ou 3e ligne utile
    if (candidateNameLines.length > 1) {
      const potentialRole = candidateNameLines[1]
      if (potentialRole !== lastName && !potentialRole.includes('@')) {
        role = potentialRole
      }
    }
  }

  // 5. Découpage par sections du CV
  const sectionKeywords = {
    experiences: [
      'expériences professionnelles',
      'expérience professionnelle',
      'expériences',
      'experience',
      'work experience',
      'parcours professionnel',
      'emplois',
      'stages',
    ],
    educations: [
      'formation académique',
      'formation',
      'formations',
      'education',
      'études',
      'etudes',
      'diplômes',
      'diplomes',
      'cursus',
    ],
    skills: [
      'compétences',
      'competences',
      'skills',
      'compétences techniques',
      'outils et technologies',
      'savoir-faire',
      'aptitudes',
    ],
    languages: [
      'langues',
      'languages',
      'langues maîtrisées',
      'langues maitrisees',
    ],
    interests: [
      'centres d’intérêt',
      'centres d\'intérêt',
      'centres d’interet',
      'centres d\'interet',
      'loisirs',
      'hobbies',
      'intérêts',
    ],
    summary: [
      'profil professionnel',
      'profil',
      'résumé',
      'resume',
      'à propos',
      'a propos',
      'synthèse',
      'objectif',
      'about me',
    ],
  }

  // Détection des positions de chaque section
  const sectionIndices = []
  lines.forEach((line, index) => {
    const cleanLine = line.toLowerCase().replace(/[:\-_#]/g, '').trim()
    for (const [key, keywords] of Object.entries(sectionKeywords)) {
      if (keywords.some((kw) => cleanLine === kw || cleanLine.startsWith(`${kw} `))) {
        sectionIndices.push({ section: key, lineIndex: index })
        break
      }
    }
  })

  // Trie par ordre d'apparition
  sectionIndices.sort((a, b) => a.lineIndex - b.lineIndex)

  const sectionBlocks = {}
  for (let i = 0; i < sectionIndices.length; i += 1) {
    const current = sectionIndices[i]
    const next = sectionIndices[i + 1]
    const start = current.lineIndex + 1
    const end = next ? next.lineIndex : lines.length
    sectionBlocks[current.section] = lines.slice(start, end)
  }

  // 6. Extraction du résumé / description
  let summary = ''
  if (sectionBlocks.summary && sectionBlocks.summary.length > 0) {
    summary = sectionBlocks.summary.join(' ').slice(0, 600)
  }

  // 7. Extraction des expériences professionnelles
  const experiences = []
  if (sectionBlocks.experiences && sectionBlocks.experiences.length > 0) {
    const expLines = sectionBlocks.experiences
    let currentExp = null

    for (let i = 0; i < expLines.length; i += 1) {
      const line = expLines[i]
      // Détection de dates (ex: "2020 - 2023", "Janvier 2021 à Présent", "06/2019 - 09/2022")
      const dateMatch = line.match(/(?:(?:19|20)\d{2}|jan|fév|mar|avr|mai|juin|juil|août|aout|sept|oct|nov|déc|\d{2}\/\d{4}).*?(?:(?:19|20)\d{2}|présent|present|actuel|aujourd'hui|\d{2}\/\d{4})/i) || line.match(/\b(19\d{2}|20\d{2})\b/)

      if (dateMatch || !currentExp) {
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

        // Tente d'extraire date et titre/entreprise
        if (dateMatch) {
          const parts = line.split(dateMatch[0])
          const titleCompanyPart = (parts[0] || parts[1] || '').trim()
          if (titleCompanyPart) {
            const splitted = titleCompanyPart.split(/[-–—|@·]/)
            if (splitted.length >= 2) {
              currentExp.jobTitle = splitted[0].replace(/^[\(\[\:\-–—\s]+|[\(\)\[\]\:\-–—\s]+$/g, '').trim()
              currentExp.company = splitted[1].replace(/^[\(\[\:\-–—\s]+|[\(\)\[\]\:\-–—\s]+$/g, '').trim()
            } else {
              currentExp.jobTitle = titleCompanyPart.replace(/^[\(\[\:\-–—\s]+|[\(\)\[\]\:\-–—\s]+$/g, '').trim()
            }
          }
          const range = parseDateRange(dateMatch[0])
          currentExp.startDate = range.startDate
          currentExp.endDate = range.endDate
        } else {
          // Ligne sans date évidente : titre ou entreprise
          const splitted = line.split(/[-–—|@·]/)
          if (splitted.length >= 2) {
            currentExp.jobTitle = splitted[0].replace(/^[\(\[\:\-–—\s]+|[\(\)\[\]\:\-–—\s]+$/g, '').trim()
            currentExp.company = splitted[1].replace(/^[\(\[\:\-–—\s]+|[\(\)\[\]\:\-–—\s]+$/g, '').trim()
          } else {
            currentExp.jobTitle = line.replace(/^[\(\[\:\-–—\s]+|[\(\)\[\]\:\-–—\s]+$/g, '').trim()
          }
        }
      } else if (currentExp) {
        if (!currentExp.company && line.length < 50 && !line.startsWith('•') && !line.startsWith('-')) {
          currentExp.company = line.replace(/^[\(\[\:\-–—\s]+|[\(\)\[\]\:\-–—\s]+$/g, '').trim()
        } else {
          // Description / tâches
          const cleanTask = line.replace(/^[•\-\*]\s*/, '').trim()
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

  // 8. Extraction des formations
  const educations = []
  if (sectionBlocks.educations && sectionBlocks.educations.length > 0) {
    const eduLines = sectionBlocks.educations
    let currentEdu = null

    for (let i = 0; i < eduLines.length; i += 1) {
      const line = eduLines[i]
      const dateMatch = line.match(/(?:(?:19|20)\d{2}|jan|fév|mar|avr|mai|juin|juil|août|aout|sept|oct|nov|déc|\d{2}\/\d{4}).*?(?:(?:19|20)\d{2}|présent|present|actuel|aujourd'hui|\d{2}\/\d{4})/i) || line.match(/\b(19\d{2}|20\d{2})\b/)

      if (dateMatch || !currentEdu) {
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
        const splitted = lineWithoutDate.split(/[-–—|@·,]/)
        if (splitted.length >= 2) {
          currentEdu.degree = splitted[0].replace(/^[\(\[\:\-–—\s]+|[\(\)\[\]\:\-–—\s]+$/g, '').trim()
          currentEdu.school = splitted[1].replace(/^[\(\[\:\-–—\s]+|[\(\)\[\]\:\-–—\s]+$/g, '').trim()
        } else {
          currentEdu.degree = lineWithoutDate.replace(/^[\(\[\:\-–—\s]+|[\(\)\[\]\:\-–—\s]+$/g, '').trim()
        }
        if (dateStr) {
          const range = parseDateRange(dateStr)
          currentEdu.startDate = range.startDate
          currentEdu.endDate = range.endDate
        }
      } else if (currentEdu) {
        if (!currentEdu.school && line.length < 60) {
          currentEdu.school = line.replace(/^[\(\[\:\-–—\s]+|[\(\)\[\]\:\-–—\s]+$/g, '').trim()
        }
      }
    }

    if (currentEdu && (currentEdu.school || currentEdu.degree)) {
      educations.push(currentEdu)
    }
  }

  // 9. Extraction des compétences
  const skills = []
  if (sectionBlocks.skills && sectionBlocks.skills.length > 0) {
    sectionBlocks.skills.forEach((line) => {
      // Découpe par virgules, puces ou points-virgules
      const tokens = line
        .split(/[,;•·|\/\\]/)
        .map((s) => s.replace(/^[•\-\*]\s*/, '').trim())
        .filter((s) => s.length > 1 && s.length < 40)
      skills.push(...tokens)
    })
  }

  // 10. Extraction des langues
  const languages = []
  if (sectionBlocks.languages && sectionBlocks.languages.length > 0) {
    sectionBlocks.languages.forEach((line) => {
      const tokens = line.split(/[,;•·|]/).map((s) => s.trim()).filter(Boolean)
      tokens.forEach((t) => {
        const parts = t.split(/[-:()]/)
        const name = parts[0].trim()
        const levelStr = (parts[1] ? parts[1].replace(/[()]/g, '').trim() : '').toLowerCase()
        let level = 5
        if (levelStr.includes('bilingue') || levelStr.includes('natif') || levelStr.includes('maternelle')) {
          level = 5
        } else if (levelStr.includes('courant') || levelStr.includes('c1') || levelStr.includes('c2') || levelStr.includes('avancé')) {
          level = 4
        } else if (levelStr.includes('intermédiaire') || levelStr.includes('b1') || levelStr.includes('b2') || levelStr.includes('pro')) {
          level = 3
        } else if (levelStr.includes('notion') || levelStr.includes('débutant') || levelStr.includes('a1') || levelStr.includes('a2')) {
          level = 2
        }
        if (name && name.length < 30) {
          languages.push({ name, level })
        }
      })
    })
  }

  // 11. Centres d'intérêt
  const interests = []
  if (sectionBlocks.interests && sectionBlocks.interests.length > 0) {
    sectionBlocks.interests.forEach((line) => {
      const tokens = line.split(/[,;•·|]/).map((s) => s.trim()).filter((s) => s.length > 2 && s.length < 30)
      interests.push(...tokens)
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
    experiences: experiences.slice(0, 8),
    educations: educations.slice(0, 6),
    skills: Array.from(new Set(skills)).slice(0, 16),
    languages: languages.slice(0, 6),
    interests: Array.from(new Set(interests)).slice(0, 8),
  }
}

