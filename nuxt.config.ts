// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxt/ui', '@nuxtjs/supabase', '@nuxt/eslint'],

  css: ['~/assets/css/main.css'],

  supabase: {
    redirectOptions: {
      login: '/',
      callback: '/',
      exclude: ['/*']
    }
  },

  app: {
    head: {
      title: 'Loup Garou',
      meta: [
        { name: 'description', content: 'Jouez au Loup Garou avec vos amis sans cartes physiques' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no' }
      ]
    }
  }
})
