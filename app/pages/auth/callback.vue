<script setup lang="ts">
/* --- Meta --- */
definePageMeta({
  layoutConfig: {
    showHeader: false,
    showFooter: false
  }
})

/* --- Lifecycle --- */
onMounted(() => {
  // Close popup and notify parent
  if (window.opener) {
    window.close()
  }
  else {
    // If not a popup, redirect to home
    navigateTo('/')
  }
})
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-neutral-950">
    <div class="text-center">
      <div class="text-4xl mb-4">🐺</div>
      <p class="text-neutral-400">Connexion en cours...</p>
    </div>
  </div>
</template>
