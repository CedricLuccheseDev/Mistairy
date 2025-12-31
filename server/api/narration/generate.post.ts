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

const SYSTEM_PROMPT = `Tu es le maître du jeu d'une partie de Loup-Garou entre amis. Ton rôle est d'animer le jeu avec une narration claire et immersive.

OBJECTIF: Créer une ambiance fun et mystérieuse qui aide les joueurs à se plonger dans le jeu, sans les perdre avec du texte trop littéraire.

RÈGLES:
- Maximum 2 phrases courtes (40 mots max)
- Langage simple et direct, compréhensible par tous
- Un peu de suspense mais pas de romance ou de poésie excessive
- Mentionne les événements concrets de la partie (noms des joueurs, ce qui s'est passé)
- Garde un ton légèrement dramatique mais accessible

CE QU'IL FAUT ÉVITER:
- Les métaphores trop poétiques ou abstraites
- Les descriptions longues et fleuries
- Le vocabulaire complexe ou précieux
- Les phrases qui ne font pas avancer le jeu
- JAMAIS d'emojis, guillemets, ou parenthèses

BON STYLE:
- "La nuit tombe sur le village. Les loups se réveillent, affamés."
- "Pierre a été retrouvé mort ce matin. Qui sera le prochain ?"
- "Le village doit voter. Trouvez le loup parmi vous."

MAUVAIS STYLE:
- "Les ténèbres engloutissent le hameau tel un linceul de désespoir..."
- "L'astre lunaire baigne de sa lumière blafarde les âmes tourmentées..."

Réponds UNIQUEMENT avec la narration.`

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
    const modelName = config.geminiModel || 'gemini-2.0-flash-lite'
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
    night_start: 'La nuit tombe sur le village. Fermez les yeux et dormez bien.',
    werewolves_wake: 'Les loups-garous se réveillent et choisissent leur victime.',
    werewolves_done: 'Les loups-garous se rendorment.',
    seer_wake: 'La voyante se réveille. Elle peut découvrir le rôle d\'un joueur.',
    seer_done: 'La voyante se rendort.',
    witch_wake: 'La sorcière se réveille. Elle a une potion de vie et une potion de mort.',
    witch_done: 'La sorcière se rendort.',
    day_start: 'Le soleil se lève. Le village se réveille.',
    death_announce: data?.victimName
      ? `${data.victimName} a été retrouvé mort ce matin.`
      : 'Un villageois a été tué cette nuit.',
    vote_start: 'Le village doit maintenant voter pour éliminer un suspect.',
    vote_result: data?.victimName
      ? `Le village a décidé d'éliminer ${data.victimName}.`
      : 'Le village a rendu son verdict.',
    hunter_death: data?.victimName
      ? `${data.victimName} était le chasseur ! Il peut tirer sur quelqu'un avant de mourir.`
      : 'Le chasseur tire une dernière fois.',
    game_end: data?.winner === 'village'
      ? 'Félicitations ! Le village a éliminé tous les loups-garous !'
      : 'Les loups-garous ont gagné. Ils ont dévoré le village.'
  }
  return defaults[context]
}
