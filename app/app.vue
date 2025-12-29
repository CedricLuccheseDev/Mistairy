<script setup lang="ts">
/* --- States --- */
const colorMode = useColorMode()

/* --- Lifecycle --- */
onMounted(() => {
  colorMode.preference = 'dark'
})
</script>

<template>
  <UApp>
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </UApp>
</template>
