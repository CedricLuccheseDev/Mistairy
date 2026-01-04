<script setup lang="ts">
/* --- Meta --- */
definePageMeta({
  layoutConfig: {
    hideLogo: true
  }
})

/* --- States --- */
const { t } = useI18n()
const { user, signInWithGoogle } = useAuth()
const router = useRouter()
const isLoadingGoogle = ref(false)

/* --- Methods --- */
async function handleGoogle() {
  isLoadingGoogle.value = true
  await signInWithGoogle()
  isLoadingGoogle.value = false
}

/* --- Watchers --- */
watch(user, (u) => {
  if (u) router.push('/')
}, { immediate: true })
</script>

<template>
  <div class="flex flex-1 flex-col">
    <!-- Background effects -->
    <div class="pointer-events-none absolute inset-0 overflow-hidden">
      <div class="absolute -left-20 top-1/4 h-64 w-64 animate-float rounded-full bg-violet-600/15 blur-3xl" />
      <div class="absolute -right-20 top-1/3 h-80 w-80 rounded-full bg-indigo-600/10 blur-3xl" style="animation: float 10s ease-in-out infinite; animation-delay: 2s" />
      <div class="absolute bottom-1/4 left-1/3 h-48 w-48 rounded-full bg-red-600/10 blur-3xl" style="animation: float 12s ease-in-out infinite; animation-delay: 4s" />

      <!-- Animated rings -->
      <div class="absolute inset-0 flex items-center justify-center">
        <div class="absolute h-[280px] w-[280px] rounded-full border border-violet-500/10 sm:h-[400px] sm:w-[400px]" style="animation: spin 60s linear infinite" />
        <div class="absolute h-[200px] w-[200px] rounded-full border border-violet-500/5 sm:h-[300px] sm:w-[300px]" style="animation: spin 45s linear infinite reverse" />
      </div>
    </div>

    <!-- Main content -->
    <main class="relative z-10 flex flex-1 items-center justify-center px-4 py-8">
      <div class="w-full max-w-md">
        <!-- Card -->
        <div class="rounded-3xl border border-neutral-800/50 bg-neutral-900/50 p-8 backdrop-blur-xl">
          <!-- Icon -->
          <div class="mb-6 flex justify-center">
            <div class="relative">
              <div class="absolute inset-0 animate-pulse rounded-full bg-violet-500/20 blur-xl" />
              <div class="relative text-7xl">
                🐺
              </div>
            </div>
          </div>

          <!-- Title -->
          <div class="mb-8 text-center">
            <h1 class="mb-2 text-2xl font-bold text-white">{{ t.loginTitle }}</h1>
            <p class="text-sm text-neutral-400">{{ t.loginSubtitle }}</p>
          </div>

          <!-- Auth buttons -->
          <div class="space-y-3">
            <!-- Google -->
            <button
              type="button"
              :disabled="isLoadingGoogle"
              class="group relative flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-white px-4 py-3.5 font-medium text-neutral-900 transition-all duration-200 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
              @click="handleGoogle"
            >
              <UIcon v-if="isLoadingGoogle" name="i-heroicons-arrow-path" class="h-5 w-5 animate-spin" />
              <UIcon v-else name="i-simple-icons-google" class="h-5 w-5" />
              <span>{{ t.continueWithGoogle }}</span>
            </button>
          </div>

          <!-- Terms notice -->
          <p class="mt-6 text-center text-xs text-neutral-500">
            {{ t.termsNotice }}
            <NuxtLink
              to="/terms"
              class="cursor-pointer text-violet-400 underline-offset-2 transition-colors hover:text-violet-300 hover:underline"
            >
              {{ t.termsLink }}
            </NuxtLink>
          </p>
        </div>

        <!-- Back link -->
        <div class="mt-6 text-center">
          <NuxtLink
            to="/"
            class="inline-flex cursor-pointer items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-white"
          >
            <UIcon name="i-heroicons-arrow-left" class="h-4 w-4" />
            <span>{{ t.back }}</span>
          </NuxtLink>
        </div>
      </div>
    </main>
  </div>
</template>
