<script setup lang="ts">
/* --- States --- */
const route = useRoute()

/* --- Computed --- */
const layoutMeta = computed(() => {
  const config = route.meta.layoutConfig as {
    showHeader?: boolean
    showFooter?: boolean
    hideLogo?: boolean
  } | undefined
  return config || {}
})
</script>

<template>
  <div class="relative flex min-h-screen flex-col bg-neutral-950">
    <!-- Header -->
    <CommonAppHeader
      v-if="layoutMeta.showHeader !== false"
      class="relative z-50"
      :hide-logo="layoutMeta.hideLogo"
    />

    <!-- Content -->
    <slot />

    <!-- Footer -->
    <CommonAppFooter v-if="layoutMeta.showFooter !== false" />
  </div>
</template>
