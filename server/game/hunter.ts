import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import type { Player } from './types'

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
  await client.from('night_actions').insert({
    game_id: gameId,
    day_number: dayNumber,
    player_id: hunterId,
    action_type: 'hunter_kill',
    target_id: targetId
  })

  // Tuer la cible
  const { data: target } = await client
    .from('players')
    .update({ is_alive: false })
    .eq('id', targetId)
    .select()
    .single()

  if (target) {
    await client.from('game_events').insert({
      game_id: gameId,
      event_type: 'hunter_kill',
      message: `Le chasseur tire une dernière fois et emporte ${target.name} dans la tombe !`,
      data: { hunterId, targetId, targetName: target.name }
    })
  }

  return target || null
}
