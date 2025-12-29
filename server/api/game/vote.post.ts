import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { checkVictory, getVictoryMessage, getPhaseEndTime, getDefaultSettings } from '../../game'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { gameId, playerId, targetId } = body

  if (!gameId || !playerId || !targetId) {
    throw createError({
      statusCode: 400,
      message: 'Paramètres manquants'
    })
  }

  const client = await serverSupabaseClient<Database>(event)

  const { data: voter } = await client
    .from('players')
    .select('*')
    .eq('id', playerId)
    .single()

  if (!voter) {
    throw createError({
      statusCode: 403,
      message: 'Joueur non trouvé'
    })
  }

  const { data: game } = await client
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single()

  if (!game || game.status !== 'vote') {
    throw createError({
      statusCode: 400,
      message: 'Pas de vote en cours'
    })
  }

  if (!voter.is_alive) {
    throw createError({
      statusCode: 400,
      message: 'Les morts ne peuvent pas voter'
    })
  }

  const { data: existingVote } = await client
    .from('day_votes')
    .select('id')
    .eq('game_id', gameId)
    .eq('day_number', game.day_number)
    .eq('voter_id', playerId)
    .single()

  if (existingVote) {
    throw createError({
      statusCode: 400,
      message: 'Tu as déjà voté'
    })
  }

  await client.from('day_votes').insert({
    game_id: gameId,
    day_number: game.day_number,
    voter_id: playerId,
    target_id: targetId
  })

  await checkVoteEnd(client, game)

  return { success: true }
})

async function checkVoteEnd(
  client: Awaited<ReturnType<typeof serverSupabaseClient<Database>>>,
  game: Database['public']['Tables']['games']['Row']
) {
  const { data: alivePlayers } = await client
    .from('players')
    .select('*')
    .eq('game_id', game.id)
    .eq('is_alive', true)

  if (!alivePlayers) return

  const { data: votes } = await client
    .from('day_votes')
    .select('*')
    .eq('game_id', game.id)
    .eq('day_number', game.day_number)

  if (!votes || votes.length < alivePlayers.length) return

  await resolveVote(client, game, votes)
}

async function resolveVote(
  client: Awaited<ReturnType<typeof serverSupabaseClient<Database>>>,
  game: Database['public']['Tables']['games']['Row'],
  votes: Database['public']['Tables']['day_votes']['Row'][]
) {
  const targetCounts: Record<string, number> = {}

  for (const vote of votes) {
    targetCounts[vote.target_id] = (targetCounts[vote.target_id] || 0) + 1
  }

  let eliminatedId: string | null = null
  let maxVotes = 0
  let isTie = false

  for (const [id, count] of Object.entries(targetCounts)) {
    if (count > maxVotes) {
      maxVotes = count
      eliminatedId = id
      isTie = false
    }
    else if (count === maxVotes) {
      isTie = true
    }
  }

  let message = ''

  if (isTie || !eliminatedId) {
    message = 'Égalité ! Personne n\'est éliminé.'
  }
  else {
    await client.from('players').update({ is_alive: false }).eq('id', eliminatedId)

    const { data: eliminated } = await client
      .from('players')
      .select('name, role')
      .eq('id', eliminatedId)
      .single()

    if (eliminated) {
      message = `Le village a décidé d'éliminer ${eliminated.name}.`

      // Gestion du chasseur
      if (eliminated.role === 'hunter') {
        await client.from('game_events').insert({
          game_id: game.id,
          event_type: 'hunter_death',
          message: `${eliminated.name} était le chasseur ! Il peut emporter quelqu'un avec lui.`,
          data: { hunterId: eliminatedId }
        })
        // TODO: Phase spéciale chasseur
      }
    }
  }

  await client.from('game_events').insert({
    game_id: game.id,
    event_type: 'vote_result',
    message,
    data: { eliminated: eliminatedId, votes: targetCounts }
  })

  // Vérifier victoire
  const { data: remainingPlayers } = await client
    .from('players')
    .select('*')
    .eq('game_id', game.id)

  const winner = checkVictory(remainingPlayers || [])

  if (winner) {
    await client.from('games').update({ status: 'finished', winner }).eq('id', game.id)

    await client.from('game_events').insert({
      game_id: game.id,
      event_type: 'game_end',
      message: getVictoryMessage(winner),
      data: { winner }
    })
  }
  else {
    // Passer à la nuit suivante
    const settings = (game.settings as ReturnType<typeof getDefaultSettings>) || getDefaultSettings()
    const phaseEndAt = getPhaseEndTime(settings, 'night')

    await client.from('games').update({
      status: 'night',
      day_number: game.day_number + 1,
      phase_end_at: phaseEndAt.toISOString()
    }).eq('id', game.id)

    await client.from('game_events').insert({
      game_id: game.id,
      event_type: 'night_start',
      message: `Nuit ${game.day_number + 1} - La nuit tombe sur le village...`,
      data: { day_number: game.day_number + 1 }
    })
  }
}
