import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../shared/types/database.types'
import type { Player } from './types'
import { killPlayer, createNightAction, createGameEvent } from '../services/gameService'

export function isHunterDeath(player: Player): boolean {
  return player.role === 'hunter'
}

export async function hunterKill(
  client: SupabaseClient<Database>,
  gameId: string,
  hunterId: string,
  targetId: string,
  dayNumber: number
): Promise<Player | null> {
  // Enregistrer l'action du chasseur
  await createNightAction(client, gameId, dayNumber, hunterId, 'hunter_kill', targetId)

  // Tuer la cible
  const target = await killPlayer(client, targetId)

  if (target) {
    await createGameEvent(
      client,
      gameId,
      'hunter_kill',
      `Le chasseur tire une dernière fois et emporte ${target.name} dans la tombe !`,
      { hunterId, targetId, targetName: target.name }
    )
  }

  return target
}
