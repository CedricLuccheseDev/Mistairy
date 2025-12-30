<script setup lang="ts">
/* --- Props --- */
defineProps<{
  seerResult?: { name: string; role: string; emoji: string } | null
}>()
</script>

<template>
  <UCard class="text-center">
    <div class="text-4xl mb-2">
      ✅
    </div>

    <!-- Seer result -->
    <template v-if="seerResult">
      <p class="text-lg font-semibold mb-2">
        {{ seerResult.name }} est...
      </p>
      <div class="text-4xl mb-2">
        {{ seerResult.emoji }}
      </div>
      <p class="text-xl font-bold" :class="seerResult.role === 'Loup-Garou' ? 'text-red-500' : 'text-green-500'">
        {{ seerResult.role }}
      </p>
    </template>

    <p v-else class="text-gray-400">
      Action enregistrée. Attends les autres joueurs.
    </p>
  </UCard>
</template>
