import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../shared/types/database.types'

export function getServiceClient() {
  const config = useRuntimeConfig()

  if (!config.supabaseServiceKey) {
    throw new Error('SUPABASE_SECRET_KEY is not configured')
  }

  return createClient<Database>(
    config.public.supabaseUrl,
    config.supabaseServiceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
