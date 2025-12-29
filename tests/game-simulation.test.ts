import { createClient } from '@supabase/supabase-js'
import type { Database } from '../app/types/database.types'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

type Player = Database['public']['Tables']['players']['Row']

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

function generateToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

async function simulateGame() {
  console.log('\n🎮 SIMULATION DE PARTIE LOUP GAROU\n')
  console.log('='.repeat(50))

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY')
    process.exit(1)
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey)

  // Step 1: Create game
  console.log('\n📝 ÉTAPE 1: Création de la partie')
  const gameCode = generateCode()

  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({ code: gameCode, status: 'lobby' })
    .select()
    .single()

  if (gameError || !game) {
    console.error('❌ Erreur création partie:', gameError?.message)
    process.exit(1)
  }
  console.log(`✅ Partie créée: ${gameCode}`)

  // Step 2: Add 6 players
  console.log('\n👥 ÉTAPE 2: Ajout des joueurs')
  const playerNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank']
  const players: Player[] = []

  for (let i = 0; i < playerNames.length; i++) {
    const { data: player, error } = await supabase
      .from('players')
      .insert({
        game_id: game.id,
        name: playerNames[i],
        is_host: i === 0,
        user_token: generateToken()
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

  // Step 3: Distribute roles
  console.log('\n🎭 ÉTAPE 3: Distribution des rôles')
  // 6 players: 1 werewolf, 1 seer, 1 witch, 3 villagers
  const roles = shuffleArray(['werewolf', 'seer', 'witch', 'villager', 'villager', 'villager'])

  for (let i = 0; i < players.length; i++) {
    await supabase
      .from('players')
      .update({ role: roles[i] as Player['role'] })
      .eq('id', players[i].id)

    players[i].role = roles[i] as Player['role']
    console.log(`   🎭 ${players[i].name}: ${roles[i]}`)
  }

  // Start game
  await supabase
    .from('games')
    .update({ status: 'night', day_number: 1 })
    .eq('id', game.id)

  console.log('\n🌙 ÉTAPE 4: Première nuit')

  // Find werewolf and a victim
  const werewolf = players.find(p => p.role === 'werewolf')!
  const seer = players.find(p => p.role === 'seer')!
  const villagers = players.filter(p => p.role === 'villager')
  const victim = villagers[0]

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
  console.log(`   🔮 ${seer.name} (Voyante) observe ${werewolf.name}`)
  await supabase.from('night_actions').insert({
    game_id: game.id,
    day_number: 1,
    player_id: seer.id,
    action_type: 'seer_look',
    target_id: werewolf.id
  })

  // Kill the victim
  await supabase
    .from('players')
    .update({ is_alive: false })
    .eq('id', victim.id)

  console.log(`   💀 ${victim.name} est dévoré !`)

  // Day phase
  await supabase
    .from('games')
    .update({ status: 'day' })
    .eq('id', game.id)

  console.log('\n☀️ ÉTAPE 5: Premier jour')
  console.log(`   💬 Débat... La voyante sait que ${werewolf.name} est le loup !`)

  // Vote phase
  await supabase
    .from('games')
    .update({ status: 'vote' })
    .eq('id', game.id)

  console.log('\n🗳️ ÉTAPE 6: Vote')
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

  console.log(`   💀 ${werewolf.name} est éliminé !`)

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

    console.log('   🎉 VICTOIRE DU VILLAGE !')
  }
  else {
    console.log('   🐺 La partie continue...')
  }

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

simulateGame().catch((error) => {
  console.error('❌ Simulation failed:', error)
  process.exit(1)
})
