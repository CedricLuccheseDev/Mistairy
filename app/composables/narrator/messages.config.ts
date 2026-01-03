/**
 * Narrator Messages Configuration
 * Default messages with SSML for natural speech pauses and emphasis
 * Easy to customize for different game themes
 */

import type { NarrationContext, NarrationData } from './types'

/**
 * Get default narration message for a given context
 * Messages include SSML tags for natural TTS rendering
 */
export function getDefaultMessage(context: NarrationContext, data?: NarrationData): string {
  const messages: Record<NarrationContext, string> = {
    night_start: 'La nuit tombe sur le village.<break time="400ms"/> Fermez les yeux.',

    werewolves_wake: 'Les <emphasis level="moderate">loups-garous</emphasis> se réveillent.<break time="300ms"/> Ils choisissent leur victime.',

    werewolves_done: 'Les loups-garous se rendorment.<break time="300ms"/>',

    seer_wake: 'La <emphasis level="moderate">voyante</emphasis> se réveille.<break time="300ms"/> Elle peut découvrir un rôle.',

    seer_done: 'La voyante se rendort.<break time="300ms"/>',

    witch_wake: 'La <emphasis level="moderate">sorcière</emphasis> se réveille avec ses potions.<break time="300ms"/>',

    witch_done: 'La sorcière se rendort.<break time="300ms"/>',

    day_start: data?.victimName
      ? `Le soleil se lève.<break time="400ms"/> <emphasis level="strong">${data.victimName}</emphasis> a été trouvé <emphasis level="moderate">mort</emphasis> ce matin.`
      : 'Le soleil se lève.<break time="400ms"/> Le village se réveille. Personne n\'est mort cette nuit.',

    death_announce: data?.victimName
      ? `<emphasis level="strong">${data.victimName}</emphasis> a été retrouvé <emphasis level="moderate">mort</emphasis> ce matin.<break time="500ms"/>`
      : 'Un villageois a été <emphasis level="moderate">tué</emphasis> cette nuit.<break time="500ms"/>',

    vote_start: 'Le village doit voter.<break time="300ms"/> Trouvez le <emphasis level="moderate">loup</emphasis> parmi vous.',

    vote_result: data?.victimName
      ? `Le village a décidé d'éliminer <emphasis level="strong">${data.victimName}</emphasis>.<break time="400ms"/>`
      : 'Le village a rendu son verdict.<break time="400ms"/>',

    hunter_death: data?.victimName
      ? `<emphasis level="strong">${data.victimName}</emphasis> était le chasseur!<break time="400ms"/> Il peut tirer sur quelqu'un.`
      : 'Le <emphasis level="moderate">chasseur</emphasis> tire une dernière fois.<break time="400ms"/>',

    game_end: data?.winner === 'village'
      ? '<prosody rate="slow">Félicitations!</prosody><break time="500ms"/> Le village a éliminé tous les <emphasis level="moderate">loups-garous</emphasis>!'
      : 'Les <emphasis level="moderate">loups-garous</emphasis> ont gagné.<break time="500ms"/> Ils ont dévoré le village.'
  }

  return messages[context]
}

/**
 * Legacy messages object for backward compatibility
 * Plain text without SSML
 */
export const LEGACY_MESSAGES = {
  nightStart: 'Le village s\'endort. La nuit tombe sur le village.',
  werewolvesWake: 'Les loups-garous se réveillent et désignent une victime.',
  werewolvesSleep: 'Les loups-garous se rendorment.',
  seerWakes: 'La voyante se réveille et peut découvrir l\'identité d\'un joueur.',
  seerSleeps: 'La voyante se rendort.',
  witchWakes: 'La sorcière se réveille.',
  witchSleeps: 'La sorcière se rendort.',
  dayStart: 'Le soleil se lève sur le village.',
  noDeathNight: 'Miracle ! Personne n\'est mort cette nuit.',
  deathNight: (name: string) => `${name} a été dévoré par les loups-garous cette nuit.`,
  voteStart: 'Le village doit maintenant voter pour éliminer un suspect.',
  voteResult: (name: string) => `Le village a décidé d'éliminer ${name}.`,
  noVote: 'Le village n\'a pas réussi à se mettre d\'accord.',
  hunterDeath: (name: string) => `${name} était le chasseur ! Il peut emporter quelqu'un dans la tombe.`,
  villageWins: 'Félicitations ! Le village a éliminé tous les loups-garous !',
  werewolvesWin: 'Les loups-garous ont dévoré tous les villageois. Ils remportent la partie !'
}

/**
 * Determine voice type based on narration context
 */
export function getVoiceTypeForContext(context: NarrationContext): 'story' | 'event' {
  // Story narration contexts (atmospheric, deep voice)
  const storyContexts: NarrationContext[] = [
    'night_start', 'werewolves_wake', 'werewolves_done',
    'seer_wake', 'seer_done', 'witch_wake', 'witch_done',
    'day_start', 'game_end'
  ]

  // Event contexts use announcement voice: death_announce, vote_start, vote_result, hunter_death
  return storyContexts.includes(context) ? 'story' : 'event'
}
