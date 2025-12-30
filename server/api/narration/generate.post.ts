import { GoogleGenerativeAI } from '@google/generative-ai'

type NarrationContext = 'night_start' | 'werewolves_wake' | 'werewolves_done' | 'seer_wake' | 'seer_done' | 'witch_wake' | 'witch_done' | 'day_start' | 'death_announce' | 'vote_start' | 'vote_result' | 'hunter_death' | 'game_end'

// Contexts that benefit from AI generation (story-critical moments)
const AI_CONTEXTS: NarrationContext[] = [
  'night_start',
  'werewolves_wake',
  'day_start',
  'death_announce',
  'vote_result',
  'hunter_death',
  'game_end'
]

// Contexts that use fallback (simple transitions, no story value)
// werewolves_done, seer_wake, seer_done, witch_wake, witch_done, vote_start

interface NarrationRequest {
  context: NarrationContext
  data?: {
    // Basic info
    victimName?: string
    killedBy?: 'werewolves' | 'witch' | 'hunter' | 'village'
    winner?: 'village' | 'werewolf'
    dayNumber?: number
    // Game stats
    playerCount?: number
    aliveCount?: number
    werewolvesCount?: number
    villagersCount?: number
    // Player context
    playerNames?: string[]
    deadPlayers?: string[]
    revealedRoles?: { name: string; role: string }[]
    // History
    lastVictim?: string
    totalDeaths?: number
    // Story context
    storyTheme?: string
    previousEvents?: string[]
  }
}

// Story themes for unique game atmospheres
const STORY_THEMES = [
  'Un village de pêcheurs au bord d\'un lac noir où la brume ne se lève jamais',
  'Un hameau de montagne isolé par les neiges, coupé du monde depuis des semaines',
  'Une bourgade forestière où les arbres semblent murmurer la nuit',
  'Un village de vignerons dont le vin a un étrange goût de fer cette année',
  'Une communauté de mineurs où les tunnels cachent plus que du charbon',
  'Un bourg côtier battu par les tempêtes où les marins disparaissent en mer',
  'Un village de bûcherons où la forêt reprend ses droits chaque nuit',
  'Une bourgade marchande sur une route oubliée, dernier refuge avant les terres sauvages'
]

// Cache for story themes per game session
const gameStoryCache: Map<string, { theme: string; events: string[] }> = new Map()

// Rate limiting: track last API call time
let lastApiCallTime = 0
const MIN_API_DELAY_MS = 500 // Minimum 500ms between API calls

async function waitForRateLimit(): Promise<void> {
  const now = Date.now()
  const elapsed = now - lastApiCallTime
  if (elapsed < MIN_API_DELAY_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_API_DELAY_MS - elapsed))
  }
  lastApiCallTime = Date.now()
}

function getOrCreateStoryContext(gameId?: string): { theme: string; events: string[] } {
  if (gameId && gameStoryCache.has(gameId)) {
    return gameStoryCache.get(gameId)!
  }

  const theme = STORY_THEMES[Math.floor(Math.random() * STORY_THEMES.length)]
  const context = { theme: theme!, events: [] }

  if (gameId) {
    gameStoryCache.set(gameId, context)
    // Clean old entries (keep max 100 games)
    if (gameStoryCache.size > 100) {
      const firstKey = gameStoryCache.keys().next().value
      if (firstKey) gameStoryCache.delete(firstKey)
    }
  }

  return context
}

const SYSTEM_PROMPT = `Tu es le maître du jeu d'une partie de Loup-Garou, un conteur qui tisse une histoire unique et cohérente tout au long de la partie.

PERSONNALITÉ: Narrateur de conte macabre. Voix grave, posée, parfois menaçante. Tu racontes une VRAIE histoire, pas des phrases génériques.

RÈGLES NARRATIVES:
- Maximum 2-3 phrases (60 mots max)
- Fais RÉFÉRENCE aux événements passés de la partie
- Utilise le THÈME du village fourni pour ancrer l'histoire
- Nomme les personnages quand c'est pertinent
- Plus la partie avance, plus le ton devient désespéré
- Chaque narration doit CONSTRUIRE sur la précédente

STYLE LITTÉRAIRE:
- Métaphores: lune sanglante, ombres mouvantes, brume glaciale, hurlements lointains
- Sensations: froid, silence oppressant, odeur de mort, craquements
- JAMAIS d'emojis, guillemets, ou parenthèses
- Phrases courtes et percutantes

EXEMPLES DE PROGRESSION:
Nuit 1: "Le brouillard engloutit le village des pêcheurs. Dans l'obscurité, quelque chose s'éveille."
Nuit 2 après un mort: "Une deuxième nuit de terreur. Le sang de Marie hante encore les ruelles."
Nuit 3: "Ils ne sont plus que sept. La bête a faim, et le lac ne rend jamais ses morts."

Réponds UNIQUEMENT avec la narration, sans introduction ni explication.`

function buildStoryPrompt(
  context: NarrationRequest['context'],
  data: NarrationRequest['data'],
  story: { theme: string; events: string[] }
): string {
  const parts: string[] = []

  // Add story theme
  parts.push(`THÈME DU VILLAGE: ${story.theme}`)

  // Add previous events for continuity
  if (story.events.length > 0) {
    parts.push(`ÉVÉNEMENTS PASSÉS: ${story.events.slice(-5).join('. ')}`)
  }

  // Add current game state
  if (data?.dayNumber) parts.push(`Jour/Nuit: ${data.dayNumber}`)
  if (data?.aliveCount) parts.push(`Survivants: ${data.aliveCount}`)
  if (data?.deadPlayers?.length) parts.push(`Morts: ${data.deadPlayers.join(', ')}`)
  if (data?.playerNames?.length) parts.push(`Vivants: ${data.playerNames.slice(0, 5).join(', ')}`)

  // Add context-specific instruction
  const contextInstructions: Record<NarrationRequest['context'], string> = {
    night_start: `SCÈNE: La nuit ${data?.dayNumber || 1} commence. Le village s'endort dans la peur.`,
    werewolves_wake: 'SCÈNE: Les loups-garous ouvrent les yeux, affamés.',
    werewolves_done: 'SCÈNE: Les loups ont choisi leur proie. Ils se rendorment, repus.',
    seer_wake: 'SCÈNE: La voyante s\'éveille, ses dons la tourmentent.',
    seer_done: 'SCÈNE: La voyante a vu. Ce secret pèse lourd.',
    witch_wake: 'SCÈNE: La sorcière contemple ses fioles. Vie ou mort ?',
    witch_done: 'SCÈNE: La sorcière a fait son choix. Retour au silence.',
    day_start: `SCÈNE: L'aube du jour ${data?.dayNumber || 1}. Le village découvre l'horreur.`,
    death_announce: `SCÈNE: ${data?.victimName || 'Quelqu\'un'} est mort ${data?.killedBy === 'werewolves' ? 'dévoré par les loups' : data?.killedBy === 'witch' ? 'empoisonné' : data?.killedBy === 'hunter' ? 'abattu par le chasseur' : 'lynché'}.`,
    vote_start: 'SCÈNE: Le village se rassemble. Il faut trouver le coupable.',
    vote_result: `SCÈNE: ${data?.victimName || 'Un suspect'} est condamné par le village. Justice ou erreur ?`,
    hunter_death: `SCÈNE: ${data?.victimName || 'Le chasseur'} révèle son arme ! Un dernier tir.`,
    game_end: `SCÈNE: FIN DE PARTIE. ${data?.winner === 'village' ? 'Le village a survécu aux ténèbres.' : 'Les loups ont dévoré le dernier innocent.'}`
  }

  parts.push(contextInstructions[context])

  return parts.join('\n')
}

function recordEvent(gameId: string | undefined, event: string) {
  if (!gameId) return
  const story = gameStoryCache.get(gameId)
  if (story) {
    story.events.push(event)
    // Keep only last 10 events
    if (story.events.length > 10) {
      story.events.shift()
    }
  }
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody<NarrationRequest>(event)

  // Extract gameId from request headers or generate session-based one
  const gameId = event.headers.get('x-game-id') || undefined

  // Get or create story context for this game
  const story = body.data?.storyTheme
    ? { theme: body.data.storyTheme, events: body.data.previousEvents || [] }
    : getOrCreateStoryContext(gameId)

  // Skip AI for simple transition contexts or if no API key
  const shouldUseAI = config.geminiApiKey && AI_CONTEXTS.includes(body.context)

  if (!shouldUseAI) {
    return {
      narration: getDefaultNarration(body.context, body.data),
      storyTheme: story.theme
    }
  }

  try {
    // Wait for rate limit before making API call
    await waitForRateLimit()

    const genAI = new GoogleGenerativeAI(config.geminiApiKey)
    const modelName = config.geminiModel || 'gemini-2.0-flash-exp'
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: SYSTEM_PROMPT
    })

    const userPrompt = buildStoryPrompt(body.context, body.data, story)

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        maxOutputTokens: 100,
        temperature: 0.85
      }
    })

    const narration = result.response.text()?.trim() || getDefaultNarration(body.context, body.data)

    // Record significant events for story continuity
    if (body.context === 'death_announce' && body.data?.victimName) {
      recordEvent(gameId, `${body.data.victimName} est mort (${body.data.killedBy})`)
    }
    else if (body.context === 'vote_result' && body.data?.victimName) {
      recordEvent(gameId, `${body.data.victimName} lynché par le village`)
    }

    return {
      narration,
      storyTheme: story.theme
    }
  }
  catch (error) {
    console.error('Narration generation error:', error)
    return {
      narration: getDefaultNarration(body.context, body.data),
      storyTheme: story.theme
    }
  }
})

function getDefaultNarration(context: NarrationRequest['context'], data?: NarrationRequest['data']): string {
  const defaults: Record<NarrationRequest['context'], string> = {
    night_start: 'Les ténèbres enveloppent le village. Quelque chose rôde dans l\'obscurité.',
    werewolves_wake: 'Des yeux jaunes s\'ouvrent dans la nuit. La chasse commence.',
    werewolves_done: 'Les prédateurs se fondent dans l\'ombre, satisfaits.',
    seer_wake: 'La voyante ouvre les yeux. Les esprits lui murmurent des secrets.',
    seer_done: 'La vision s\'estompe. La voyante garde ce fardeau pour elle.',
    witch_wake: 'La sorcière s\'éveille. Ses potions luisent dans la pénombre.',
    witch_done: 'Le choix est fait. La sorcière retourne au sommeil.',
    day_start: 'L\'aube se lève, froide et cruelle. Le village retient son souffle.',
    death_announce: data?.victimName
      ? `Le corps de ${data.victimName} gît dans la brume matinale. La mort a encore frappé.`
      : 'Un corps sans vie. La terreur grandit.',
    vote_start: 'Les villageois se rassemblent, méfiants. Qui est le monstre parmi eux ?',
    vote_result: data?.victimName
      ? `${data.victimName} est traîné vers le bûcher. Justice sera faite.`
      : 'Le verdict est tombé. Qu\'il soit juste ou non.',
    hunter_death: data?.victimName
      ? `${data.victimName} dégaine son arme d'une main tremblante. Un dernier acte de bravoure.`
      : 'Le chasseur ne partira pas seul.',
    game_end: data?.winner === 'village'
      ? 'Le dernier loup s\'effondre. Le village peut enfin respirer.'
      : 'Le silence règne. Les loups ont gagné.'
  }
  return defaults[context]
}
