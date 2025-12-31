// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxt/ui', '@nuxtjs/supabase', '@nuxt/eslint', '@vueuse/motion/nuxt'],

  alias: {
    '#shared': '../shared'
  },

  runtimeConfig: {
    supabaseServiceKey: process.env.SUPABASE_SECRET_KEY,
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiModel: process.env.GEMINI_MODEL, // Optional: defaults to gemini-2.0-flash-lite
    googleCloudApiKey: process.env.GOOGLE_CLOUD_API_KEY, // For Google Cloud TTS
    public: {
      supabaseUrl: process.env.SUPABASE_URL
    }
  },

  css: ['~/assets/css/main.css'],

  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    serviceKey: process.env.SUPABASE_SECRET_KEY,
    types: false,
    redirectOptions: {
      login: '/',
      callback: '/',
      exclude: ['/*']
    }
  },

  app: {
    head: {
      title: 'Loup Agrou',
      meta: [
        { name: 'description', content: 'Jouer au Loup Garou en vrai sans cartes physiques' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no' }
      ]
    }
  }
})
