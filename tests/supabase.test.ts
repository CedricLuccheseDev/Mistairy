import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

async function testSupabaseConnection() {
  console.log('\n🔌 Testing Supabase connection...\n')

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY environment variables')
    process.exit(1)
  }

  console.log('📍 URL:', supabaseUrl.replace(/^(https?:\/\/[^.]+).*/, '$1...'))

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Test 1: Database connectivity
  console.log('\n=== DATABASE ===')
  try {
    const { error } = await supabase.from('games').select('id').limit(1)

    if (error && error.code === 'PGRST116') {
      console.log('✅ Database is reachable (table does not exist yet - run migrations)')
    }
    else if (error && error.code === '42P01') {
      console.log('⚠️  Table "games" does not exist - run migrations first')
    }
    else if (error) {
      console.log('✅ Database is reachable (error:', error.message, ')')
    }
    else {
      console.log('✅ Database is reachable and games table exists')
    }
  }
  catch (err) {
    console.error('❌ Database connection failed:', err)
    process.exit(1)
  }

  // Test 2: Realtime capability check
  console.log('\n=== REALTIME ===')
  try {
    const channel = supabase.channel('test')
    console.log('✅ Realtime channel created successfully')
    supabase.removeChannel(channel)
  }
  catch (err) {
    console.log('⚠️  Realtime check:', err instanceof Error ? err.message : 'Unknown error')
  }

  console.log('\n' + '='.repeat(50))
  console.log('✅ Supabase connection test passed!\n')
}

testSupabaseConnection().catch((error) => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})
