<script setup lang="ts">
import type { Player } from '#shared/types/game'
import { ROLES } from '#shared/types/game'

/* --- Props --- */
defineProps<{
  players: Player[]
  currentPlayerId?: string
  showRoles?: boolean
}>()

/* --- Helpers --- */
function getRoleEmoji(role: string): string {
  return ROLES[role as keyof typeof ROLES]?.emoji || '👤'
}

function getRoleColor(role: string): string {
  const roleData = ROLES[role as keyof typeof ROLES]
  return roleData?.team === 'werewolf' ? 'red' : 'violet'
}
</script>

<template>
  <div class="space-y-2">
    <!-- Alive players -->
    <div class="grid grid-cols-2 gap-2">
      <div
        v-for="player in players.filter(p => p.is_alive)"
        :key="player.id"
        class="relative group"
      >
        <!-- Player card -->
        <div
          class="relative p-3 rounded-xl border-2 transition-all duration-300"
          :class="[
            player.id === currentPlayerId
              ? 'border-violet-500 bg-violet-950/50 shadow-lg shadow-violet-500/20'
              : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
          ]"
        >
          <!-- Host crown -->
          <div
            v-if="player.is_host"
            class="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-xs shadow-lg"
          >
            👑
          </div>

          <!-- Avatar -->
          <div class="flex items-center gap-3">
            <div
              class="w-12 h-12 rounded-lg flex items-center justify-center text-2xl font-bold"
              :class="[
                showRoles && player.role
                  ? getRoleColor(player.role) === 'red'
                    ? 'bg-red-900/50 border border-red-500/50'
                    : 'bg-violet-900/50 border border-violet-500/50'
                  : 'bg-slate-800 border border-slate-700'
              ]"
            >
              <span v-if="showRoles && player.role">{{ getRoleEmoji(player.role) }}</span>
              <span v-else class="text-white/80">{{ player.name.charAt(0).toUpperCase() }}</span>
            </div>

            <div class="flex-1 min-w-0">
              <p
                class="font-bold truncate"
                :class="player.id === currentPlayerId ? 'text-violet-300' : 'text-white'"
              >
                {{ player.name }}
              </p>
              <div class="flex items-center gap-1.5 mt-0.5">
                <!-- Alive indicator -->
                <span class="flex items-center gap-1 text-xs text-emerald-400">
                  <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  En vie
                </span>
                <!-- You indicator -->
                <span
                  v-if="player.id === currentPlayerId"
                  class="text-xs text-violet-400 font-medium"
                >
                  (toi)
                </span>
              </div>
            </div>
          </div>

          <!-- Role reveal (when showRoles) -->
          <div
            v-if="showRoles && player.role"
            class="mt-2 pt-2 border-t border-white/10"
          >
            <span
              class="text-xs font-medium px-2 py-0.5 rounded-full"
              :class="getRoleColor(player.role) === 'red'
                ? 'bg-red-900/50 text-red-400'
                : 'bg-violet-900/50 text-violet-400'"
            >
              {{ ROLES[player.role as keyof typeof ROLES]?.name || player.role }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Dead players section -->
    <div v-if="players.filter(p => !p.is_alive).length > 0" class="mt-4">
      <div class="flex items-center gap-2 mb-2">
        <div class="h-px flex-1 bg-white/10" />
        <span class="text-xs text-neutral-500 uppercase tracking-wider font-medium">Éliminés</span>
        <div class="h-px flex-1 bg-white/10" />
      </div>

      <div class="grid grid-cols-3 gap-2">
        <div
          v-for="player in players.filter(p => !p.is_alive)"
          :key="player.id"
          class="relative"
        >
          <!-- Dead player card -->
          <div
            class="p-2 rounded-lg border border-neutral-800 bg-neutral-900/50 opacity-60"
          >
            <div class="flex items-center gap-2">
              <!-- Skull avatar -->
              <div class="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-lg">
                💀
              </div>

              <div class="flex-1 min-w-0">
                <p class="text-sm text-neutral-400 truncate line-through">
                  {{ player.name }}
                </p>
                <!-- Role reveal for dead players -->
                <span
                  v-if="showRoles && player.role"
                  class="text-xs"
                  :class="getRoleColor(player.role) === 'red' ? 'text-red-500/70' : 'text-violet-500/70'"
                >
                  {{ ROLES[player.role as keyof typeof ROLES]?.name || player.role }}
                </span>
              </div>
            </div>
          </div>

          <!-- Death mark overlay -->
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div class="w-full h-0.5 bg-red-500/30 rotate-[-15deg]" />
          </div>
        </div>
      </div>
    </div>

    <!-- Stats bar -->
    <div class="flex items-center justify-center gap-4 pt-3 border-t border-white/5">
      <div class="flex items-center gap-1.5 text-xs">
        <span class="w-2 h-2 rounded-full bg-emerald-500" />
        <span class="text-neutral-400">{{ players.filter(p => p.is_alive).length }} vivants</span>
      </div>
      <div class="flex items-center gap-1.5 text-xs">
        <span class="w-2 h-2 rounded-full bg-neutral-600" />
        <span class="text-neutral-500">{{ players.filter(p => !p.is_alive).length }} morts</span>
      </div>
    </div>
  </div>
</template>
