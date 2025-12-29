<script setup lang="ts">
import type { Database } from '~/types/database.types'
import { ROLES } from '~/types/game'

type Game = Database['public']['Tables']['games']['Row']
type Player = Database['public']['Tables']['players']['Row']

/* --- Props --- */
const props = defineProps<{
  game: Game
  currentPlayer: Player
  alivePlayers: Player[]
  otherWerewolves: Player[]
}>()

/* --- States --- */
const selectedTarget = ref<string | null>(null)
const hasActed = ref(false)
const isSubmitting = ref(false)
const seerResult = ref<{ name: string, role: string, emoji: string } | null>(null)

/* --- Computed --- */
const roleInfo = computed(() => {
  if (!props.currentPlayer.role) return null
  return ROLES[props.currentPlayer.role]
})

const canAct = computed(() => {
  if (hasActed.value) return false
  if (!props.currentPlayer.is_alive) return false

  switch (props.currentPlayer.role) {
    case 'werewolf':
    case 'seer':
      return true
    case 'witch':
      return !props.currentPlayer.witch_heal_used || !props.currentPlayer.witch_kill_used
    default:
      return false
  }
})

const targets = computed(() => {
  switch (props.currentPlayer.role) {
    case 'werewolf':
      return props.alivePlayers.filter(p => p.role !== 'werewolf')
    case 'seer':
    case 'witch':
      return props.alivePlayers.filter(p => p.id !== props.currentPlayer.id)
    default:
      return []
  }
})

const actionLabel = computed(() => {
  switch (props.currentPlayer.role) {
    case 'werewolf': return 'Dévorer'
    case 'seer': return 'Observer'
    case 'witch': return 'Utiliser potion'
    default: return 'Confirmer'
  }
})

/* --- Methods --- */
async function submitAction(actionType: string) {
  if (!selectedTarget.value && actionType !== 'witch_skip') return

  isSubmitting.value = true

  try {
    const response = await $fetch('/api/game/night-action', {
      method: 'POST',
      body: {
        gameId: props.game.id,
        playerId: props.currentPlayer.id,
        playerToken: localStorage.getItem('playerToken'),
        actionType,
        targetId: selectedTarget.value
      }
    })

    hasActed.value = true

    if (actionType === 'seer_look' && response.revealedRole) {
      const targetPlayer = props.alivePlayers.find(p => p.id === selectedTarget.value)
      seerResult.value = {
        name: targetPlayer?.name || 'Inconnu',
        role: ROLES[response.revealedRole as keyof typeof ROLES].name,
        emoji: ROLES[response.revealedRole as keyof typeof ROLES].emoji
      }
    }
  }
  catch (e) {
    console.error('Action failed:', e)
  }
  finally {
    isSubmitting.value = false
  }
}

async function skipWitchAction() {
  hasActed.value = true
}
</script>

<template>
  <div class="space-y-6">
    <!-- Night atmosphere -->
    <div class="text-center py-8">
      <div class="text-4xl mb-2">
        🌙
      </div>
      <h2 class="text-xl font-semibold">
        Nuit {{ game.day_number }}
      </h2>
      <p class="text-gray-400">
        Le village dort...
      </p>
    </div>

    <!-- Dead player view -->
    <UCard v-if="!currentPlayer.is_alive" class="text-center">
      <div class="text-4xl mb-2">
        💀
      </div>
      <p class="text-gray-400">
        Tu es mort. Observe en silence.
      </p>
    </UCard>

    <!-- Villager view (no action) -->
    <UCard v-else-if="currentPlayer.role === 'villager'" class="text-center">
      <div class="text-4xl mb-2">
        😴
      </div>
      <p class="text-gray-400">
        Tu dors paisiblement. Attends le lever du jour.
      </p>
    </UCard>

    <!-- Hunter (no night action) -->
    <UCard v-else-if="currentPlayer.role === 'hunter'" class="text-center">
      <div class="text-4xl mb-2">
        🏹
      </div>
      <p class="text-gray-400">
        Tu n'as pas d'action de nuit. Attends le lever du jour.
      </p>
    </UCard>

    <!-- Active role -->
    <template v-else-if="canAct && !hasActed">
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <span class="text-2xl">{{ roleInfo?.emoji }}</span>
            <span class="font-semibold">{{ roleInfo?.name }}</span>
          </div>
        </template>

        <!-- Werewolf allies -->
        <div
          v-if="currentPlayer.role === 'werewolf' && otherWerewolves.length > 0"
          class="mb-4 p-3 rounded-lg bg-red-950/30 border border-red-800"
        >
          <p class="text-sm text-red-400 mb-2">
            Avec :
          </p>
          <div class="flex flex-wrap gap-2">
            <UBadge v-for="wolf in otherWerewolves" :key="wolf.id" color="error">
              {{ wolf.name }}
            </UBadge>
          </div>
        </div>

        <!-- Target selection -->
        <div class="space-y-2">
          <p class="text-sm text-gray-400 mb-3">
            <template v-if="currentPlayer.role === 'werewolf'">
              Choisissez une victime à dévorer :
            </template>
            <template v-else-if="currentPlayer.role === 'seer'">
              Qui veux-tu observer ?
            </template>
            <template v-else-if="currentPlayer.role === 'witch'">
              Utiliser une potion ?
            </template>
          </p>

          <div class="grid gap-2">
            <UButton
              v-for="target in targets"
              :key="target.id"
              :color="selectedTarget === target.id ? 'primary' : 'neutral'"
              :variant="selectedTarget === target.id ? 'solid' : 'outline'"
              block
              @click="selectedTarget = target.id"
            >
              {{ target.name }}
            </UButton>
          </div>
        </div>

        <template #footer>
          <div class="space-y-2">
            <UButton
              v-if="currentPlayer.role === 'werewolf'"
              color="error"
              block
              :disabled="!selectedTarget"
              :loading="isSubmitting"
              @click="submitAction('werewolf_vote')"
            >
              {{ actionLabel }}
            </UButton>

            <UButton
              v-else-if="currentPlayer.role === 'seer'"
              color="primary"
              block
              :disabled="!selectedTarget"
              :loading="isSubmitting"
              @click="submitAction('seer_look')"
            >
              {{ actionLabel }}
            </UButton>

            <template v-else-if="currentPlayer.role === 'witch'">
              <UButton
                v-if="!currentPlayer.witch_heal_used"
                color="success"
                block
                :disabled="!selectedTarget"
                :loading="isSubmitting"
                @click="submitAction('witch_heal')"
              >
                Potion de vie
              </UButton>
              <UButton
                v-if="!currentPlayer.witch_kill_used"
                color="error"
                block
                :disabled="!selectedTarget"
                :loading="isSubmitting"
                @click="submitAction('witch_kill')"
              >
                Potion de mort
              </UButton>
              <UButton
                color="neutral"
                variant="outline"
                block
                @click="skipWitchAction"
              >
                Ne rien faire
              </UButton>
            </template>
          </div>
        </template>
      </UCard>
    </template>

    <!-- Action done -->
    <UCard v-else-if="hasActed" class="text-center">
      <div class="text-4xl mb-2">
        ✅
      </div>

      <!-- Seer result -->
      <template v-if="seerResult">
        <p class="text-lg font-semibold mb-2">
          {{ seerResult.name }} est...
        </p>
        <div class="text-4xl mb-2">
          {{ seerResult.emoji }}
        </div>
        <p class="text-xl font-bold" :class="seerResult.role === 'Loup-Garou' ? 'text-red-500' : 'text-green-500'">
          {{ seerResult.role }}
        </p>
      </template>

      <p v-else class="text-gray-400">
        Action enregistrée. Attends les autres joueurs.
      </p>
    </UCard>
  </div>
</template>
