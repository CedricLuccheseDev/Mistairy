<script setup lang="ts">
/* --- States --- */
const colorMode = useColorMode()
const { init: initAuth } = useAuth()

/* --- Lifecycle --- */
onMounted(() => {
  colorMode.preference = 'dark'
  initAuth()
})
</script>

<template>
  <UApp>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
