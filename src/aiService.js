/**
 * Service IA gratuit pour l'optimisation et la rédaction de descriptions de CV
 * - Fournisseur gratuit 1 : Pollinations.ai (OpenAI / Mistral, sans clé requise, CORS ouvert)
 * - Fournisseur optionnel 2 : Google Gemini (si VITE_GEMINI_API_KEY est configurée)
 * - Algorithme de secours : Générateur contextuel RH intelligent (garantie de disponibilité sans interruption)
 */

export async function improveResumeSummaryWithAi({
  currentSummary = '',
  role = '',
  experiences = [],
  skills = [],
  educations = [],
} = {}) {
  // Construire un contexte riche et pertinent
  const expContext = (experiences || [])
    .filter((e) => e.jobTitle || e.company)
    .slice(0, 3)
    .map((e) => `${e.jobTitle || ''} chez ${e.company || ''}`.trim())
    .join(', ')

  const skillsContext = (skills || []).filter(Boolean).slice(0, 6).join(', ')
  const eduContext = (educations || []).filter((e) => e.degree).map((e) => e.degree).slice(0, 2).join(', ')

  let userInstruction = ''
  if (currentSummary && currentSummary.trim().length > 10) {
    userInstruction = `Voici ma description actuelle de CV :\n"${currentSummary.trim()}"\n\n`
    if (role) userInstruction += `Mon métier / intitulé du poste : ${role}.\n`
    if (expContext) userInstruction += `Mes expériences : ${expContext}.\n`
    if (skillsContext) userInstruction += `Mes compétences clés : ${skillsContext}.\n`
    userInstruction += `\nAméliore et reformule cette description en un profil professionnel percutant, fluide et valorisant pour un recruteur.`
  } else {
    userInstruction = `Rédige une accroche professionnelle percutante pour mon profil de CV.`
    if (role) userInstruction += ` Métier / poste : ${role}.`
    if (expContext) userInstruction += ` Expériences : ${expContext}.`
    if (skillsContext) userInstruction += ` Compétences : ${skillsContext}.`
    if (eduContext) userInstruction += ` Formation : ${eduContext}.`
    userInstruction += `\nLe profil doit mettre en avant mes compétences, mon engagement et ma motivation.`
  }

  const systemPrompt = `Tu es un expert RH et consultant senior en recrutement pour le marché francophone.
Ta mission : rédiger ou améliorer le paragraphe de présentation ("Profil professionnel" / "Description") d'un CV.
Règles strictes :
1. Rédige un texte fluide, moderne et percutant en français (2 à 4 phrases bien tournées, environ 45 à 75 mots).
2. Met en valeur les compétences, l'expérience pratique et la valeur ajoutée pour l'entreprise.
3. Reste professionnel, dynamique et sobre (évite le bavardage inutile, les clichés vides ou les superlatifs excessifs).
4. Fournis UNIQUEMENT le texte final prêt à être inséré dans le CV.
5. NE METS PAS de guillemets, NE METS PAS de titre ("Profil :"), NE METS PAS de formule de politesse ni d'explication.`

  // 1. Si une clé Gemini est présente dans l'environnement, essayer Gemini
  const geminiApiKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) || ''
  if (geminiApiKey) {
    try {
      const geminiRes = await callGeminiApi(geminiApiKey, systemPrompt, userInstruction)
      const cleaned = cleanAiOutput(geminiRes)
      if (cleaned && cleaned.length >= 25) {
        return cleaned
      }
    } catch (err) {
      console.warn('Erreur Gemini API, bascule vers Pollinations gratuit:', err)
    }
  }

  // 2. Appel au service IA gratuit Pollinations.ai (sans clé requise)
  try {
    const aiText = await callPollinationsApi(systemPrompt, userInstruction)
    const cleaned = cleanAiOutput(aiText)
    if (cleaned && cleaned.length >= 25) {
      return cleaned
    }
  } catch (err) {
    console.warn('API Pollinations indisponible ou lente, utilisation du modèle contextuel RH:', err)
  }

  // 3. Fallback immédiat : Générateur contextuel RH intelligent
  return generateSmartSummaryFallback({
    role,
    currentSummary,
    experiences,
    skills,
    educations,
  })
}

async function callPollinationsApi(systemPrompt, userInstruction) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)

  try {
    const prompt = encodeURIComponent(`${systemPrompt}\n\nDemande utilisateur:\n${userInstruction}`)
    const response = await fetch(`https://text.pollinations.ai/${prompt}?model=openai`, {
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const text = await response.text()
    return text.trim()
  } finally {
    clearTimeout(timeoutId)
  }
}

async function callGeminiApi(apiKey, systemPrompt, userInstruction) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000)

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: `${systemPrompt}\n\n${userInstruction}` }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 200,
          temperature: 0.7,
        },
      }),
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`Gemini HTTP ${response.status}`)
    const data = await response.json()
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Modèle contextuel RH intelligent de secours
 * Garantit qu'un profil de haute qualité est toujours généré même en cas de coupure réseau
 */
export function generateSmartSummaryFallback({
  role = '',
  currentSummary = '',
  experiences = [],
  skills = [],
} = {}) {
  const cleanRole = role ? role.trim() : 'Professionnel engagé'
  const topSkills = (skills || []).filter(Boolean).slice(0, 3).join(', ')
  const mainExp = experiences?.[0]

  if (currentSummary && currentSummary.trim().length > 15) {
    const trimmed = currentSummary.trim()
    const firstPeriod = trimmed.indexOf('.')
    const firstSentence = firstPeriod > 10 ? trimmed.slice(0, firstPeriod + 1) : trimmed
    return `${cleanRole} dynamique et orienté résultats, ${firstSentence.charAt(0).toLowerCase() + firstSentence.slice(1)} Reconnu pour mon sens de l’organisation, mon autonomie et ma capacité d’adaptation, je souhaite mettre mes compétences au service d’une équipe ambitieuse pour relever de nouveaux défis.`
  }

  if (mainExp && mainExp.jobTitle) {
    return `${cleanRole} fort d'une expérience probante en tant que ${mainExp.jobTitle}${mainExp.company ? ` chez ${mainExp.company}` : ''}, je maîtrise ${topSkills ? `notamment ${topSkills}` : "les fondamentaux du métier"}. Doté d’un excellent esprit d’équipe et d’un sens aigu du travail bien fait, je suis déterminé à contribuer activement à vos objectifs d’entreprise.`
  }

  return `${cleanRole} motivé et rigoureux${topSkills ? `, doté de solides compétences en ${topSkills}` : ''}. Passionné par mon secteur d'activité, j’allie esprit d'initiative, réactivité et soif d’apprentissage au service de projets collectifs à fort impact.`
}

function cleanAiOutput(raw) {
  if (!raw) return ''
  return raw
    .replace(/^["'«“](.*)["'»”]$/s, '$1')
    .replace(/^(Voici|Proposition|Description|Profil professionnel|Accroche)\s*:\s*/i, '')
    .trim()
}
