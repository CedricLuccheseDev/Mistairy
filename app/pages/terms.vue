<script setup lang="ts">
/* --- Meta --- */
definePageMeta({
  layoutConfig: {
    hideLogo: false
  }
})

/* --- States --- */
const activeSection = ref<string | null>(null)

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
            Conditions d'utilisation
          </h1>
          <p class="text-neutral-400">
            Regles d'utilisation de Mistairy
          </p>
        </div>

        <!-- Introduction -->
        <section class="mb-6">
          <button
            class="w-full p-4 rounded-xl bg-gradient-to-br from-violet-600/20 to-violet-900/20 border border-violet-500/30 backdrop-blur-sm text-left transition-all hover:border-violet-500/50"
            @click="toggleSection('intro')"
          >
            <div class="flex items-center gap-3">
              <span class="text-2xl">📜</span>
              <div class="flex-1">
                <h2 class="text-lg font-bold text-white">Introduction</h2>
              </div>
              <span class="text-violet-400 transition-transform" :class="{ 'rotate-180': activeSection === 'intro' }">▼</span>
            </div>
          </button>
          <Transition name="expand">
            <div v-if="activeSection === 'intro'" class="mt-2 p-4 rounded-xl bg-white/5 border border-white/10">
              <p class="text-neutral-300 text-sm leading-relaxed">
                Bienvenue sur <strong class="text-white">Mistairy</strong>. En utilisant cette application,
                vous acceptez les presentes conditions d'utilisation. Mistairy est une application de jeu
                sociale gratuite permettant de jouer au Loup-Garou en ligne avec vos amis.
              </p>
            </div>
          </Transition>
        </section>

        <!-- Usage -->
        <section class="mb-6">
          <button
            class="w-full p-4 rounded-xl bg-gradient-to-br from-emerald-600/20 to-emerald-900/20 border border-emerald-500/30 backdrop-blur-sm text-left transition-all hover:border-emerald-500/50"
            @click="toggleSection('usage')"
          >
            <div class="flex items-center gap-3">
              <span class="text-2xl">✅</span>
              <div class="flex-1">
                <h2 class="text-lg font-bold text-white">Utilisation autorisee</h2>
              </div>
              <span class="text-emerald-400 transition-transform" :class="{ 'rotate-180': activeSection === 'usage' }">▼</span>
            </div>
          </button>
          <Transition name="expand">
            <div v-if="activeSection === 'usage'" class="mt-2 p-4 rounded-xl bg-white/5 border border-white/10">
              <ul class="space-y-2 text-neutral-300 text-sm">
                <li class="flex gap-2">
                  <span class="text-emerald-400">•</span>
                  <span>Jouer au jeu avec vos amis dans un cadre amical et respectueux</span>
                </li>
                <li class="flex gap-2">
                  <span class="text-emerald-400">•</span>
                  <span>Creer et rejoindre des parties avec un pseudonyme de votre choix</span>
                </li>
                <li class="flex gap-2">
                  <span class="text-emerald-400">•</span>
                  <span>Utiliser les fonctionnalites de l'application comme prevu</span>
                </li>
              </ul>
            </div>
          </Transition>
        </section>

        <!-- Prohibitions -->
        <section class="mb-6">
          <button
            class="w-full p-4 rounded-xl bg-gradient-to-br from-red-600/20 to-red-900/20 border border-red-500/30 backdrop-blur-sm text-left transition-all hover:border-red-500/50"
            @click="toggleSection('prohibitions')"
          >
            <div class="flex items-center gap-3">
              <span class="text-2xl">🚫</span>
              <div class="flex-1">
                <h2 class="text-lg font-bold text-white">Interdictions</h2>
              </div>
              <span class="text-red-400 transition-transform" :class="{ 'rotate-180': activeSection === 'prohibitions' }">▼</span>
            </div>
          </button>
          <Transition name="expand">
            <div v-if="activeSection === 'prohibitions'" class="mt-2 p-4 rounded-xl bg-white/5 border border-white/10">
              <ul class="space-y-2 text-neutral-300 text-sm">
                <li class="flex gap-2">
                  <span class="text-red-400">•</span>
                  <span>Utiliser des pseudonymes offensants, discriminatoires ou inappropries</span>
                </li>
                <li class="flex gap-2">
                  <span class="text-red-400">•</span>
                  <span>Tenter de pirater, exploiter ou perturber le service</span>
                </li>
                <li class="flex gap-2">
                  <span class="text-red-400">•</span>
                  <span>Utiliser l'application a des fins commerciales non autorisees</span>
                </li>
                <li class="flex gap-2">
                  <span class="text-red-400">•</span>
                  <span>Harceler ou intimider d'autres joueurs</span>
                </li>
              </ul>
            </div>
          </Transition>
        </section>

        <!-- Data Privacy -->
        <section class="mb-6">
          <button
            class="w-full p-4 rounded-xl bg-gradient-to-br from-indigo-600/20 to-indigo-900/20 border border-indigo-500/30 backdrop-blur-sm text-left transition-all hover:border-indigo-500/50"
            @click="toggleSection('privacy')"
          >
            <div class="flex items-center gap-3">
              <span class="text-2xl">🔒</span>
              <div class="flex-1">
                <h2 class="text-lg font-bold text-white">Donnees personnelles</h2>
              </div>
              <span class="text-indigo-400 transition-transform" :class="{ 'rotate-180': activeSection === 'privacy' }">▼</span>
            </div>
          </button>
          <Transition name="expand">
            <div v-if="activeSection === 'privacy'" class="mt-2 p-4 rounded-xl bg-white/5 border border-white/10">
              <div class="space-y-3 text-neutral-300 text-sm">
                <p>
                  <strong class="text-white">Donnees collectees :</strong>
                </p>
                <ul class="space-y-1 ml-4">
                  <li class="flex gap-2">
                    <span class="text-indigo-400">•</span>
                    <span>Pseudonyme choisi lors de la partie</span>
                  </li>
                  <li class="flex gap-2">
                    <span class="text-indigo-400">•</span>
                    <span>Actions de jeu (votes, choix nocturnes)</span>
                  </li>
                </ul>
                <p class="mt-3">
                  <strong class="text-white">Conservation :</strong> Les donnees de partie sont automatiquement
                  supprimees 24h apres la fin de la partie.
                </p>
                <div class="mt-3 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                  <p class="text-indigo-300 text-sm">
                    Aucune donnee personnelle sensible n'est collectee. Le jeu peut etre utilise
                    sans creation de compte.
                  </p>
                </div>
              </div>
            </div>
          </Transition>
        </section>

        <!-- Intellectual Property -->
        <section class="mb-6">
          <button
            class="w-full p-4 rounded-xl bg-gradient-to-br from-amber-600/20 to-amber-900/20 border border-amber-500/30 backdrop-blur-sm text-left transition-all hover:border-amber-500/50"
            @click="toggleSection('ip')"
          >
            <div class="flex items-center gap-3">
              <span class="text-2xl">©</span>
              <div class="flex-1">
                <h2 class="text-lg font-bold text-white">Propriete intellectuelle</h2>
              </div>
              <span class="text-amber-400 transition-transform" :class="{ 'rotate-180': activeSection === 'ip' }">▼</span>
            </div>
          </button>
          <Transition name="expand">
            <div v-if="activeSection === 'ip'" class="mt-2 p-4 rounded-xl bg-white/5 border border-white/10">
              <p class="text-neutral-300 text-sm leading-relaxed">
                Mistairy est un projet <strong class="text-white">open source</strong>.
                Le concept du jeu du Loup-Garou est dans le domaine public.
                L'interface et le code source sont soumis a leur licence respective.
              </p>
            </div>
          </Transition>
        </section>

        <!-- Liability -->
        <section class="mb-6">
          <button
            class="w-full p-4 rounded-xl bg-gradient-to-br from-cyan-600/20 to-cyan-900/20 border border-cyan-500/30 backdrop-blur-sm text-left transition-all hover:border-cyan-500/50"
            @click="toggleSection('liability')"
          >
            <div class="flex items-center gap-3">
              <span class="text-2xl">⚖️</span>
              <div class="flex-1">
                <h2 class="text-lg font-bold text-white">Responsabilite</h2>
              </div>
              <span class="text-cyan-400 transition-transform" :class="{ 'rotate-180': activeSection === 'liability' }">▼</span>
            </div>
          </button>
          <Transition name="expand">
            <div v-if="activeSection === 'liability'" class="mt-2 p-4 rounded-xl bg-white/5 border border-white/10">
              <ul class="space-y-2 text-neutral-300 text-sm">
                <li class="flex gap-2">
                  <span class="text-cyan-400">•</span>
                  <span>Le service est fourni "tel quel" sans garantie de disponibilite</span>
                </li>
                <li class="flex gap-2">
                  <span class="text-cyan-400">•</span>
                  <span>Nous ne sommes pas responsables des interactions entre joueurs</span>
                </li>
                <li class="flex gap-2">
                  <span class="text-cyan-400">•</span>
                  <span>Nous nous reservons le droit de modifier ou interrompre le service</span>
                </li>
              </ul>
            </div>
          </Transition>
        </section>

        <!-- Contact -->
        <section class="mb-8">
          <button
            class="w-full p-4 rounded-xl bg-gradient-to-br from-pink-600/20 to-pink-900/20 border border-pink-500/30 backdrop-blur-sm text-left transition-all hover:border-pink-500/50"
            @click="toggleSection('contact')"
          >
            <div class="flex items-center gap-3">
              <span class="text-2xl">📧</span>
              <div class="flex-1">
                <h2 class="text-lg font-bold text-white">Contact</h2>
              </div>
              <span class="text-pink-400 transition-transform" :class="{ 'rotate-180': activeSection === 'contact' }">▼</span>
            </div>
          </button>
          <Transition name="expand">
            <div v-if="activeSection === 'contact'" class="mt-2 p-4 rounded-xl bg-white/5 border border-white/10">
              <p class="text-neutral-300 text-sm leading-relaxed">
                Pour toute question concernant ces conditions ou l'utilisation de Mistairy,
                vous pouvez nous contacter via le depot GitHub du projet.
              </p>
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

        <!-- Last update -->
        <p class="text-center text-neutral-500 text-xs mt-6">
          Derniere mise a jour : Janvier 2025
        </p>
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
