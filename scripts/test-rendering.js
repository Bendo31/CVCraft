import assert from 'node:assert'

// Test de simulation de la structure des données transmises à ResumeDocument
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

// Scénario 1 : Données incomplètes avec des champs null / undefined
const problematicResumes = [
  {},
  { skills: null, interests: null, experiences: null },
  { skills: undefined, languages: undefined, educations: undefined },
  {
    firstName: 'Jean',
    lastName: 'Dupont',
    role: 'Développeur Web',
    experiences: [{ company: 'Acme', jobTitle: 'Dev', startDate: '2023', endDate: '2024', tasks: 'Code\nTest' }],
    skills: ['JavaScript', 'React'],
    interests: ['Football'],
  },
]

for (const raw of problematicResumes) {
  const resume = {
    ...defaultResume,
    ...raw,
    sectionVisibility: {
      ...defaultResume.sectionVisibility,
      ...(raw.sectionVisibility || {}),
      personal: raw.sectionVisibility?.personal ?? true,
    },
    experiences: Array.isArray(raw.experiences) ? raw.experiences : defaultResume.experiences,
    educations: Array.isArray(raw.educations) ? raw.educations : defaultResume.educations,
    skills: Array.isArray(raw.skills) ? raw.skills : defaultResume.skills,
    languages: Array.isArray(raw.languages) ? raw.languages : defaultResume.languages,
    projects: Array.isArray(raw.projects) ? raw.projects : defaultResume.projects,
    references: Array.isArray(raw.references) ? raw.references : defaultResume.references,
    certifications: Array.isArray(raw.certifications) ? raw.certifications : defaultResume.certifications,
    interests: Array.isArray(raw.interests) ? raw.interests : defaultResume.interests,
  }

  // Vérifier qu'aucun tableau n'est null ou undefined
  assert(Array.isArray(resume.experiences), 'experiences doit être un tableau')
  assert(Array.isArray(resume.educations), 'educations doit être un tableau')
  assert(Array.isArray(resume.skills), 'skills doit être un tableau')
  assert(Array.isArray(resume.languages), 'languages doit être un tableau')
  assert(Array.isArray(resume.projects), 'projects doit être un tableau')
  assert(Array.isArray(resume.references), 'references doit être un tableau')
  assert(Array.isArray(resume.certifications), 'certifications doit être un tableau')
  assert(Array.isArray(resume.interests), 'interests doit être un tableau')

  // Tester les opérations critiques qui faisaient planter ResumeDocument auparavant :
  assert.doesNotThrow(() => {
    resume.skills.filter(Boolean)
    resume.interests.filter(Boolean)
    resume.references.map(r => r.name)
    resume.languages.map(l => l.name)
    resume.certifications.map(c => c.name)
    resume.experiences.slice(0, 3).forEach(e => {})
    resume.educations.forEach(e => {})
  }, 'Aucune opération sur les listes ne doit lever d’erreur')
}

console.log('✅ Tous les tests de normalisation et de manipulation des listes ont réussi avec succès !')
