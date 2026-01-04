<script setup lang="ts">
/* --- Meta --- */
definePageMeta({
  layoutConfig: {
    hideLogo: false
  }
})

/* --- Composables --- */
const { t, lang, toggleLang } = useI18n()
const { user, loading, userName, userAvatar, signOut } = useAuth()
const router = useRouter()

/* --- States --- */
const imageError = ref(false)
const isSigningOut = ref(false)

/* --- Computed --- */
const showAvatar = computed(() => userAvatar.value && !imageError.value)

const userEmail = computed(() => user.value?.email || null)

const memberSince = computed(() => {
  if (!user.value?.created_at) return null
  const date = new Date(user.value.created_at)
  return date.toLocaleDateString(lang.value === 'fr' ? 'fr-FR' : 'en-US', {
    year: 'numeric',
    month: 'long'
  })
})

/* --- Methods --- */
async function handleSignOut() {
  isSigningOut.value = true
  await signOut()
  router.push('/')
}

/* --- Watchers --- */
watch(() => user.value?.id, () => {
  imageError.value = false
})
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
      <div class="mx-auto w-full max-w-md">
        <!-- Loading -->
        <div v-if="loading" class="flex flex-col items-center justify-center py-20">
          <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-violet-500" />
          <p class="mt-4 text-neutral-400">{{ t.loading }}</p>
        </div>

        <!-- Not logged in -->
        <div v-else-if="!user" class="flex flex-col items-center justify-center py-20">
          <div class="w-20 h-20 rounded-full bg-neutral-800 flex items-center justify-center mb-4">
            <UIcon name="i-heroicons-user-circle" class="h-12 w-12 text-neutral-500" />
          </div>
          <h1 class="text-2xl font-bold text-white mb-2">{{ t.profileNotLoggedIn }}</h1>
          <p class="text-neutral-400 text-center mb-6">{{ t.profileLoginPrompt }}</p>
          <NuxtLink
            to="/login"
            class="px-6 py-3 rounded-xl bg-violet-600 text-white font-semibold hover:bg-violet-500 transition-colors"
          >
            {{ t.login }}
          </NuxtLink>
        </div>

        <!-- Profile -->
        <div v-else class="space-y-6">
          <!-- Avatar & Name -->
          <div class="flex flex-col items-center text-center">
            <div class="relative mb-4">
              <div class="w-24 h-24 rounded-full overflow-hidden border-4 border-violet-500/50">
                <img
                  v-if="showAvatar"
                  :src="userAvatar!"
                  :alt="userName || 'Avatar'"
                  class="h-full w-full object-cover"
                  referrerpolicy="no-referrer"
                  @error="imageError = true"
                >
                <div
                  v-else
                  class="flex h-full w-full items-center justify-center bg-violet-600 text-3xl font-bold text-white"
                >
                  {{ (userName?.[0] || 'U').toUpperCase() }}
                </div>
              </div>
              <div class="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-neutral-950">
                <UIcon name="i-heroicons-check" class="h-4 w-4 text-white" />
              </div>
            </div>
            <h1 class="text-2xl font-bold text-white">{{ userName }}</h1>
            <p v-if="userEmail" class="text-neutral-400 text-sm mt-1">{{ userEmail }}</p>
            <p v-if="memberSince" class="text-neutral-500 text-xs mt-2">
              {{ t.profileMemberSince }} {{ memberSince }}
            </p>
          </div>

          <!-- Stats -->
          <div class="grid grid-cols-3 gap-3">
            <div class="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
              <div class="text-2xl font-bold text-white">-</div>
              <div class="text-xs text-neutral-400 mt-1">{{ t.profileGamesPlayed }}</div>
            </div>
            <div class="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
              <div class="text-2xl font-bold text-emerald-400">-</div>
              <div class="text-xs text-neutral-400 mt-1">{{ t.profileWins }}</div>
            </div>
            <div class="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
              <div class="text-2xl font-bold text-red-400">-</div>
              <div class="text-xs text-neutral-400 mt-1">{{ t.profileWolfWins }}</div>
            </div>
          </div>

          <!-- Settings -->
          <div class="space-y-2">
            <h2 class="text-sm font-semibold text-neutral-400 uppercase tracking-wider px-1">
              {{ t.profileSettings }}
            </h2>

            <!-- Language -->
            <button
              class="w-full p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3 hover:bg-white/10 transition-colors"
              @click="toggleLang"
            >
              <div class="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <span class="text-lg">{{ lang === 'fr' ? '🇫🇷' : '🇬🇧' }}</span>
              </div>
              <div class="flex-1 text-left">
                <div class="text-white font-medium">{{ t.profileLanguage }}</div>
                <div class="text-neutral-400 text-sm">{{ lang === 'fr' ? 'Francais' : 'English' }}</div>
              </div>
              <UIcon name="i-heroicons-chevron-right" class="h-5 w-5 text-neutral-500" />
            </button>
          </div>

          <!-- Links -->
          <div class="space-y-2">
            <h2 class="text-sm font-semibold text-neutral-400 uppercase tracking-wider px-1">
              {{ t.profileInformation }}
            </h2>

            <NuxtLink
              to="/help"
              class="w-full p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3 hover:bg-white/10 transition-colors"
            >
              <div class="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <UIcon name="i-heroicons-question-mark-circle" class="h-5 w-5 text-violet-400" />
              </div>
              <div class="flex-1 text-left">
                <div class="text-white font-medium">{{ t.profileHelp }}</div>
                <div class="text-neutral-400 text-sm">{{ t.profileHelpSub }}</div>
              </div>
              <UIcon name="i-heroicons-chevron-right" class="h-5 w-5 text-neutral-500" />
            </NuxtLink>

            <NuxtLink
              to="/terms"
              class="w-full p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3 hover:bg-white/10 transition-colors"
            >
              <div class="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <UIcon name="i-heroicons-document-text" class="h-5 w-5 text-amber-400" />
              </div>
              <div class="flex-1 text-left">
                <div class="text-white font-medium">{{ t.profileTerms }}</div>
                <div class="text-neutral-400 text-sm">{{ t.profileTermsSub }}</div>
              </div>
              <UIcon name="i-heroicons-chevron-right" class="h-5 w-5 text-neutral-500" />
            </NuxtLink>
          </div>

          <!-- Sign out -->
          <button
            class="w-full p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center gap-2 text-red-400 font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50"
            :disabled="isSigningOut"
            @click="handleSignOut"
          >
            <UIcon v-if="isSigningOut" name="i-heroicons-arrow-path" class="h-5 w-5 animate-spin" />
            <UIcon v-else name="i-heroicons-arrow-right-on-rectangle" class="h-5 w-5" />
            <span>{{ isSigningOut ? t.profileSigningOut : t.profileSignOut }}</span>
          </button>

          <!-- Back button -->
          <div class="text-center pt-2">
            <NuxtLink
              to="/"
              class="text-neutral-400 hover:text-white transition-colors text-sm"
            >
              ← {{ t.backToHome }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
