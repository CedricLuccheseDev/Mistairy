/**
 * Victory Conditions
 * Handles win/lose detection and victory messages
 */

import type { Player, Winner } from './types'

/**
 * Check if either team has won
 * @returns 'village' if villagers won, 'werewolf' if wolves won, null if game continues
 */
export function checkVictory(players: Player[]): Winner {
  const alive = players.filter(p => p.is_alive)
  const wolves = alive.filter(p => p.role === 'werewolf')
  const villagers = alive.filter(p => p.role !== 'werewolf')

  // Village wins when all werewolves are dead
  if (wolves.length === 0) return 'village'

  // Werewolves win when they equal or outnumber villagers
  if (wolves.length >= villagers.length) return 'werewolf'

  // Game continues
  return null
}

/**
 * Get victory announcement message
 */
export function getVictoryMessage(winner: Winner): string {
  if (winner === 'village') {
    return 'Le village a éliminé tous les loups-garous ! Les villageois remportent la victoire !'
  }
  if (winner === 'werewolf') {
    return 'Les loups-garous ont dévoré le village ! Les loups remportent la victoire !'
  }
  return ''
}
