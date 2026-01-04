<script setup lang="ts">
/* --- Props --- */
const props = withDefaults(defineProps<{
  size?: 'sm' | 'md'
}>(), {
  size: 'md'
})

/* --- Constants --- */
const sizeClasses = {
  sm: {
    wrapper: 'h-8 w-8',
    icon: 'h-4 w-4'
  },
  md: {
    wrapper: 'h-10 w-10',
    icon: 'h-5 w-5'
  }
}

/* --- Composables --- */
const { t } = useI18n()
const { user, loading, userName, userAvatar, signOut } = useAuth()
const router = useRouter()

/* --- States --- */
const imageError = ref(false)

/* --- Computed --- */
const showAvatar = computed(() => userAvatar.value && !imageError.value)

const dropdownItems = computed(() => [
  [
    {
      label: t.value.profileMenu,
      icon: 'i-heroicons-user-circle',
      click: () => router.push('/profile')
    },
    {
      label: t.value.profileSignOut,
      icon: 'i-heroicons-arrow-right-on-rectangle',
      click: () => signOut()
    }
  ]
])

/* --- Watchers --- */
watch(() => user.value?.id, () => {
  imageError.value = false
})
</script>

<template>
  <div class="flex items-center">
    <!-- Loading -->
    <div v-if="loading" :class="[sizeClasses[size].wrapper, 'flex items-center justify-center']">
      <UIcon name="i-heroicons-arrow-path" :class="[sizeClasses[size].icon, 'animate-spin text-neutral-500']" />
    </div>

    <!-- Logged in -->
    <UDropdownMenu v-else-if="user" :items="dropdownItems">
      <button
        type="button"
        :class="[sizeClasses[size].wrapper, 'relative cursor-pointer overflow-hidden rounded-full border-2 border-violet-500/50 transition-all hover:border-violet-500']"
      >
        <img
          v-if="showAvatar"
          :src="userAvatar!"
          :alt="userName || 'Avatar'"
          class="h-full w-full object-cover"
          referrerpolicy="no-referrer"
          loading="eager"
          @error="imageError = true"
        >
        <div
          v-else
          class="flex h-full w-full items-center justify-center bg-violet-600 text-sm font-medium text-white"
        >
          {{ (userName?.[0] || 'U').toUpperCase() }}
        </div>
      </button>
    </UDropdownMenu>

    <!-- Not logged in -->
    <UTooltip v-else :text="t.tooltipLogin">
      <NuxtLink
        to="/login"
        :class="[sizeClasses[props.size].wrapper, 'flex cursor-pointer items-center justify-center rounded-full border-2 border-neutral-700/50 bg-neutral-800/50 text-neutral-400 transition-all duration-200 hover:border-violet-500/50 hover:bg-violet-500/10 hover:text-violet-400']"
      >
        <UIcon name="i-heroicons-user-circle" :class="sizeClasses[props.size].icon" />
      </NuxtLink>
    </UTooltip>
  </div>
</template>
