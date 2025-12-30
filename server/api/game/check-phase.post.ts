import { getServiceClient } from '../../utils/supabase'
import type { Database, GameSettings } from '../../../shared/types/database.types'
import { transitionToDay, transitionToVote, transitionToNight, getDefaultSettings, getPhaseEndTime } from '../../game'
import { checkVictory, getVictoryMessage } from '../../game/victory'

type Game = Database['public']['Tables']['games']['Row']
type Player = Database['public']['Tables']['players']['Row']

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { gameId } = body

  if (!gameId) {
    throw createError({
      statusCode: 400,
      message: 'gameId requis'
    })
  }

  const client = getServiceClient()

  // Get game with current state
  const { data: game, error: gameError } = await client
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single()

  if (gameError || !game) {
    throw createError({
      statusCode: 404,
      message: 'Partie introuvable'
    })
  }

  // Check if game is in a timed phase
  if (!game.phase_end_at || game.status === 'lobby' || game.status === 'finished') {
    return { advanced: false, reason: 'no_timer' }
  }

  // Check if timer has expired
  const phaseEndAt = new Date(game.phase_end_at).getTime()
  const now = Date.now()

  if (now < phaseEndAt) {
    return { advanced: false, reason: 'timer_not_expired', timeLeft: Math.ceil((phaseEndAt - now) / 1000) }
  }

  // Timer expired - advance to next phase
  const { data: players } = await client
    .from('players')
    .select('*')
    .eq('game_id', gameId)

  if (!players) {
    throw createError({
      statusCode: 500,
      message: 'Impossible de récupérer les joueurs'
    })
  }

  const settings = (game.settings as unknown as GameSettings) || getDefaultSettings()
  // Create a typed game object for phase transitions
  const gameTyped = {
    ...game,
    settings
  } as Game & { settings: GameSettings }

  try {
    switch (game.status) {
      case 'night': {
        // Night -> Day: Resolve night actions and transition
        const result = await transitionToDay(client, gameTyped, players as Player[])
        return {
          advanced: true,
          from: 'night',
          to: result.winner ? 'finished' : 'day',
          winner: result.winner,
          deadPlayers: result.deadPlayers.map(p => p.name)
        }
      }

      case 'day': {
        // Day -> Vote: Start voting phase
        await transitionToVote(client, gameTyped)
        return {
          advanced: true,
          from: 'day',
          to: 'vote'
        }
      }

      case 'vote': {
        // Vote -> Night: Resolve votes and transition
        // First, check if there are any votes
        const { data: votes } = await client
          .from('day_votes')
          .select('target_id')
          .eq('game_id', gameId)
          .eq('day_number', game.day_number)

        let eliminatedPlayer: Player | null = null

        if (votes && votes.length > 0) {
          // Count votes
          const voteCounts = new Map<string, number>()
          for (const vote of votes) {
            voteCounts.set(vote.target_id, (voteCounts.get(vote.target_id) || 0) + 1)
          }

          // Find player with most votes
          let maxVotes = 0
          let maxVotedId: string | null = null
          for (const [targetId, count] of voteCounts) {
            if (count > maxVotes) {
              maxVotes = count
              maxVotedId = targetId
            }
          }

          // Check for tie
          const tiedPlayers = Array.from(voteCounts.entries()).filter(([_, count]) => count === maxVotes)

          if (tiedPlayers.length === 1 && maxVotedId) {
            // Clear winner - eliminate them
            eliminatedPlayer = players.find(p => p.id === maxVotedId) as Player | null

            if (eliminatedPlayer) {
              await client
                .from('players')
                .update({ is_alive: false })
                .eq('id', maxVotedId)

              await client.from('game_events').insert({
                game_id: gameId,
                event_type: 'player_eliminated',
                message: `${eliminatedPlayer.name} a été éliminé par le village.`,
                data: { playerId: maxVotedId, playerName: eliminatedPlayer.name, role: eliminatedPlayer.role }
              })

              // If eliminated player is hunter, transition to hunter phase
              if (eliminatedPlayer.role === 'hunter') {
                await client.from('game_events').insert({
                  game_id: gameId,
                  event_type: 'hunter_death',
                  message: `${eliminatedPlayer.name} était le chasseur ! Il peut emporter quelqu'un avec lui.`,
                  data: { hunterId: maxVotedId }
                })

                await client.from('games').update({
                  status: 'hunter',
                  hunter_target_pending: maxVotedId,
                  phase_end_at: new Date(Date.now() + 30000).toISOString()
                }).eq('id', gameId)

                return {
                  advanced: true,
                  from: 'vote',
                  to: 'hunter',
                  eliminated: eliminatedPlayer.name
                }
              }
            }
          }
          else {
            // Tie - no elimination
            await client.from('game_events').insert({
              game_id: gameId,
              event_type: 'vote_tie',
              message: 'Égalité des votes ! Personne n\'est éliminé.',
              data: { tiedPlayers: tiedPlayers.map(([id]) => id) }
            })
          }
        }
        else {
          // No votes - no elimination
          await client.from('game_events').insert({
            game_id: gameId,
            event_type: 'no_votes',
            message: 'Aucun vote n\'a été exprimé. Personne n\'est éliminé.',
            data: {}
          })
        }

        // Transition to night
        const result = await transitionToNight(client, gameTyped, eliminatedPlayer)
        return {
          advanced: true,
          from: 'vote',
          to: result.winner ? 'finished' : 'night',
          winner: result.winner,
          eliminated: eliminatedPlayer?.name || null
        }
      }

      case 'hunter': {
        // Hunter timeout - hunter didn't shoot, transition to next phase
        const hunterId = game.hunter_target_pending

        if (hunterId) {
          await client.from('game_events').insert({
            game_id: gameId,
            event_type: 'hunter_timeout',
            message: 'Le chasseur n\'a pas tiré à temps.',
            data: { hunterId }
          })
        }

        // Check victory after hunter phase
        const { data: updatedPlayers } = await client
          .from('players')
          .select('*')
          .eq('game_id', gameId)

        const winner = checkVictory(updatedPlayers || [])

        if (winner) {
          await client.from('games').update({
            status: 'finished',
            winner,
            phase_end_at: null,
            hunter_target_pending: null
          }).eq('id', gameId)

          await client.from('game_events').insert({
            game_id: gameId,
            event_type: 'game_end',
            message: getVictoryMessage(winner),
            data: { winner }
          })

          return {
            advanced: true,
            from: 'hunter',
            to: 'finished',
            winner
          }
        }

        // Transition to night
        const phaseEndAt = getPhaseEndTime(settings, 'night')

        await client.from('games').update({
          status: 'night',
          day_number: game.day_number + 1,
          phase_end_at: phaseEndAt.toISOString(),
          hunter_target_pending: null
        }).eq('id', gameId)

        await client.from('game_events').insert({
          game_id: gameId,
          event_type: 'night_start',
          message: `Nuit ${game.day_number + 1} - Le village s'endort après cette journée tragique.`,
          data: { day_number: game.day_number + 1 }
        })

        return {
          advanced: true,
          from: 'hunter',
          to: 'night'
        }
      }

      default:
        return { advanced: false, reason: 'invalid_phase' }
    }
  }
  catch (error) {
    console.error('Phase transition error:', error)
    throw createError({
      statusCode: 500,
      message: 'Erreur lors de la transition de phase'
    })
  }
})
