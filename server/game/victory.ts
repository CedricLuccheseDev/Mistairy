import type { Player, Winner } from './types'

export function checkVictory(players: Player[]): Winner {
  const alivePlayers = players.filter(p => p.is_alive)
  const aliveWerewolves = alivePlayers.filter(p => p.role === 'werewolf')
  const aliveVillagers = alivePlayers.filter(p => p.role !== 'werewolf')

  // Victoire du village : tous les loups sont morts
  if (aliveWerewolves.length === 0) {
    return 'village'
  }

  // Victoire des loups : autant ou plus de loups que de villageois
  if (aliveWerewolves.length >= aliveVillagers.length) {
    return 'werewolf'
  }

  return null
}

export function getVictoryMessage(winner: Winner): string {
  if (winner === 'village') {
    return 'Le village a éliminé tous les loups-garous ! Les villageois remportent la victoire !'
  }
  if (winner === 'werewolf') {
    return 'Les loups-garous ont dévoré le village ! Les loups remportent la victoire !'
  }
  return ''
}
