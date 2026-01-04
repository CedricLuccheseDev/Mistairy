/**
 * Narration Service - AI-powered game narration
 * Generates dynamic, story-driven narrations using Gemini
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

export type NarrationContext =
  | 'night_intro'
  | 'night_role'
  | 'day_intro'
  | 'vote_start'
  | 'vote_result'
  | 'hunter_death'
  | 'game_end'

export interface NarrationData {
  gameId: string
  dayNumber: number
  playerCount: number
  aliveCount: number
  // Context-specific data
  victimName?: string
  victimRole?: string // Role name of the victim (e.g., "Villageois", "Loup-Garou")
  victimNames?: string[] // Multiple victims (wolf + witch)
  killedBy?: 'werewolves' | 'witch' | 'hunter' | 'village'
  winner?: 'village' | 'werewolf'
  currentRole?: 'seer' | 'werewolf' | 'witch'
  isTie?: boolean
  playerNames?: string[]
  isFirstNight?: boolean
}

// Story themes for unique game atmospheres
const STORY_THEMES = [
  'Un village de pecheurs au bord d\'un lac noir ou la brume ne se leve jamais',
  'Un hameau de montagne isole par les neiges, coupe du monde depuis des semaines',
  'Une bourgade forestiere ou les arbres semblent murmurer la nuit',
  'Un village de vignerons dont le vin a un etrange gout de fer cette annee',
  'Une communaute de mineurs ou les tunnels cachent plus que du charbon',
  'Un bourg cotier battu par les tempetes ou les marins disparaissent en mer',
  'Un village de bucherons ou la foret reprend ses droits chaque nuit',
  'Une bourgade marchande sur une route oubliee, dernier refuge avant les terres sauvages'
]

// Cache for story themes and events per game
const gameStoryCache = new Map<string, { theme: string; events: string[] }>()

// Rate limiting
let lastApiCallTime = 0
const MIN_API_DELAY_MS = 500

async function waitForRateLimit(): Promise<void> {
  const now = Date.now()
  const elapsed = now - lastApiCallTime
  if (elapsed < MIN_API_DELAY_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_API_DELAY_MS - elapsed))
  }
  lastApiCallTime = Date.now()
}

function getOrCreateStory(gameId: string): { theme: string; events: string[] } {
  if (gameStoryCache.has(gameId)) {
    return gameStoryCache.get(gameId)!
  }

  const theme = STORY_THEMES[Math.floor(Math.random() * STORY_THEMES.length)]!
  const story = { theme, events: [] }
  gameStoryCache.set(gameId, story)

  // Cleanup old entries (keep max 100 games)
  if (gameStoryCache.size > 100) {
    const firstKey = gameStoryCache.keys().next().value
    if (firstKey) gameStoryCache.delete(firstKey)
  }

  return story
}

export function recordGameEvent(gameId: string, event: string): void {
  const story = gameStoryCache.get(gameId)
  if (story) {
    story.events.push(event)
    if (story.events.length > 10) story.events.shift()
  }
}

export function getGameStory(gameId: string): { theme: string; events: string[] } | undefined {
  return gameStoryCache.get(gameId)
}

const SYSTEM_PROMPT = `Tu es le maitre du jeu d'une partie de Loup-Garou.

STYLE:
- Langage simple mais mysterieux
- Ambiance legerement inquietante, comme un conte
- 1-3 phrases maximum, sauf pour l'intro du jeu (3-4 phrases)

REGLES:
- Utilise EXACTEMENT les noms fournis, jamais d'autres
- Pas de vocabulaire litteraire (funeste, crepuscule, etc.)
- Pas d'emojis, guillemets ou parentheses
- Pas de balises SSML ou XML

Reponds UNIQUEMENT avec la narration, rien d'autre.`

function buildPrompt(context: NarrationContext, data: NarrationData, story: { theme: string; events: string[] }): string {
  const parts: string[] = [`AMBIANCE: ${story.theme}`]

  if (story.events.length > 0) {
    parts.push(`EVENEMENTS PRECEDENTS: ${story.events.slice(-3).join('. ')}`)
  }

  parts.push(`Jour/Nuit: ${data.dayNumber}, Survivants: ${data.aliveCount}/${data.playerCount}`)

  const instructions: Record<NarrationContext, string> = {
    night_intro: data.isFirstNight
      ? `INTRO DU JEU: Presente ce village en 3-4 phrases. Les joueurs sont: ${data.playerNames?.join(', ')}. Cree une ambiance mysterieuse. Termine par inviter les joueurs a fermer les yeux.`
      : `NUIT ${data.dayNumber}: Le village s'endort. 1-2 phrases d'ambiance.`,

    night_role: data.currentRole === 'werewolf'
      ? 'Les loups-garous se reveillent et cherchent leur proie. 1 phrase.'
      : data.currentRole === 'seer'
        ? 'La voyante ouvre les yeux, prete a percer les secrets. 1 phrase.'
        : 'La sorciere se reveille avec ses potions. 1 phrase.',

    day_intro: data.victimNames && data.victimNames.length > 0
      ? `JOUR ${data.dayNumber}: ${data.victimNames.join(' et ')} ${data.victimNames.length > 1 ? 'ont ete trouves morts' : 'a ete trouve mort'} ce matin. Annonce le lever du jour et ${data.victimNames.length > 1 ? 'les morts' : 'la mort'}.`
      : `JOUR ${data.dayNumber}: Le soleil se leve, personne n'est mort cette nuit. 1-2 phrases.`,

    vote_start: `Le village doit voter pour eliminer un suspect parmi les ${data.aliveCount} survivants. 1 phrase.`,

    vote_result: data.victimName
      ? `${data.victimName} a ete elimine par le vote du village. C'etait un ${data.victimRole || 'villageois'}. Annonce son elimination et revele son role.`
      : data.isTie
        ? 'Egalite au vote, personne n\'est elimine. 1 phrase.'
        : 'Aucun vote, personne n\'est elimine. 1 phrase.',

    hunter_death: `${data.victimName || 'Le chasseur'} etait le chasseur! Il peut tirer une derniere fois. 1-2 phrases dramatiques.`,

    game_end: data.winner === 'village'
      ? 'VICTOIRE DU VILLAGE: Tous les loups sont elimines! 2-3 phrases de celebration.'
      : 'VICTOIRE DES LOUPS: Le village est tombe! 2-3 phrases dramatiques.'
  }

  parts.push(instructions[context])
  return parts.join('\n')
}

// Default fallback narrations
function getDefaultNarration(context: NarrationContext, data: NarrationData): string {
  const defaults: Record<NarrationContext, string> = {
    night_intro: data.isFirstNight
      ? `Bienvenue dans ce village paisible. ${data.playerCount} ames s'appretent a vivre une nuit mouvementee. Parmi vous se cachent des loups-garous. La nuit tombe, fermez les yeux...`
      : `Nuit ${data.dayNumber}. Le village s'endort a nouveau. Les ${data.aliveCount} survivants ferment les yeux...`,

    night_role: data.currentRole === 'werewolf'
      ? 'Les loups-garous se reveillent et choisissent leur victime.'
      : data.currentRole === 'seer'
        ? 'La voyante ouvre les yeux et peut decouvrir le role d\'un joueur.'
        : 'La sorciere se reveille. Elle possede une potion de vie et une potion de mort.',

    day_intro: data.victimNames && data.victimNames.length > 0
      ? `Le soleil se leve sur le village. ${data.victimNames.join(' et ')} ${data.victimNames.length > 1 ? 'ont ete trouves morts' : 'a ete trouve mort'} ce matin.`
      : `Le soleil se leve sur le village. Miracle, personne n'est mort cette nuit.`,

    vote_start: `Le village doit maintenant voter. Les ${data.aliveCount} survivants doivent designer celui qu'ils pensent etre un loup-garou.`,

    vote_result: data.victimName
      ? `Le village a parle. ${data.victimName} est elimine. C'etait ${data.victimRole || 'un villageois'}.`
      : data.isTie
        ? 'Egalite! Le village n\'arrive pas a se decider. Personne n\'est elimine.'
        : 'Personne n\'a vote. Le village reste indecis.',

    hunter_death: `${data.victimName || 'Le chasseur'} s'effondre. Mais dans son dernier souffle, il leve son arme. Il peut emporter quelqu'un avec lui.`,

    game_end: data.winner === 'village'
      ? 'Felicitations! Le village a elimine tous les loups-garous. La paix revient enfin.'
      : 'Les loups-garous ont gagne. Le village est tombe sous leurs crocs.'
  }
  return defaults[context]
}

export async function generateNarration(
  context: NarrationContext,
  data: NarrationData,
  apiKey?: string
): Promise<string> {
  const story = getOrCreateStory(data.gameId)

  // If no API key, use defaults
  if (!apiKey) {
    console.log(`[Narration] No API key, using default for ${context}`)
    return getDefaultNarration(context, data)
  }

  try {
    await waitForRateLimit()

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-lite',
      systemInstruction: SYSTEM_PROMPT
    })

    const prompt = buildPrompt(context, data, story)
    const isIntro = context === 'night_intro' && data.isFirstNight
    const maxTokens = isIntro ? 200 : 100

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.85 }
    })

    const narration = result.response.text()?.trim()

    if (narration) {
      console.log(`[Narration] AI generated for ${context}: ${narration.substring(0, 60)}...`)

      // Record significant events
      if (context === 'day_intro' && data.victimNames?.length) {
        recordGameEvent(data.gameId, `${data.victimNames.join(' et ')} mort(s) la nuit`)
      }
      else if (context === 'vote_result' && data.victimName) {
        recordGameEvent(data.gameId, `${data.victimName} elimine par le village`)
      }

      return narration
    }

    return getDefaultNarration(context, data)
  }
  catch (error) {
    console.error(`[Narration] AI error for ${context}:`, error)
    return getDefaultNarration(context, data)
  }
}
