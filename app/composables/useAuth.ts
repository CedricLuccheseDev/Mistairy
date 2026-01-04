import type { User } from '@supabase/supabase-js'

export const useAuth = () => {
  /* --- State --- */
  const user = useState<User | null>('auth-user', () => null)
  const loading = useState<boolean>('auth-loading', () => true)

  const supabase = useSupabaseClient()

  /* --- Methods --- */
  async function init() {
    if (!supabase) {
      loading.value = false
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      user.value = session?.user ?? null

      // Listen for auth changes
      supabase.auth.onAuthStateChange((_event, session) => {
        user.value = session?.user ?? null
      })
    }
    catch {
      // Init failed silently
    }
    finally {
      loading.value = false
    }
  }

  async function signInWithGoogle() {
    if (!supabase) {
      return { error: { message: 'Supabase not configured' } }
    }

    const redirectUrl = `${window.location.origin}/auth/callback`

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true
      }
    })

    if (error) {
      return { data, error }
    }

    // Open OAuth in popup instead of redirect
    if (data?.url) {
      const width = 500
      const height = 600
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2

      window.open(
        data.url,
        'google-oauth',
        `width=${width},height=${height},left=${left},top=${top},popup=true`
      )
    }

    return { data, error }
  }

  async function signOut() {
    if (!supabase) {
      return { error: { message: 'Supabase not configured' } }
    }

    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) {
        return { error }
      }
      user.value = null
      return { error: null }
    }
    catch {
      return { error: { message: 'Sign-out failed' } }
    }
  }

  /* --- Computed --- */
  const userName = computed(() => {
    if (!user.value) return null
    return user.value.user_metadata?.full_name || user.value.user_metadata?.name || user.value.email?.split('@')[0] || 'Joueur'
  })

  const userAvatar = computed(() => {
    if (!user.value) return null
    return user.value.user_metadata?.avatar_url || user.value.user_metadata?.picture || null
  })

  return {
    user: readonly(user),
    loading: readonly(loading),
    userName,
    userAvatar,
    init,
    signInWithGoogle,
    signOut
  }
}
