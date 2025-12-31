import { config } from 'dotenv'
import { TextToSpeechClient } from '@google-cloud/text-to-speech'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
config()

const GOOGLE_CLOUD_API_KEY = process.env.GOOGLE_CLOUD_API_KEY

// French neural voices
const VOICES = {
  male: {
    name: 'fr-FR-Neural2-B',
    ssmlGender: 'MALE' as const
  },
  female: {
    name: 'fr-FR-Neural2-A',
    ssmlGender: 'FEMALE' as const
  }
}

async function testTTSConnection() {
  console.log('\n' + '═'.repeat(60))
  console.log('       🔊 TEST GOOGLE CLOUD TTS')
  console.log('═'.repeat(60))

  // Check if API key exists
  console.log('\n📋 Configuration:')

  const hasApiKey = !!GOOGLE_CLOUD_API_KEY
  const hasCredentialsFile = !!process.env.GOOGLE_APPLICATION_CREDENTIALS

  if (!hasApiKey && !hasCredentialsFile) {
    console.log('   ❌ Aucune configuration TTS trouvée')
    console.log('   💡 Options:')
    console.log('      1. Ajoute GOOGLE_CLOUD_API_KEY=ta_clé dans .env')
    console.log('      2. Ou définis GOOGLE_APPLICATION_CREDENTIALS avec le chemin du fichier JSON')
    return { success: false, error: 'No TTS configuration' }
  }

  if (hasApiKey) {
    console.log(`   ✅ GOOGLE_CLOUD_API_KEY: ${GOOGLE_CLOUD_API_KEY!.substring(0, 10)}...`)
  }
  if (hasCredentialsFile) {
    console.log(`   ✅ GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`)
  }

  return { success: true }
}

async function testTTSSynthesis() {
  console.log('\n' + '═'.repeat(60))
  console.log('       🎙️ TEST SYNTHÈSE VOCALE')
  console.log('═'.repeat(60))

  if (!GOOGLE_CLOUD_API_KEY && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log('\n   ⏭️  Ignoré (pas de configuration TTS)')
    return { success: false, skipped: true }
  }

  let client: TextToSpeechClient

  try {
    if (GOOGLE_CLOUD_API_KEY) {
      client = new TextToSpeechClient({
        apiKey: GOOGLE_CLOUD_API_KEY
      })
    }
    else {
      client = new TextToSpeechClient()
    }
  }
  catch (error) {
    console.log(`\n   ❌ Erreur initialisation client: ${error instanceof Error ? error.message : error}`)
    return { success: false, error: String(error) }
  }

  const testCases = [
    {
      name: 'Voix masculine',
      text: 'La nuit tombe sur le village. Les loups-garous se préparent à chasser.',
      voice: 'male' as const
    },
    {
      name: 'Voix féminine',
      text: 'Le village se réveille dans la terreur. Un cadavre a été découvert.',
      voice: 'female' as const
    }
  ]

  console.log('')
  let passed = 0

  for (const test of testCases) {
    process.stdout.write(`   🎭 ${test.name}... `)

    try {
      const startTime = Date.now()
      const voiceConfig = VOICES[test.voice]

      const [response] = await client.synthesizeSpeech({
        input: { text: test.text },
        voice: {
          languageCode: 'fr-FR',
          name: voiceConfig.name,
          ssmlGender: voiceConfig.ssmlGender
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 0.9,
          pitch: -2.0,
          effectsProfileId: ['headphone-class-device']
        }
      })

      const elapsed = Date.now() - startTime

      if (response.audioContent) {
        const audioSize = Buffer.from(response.audioContent).length
        console.log(`✅ (${elapsed}ms, ${(audioSize / 1024).toFixed(1)}KB)`)
        passed++
      }
      else {
        console.log('❌ Pas de contenu audio')
      }
    }
    catch (error) {
      console.log(`❌ ${error instanceof Error ? error.message : error}`)
    }
  }

  console.log(`\n   📊 Résultat: ${passed}/${testCases.length} tests passés`)
  return { success: passed === testCases.length, passed, total: testCases.length }
}

async function testTTSSaveAudio() {
  console.log('\n' + '═'.repeat(60))
  console.log('       💾 TEST SAUVEGARDE AUDIO')
  console.log('═'.repeat(60))

  if (!GOOGLE_CLOUD_API_KEY && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log('\n   ⏭️  Ignoré (pas de configuration TTS)')
    return { success: false, skipped: true }
  }

  let client: TextToSpeechClient

  try {
    if (GOOGLE_CLOUD_API_KEY) {
      client = new TextToSpeechClient({
        apiKey: GOOGLE_CLOUD_API_KEY
      })
    }
    else {
      client = new TextToSpeechClient()
    }
  }
  catch (error) {
    console.log(`\n   ❌ Erreur initialisation client: ${error instanceof Error ? error.message : error}`)
    return { success: false, error: String(error) }
  }

  const text = 'Bienvenue dans ce village paisible. Mais attention, des loups-garous se cachent parmi vous.'
  const outputPath = path.join(__dirname, 'test-output.mp3')

  console.log(`\n   📝 Texte: "${text}"`)
  console.log(`   📁 Fichier: ${outputPath}`)

  try {
    const startTime = Date.now()

    const [response] = await client.synthesizeSpeech({
      input: { text },
      voice: {
        languageCode: 'fr-FR',
        name: 'fr-FR-Neural2-B',
        ssmlGender: 'MALE'
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 0.9,
        pitch: -2.0
      }
    })

    const elapsed = Date.now() - startTime

    if (response.audioContent) {
      fs.writeFileSync(outputPath, response.audioContent, 'binary')
      const stats = fs.statSync(outputPath)

      console.log(`\n   ✅ Audio généré en ${elapsed}ms`)
      console.log(`   📊 Taille: ${(stats.size / 1024).toFixed(1)} KB`)
      console.log(`   🎧 Écoute le fichier: ${outputPath}`)

      // Clean up after 5 seconds
      setTimeout(() => {
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath)
          console.log(`   🗑️  Fichier de test supprimé`)
        }
      }, 5000)

      return { success: true, size: stats.size, elapsed }
    }
    else {
      console.log('\n   ❌ Pas de contenu audio retourné')
      return { success: false, error: 'No audio content' }
    }
  }
  catch (error) {
    console.log(`\n   ❌ Erreur: ${error instanceof Error ? error.message : error}`)
    return { success: false, error: String(error) }
  }
}

async function testAvailableVoices() {
  console.log('\n' + '═'.repeat(60))
  console.log('       🗣️ VOIX FRANÇAISES DISPONIBLES')
  console.log('═'.repeat(60))

  if (!GOOGLE_CLOUD_API_KEY && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log('\n   ⏭️  Ignoré (pas de configuration TTS)')
    return { success: false, skipped: true }
  }

  let client: TextToSpeechClient

  try {
    if (GOOGLE_CLOUD_API_KEY) {
      client = new TextToSpeechClient({
        apiKey: GOOGLE_CLOUD_API_KEY
      })
    }
    else {
      client = new TextToSpeechClient()
    }
  }
  catch (error) {
    console.log(`\n   ❌ Erreur initialisation client: ${error instanceof Error ? error.message : error}`)
    return { success: false, error: String(error) }
  }

  try {
    const [result] = await client.listVoices({ languageCode: 'fr-FR' })

    if (!result.voices || result.voices.length === 0) {
      console.log('\n   ⚠️  Aucune voix française trouvée')
      return { success: false, error: 'No French voices' }
    }

    console.log(`\n   📋 ${result.voices.length} voix françaises disponibles:\n`)

    // Group by type
    const neural2 = result.voices.filter(v => v.name?.includes('Neural2'))
    const wavenet = result.voices.filter(v => v.name?.includes('Wavenet'))
    const standard = result.voices.filter(v => v.name?.includes('Standard'))
    const studio = result.voices.filter(v => v.name?.includes('Studio'))

    if (studio.length > 0) {
      console.log('   🌟 Studio (meilleure qualité):')
      studio.forEach(v => console.log(`      - ${v.name} (${v.ssmlGender})`))
    }

    if (neural2.length > 0) {
      console.log('   ⭐ Neural2 (très haute qualité):')
      neural2.forEach(v => console.log(`      - ${v.name} (${v.ssmlGender})`))
    }

    if (wavenet.length > 0) {
      console.log('   ✨ WaveNet (haute qualité):')
      wavenet.forEach(v => console.log(`      - ${v.name} (${v.ssmlGender})`))
    }

    if (standard.length > 0) {
      console.log('   📝 Standard:')
      standard.forEach(v => console.log(`      - ${v.name} (${v.ssmlGender})`))
    }

    return { success: true, voiceCount: result.voices.length }
  }
  catch (error) {
    console.log(`\n   ❌ Erreur: ${error instanceof Error ? error.message : error}`)
    return { success: false, error: String(error) }
  }
}

async function main() {
  const results = {
    connection: await testTTSConnection(),
    synthesis: await testTTSSynthesis(),
    saveAudio: await testTTSSaveAudio(),
    voices: await testAvailableVoices()
  }

  // Summary
  console.log('\n' + '═'.repeat(60))
  console.log('       📊 RÉSUMÉ DES TESTS TTS')
  console.log('═'.repeat(60))
  console.log(`   🔌 Configuration: ${results.connection.success ? '✅' : '❌'}`)
  console.log(`   🎙️ Synthèse: ${results.synthesis.success ? '✅' : results.synthesis.skipped ? '⏭️' : '❌'}`)
  console.log(`   💾 Sauvegarde: ${results.saveAudio.success ? '✅' : results.saveAudio.skipped ? '⏭️' : '❌'}`)
  console.log(`   🗣️ Voix: ${results.voices.success ? '✅' : results.voices.skipped ? '⏭️' : '❌'}`)
  console.log('═'.repeat(60) + '\n')

  // Exit with error if any test failed (and wasn't skipped)
  const hasFailure = !results.connection.success ||
    (!results.synthesis.success && !results.synthesis.skipped) ||
    (!results.saveAudio.success && !results.saveAudio.skipped)

  if (hasFailure) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})
