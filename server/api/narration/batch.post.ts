import { GoogleGenerativeAI } from '@google/generative-ai'

type NarrationContext = 'night_start' | 'werewolves_wake' | 'werewolves_done' | 'seer_wake' | 'seer_done' | 'witch_wake' | 'witch_done' | 'day_start' | 'death_announce' | 'vote_start' | 'vote_result' | 'hunter_death' | 'game_end'

interface BatchRequest {
  gameId?: string
  storyTheme?: string
  contexts: Array<{
    context: NarrationContext
    data?: Record<string, unknown>
  }>
}

interface BatchResponse {
  narrations: Record<NarrationContext, string>
  storyTheme: string
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
const gameStoryCache: Map<string, string> = new Map()

function getOrCreateTheme(gameId?: string): string {
  if (gameId && gameStoryCache.has(gameId)) {
    return gameStoryCache.get(gameId)!
  }

  const theme = STORY_THEMES[Math.floor(Math.random() * STORY_THEMES.length)]!

  if (gameId) {
    gameStoryCache.set(gameId, theme)
    // Clean old entries (keep max 100 games)
    if (gameStoryCache.size > 100) {
      const firstKey = gameStoryCache.keys().next().value
      if (firstKey) gameStoryCache.delete(firstKey)
    }
  }

  return theme
}

const SYSTEM_PROMPT = `Tu génères des narrations pour un jeu de Loup-Garou en SSML.

RÈGLE ABSOLUE: Si un nom de joueur est donné avec [JOUEUR: xxx], utilise EXACTEMENT ce nom. Ne jamais inventer de nom!

STYLE: Conteur dramatique. 2 phrases max (40 mots) par narration.
FORMAT SSML: <break time="Xms"/>, <emphasis level="strong">nom</emphasis>
INTERDIT: emojis, guillemets, parenthèses, balise <speak>, noms inventés

Réponds en JSON:
{"narrations": {"context1": "narration SSML 1", "context2": "narration SSML 2", ...}}`

const CONTEXT_PROMPTS: Record<NarrationContext, string> = {
  night_start: 'La nuit tombe sur le village',
  werewolves_wake: 'Les loups-garous ouvrent les yeux',
  werewolves_done: 'Les loups ont choisi leur proie',
  seer_wake: 'La voyante s\'éveille',
  seer_done: 'La voyante se rendort',
  witch_wake: 'La sorcière contemple ses potions',
  witch_done: 'La sorcière fait son choix',
  day_start: 'L\'aube se lève',
  death_announce: 'Un corps est découvert',
  vote_start: 'Le village se rassemble pour voter',
  vote_result: 'Le verdict est rendu',
  hunter_death: 'Le chasseur tire une dernière fois',
  game_end: 'La partie se termine'
}

const DEFAULT_NARRATIONS: Record<NarrationContext, string> = {
  night_start: 'Les ténèbres enveloppent le village. Quelque chose rôde dans l\'obscurité.',
  werewolves_wake: 'Des yeux jaunes s\'ouvrent dans la nuit. La chasse commence.',
  werewolves_done: 'Les prédateurs se fondent dans l\'ombre, satisfaits.',
  seer_wake: 'La voyante ouvre les yeux. Les esprits lui murmurent des secrets.',
  seer_done: 'La vision s\'estompe. La voyante garde ce fardeau pour elle.',
  witch_wake: 'La sorcière s\'éveille. Ses potions luisent dans la pénombre.',
  witch_done: 'Le choix est fait. La sorcière retourne au sommeil.',
  day_start: 'L\'aube se lève, froide et cruelle. Le village retient son souffle.',
  death_announce: 'Un corps sans vie. La terreur grandit.',
  vote_start: 'Les villageois se rassemblent, méfiants. Qui est le monstre parmi eux ?',
  vote_result: 'Le verdict est tombé. Qu\'il soit juste ou non.',
  hunter_death: 'Le chasseur ne partira pas seul.',
  game_end: 'Le silence règne sur le village.'
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody<BatchRequest>(event)

  const theme = body.storyTheme || getOrCreateTheme(body.gameId)

  // If no API key, return all defaults
  if (!config.geminiApiKey || body.contexts.length === 0) {
    const narrations: Record<string, string> = {}
    for (const ctx of body.contexts) {
      narrations[ctx.context] = getContextualDefault(ctx.context, ctx.data)
    }
    return { narrations, storyTheme: theme }
  }

  try {
    const genAI = new GoogleGenerativeAI(config.geminiApiKey)
    const modelName = config.geminiModel || 'gemini-2.0-flash-lite'
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: SYSTEM_PROMPT
    })

    // Build batch prompt
    const scenes: string[] = [`THÈME: ${theme}`, '', 'SCÈNES À NARRER:']

    for (const ctx of body.contexts) {
      let sceneDesc = CONTEXT_PROMPTS[ctx.context]

      // Add contextual data with clear player name marker
      if (ctx.data?.victimName) {
        sceneDesc += ` [JOUEUR: ${ctx.data.victimName}]`
      }
      if (ctx.data?.killedBy) {
        const cause = ctx.data.killedBy === 'werewolves' ? 'loups' : ctx.data.killedBy === 'witch' ? 'poison' : ctx.data.killedBy === 'hunter' ? 'chasseur' : 'village'
        sceneDesc += ` (cause: ${cause})`
      }
      if (ctx.data?.winner) {
        sceneDesc += ` (gagnant: ${ctx.data.winner === 'village' ? 'village' : 'loups'})`
      }
      if (ctx.data?.dayNumber) {
        sceneDesc += ` (jour ${ctx.data.dayNumber})`
      }

      scenes.push(`- ${ctx.context}: ${sceneDesc}`)
    }

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: scenes.join('\n') }] }],
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.85,
        responseMimeType: 'application/json'
      }
    })

    const responseText = result.response.text()?.trim()

    if (responseText) {
      try {
        const parsed = JSON.parse(responseText) as { narrations: Record<string, string> }

        // Fill in any missing narrations with defaults
        const narrations: Record<string, string> = {}
        for (const ctx of body.contexts) {
          narrations[ctx.context] = parsed.narrations[ctx.context] || getContextualDefault(ctx.context, ctx.data)
        }

        return { narrations, storyTheme: theme } as BatchResponse
      }
      catch {
        // JSON parse failed, return defaults
      }
    }
  }
  catch (error) {
    console.error('Batch narration error:', error)
  }

  // Fallback: return all defaults
  const narrations: Record<string, string> = {}
  for (const ctx of body.contexts) {
    narrations[ctx.context] = getContextualDefault(ctx.context, ctx.data)
  }
  return { narrations, storyTheme: theme }
})

function getContextualDefault(context: NarrationContext, data?: Record<string, unknown>): string {
  if (context === 'death_announce' && data?.victimName) {
    return `Le corps de ${data.victimName} gît dans la brume matinale. La mort a encore frappé.`
  }
  if (context === 'vote_result' && data?.victimName) {
    return `${data.victimName} est traîné vers le bûcher. Justice sera faite.`
  }
  if (context === 'hunter_death' && data?.victimName) {
    return `${data.victimName} dégaine son arme d'une main tremblante. Un dernier acte de bravoure.`
  }
  if (context === 'game_end') {
    return data?.winner === 'village'
      ? 'Le dernier loup s\'effondre. Le village peut enfin respirer.'
      : 'Le silence règne. Les loups ont gagné.'
  }
  return DEFAULT_NARRATIONS[context]
}
