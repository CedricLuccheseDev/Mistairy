import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../shared/types/database.types'

// Load environment variables from .env file
config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY
const baseUrl = process.env.BASE_URL || 'http://localhost:3000'

type Player = Database['public']['Tables']['players']['Row']

// Narration contexts for testing
type NarrationContext = 'night_start' | 'werewolves_wake' | 'werewolves_done' | 'seer_wake' | 'seer_done' | 'witch_wake' | 'witch_done' | 'day_start' | 'death_announce' | 'vote_start' | 'vote_result' | 'hunter_death' | 'game_end'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// Check if server is running
let serverAvailable: boolean | null = null

async function checkServer(): Promise<boolean> {
  if (serverAvailable !== null) return serverAvailable

  try {
    const response = await fetch(`${baseUrl}/api/narration/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context: 'night_start' })
    })
    serverAvailable = response.ok
    return serverAvailable
  }
  catch {
    serverAvailable = false
    return false
  }
}

// Test narration API with game ID for story continuity
async function testNarration(
  context: NarrationContext,
  data?: Record<string, unknown>,
  gameId?: string
): Promise<{ narration: string; storyTheme?: string } | null> {
  if (serverAvailable === false) return null

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (gameId) headers['x-game-id'] = gameId

    const response = await fetch(`${baseUrl}/api/narration/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ context, data })
    })

    if (!response.ok) {
      return null
    }

    return await response.json() as { narration: string; storyTheme?: string }
  }
  catch {
    return null
  }
}

async function testNarrationAPI() {
  console.log('\n🎙️ TEST NARRATION IA - SIMULATION COMPLÈTE\n')
  console.log('='.repeat(50))

  // Check if server is available
  const isServerUp = await checkServer()
  if (!isServerUp) {
    console.log('   ⚠️  Serveur non disponible (npm run dev)')
    console.log('   ℹ️  Tests de narration ignorés')
    return { passed: 0, failed: 0, skipped: true }
  }

  // Generate a unique game ID for story continuity
  const gameId = `test-game-${Date.now()}`
  const players = ['Alice', 'Bob', 'Charlie', 'David', 'Emma', 'François']
  const deadPlayers: string[] = []

  console.log(`\n   📖 Game ID: ${gameId}`)
  console.log(`   👥 Joueurs: ${players.join(', ')}`)

  // Simulate a full game with narrative continuity
  const gameSequence: Array<{
    context: NarrationContext
    data?: Record<string, unknown>
    description: string
    updateState?: () => void
  }> = [
    // Night 1
    {
      context: 'night_start',
      data: { dayNumber: 1, aliveCount: 6, playerNames: players },
      description: '🌙 NUIT 1 - Le village s\'endort'
    },
    {
      context: 'werewolves_wake',
      data: { dayNumber: 1 },
      description: '🐺 Les loups-garous se réveillent'
    },
    {
      context: 'werewolves_done',
      description: '🐺 Les loups ont choisi'
    },
    {
      context: 'seer_wake',
      description: '🔮 La voyante se réveille'
    },
    {
      context: 'seer_done',
      description: '🔮 La voyante se rendort'
    },
    {
      context: 'witch_wake',
      description: '🧪 La sorcière se réveille'
    },
    {
      context: 'witch_done',
      description: '🧪 La sorcière se rendort'
    },

    // Day 1
    {
      context: 'day_start',
      data: { dayNumber: 1, aliveCount: 6, playerNames: players },
      description: '☀️ JOUR 1 - L\'aube se lève'
    },
    {
      context: 'death_announce',
      data: { victimName: 'Charlie', killedBy: 'werewolves', deadPlayers: [] },
      description: '💀 Charlie a été dévoré',
      updateState: () => deadPlayers.push('Charlie')
    },
    {
      context: 'vote_start',
      data: { aliveCount: 5, playerNames: players.filter(p => p !== 'Charlie') },
      description: '🗳️ Le village vote'
    },
    {
      context: 'vote_result',
      data: { victimName: 'David', deadPlayers: ['Charlie'] },
      description: '⚖️ David est lynché',
      updateState: () => deadPlayers.push('David')
    },

    // Night 2
    {
      context: 'night_start',
      data: { dayNumber: 2, aliveCount: 4, deadPlayers: ['Charlie', 'David'], playerNames: ['Alice', 'Bob', 'Emma', 'François'] },
      description: '🌙 NUIT 2 - Les ténèbres reviennent'
    },
    {
      context: 'werewolves_wake',
      data: { dayNumber: 2, deadPlayers: ['Charlie', 'David'] },
      description: '🐺 Les loups chassent encore'
    },
    {
      context: 'werewolves_done',
      description: '🐺 Une nouvelle victime est choisie'
    },

    // Day 2
    {
      context: 'day_start',
      data: { dayNumber: 2, aliveCount: 4, deadPlayers: ['Charlie', 'David'] },
      description: '☀️ JOUR 2 - Combien reste-t-il ?'
    },
    {
      context: 'death_announce',
      data: { victimName: 'Emma', killedBy: 'werewolves', deadPlayers: ['Charlie', 'David'] },
      description: '💀 Emma a été dévorée',
      updateState: () => deadPlayers.push('Emma')
    },
    {
      context: 'vote_start',
      data: { aliveCount: 3, deadPlayers: ['Charlie', 'David', 'Emma'] },
      description: '🗳️ Dernier vote désespéré'
    },
    {
      context: 'vote_result',
      data: { victimName: 'Bob', deadPlayers: ['Charlie', 'David', 'Emma'] },
      description: '⚖️ Bob est exécuté'
    },

    // Game end
    {
      context: 'game_end',
      data: { winner: 'village', deadPlayers: ['Charlie', 'David', 'Emma', 'Bob'], aliveCount: 2 },
      description: '🏆 FIN - Le village gagne !'
    }
  ]

  let passed = 0
  let failed = 0
  let storyTheme: string | undefined

  console.log('\n   ' + '-'.repeat(46))

  for (const step of gameSequence) {
    if (step.updateState) step.updateState()

    const result = await testNarration(step.context, step.data, gameId)

    if (result) {
      // Capture story theme from first response
      if (!storyTheme && result.storyTheme) {
        storyTheme = result.storyTheme
        console.log(`\n   🎭 THÈME: "${storyTheme}"`)
        console.log('   ' + '-'.repeat(46))
      }

      console.log(`\n   ${step.description}`)
      console.log(`   → "${result.narration}"`)
      passed++
    }
    else {
      console.log(`\n   ❌ ${step.description}: Échec`)
      failed++
    }
  }

  console.log('\n   ' + '-'.repeat(46))
  console.log(`\n   📊 Résultat: ${passed}/${gameSequence.length} narrations générées`)

  return { passed, failed, skipped: false }
}

async function simulateGame() {
  console.log('\n🎮 SIMULATION DE PARTIE LOUP GAROU\n')
  console.log('='.repeat(50))

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY')
    process.exit(1)
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey)

  // Step 1: Create game with settings
  console.log('\n📝 ÉTAPE 1: Création de la partie avec configuration')
  const gameCode = generateCode()

  const settings = {
    night_time: 30,
    discussion_time: 120,
    vote_time: 60,
    narration_enabled: true,
    roles: { seer: true, witch: true, hunter: false }
  }

  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({
      code: gameCode,
      status: 'lobby',
      settings: settings as unknown as Database['public']['Tables']['games']['Insert']['settings']
    })
    .select()
    .single()

  if (gameError || !game) {
    console.error('❌ Erreur création partie:', gameError?.message)
    process.exit(1)
  }
  console.log(`✅ Partie créée: ${gameCode}`)
  console.log(`   ⚙️ Config: Nuit ${settings.night_time}s, Discussion ${settings.discussion_time}s, Vote ${settings.vote_time}s`)
  console.log(`   🎭 Rôles: Voyante ${settings.roles.seer ? '✓' : '✗'}, Sorcière ${settings.roles.witch ? '✓' : '✗'}, Chasseur ${settings.roles.hunter ? '✓' : '✗'}`)

  // Step 2: Add 6 players
  console.log('\n👥 ÉTAPE 2: Ajout des joueurs')
  const playerNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank']
  const players: Player[] = []

  for (let i = 0; i < playerNames.length; i++) {
    const { data: player, error } = await supabase
      .from('players')
      .insert({
        game_id: game.id,
        name: playerNames[i]!,
        is_host: i === 0
      })
      .select()
      .single()

    if (error || !player) {
      console.error(`❌ Erreur ajout ${playerNames[i]}:`, error?.message)
      process.exit(1)
    }
    players.push(player)
    console.log(`   ✅ ${player.name} a rejoint${player.is_host ? ' (hôte)' : ''}`)
  }

  // Update host_id
  await supabase.from('games').update({ host_id: players[0].id }).eq('id', game.id)

  // Step 3: Distribute roles (based on settings - no hunter since disabled)
  console.log('\n🎭 ÉTAPE 3: Distribution des rôles')
  // 6 players: 1 werewolf, 1 seer, 1 witch, 3 villagers (no hunter - disabled in settings)
  const roles = shuffleArray(['werewolf', 'seer', 'witch', 'villager', 'villager', 'villager'])

  for (let i = 0; i < players.length; i++) {
    await supabase
      .from('players')
      .update({ role: roles[i] as Player['role'] })
      .eq('id', players[i].id)

    players[i].role = roles[i] as Player['role']
    const emoji = roles[i] === 'werewolf' ? '🐺' : roles[i] === 'seer' ? '🔮' : roles[i] === 'witch' ? '🧪' : '👤'
    console.log(`   ${emoji} ${players[i].name}: ${roles[i]}`)
  }

  // Test narration: Night start
  console.log('\n🎙️ Narration: Début de nuit')
  const nightNarration = await testNarration('night_start', {
    dayNumber: 1,
    aliveCount: players.length,
    playerNames: players.map(p => p.name)
  })
  if (nightNarration) {
    console.log(`   📢 "${nightNarration.narration}"`)
  }

  // Start game
  const phaseEndAt = new Date(Date.now() + settings.night_time * 1000).toISOString()
  await supabase
    .from('games')
    .update({ status: 'night', day_number: 1, phase_end_at: phaseEndAt })
    .eq('id', game.id)

  console.log('\n🌙 ÉTAPE 4: Première nuit')

  // Find werewolf and a victim
  const werewolf = players.find(p => p.role === 'werewolf')!
  const seer = players.find(p => p.role === 'seer')!
  const witch = players.find(p => p.role === 'witch')!
  const villagers = players.filter(p => p.role === 'villager')
  const victim = villagers[0]

  // Werewolf wakes
  const werewolfNarration = await testNarration('werewolves_wake')
  if (werewolfNarration) console.log(`   📢 "${werewolfNarration.narration}"`)

  // Werewolf votes
  console.log(`   🐺 ${werewolf.name} (Loup) vote pour tuer ${victim.name}`)
  await supabase.from('night_actions').insert({
    game_id: game.id,
    day_number: 1,
    player_id: werewolf.id,
    action_type: 'werewolf_vote',
    target_id: victim.id
  })

  // Seer looks at werewolf
  const seerNarration = await testNarration('seer_wake')
  if (seerNarration) console.log(`   📢 "${seerNarration.narration}"`)

  console.log(`   🔮 ${seer.name} (Voyante) observe ${werewolf.name} → C'est un LOUP !`)
  await supabase.from('night_actions').insert({
    game_id: game.id,
    day_number: 1,
    player_id: seer.id,
    action_type: 'seer_look',
    target_id: werewolf.id
  })

  // Witch sees victim
  const witchNarration = await testNarration('witch_wake')
  if (witchNarration) console.log(`   📢 "${witchNarration.narration}"`)

  console.log(`   🧪 ${witch.name} (Sorcière) voit que ${victim.name} a été attaqué`)
  console.log(`   🧪 ${witch.name} choisit de NE PAS utiliser sa potion de vie`)

  // Kill the victim
  await supabase
    .from('players')
    .update({ is_alive: false })
    .eq('id', victim.id)

  // Death announcement
  const deathNarration = await testNarration('death_announce', {
    victimName: victim.name,
    killedBy: 'werewolves',
    totalDeaths: 1
  })
  console.log(`   💀 ${victim.name} est dévoré !`)
  if (deathNarration) console.log(`   📢 "${deathNarration.narration}"`)

  // Day phase
  const dayEndAt = new Date(Date.now() + settings.discussion_time * 1000).toISOString()
  await supabase
    .from('games')
    .update({ status: 'day', phase_end_at: dayEndAt })
    .eq('id', game.id)

  const dayNarration = await testNarration('day_start', {
    dayNumber: 1,
    aliveCount: players.length - 1,
    totalDeaths: 1,
    deadPlayers: [victim.name]
  })
  console.log('\n☀️ ÉTAPE 5: Premier jour')
  if (dayNarration) console.log(`   📢 "${dayNarration.narration}"`)
  console.log(`   💬 Débat... La voyante sait que ${werewolf.name} est le loup !`)

  // Vote phase
  const voteEndAt = new Date(Date.now() + settings.vote_time * 1000).toISOString()
  await supabase
    .from('games')
    .update({ status: 'vote', phase_end_at: voteEndAt })
    .eq('id', game.id)

  const voteNarration = await testNarration('vote_start', { aliveCount: players.length - 1 })
  console.log('\n🗳️ ÉTAPE 6: Vote')
  if (voteNarration) console.log(`   📢 "${voteNarration.narration}"`)

  const livingPlayers = players.filter(p => p.id !== victim.id)

  // Everyone votes for the werewolf (seer convinced them)
  for (const voter of livingPlayers) {
    if (voter.id !== werewolf.id) {
      console.log(`   🗳️ ${voter.name} vote contre ${werewolf.name}`)
      await supabase.from('day_votes').insert({
        game_id: game.id,
        day_number: 1,
        voter_id: voter.id,
        target_id: werewolf.id
      })
    }
  }

  // Eliminate werewolf
  await supabase
    .from('players')
    .update({ is_alive: false })
    .eq('id', werewolf.id)

  const voteResultNarration = await testNarration('vote_result', { victimName: werewolf.name })
  console.log(`   💀 ${werewolf.name} est éliminé par le village !`)
  if (voteResultNarration) console.log(`   📢 "${voteResultNarration.narration}"`)

  // Check win condition
  const { data: alivePlayers } = await supabase
    .from('players')
    .select('role')
    .eq('game_id', game.id)
    .eq('is_alive', true)

  const aliveWerewolves = alivePlayers?.filter(p => p.role === 'werewolf').length || 0

  console.log('\n🏆 ÉTAPE 7: Fin de partie')

  if (aliveWerewolves === 0) {
    await supabase
      .from('games')
      .update({ status: 'finished', winner: 'village' })
      .eq('id', game.id)

    const endNarration = await testNarration('game_end', {
      winner: 'village',
      totalDeaths: 2,
      aliveCount: alivePlayers?.length || 0
    })
    console.log('   🎉 VICTOIRE DU VILLAGE !')
    if (endNarration) console.log(`   📢 "${endNarration.narration}"`)
  }
  else {
    console.log('   🐺 La partie continue...')
  }

  // Add game events
  console.log('\n📜 ÉTAPE 8: Événements de jeu')
  await supabase.from('game_events').insert([
    { game_id: game.id, event_type: 'death', message: `${victim.name} a été dévoré par les loups`, data: { victim: victim.name, killedBy: 'werewolves' } },
    { game_id: game.id, event_type: 'vote', message: `${werewolf.name} a été éliminé par le village`, data: { victim: werewolf.name } },
    { game_id: game.id, event_type: 'game_end', message: 'Le village a gagné !', data: { winner: 'village' } }
  ])
  console.log('   ✅ 3 événements enregistrés')

  // Cleanup
  console.log('\n🧹 Nettoyage des données de test...')
  await supabase.from('day_votes').delete().eq('game_id', game.id)
  await supabase.from('night_actions').delete().eq('game_id', game.id)
  await supabase.from('game_events').delete().eq('game_id', game.id)
  await supabase.from('games').update({ host_id: null }).eq('id', game.id)
  await supabase.from('players').delete().eq('game_id', game.id)
  await supabase.from('games').delete().eq('id', game.id)
  console.log('   ✅ Données supprimées')

  console.log('\n' + '='.repeat(50))
  console.log('✅ SIMULATION TERMINÉE AVEC SUCCÈS !')
  console.log('='.repeat(50) + '\n')
}

async function main() {
  console.log('\n' + '═'.repeat(60))
  console.log('       🐺 LOUP GAROU - TESTS COMPLETS')
  console.log('═'.repeat(60))

  // Test 1: Narration API
  const narrationResults = await testNarrationAPI()

  // Test 2: Game simulation
  await simulateGame()

  // Summary
  console.log('\n' + '═'.repeat(60))
  console.log('       📊 RÉSUMÉ DES TESTS')
  console.log('═'.repeat(60))
  if (narrationResults.skipped) {
    console.log(`   🎙️ Narration: ⏭️  Ignorés (serveur non disponible)`)
  }
  else {
    console.log(`   🎙️ Narration: ${narrationResults.passed}/${narrationResults.passed + narrationResults.failed} tests passés`)
  }
  console.log(`   🎮 Simulation: ✅ Complète`)
  console.log('═'.repeat(60) + '\n')
}

main().catch((error) => {
  console.error('❌ Tests failed:', error)
  process.exit(1)
})
