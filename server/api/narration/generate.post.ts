import { GoogleGenerativeAI } from '@google/generative-ai'

type NarrationContext = 'night_start' | 'werewolves_wake' | 'werewolves_done' | 'seer_wake' | 'seer_done' | 'witch_wake' | 'witch_done' | 'day_start' | 'death_announce' | 'vote_start' | 'vote_result' | 'hunter_death' | 'game_end'

// Contexts that benefit from AI generation (story-critical moments)
const AI_CONTEXTS: NarrationContext[] = [
  'night_start',
  'werewolves_wake',
  'day_start',
  'death_announce',
  'vote_start',
  'vote_result',
  'hunter_death',
  'game_end'
]

// Contexts that use fallback (simple transitions, no story value)
// werewolves_done, seer_wake, seer_done, witch_wake, witch_done

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

const SYSTEM_PROMPT = `Tu es le maître du jeu d'une partie de Loup-Garou entre amis.

RÈGLE #1 ABSOLUE: Tu ne dois JAMAIS inventer de nom. Si un NOM est fourni dans [JOUEUR: xxx], tu utilises EXACTEMENT ce nom. Si aucun nom n'est fourni, tu ne mentionnes PAS de nom.

FORMAT: SSML

STYLE:
- Langage simple mais avec une touche de mystère
- Ambiance légèrement inquiétante, comme un conte pour ados
- INTRO: 3-4 phrases pour poser le décor du village
- Autres scènes: 1-2 phrases avec un peu de suspense

SSML:
- <emphasis level="strong">NOM</emphasis> pour les noms
- <break time="Xms"/> pour les pauses

INTERDIT:
- Vocabulaire trop littéraire (funeste, crépuscule, etc.)
- Longues métaphores
- Inventer des noms
- Emojis, guillemets, parenthèses
- Balise <speak>

Réponds UNIQUEMENT avec la narration SSML.`

function buildStoryPrompt(
  context: NarrationRequest['context'],
  data: NarrationRequest['data'],
  story: { theme: string; events: string[] }
): string {
  const parts: string[] = []

  // Add story theme for atmosphere
  parts.push(`AMBIANCE: ${story.theme}`)

  // Add current game state
  if (data?.dayNumber) parts.push(`Nuit/Jour: ${data.dayNumber}`)
  if (data?.aliveCount) parts.push(`Survivants: ${data.aliveCount}`)

  // Build context-specific instruction with player name clearly marked
  const contextInstructions: Record<NarrationRequest['context'], string> = {
    night_start: (data?.dayNumber || 1) === 1
      ? `INTRO: Présente ce village mystérieux en 3-4 phrases. Crée une ambiance un peu inquiétante. Termine par "Fermez les yeux".`
      : `SCÈNE: Nuit ${data?.dayNumber}. Le village s'endort à nouveau.`,
    werewolves_wake: 'SCÈNE: Les loups-garous se réveillent et choisissent une victime.',
    werewolves_done: 'SCÈNE: Les loups-garous se rendorment.',
    seer_wake: 'SCÈNE: La voyante se réveille et découvre un rôle.',
    seer_done: 'SCÈNE: La voyante se rendort.',
    witch_wake: 'SCÈNE: La sorcière se réveille avec ses potions.',
    witch_done: 'SCÈNE: La sorcière se rendort.',
    day_start: data?.victimName
      ? `SCÈNE: Le jour ${data?.dayNumber || 1} se lève. [JOUEUR: ${data.victimName}] a été trouvé mort cette nuit (${data.killedBy === 'werewolves' ? 'dévoré par les loups' : data.killedBy === 'witch' ? 'empoisonné' : 'tué'}). Annonce le lever du jour et la mort.`
      : `SCÈNE: Le jour ${data?.dayNumber || 1} se lève. Personne n'est mort cette nuit.`,
    death_announce: data?.victimName
      ? `[JOUEUR: ${data.victimName}] est mort cette nuit (${data.killedBy === 'werewolves' ? 'dévoré par les loups' : data.killedBy === 'witch' ? 'empoisonné' : 'tué'}). Annonce sa mort de façon dramatique.`
      : 'SCÈNE: Personne n\'est mort cette nuit.',
    vote_start: 'SCÈNE: Le village doit voter pour éliminer un suspect.',
    vote_result: data?.victimName
      ? `[JOUEUR: ${data.victimName}] a été éliminé par le vote du village. Annonce son élimination.`
      : 'SCÈNE: Le village n\'a pas réussi à se décider.',
    hunter_death: data?.victimName
      ? `[JOUEUR: ${data.victimName}] était le chasseur! Il peut tirer sur quelqu'un avant de mourir.`
      : 'SCÈNE: Le chasseur peut tirer une dernière fois.',
    game_end: data?.winner === 'village'
      ? 'SCÈNE: FIN - Le village a gagné! Tous les loups sont morts.'
      : 'SCÈNE: FIN - Les loups-garous ont gagné!'
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

  console.log(`[Narration] Context: ${body.context}, useAI: ${shouldUseAI}, data: ${JSON.stringify(body.data)}`)

  if (!shouldUseAI) {
    console.log(`[Narration] Using fallback for ${body.context}`)
    return {
      narration: getDefaultNarration(body.context, body.data),
      storyTheme: story.theme
    }
  }

  try {
    // Wait for rate limit before making API call
    await waitForRateLimit()

    const genAI = new GoogleGenerativeAI(config.geminiApiKey)
    const modelName = config.geminiModel || 'gemini-2.0-flash-lite'
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: SYSTEM_PROMPT
    })

    const userPrompt = buildStoryPrompt(body.context, body.data, story)

    // Increase tokens for intro (night 1)
    const isIntro = body.context === 'night_start' && (body.data?.dayNumber || 1) === 1
    const maxTokens = isIntro ? 200 : 100

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.85
      }
    })

    const narration = result.response.text()?.trim() || getDefaultNarration(body.context, body.data)

    console.log(`[Narration] AI generated for ${body.context}: ${narration.substring(0, 80)}...`)

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
    console.error(`[Narration] AI error for ${body.context}:`, error)
    return {
      narration: getDefaultNarration(body.context, body.data),
      storyTheme: story.theme
    }
  }
})

function getDefaultNarration(context: NarrationRequest['context'], data?: NarrationRequest['data']): string {
  // Default narrations with SSML for natural speech
  const defaults: Record<NarrationRequest['context'], string> = {
    night_start: 'La nuit tombe sur le village.<break time="400ms"/> Fermez les yeux,<break time="200ms"/> et dormez bien.',
    werewolves_wake: 'Les <emphasis level="moderate">loups-garous</emphasis> se réveillent.<break time="400ms"/> Ils choisissent leur victime.',
    werewolves_done: 'Les loups-garous se rendorment.<break time="300ms"/> Satisfaits.',
    seer_wake: 'La <emphasis level="moderate">voyante</emphasis> se réveille.<break time="400ms"/> Elle peut découvrir le rôle d\'un joueur.',
    seer_done: 'La voyante se rendort,<break time="200ms"/> gardant son secret.',
    witch_wake: 'La <emphasis level="moderate">sorcière</emphasis> se réveille.<break time="400ms"/> Elle a une potion de vie,<break time="200ms"/> et une potion de mort.',
    witch_done: 'La sorcière se rendort.<break time="300ms"/> Son choix est fait.',
    day_start: 'Le soleil se lève.<break time="500ms"/> Le village se réveille.',
    death_announce: data?.victimName
      ? `<emphasis level="strong">${data.victimName}</emphasis> a été retrouvé <emphasis level="moderate">mort</emphasis> ce matin.<break time="500ms"/>`
      : 'Un villageois a été <emphasis level="moderate">tué</emphasis> cette nuit.<break time="500ms"/>',
    vote_start: 'Le village doit maintenant voter.<break time="400ms"/> Trouvez le <emphasis level="moderate">loup</emphasis> parmi vous.',
    vote_result: data?.victimName
      ? `Le village a décidé d'éliminer <emphasis level="strong">${data.victimName}</emphasis>.<break time="400ms"/>`
      : 'Le village a rendu son verdict.<break time="400ms"/>',
    hunter_death: data?.victimName
      ? `<emphasis level="strong">${data.victimName}</emphasis> était le chasseur!<break time="400ms"/> Il peut tirer sur quelqu'un avant de mourir.`
      : 'Le <emphasis level="moderate">chasseur</emphasis> tire une dernière fois.<break time="400ms"/>',
    game_end: data?.winner === 'village'
      ? '<prosody rate="slow">Félicitations!</prosody><break time="500ms"/> Le village a éliminé tous les <emphasis level="moderate">loups-garous</emphasis>!'
      : 'Les <emphasis level="moderate">loups-garous</emphasis> ont gagné.<break time="500ms"/> Ils ont dévoré le village.'
  }
  return defaults[context]
}
