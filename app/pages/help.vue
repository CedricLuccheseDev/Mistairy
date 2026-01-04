<script setup lang="ts">
import { ROLES_CONFIG } from '#shared/types/game'

/* --- Meta --- */
definePageMeta({
  layoutConfig: {
    hideLogo: false
  }
})

/* --- States --- */
const activeSection = ref<string | null>(null)

/* --- Data --- */
const roles = [
  { ...ROLES_CONFIG.werewolf, team: 'Loups-Garous' },
  { ...ROLES_CONFIG.villager, team: 'Village' },
  { ...ROLES_CONFIG.seer, team: 'Village' },
  { ...ROLES_CONFIG.witch, team: 'Village' },
  { ...ROLES_CONFIG.hunter, team: 'Village' }
]

const phases = [
  {
    icon: '🌙',
    name: 'Nuit',
    description: 'Le village s\'endort. Les roles speciaux agissent dans l\'ordre : Voyante, Loups-Garous, Sorciere.'
  },
  {
    icon: '☀️',
    name: 'Jour',
    description: 'Le village se reveille et decouvre les evenements de la nuit. Les joueurs debattent pour trouver les loups.'
  },
  {
    icon: '🗳️',
    name: 'Vote',
    description: 'Les villageois votent pour eliminer un suspect. La majorite l\'emporte.'
  }
]

/* --- Methods --- */
function toggleSection(section: string) {
  activeSection.value = activeSection.value === section ? null : section
}
</script>

<template>
  <div class="flex flex-1 flex-col">
    <!-- Background -->
    <GamePhaseParticles phase="lobby" intensity="low" />
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-20 -left-20 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl" />
      <div class="absolute -bottom-32 -right-32 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl" />
    </div>

    <!-- Content -->
    <div class="relative z-10 flex flex-1 flex-col px-4 py-6 md:py-10">
      <div class="mx-auto w-full max-w-2xl">
        <!-- Header -->
        <div class="text-center mb-8">
          <h1 class="text-3xl md:text-4xl font-black text-white mb-2">
            Comment jouer
          </h1>
          <p class="text-neutral-400">
            Guide complet pour maitriser Mistairy
          </p>
        </div>

        <!-- What is Mistairy -->
        <section class="mb-6">
          <button
            class="w-full p-4 rounded-xl bg-gradient-to-br from-violet-600/20 to-violet-900/20 border border-violet-500/30 backdrop-blur-sm text-left transition-all hover:border-violet-500/50"
            @click="toggleSection('intro')"
          >
            <div class="flex items-center gap-3">
              <span class="text-2xl">🐺</span>
              <div class="flex-1">
                <h2 class="text-lg font-bold text-white">C'est quoi Mistairy ?</h2>
              </div>
              <span class="text-violet-400 transition-transform" :class="{ 'rotate-180': activeSection === 'intro' }">▼</span>
            </div>
          </button>
          <Transition name="expand">
            <div v-if="activeSection === 'intro'" class="mt-2 p-4 rounded-xl bg-white/5 border border-white/10">
              <div class="prose prose-invert prose-sm max-w-none">
                <p class="text-neutral-300 leading-relaxed">
                  <strong class="text-white">Mistairy</strong> est une application pour jouer au celebre jeu du
                  <strong class="text-white">Loup-Garou</strong> sans cartes physiques et sans maitre du jeu.
                </p>
                <p class="text-neutral-300 leading-relaxed mt-3">
                  Votre telephone devient le narrateur : il distribue les roles secretement,
                  guide les phases de jeu avec la synthese vocale, et gere automatiquement
                  les actions de nuit.
                </p>
                <div class="mt-4 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
                  <p class="text-violet-300 text-sm">
                    <strong>5 a 18 joueurs</strong> peuvent participer. Plus vous etes nombreux,
                    plus il y aura de loups !
                  </p>
                </div>
              </div>
            </div>
          </Transition>
        </section>

        <!-- Objective -->
        <section class="mb-6">
          <button
            class="w-full p-4 rounded-xl bg-gradient-to-br from-amber-600/20 to-amber-900/20 border border-amber-500/30 backdrop-blur-sm text-left transition-all hover:border-amber-500/50"
            @click="toggleSection('objective')"
          >
            <div class="flex items-center gap-3">
              <span class="text-2xl">🎯</span>
              <div class="flex-1">
                <h2 class="text-lg font-bold text-white">Objectif du jeu</h2>
              </div>
              <span class="text-amber-400 transition-transform" :class="{ 'rotate-180': activeSection === 'objective' }">▼</span>
            </div>
          </button>
          <Transition name="expand">
            <div v-if="activeSection === 'objective'" class="mt-2 p-4 rounded-xl bg-white/5 border border-white/10">
              <div class="space-y-4">
                <div class="flex gap-3">
                  <div class="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-lg shrink-0">
                    👥
                  </div>
                  <div>
                    <h3 class="font-semibold text-white">Village</h3>
                    <p class="text-neutral-400 text-sm">Eliminer tous les loups-garous avant qu'ils ne vous devorent.</p>
                  </div>
                </div>
                <div class="flex gap-3">
                  <div class="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center text-lg shrink-0">
                    🐺
                  </div>
                  <div>
                    <h3 class="font-semibold text-white">Loups-Garous</h3>
                    <p class="text-neutral-400 text-sm">Devorer les villageois jusqu'a etre en majorite.</p>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </section>

        <!-- Game Phases -->
        <section class="mb-6">
          <button
            class="w-full p-4 rounded-xl bg-gradient-to-br from-indigo-600/20 to-indigo-900/20 border border-indigo-500/30 backdrop-blur-sm text-left transition-all hover:border-indigo-500/50"
            @click="toggleSection('phases')"
          >
            <div class="flex items-center gap-3">
              <span class="text-2xl">🔄</span>
              <div class="flex-1">
                <h2 class="text-lg font-bold text-white">Deroulement d'une partie</h2>
              </div>
              <span class="text-indigo-400 transition-transform" :class="{ 'rotate-180': activeSection === 'phases' }">▼</span>
            </div>
          </button>
          <Transition name="expand">
            <div v-if="activeSection === 'phases'" class="mt-2 p-4 rounded-xl bg-white/5 border border-white/10">
              <div class="space-y-4">
                <div v-for="(phase, index) in phases" :key="phase.name" class="flex gap-3">
                  <div class="flex flex-col items-center">
                    <div class="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-lg">
                      {{ phase.icon }}
                    </div>
                    <div v-if="index < phases.length - 1" class="w-0.5 h-full bg-indigo-500/20 mt-1" />
                  </div>
                  <div class="pb-4">
                    <h3 class="font-semibold text-white">{{ phase.name }}</h3>
                    <p class="text-neutral-400 text-sm">{{ phase.description }}</p>
                  </div>
                </div>
                <div class="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                  <p class="text-indigo-300 text-sm">
                    Le cycle <strong>Nuit → Jour → Vote</strong> se repete jusqu'a la victoire d'un camp.
                  </p>
                </div>
              </div>
            </div>
          </Transition>
        </section>

        <!-- Roles -->
        <section class="mb-6">
          <button
            class="w-full p-4 rounded-xl bg-gradient-to-br from-emerald-600/20 to-emerald-900/20 border border-emerald-500/30 backdrop-blur-sm text-left transition-all hover:border-emerald-500/50"
            @click="toggleSection('roles')"
          >
            <div class="flex items-center gap-3">
              <span class="text-2xl">🎭</span>
              <div class="flex-1">
                <h2 class="text-lg font-bold text-white">Les roles</h2>
              </div>
              <span class="text-emerald-400 transition-transform" :class="{ 'rotate-180': activeSection === 'roles' }">▼</span>
            </div>
          </button>
          <Transition name="expand">
            <div v-if="activeSection === 'roles'" class="mt-2 space-y-2">
              <div
                v-for="role in roles"
                :key="role.id"
                class="p-3 rounded-xl border backdrop-blur-sm"
                :class="[role.ui.bgColor, role.ui.borderColor]"
              >
                <div class="flex items-start gap-3">
                  <span class="text-2xl">{{ role.emoji }}</span>
                  <div class="flex-1">
                    <div class="flex items-center gap-2">
                      <h3 class="font-semibold" :class="role.ui.textColor">{{ role.name }}</h3>
                      <span class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-neutral-400">
                        {{ role.team }}
                      </span>
                    </div>
                    <p class="text-neutral-400 text-sm mt-1">{{ role.description }}</p>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </section>

        <!-- How to Start -->
        <section class="mb-6">
          <button
            class="w-full p-4 rounded-xl bg-gradient-to-br from-cyan-600/20 to-cyan-900/20 border border-cyan-500/30 backdrop-blur-sm text-left transition-all hover:border-cyan-500/50"
            @click="toggleSection('start')"
          >
            <div class="flex items-center gap-3">
              <span class="text-2xl">🚀</span>
              <div class="flex-1">
                <h2 class="text-lg font-bold text-white">Demarrer une partie</h2>
              </div>
              <span class="text-cyan-400 transition-transform" :class="{ 'rotate-180': activeSection === 'start' }">▼</span>
            </div>
          </button>
          <Transition name="expand">
            <div v-if="activeSection === 'start'" class="mt-2 p-4 rounded-xl bg-white/5 border border-white/10">
              <ol class="space-y-3 text-neutral-300 text-sm">
                <li class="flex gap-3">
                  <span class="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                  <span>Un joueur cree une partie et partage le <strong class="text-white">code a 6 lettres</strong></span>
                </li>
                <li class="flex gap-3">
                  <span class="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                  <span>Les autres joueurs rejoignent avec le code sur leur telephone</span>
                </li>
                <li class="flex gap-3">
                  <span class="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                  <span>L'hote configure les roles actifs et lance la partie</span>
                </li>
                <li class="flex gap-3">
                  <span class="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold shrink-0">4</span>
                  <span>Chacun decouvre son role en secret sur son ecran</span>
                </li>
                <li class="flex gap-3">
                  <span class="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold shrink-0">5</span>
                  <span><strong class="text-white">Activez le son</strong> pour entendre le narrateur !</span>
                </li>
              </ol>
            </div>
          </Transition>
        </section>

        <!-- Tips -->
        <section class="mb-8">
          <button
            class="w-full p-4 rounded-xl bg-gradient-to-br from-pink-600/20 to-pink-900/20 border border-pink-500/30 backdrop-blur-sm text-left transition-all hover:border-pink-500/50"
            @click="toggleSection('tips')"
          >
            <div class="flex items-center gap-3">
              <span class="text-2xl">💡</span>
              <div class="flex-1">
                <h2 class="text-lg font-bold text-white">Conseils</h2>
              </div>
              <span class="text-pink-400 transition-transform" :class="{ 'rotate-180': activeSection === 'tips' }">▼</span>
            </div>
          </button>
          <Transition name="expand">
            <div v-if="activeSection === 'tips'" class="mt-2 p-4 rounded-xl bg-white/5 border border-white/10">
              <ul class="space-y-2 text-neutral-300 text-sm">
                <li class="flex gap-2">
                  <span class="text-pink-400">•</span>
                  <span>Gardez votre telephone face cachee pendant la nuit</span>
                </li>
                <li class="flex gap-2">
                  <span class="text-pink-400">•</span>
                  <span>Observez les reactions des autres joueurs</span>
                </li>
                <li class="flex gap-2">
                  <span class="text-pink-400">•</span>
                  <span>Bluffez ! Les loups doivent se faire passer pour des villageois</span>
                </li>
                <li class="flex gap-2">
                  <span class="text-pink-400">•</span>
                  <span>La Voyante doit partager ses infos... au bon moment</span>
                </li>
                <li class="flex gap-2">
                  <span class="text-pink-400">•</span>
                  <span>La Sorciere doit economiser ses potions</span>
                </li>
              </ul>
            </div>
          </Transition>
        </section>

        <!-- Back button -->
        <div class="text-center">
          <NuxtLink
            to="/"
            class="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 text-white font-semibold hover:bg-violet-500 transition-colors"
          >
            <span>←</span>
            <span>Retour a l'accueil</span>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-10px);
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 500px;
  transform: translateY(0);
}
</style>
