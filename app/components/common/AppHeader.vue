<script setup lang="ts">
/* --- Props --- */
withDefaults(defineProps<{
  hideLogo?: boolean
}>(), {
  hideLogo: false
})
</script>

<template>
  <header class="relative z-50">
    <!-- Desktop layout -->
    <div class="hidden md:grid md:grid-cols-3 md:items-center md:px-6 md:py-4">
      <!-- Left (empty or logo) -->
      <div class="flex items-center justify-start">
        <slot name="left">
          <div v-if="!hideLogo" class="text-xl font-bold text-white">
            Mistairy
          </div>
        </slot>
      </div>

      <!-- Center -->
      <div class="flex justify-center">
        <slot name="center" />
      </div>

      <!-- Right -->
      <div class="flex items-center justify-end gap-3">
        <slot name="right">
          <CommonLangSwitch />
          <CommonProfileButton />
        </slot>
      </div>
    </div>

    <!-- Mobile layout -->
    <div class="flex items-center justify-between px-4 py-3 md:hidden">
      <!-- Left -->
      <div class="flex items-center">
        <slot name="left-mobile">
          <div v-if="!hideLogo" class="text-lg font-bold text-white">
            Mistairy
          </div>
        </slot>
      </div>

      <!-- Right -->
      <div class="flex items-center gap-2">
        <slot name="right-mobile">
          <CommonLangSwitch size="sm" />
          <CommonProfileButton size="sm" />
        </slot>
      </div>
    </div>
  </header>
</template>
