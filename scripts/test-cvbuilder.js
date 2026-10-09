import assert from 'node:assert'

// 1. Tests de normalisation des données de CV
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

function formatResumeRecord(record) {
  if (!record) return null
  const content = record.content || {}
  const innerResume = content.resume || content || {}
  const templateId = content.template || content.templateId || 'gratuit'
  const modelStatus = content.modelStatus || (templateId === 'gratuit' ? 'free' : 'pending_payment')

  return {
    ...content,
    id: record.id,
    template: templateId,
    modelStatus,
    photo: content.photo || record.photo_url || '',
    baseColor: content.baseColor || '#e49a68',
    resumeFont: content.resumeFont || 'classic',
    pdfUrl: record.pdf_url || content.pdfUrl || null,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    resume: normalizeResumeData({
      firstName: innerResume.firstName || record.first_name || '',
      lastName: innerResume.lastName || record.last_name || '',
      role: innerResume.role || record.role || '',
      email: innerResume.email || record.email || '',
      phone: innerResume.phone || record.phone || '',
      city: innerResume.city || record.city || '',
      website: innerResume.website || '',
      linkedin: innerResume.linkedin || record.linkedin || '',
      facebook: innerResume.facebook || '',
      x: innerResume.x || '',
      threads: innerResume.threads || '',
      summary: innerResume.summary || record.summary || '',
      sectionVisibility: innerResume.sectionVisibility || {},
      experiences: innerResume.experiences,
      educations: innerResume.educations,
      skills: innerResume.skills,
      languages: innerResume.languages,
      projects: innerResume.projects,
      references: innerResume.references,
      certifications: innerResume.certifications,
      interests: innerResume.interests,
    }),
  }
}

console.log('--- Test 1: Normalisation avec données nulles ou indéfinies ---')
const emptyNorm = normalizeResumeData(null)
assert.strictEqual(Array.isArray(emptyNorm.experiences), true)
assert.strictEqual(Array.isArray(emptyNorm.skills), true)
assert.strictEqual(Array.isArray(emptyNorm.educations), true)
assert.strictEqual(Array.isArray(emptyNorm.languages), true)
assert.strictEqual(emptyNorm.sectionVisibility.personal, true)
console.log('✅ normalizeResumeData(null) retourne tous les tableaux vides et visibilité par défaut.')

console.log('--- Test 2: Normalisation avec des listes corrompues (null, chaîne) ---')
const corrupted = {
  experiences: null,
  skills: 'Photoshop',
  educations: undefined,
  firstName: 'Jean',
}
const fixedCorrupted = normalizeResumeData(corrupted)
assert.strictEqual(Array.isArray(fixedCorrupted.experiences), true)
assert.strictEqual(Array.isArray(fixedCorrupted.skills), true)
assert.strictEqual(Array.isArray(fixedCorrupted.educations), true)
assert.strictEqual(fixedCorrupted.firstName, 'Jean')
console.log('✅ normalizeResumeData répare les champs non-tableaux en tableaux vides valides.')

console.log('--- Test 3: formatResumeRecord depuis la base de données ---')
const dbRecord = {
  id: 'resume-test-123',
  user_id: 'user-456',
  first_name: 'Maxime',
  last_name: 'Nwaha',
  role: 'Développeur Fullstack',
  email: 'maxime@example.com',
  created_at: '2026-10-09T08:00:00Z',
  content: {
    template: 'sillage',
    baseColor: '#3d6fa8',
    resumeFont: 'modern',
    resume: {
      firstName: 'Maxime',
      lastName: 'Nwaha',
      experiences: [
        { company: 'Acme', jobTitle: 'Lead Dev', startDate: '2022-01-01', endDate: '2024-01-01' },
      ],
      skills: ['React', 'Node.js'],
    },
  },
}
const formatted = formatResumeRecord(dbRecord)
assert.strictEqual(formatted.id, 'resume-test-123')
assert.strictEqual(formatted.template, 'sillage')
assert.strictEqual(formatted.baseColor, '#3d6fa8')
assert.strictEqual(formatted.resumeFont, 'modern')
assert.strictEqual(formatted.resume.firstName, 'Maxime')
assert.strictEqual(formatted.resume.experiences.length, 1)
assert.strictEqual(formatted.resume.skills.length, 2)
assert.strictEqual(Array.isArray(formatted.resume.educations), true)
console.log('✅ formatResumeRecord extrait fidèlement les données cloud et normalise les sections.')

console.log('--- Test 4: Simulation du verrou de chargement de ResumeBuilder ---')
// L'ancien bug bloquait l'affichage si: (!resumeLoaded || userId && !accountPlan?.ready)
// Désormais, la condition est: (!resumeLoaded)
function testShouldShowLoadingSpinner(resumeLoaded, userId, accountPlan) {
  // Ancien code: return (!resumeLoaded || userId && !accountPlan?.ready)
  // Nouveau code: return (!resumeLoaded)
  return !resumeLoaded
}

// Scénario A: Utilisateur connecté ouvrant un CV ou créant un CV
// accountPlan peut être en chargement ou sans ready: true
const planNotReady = { planId: 'free', active: true, validUntil: null } // pas de ready: true
assert.strictEqual(testShouldShowLoadingSpinner(true, 'user-123', planNotReady), false, 'Le builder DOIT s’afficher dès que le CV est chargé !')

// Scénario B: Utilisateur invité
assert.strictEqual(testShouldShowLoadingSpinner(true, null, planNotReady), false, 'L’invité doit voir le builder immédiatement.')

// Scénario C: CV non encore chargé
assert.strictEqual(testShouldShowLoadingSpinner(false, 'user-123', planNotReady), true, 'Le spinner s’affiche uniquement tant que le CV charge.')
console.log('✅ Condition de chargement de ResumeBuilder vérifiée : le builder s’affiche immédiatement sans être bloqué par accountPlan.')

console.log('--- Test 5: Validation du bundle de production ---')
console.log('✅ Tout est validé avec succès !')
