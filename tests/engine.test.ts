/**
 * Engine Unit Tests
 * Tests for pure functions in victory.ts, resolution.ts, and engine.ts
 */

import { checkVictory, getVictoryMessage } from '../server/game/victory'
import { getNightDeathMessage } from '../server/game/resolution'
import {
  getDefaultSettings,
  getPhaseEndTime,
  getFirstNightRole,
  getNextNightRole,
  getNightRoleNarration
} from '../server/game/engine'
import type { Player, NightRole } from '../server/game/types'

/* ═══════════════════════════════════════════
   TEST UTILITIES
   ═══════════════════════════════════════════ */

function createPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: `player-${Math.random().toString(36).slice(2)}`,
    game_id: 'game-1',
    name: 'Player',
    role: 'villager',
    is_alive: true,
    is_host: false,
    witch_heal_used: false,
    witch_kill_used: false,
    created_at: new Date().toISOString(),
    ...overrides
  }
}

function createPlayers(configs: Array<{ role: string; alive?: boolean; name?: string }>): Player[] {
  return configs.map((config, i) => createPlayer({
    name: config.name || `Player${i + 1}`,
    role: config.role as Player['role'],
    is_alive: config.alive !== false
  }))
}

/* ═══════════════════════════════════════════
   VICTORY TESTS
   ═══════════════════════════════════════════ */

function testVictory() {
  console.log('\n🏆 Testing Victory Conditions...\n')
  let passed = 0
  let failed = 0

  // Test 1: Village wins when all wolves are dead
  {
    const players = createPlayers([
      { role: 'villager', alive: true },
      { role: 'villager', alive: true },
      { role: 'seer', alive: true },
      { role: 'werewolf', alive: false }
    ])
    const result = checkVictory(players)
    if (result === 'village') {
      console.log('✅ Village wins when all wolves are dead')
      passed++
    }
    else {
      console.log(`❌ Village should win when all wolves are dead (got: ${result})`)
      failed++
    }
  }

  // Test 2: Wolves win when they equal villagers
  {
    const players = createPlayers([
      { role: 'werewolf', alive: true },
      { role: 'villager', alive: true }
    ])
    const result = checkVictory(players)
    if (result === 'werewolf') {
      console.log('✅ Wolves win when equal to villagers')
      passed++
    }
    else {
      console.log(`❌ Wolves should win when equal to villagers (got: ${result})`)
      failed++
    }
  }

  // Test 3: Wolves win when they outnumber villagers
  {
    const players = createPlayers([
      { role: 'werewolf', alive: true },
      { role: 'werewolf', alive: true },
      { role: 'villager', alive: true }
    ])
    const result = checkVictory(players)
    if (result === 'werewolf') {
      console.log('✅ Wolves win when outnumbering villagers')
      passed++
    }
    else {
      console.log(`❌ Wolves should win when outnumbering (got: ${result})`)
      failed++
    }
  }

  // Test 4: Game continues when villagers outnumber wolves
  {
    const players = createPlayers([
      { role: 'werewolf', alive: true },
      { role: 'villager', alive: true },
      { role: 'seer', alive: true },
      { role: 'hunter', alive: true }
    ])
    const result = checkVictory(players)
    if (result === null) {
      console.log('✅ Game continues when villagers outnumber wolves')
      passed++
    }
    else {
      console.log(`❌ Game should continue when villagers outnumber (got: ${result})`)
      failed++
    }
  }

  // Test 5: Dead players are not counted
  {
    const players = createPlayers([
      { role: 'werewolf', alive: true },
      { role: 'werewolf', alive: false },
      { role: 'villager', alive: true },
      { role: 'villager', alive: false },
      { role: 'seer', alive: true }
    ])
    const result = checkVictory(players)
    if (result === null) {
      console.log('✅ Dead players are not counted in victory check')
      passed++
    }
    else {
      console.log(`❌ Dead players should not be counted (got: ${result})`)
      failed++
    }
  }

  // Test 6: Victory messages
  {
    const villageMsg = getVictoryMessage('village')
    const wolfMsg = getVictoryMessage('werewolf')
    const nullMsg = getVictoryMessage(null)

    if (villageMsg.includes('villageois') && wolfMsg.includes('loups') && nullMsg === '') {
      console.log('✅ Victory messages are correct')
      passed++
    }
    else {
      console.log('❌ Victory messages are incorrect')
      failed++
    }
  }

  console.log(`\n   Victory: ${passed}/${passed + failed} tests passed`)
  return { passed, failed }
}

/* ═══════════════════════════════════════════
   RESOLUTION TESTS
   ═══════════════════════════════════════════ */

function testResolution() {
  console.log('\n💀 Testing Night Resolution...\n')
  let passed = 0
  let failed = 0

  // Test 1: No deaths message
  {
    const message = getNightDeathMessage([])
    if (message.includes('Personne')) {
      console.log('✅ No deaths message is correct')
      passed++
    }
    else {
      console.log('❌ No deaths message is incorrect')
      failed++
    }
  }

  // Test 2: Single death message
  {
    const dead = [createPlayer({ name: 'Alice' })]
    const message = getNightDeathMessage(dead)
    if (message.includes('Alice') && message.includes('mort')) {
      console.log('✅ Single death message is correct')
      passed++
    }
    else {
      console.log('❌ Single death message is incorrect')
      failed++
    }
  }

  // Test 3: Multiple deaths message
  {
    const dead = [
      createPlayer({ name: 'Alice' }),
      createPlayer({ name: 'Bob' })
    ]
    const message = getNightDeathMessage(dead)
    if (message.includes('Alice') && message.includes('Bob') && message.includes('et')) {
      console.log('✅ Multiple deaths message is correct')
      passed++
    }
    else {
      console.log('❌ Multiple deaths message is incorrect')
      failed++
    }
  }

  console.log(`\n   Resolution: ${passed}/${passed + failed} tests passed`)
  return { passed, failed }
}

/* ═══════════════════════════════════════════
   ENGINE UTILITIES TESTS
   ═══════════════════════════════════════════ */

function testEngineUtils() {
  console.log('\n⚙️ Testing Engine Utilities...\n')
  let passed = 0
  let failed = 0

  // Test 1: Default settings
  {
    const settings = getDefaultSettings()
    if (
      settings.night_time > 0 &&
      settings.discussion_time > 0 &&
      settings.vote_time > 0 &&
      typeof settings.roles === 'object'
    ) {
      console.log('✅ Default settings are valid')
      passed++
    }
    else {
      console.log('❌ Default settings are invalid')
      failed++
    }
  }

  // Test 2: Phase end time calculation
  {
    const settings = { night_time: 30, discussion_time: 120, vote_time: 60 }
    const nightEnd = getPhaseEndTime(settings, 'night')
    const dayEnd = getPhaseEndTime(settings, 'day')
    const voteEnd = getPhaseEndTime(settings, 'vote')

    const now = Date.now()
    const nightDiff = nightEnd.getTime() - now
    const dayDiff = dayEnd.getTime() - now
    const voteDiff = voteEnd.getTime() - now

    // Allow 100ms tolerance
    if (
      Math.abs(nightDiff - 30000) < 100 &&
      Math.abs(dayDiff - 120000) < 100 &&
      Math.abs(voteDiff - 60000) < 100
    ) {
      console.log('✅ Phase end times are calculated correctly')
      passed++
    }
    else {
      console.log('❌ Phase end times are incorrect')
      failed++
    }
  }

  // Test 3: First night role with seer
  {
    const players = createPlayers([
      { role: 'seer', alive: true },
      { role: 'werewolf', alive: true },
      { role: 'villager', alive: true }
    ])
    const firstRole = getFirstNightRole(players)
    if (firstRole === 'seer') {
      console.log('✅ First night role is seer when present')
      passed++
    }
    else {
      console.log(`❌ First night role should be seer (got: ${firstRole})`)
      failed++
    }
  }

  // Test 4: First night role without seer
  {
    const players = createPlayers([
      { role: 'werewolf', alive: true },
      { role: 'villager', alive: true }
    ])
    const firstRole = getFirstNightRole(players)
    if (firstRole === 'werewolf') {
      console.log('✅ First night role is werewolf when no seer')
      passed++
    }
    else {
      console.log(`❌ First night role should be werewolf (got: ${firstRole})`)
      failed++
    }
  }

  // Test 5: First night role with dead seer
  {
    const players = createPlayers([
      { role: 'seer', alive: false },
      { role: 'werewolf', alive: true },
      { role: 'witch', alive: true }
    ])
    const firstRole = getFirstNightRole(players)
    if (firstRole === 'werewolf') {
      console.log('✅ First night role skips dead seer')
      passed++
    }
    else {
      console.log(`❌ First night role should skip dead seer (got: ${firstRole})`)
      failed++
    }
  }

  // Test 6: Next night role from seer
  {
    const players = createPlayers([
      { role: 'seer', alive: true },
      { role: 'werewolf', alive: true },
      { role: 'witch', alive: true }
    ])
    const nextRole = getNextNightRole('seer' as NightRole, players)
    if (nextRole === 'werewolf') {
      console.log('✅ Next role after seer is werewolf')
      passed++
    }
    else {
      console.log(`❌ Next role after seer should be werewolf (got: ${nextRole})`)
      failed++
    }
  }

  // Test 7: Next night role from werewolf
  {
    const players = createPlayers([
      { role: 'werewolf', alive: true },
      { role: 'witch', alive: true }
    ])
    const nextRole = getNextNightRole('werewolf' as NightRole, players)
    if (nextRole === 'witch') {
      console.log('✅ Next role after werewolf is witch')
      passed++
    }
    else {
      console.log(`❌ Next role after werewolf should be witch (got: ${nextRole})`)
      failed++
    }
  }

  // Test 8: Next night role when witch is dead
  {
    const players = createPlayers([
      { role: 'werewolf', alive: true },
      { role: 'witch', alive: false }
    ])
    const nextRole = getNextNightRole('werewolf' as NightRole, players)
    if (nextRole === null) {
      console.log('✅ Next role is null when no more roles')
      passed++
    }
    else {
      console.log(`❌ Next role should be null (got: ${nextRole})`)
      failed++
    }
  }

  // Test 9: Night role narrations exist
  {
    const seerNarr = getNightRoleNarration('seer')
    const wolfNarr = getNightRoleNarration('werewolf')
    const witchNarr = getNightRoleNarration('witch')

    if (seerNarr && wolfNarr && witchNarr) {
      console.log('✅ All night role narrations exist')
      passed++
    }
    else {
      console.log('❌ Some night role narrations are missing')
      failed++
    }
  }

  console.log(`\n   Engine: ${passed}/${passed + failed} tests passed`)
  return { passed, failed }
}

/* ═══════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════ */

async function runTests() {
  console.log('\n' + '═'.repeat(60))
  console.log('       GAME ENGINE UNIT TESTS')
  console.log('═'.repeat(60))

  const victoryResults = testVictory()
  const resolutionResults = testResolution()
  const engineResults = testEngineUtils()

  const totalPassed = victoryResults.passed + resolutionResults.passed + engineResults.passed
  const totalFailed = victoryResults.failed + resolutionResults.failed + engineResults.failed

  console.log('\n' + '═'.repeat(60))
  console.log('       SUMMARY')
  console.log('═'.repeat(60))
  console.log(`   Victory:    ${victoryResults.passed}/${victoryResults.passed + victoryResults.failed} passed`)
  console.log(`   Resolution: ${resolutionResults.passed}/${resolutionResults.passed + resolutionResults.failed} passed`)
  console.log(`   Engine:     ${engineResults.passed}/${engineResults.passed + engineResults.failed} passed`)
  console.log('─'.repeat(60))
  console.log(`   TOTAL:      ${totalPassed}/${totalPassed + totalFailed} passed`)
  console.log('═'.repeat(60))

  if (totalFailed > 0) {
    console.log('\n❌ Some tests failed!')
    process.exit(1)
  }
  else {
    console.log('\n✅ All tests passed!')
  }
}

runTests().catch((error) => {
  console.error('❌ Test runner failed:', error)
  process.exit(1)
})
