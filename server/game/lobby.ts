/**
 * Lobby Module - All lobby operations
 * Create, join, leave, ready, start game
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, GameSettings } from '../../shared/types/database.types'
import { DEFAULT_SETTINGS, calculateRoles, shuffleArray } from '../../shared/config/game.config'
import { getPhaseEndTime, getDefaultSettings, startNightPhase } from './engine'
import * as db from '../services/database'
import { generateNarration } from '../services/narration'

type Game = Database['public']['Tables']['games']['Row']
type Player = Database['public']['Tables']['players']['Row']

/* ═══════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════ */

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

async function generateUniqueCode(client: SupabaseClient<Database>): Promise<string> {
  const maxAttempts = 10
  let attempts = 0
  let code = generateCode()

  while (attempts < maxAttempts) {
    const { data: existing } = await client
      .from('games')
      .select('id')
      .eq('code', code)
      .single()

    if (!existing) return code

    code = generateCode()
    attempts++
  }

  throw new Error('Impossible de générer un code unique')
}

/* ═══════════════════════════════════════════
   CREATE GAME
   ═══════════════════════════════════════════ */

export interface CreateGameResult {
  success: boolean
  code?: string
  gameId?: string
  error?: string
}

export async function createGame(
  client: SupabaseClient<Database>
): Promise<CreateGameResult> {
  try {
    const code = await generateUniqueCode(client)

    const { data: game, error } = await client
      .from('games')
      .insert({
        code,
        status: 'lobby',
        settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS))
      })
      .select()
      .single()

    if (error || !game) {
      return { success: false, error: 'Erreur lors de la création de la partie' }
    }

    return { success: true, code: game.code, gameId: game.id }
  }
  catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

/* ═══════════════════════════════════════════
   JOIN GAME
   ═══════════════════════════════════════════ */

export interface JoinGameResult {
  success: boolean
  code?: string
  gameId?: string
  playerId?: string
  isHost?: boolean
  error?: string
}

export async function joinGame(
  client: SupabaseClient<Database>,
  code: string,
  playerName: string
): Promise<JoinGameResult> {
  // Find game
  const { data: game, error: gameError } = await client
    .from('games')
    .select('*')
    .eq('code', code.toUpperCase())
    .single()

  if (gameError || !game) {
    return { success: false, error: 'Partie introuvable' }
  }

  if (game.status !== 'lobby') {
    return { success: false, error: 'La partie a déjà commencé' }
  }

  // Check player count
  const { data: existingPlayers } = await client
    .from('players')
    .select('id')
    .eq('game_id', game.id)

  const settings = game.settings as GameSettings | null
  const maxPlayers = settings?.max_players ?? DEFAULT_SETTINGS.max_players

  if (existingPlayers && existingPlayers.length >= maxPlayers) {
    return { success: false, error: `La partie est complète (${maxPlayers} joueurs max)` }
  }

  // First player becomes host
  const isFirstPlayer = !existingPlayers || existingPlayers.length === 0

  // Create player
  const { data: player, error: playerError } = await client
    .from('players')
    .insert({
      game_id: game.id,
      name: playerName.trim(),
      is_host: isFirstPlayer
    })
    .select()
    .single()

  if (playerError || !player) {
    return { success: false, error: 'Erreur lors de la connexion à la partie' }
  }

  // Set host_id on game if first player
  if (isFirstPlayer) {
    await client
      .from('games')
      .update({ host_id: player.id })
      .eq('id', game.id)
  }

  return {
    success: true,
    code: game.code,
    gameId: game.id,
    playerId: player.id,
    isHost: isFirstPlayer
  }
}

/* ═══════════════════════════════════════════
   LEAVE GAME
   ═══════════════════════════════════════════ */

export interface LeaveGameResult {
  success: boolean
  gameDeleted?: boolean
  error?: string
}

export async function leaveGame(
  client: SupabaseClient<Database>,
  gameId: string,
  playerId: string
): Promise<LeaveGameResult> {
  // Get game status
  const { data: game } = await client
    .from('games')
    .select('status')
    .eq('id', gameId)
    .single()

  if (!game) {
    return { success: false, error: 'Partie introuvable' }
  }

  if (game.status !== 'lobby') {
    return { success: false, error: 'Impossible de quitter une partie en cours' }
  }

  // Get player info
  const { data: player } = await client
    .from('players')
    .select('is_host')
    .eq('id', playerId)
    .eq('game_id', gameId)
    .single()

  if (!player) {
    return { success: false, error: 'Joueur non trouvé' }
  }

  // Clear host_id if player is host (avoid FK constraint)
  if (player.is_host) {
    await client
      .from('games')
      .update({ host_id: null })
      .eq('id', gameId)
  }

  // Delete player
  const { error: deleteError } = await client
    .from('players')
    .delete()
    .eq('id', playerId)

  if (deleteError) {
    return { success: false, error: 'Erreur lors de la suppression du joueur' }
  }

  // Check remaining players
  const { data: remainingPlayers } = await client
    .from('players')
    .select('id')
    .eq('game_id', gameId)

  // Delete game if empty
  if (!remainingPlayers || remainingPlayers.length === 0) {
    await client.from('games').delete().eq('id', gameId)
    return { success: true, gameDeleted: true }
  }

  // Reassign host if needed
  if (player.is_host && remainingPlayers.length > 0) {
    const randomIndex = Math.floor(Math.random() * remainingPlayers.length)
    const newHostId = remainingPlayers[randomIndex]!.id

    await client
      .from('players')
      .update({ is_host: true })
      .eq('id', newHostId)

    await client
      .from('games')
      .update({ host_id: newHostId })
      .eq('id', gameId)
  }

  return { success: true, gameDeleted: false }
}

/* ═══════════════════════════════════════════
   PLAYER READY
   ═══════════════════════════════════════════ */

export interface ReadyResult {
  success: boolean
  alreadyReady?: boolean
  transitionedToVote?: boolean
  error?: string
}

export async function setPlayerReady(
  client: SupabaseClient<Database>,
  game: Game,
  player: Player
): Promise<ReadyResult> {
  if (!player.is_alive) {
    return { success: false, error: 'Joueur éliminé' }
  }

  if (game.status !== 'day') {
    return { success: false, error: 'Pas en phase jour' }
  }

  // Check if already ready
  const { data: existingReady } = await client
    .from('day_ready')
    .select('id')
    .eq('game_id', game.id)
    .eq('day_number', game.day_number)
    .eq('player_id', player.id)
    .single()

  if (existingReady) {
    return { success: true, alreadyReady: true }
  }

  // Mark as ready
  await client.from('day_ready').insert({
    game_id: game.id,
    day_number: game.day_number,
    player_id: player.id
  })

  // Check if all alive players are ready
  const { data: alivePlayers } = await client
    .from('players')
    .select('id')
    .eq('game_id', game.id)
    .eq('is_alive', true)

  const { data: readyPlayers } = await client
    .from('day_ready')
    .select('player_id')
    .eq('game_id', game.id)
    .eq('day_number', game.day_number)

  if (alivePlayers && readyPlayers && readyPlayers.length >= alivePlayers.length) {
    // All players ready - transition to vote
    const settings = (game.settings as unknown as GameSettings) || getDefaultSettings()
    const phaseEndAt = getPhaseEndTime(settings, 'vote')

    await client.from('games').update({
      status: 'vote',
      phase_end_at: phaseEndAt.toISOString()
    }).eq('id', game.id)

    await db.createGameEvent(client, game.id, 'vote_start',
      'Le village est prêt à voter.', { day_number: game.day_number })

    return { success: true, transitionedToVote: true }
  }

  return { success: true }
}

/* ═══════════════════════════════════════════
   START GAME
   ═══════════════════════════════════════════ */

export interface StartGameResult {
  success: boolean
  error?: string
}

export async function startGame(
  client: SupabaseClient<Database>,
  game: Game,
  hostPlayer: Player,
  allPlayers: Player[],
  geminiApiKey?: string
): Promise<StartGameResult> {
  // Validate host
  if (game.host_id !== hostPlayer.id && !hostPlayer.is_host) {
    return { success: false, error: 'Seul l\'hôte peut lancer la partie' }
  }

  // Fix inconsistent host_id
  if (game.host_id !== hostPlayer.id && hostPlayer.is_host) {
    await client.from('games').update({ host_id: hostPlayer.id }).eq('id', game.id)
  }

  if (game.status !== 'lobby') {
    return { success: false, error: 'La partie a déjà commencé' }
  }

  if (allPlayers.length < 5) {
    return { success: false, error: 'Il faut au moins 5 joueurs' }
  }

  // Distribute roles
  const roles = shuffleArray(calculateRoles(allPlayers.length))

  const updatePromises = allPlayers.map((p, index) =>
    client
      .from('players')
      .update({ role: roles[index] })
      .eq('id', p.id)
  )

  await Promise.all(updatePromises)

  // Generate intro narration using AI
  const playerNames = allPlayers.map(p => p.name)
  const narration = await generateNarration('night_intro', {
    gameId: game.id,
    dayNumber: 1,
    playerCount: allPlayers.length,
    aliveCount: allPlayers.length,
    playerNames,
    isFirstNight: true
  }, geminiApiKey)

  // Start with night_intro phase (no timer, blocking narration)
  const { error: updateError } = await client.from('games').update({
    status: 'night_intro',
    day_number: 1,
    phase_end_at: null,
    narration_text: narration
  }).eq('id', game.id)

  if (updateError) {
    return { success: false, error: `Erreur DB: ${updateError.message}` }
  }

  // Create game start event
  await db.createGameEvent(client, game.id, 'game_start',
    'La partie commence. La nuit tombe sur le village...',
    { player_count: allPlayers.length })

  return { success: true }
}

/* ═══════════════════════════════════════════
   START NIGHT (from night_intro)
   ═══════════════════════════════════════════ */

export interface StartNightResult {
  success: boolean
  alreadyStarted?: boolean
  error?: string
}

export async function startNight(
  client: SupabaseClient<Database>,
  game: Game
): Promise<StartNightResult> {
  if (game.status !== 'night_intro') {
    return { success: true, alreadyStarted: true }
  }

  await startNightPhase(client, game)
  return { success: true }
}

/* ═══════════════════════════════════════════
   RESTART GAME
   ═══════════════════════════════════════════ */

export interface RestartGameResult {
  success: boolean
  error?: string
}

export async function restartGame(
  client: SupabaseClient<Database>,
  game: Game,
  hostPlayer: Player
): Promise<RestartGameResult> {
  // Validate host
  if (game.host_id !== hostPlayer.id && !hostPlayer.is_host) {
    return { success: false, error: 'Seul l\'hôte peut relancer la partie' }
  }

  if (game.status !== 'finished') {
    return { success: false, error: 'La partie n\'est pas terminée' }
  }

  // Clear all game data
  await Promise.all([
    client.from('night_actions').delete().eq('game_id', game.id),
    client.from('day_votes').delete().eq('game_id', game.id),
    client.from('day_ready').delete().eq('game_id', game.id),
    client.from('game_events').delete().eq('game_id', game.id)
  ])

  // Reset all players
  await client
    .from('players')
    .update({ role: null, is_alive: true })
    .eq('game_id', game.id)

  // Reset game state
  const { error: updateError } = await client
    .from('games')
    .update({
      status: 'lobby',
      day_number: 0,
      winner: null,
      phase_end_at: null,
      narration_text: null,
      current_night_role: null
    })
    .eq('id', game.id)

  if (updateError) {
    return { success: false, error: `Erreur DB: ${updateError.message}` }
  }

  return { success: true }
}
