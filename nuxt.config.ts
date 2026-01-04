import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import pkg from './package.json'

function getVersion(): string {
  // 1. Use APP_VERSION from CI/CD if available
  if (process.env.APP_VERSION) {
    return process.env.APP_VERSION
  }

  // 2. Read from .version file (created by CI)
  try {
    if (existsSync('.version')) {
      return readFileSync('.version', 'utf-8').trim()
    }
  }
  catch { /* ignore */ }

  // 3. Try git describe (dev only)
  try {
    return execSync('git describe --tags --abbrev=0 2>/dev/null').toString().trim()
  }
  catch { /* ignore */ }

  // 4. Fallback to package.json
  return `v${pkg.version}`
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  vite: {
    define: {
      __APP_VERSION__: JSON.stringify(getVersion())
    }
  },
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
      title: 'Mistairy',
      meta: [
        { name: 'description', content: 'Social deduction game engine - Create your own mystery games' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no' }
      ]
    }
  }
})
