import { config } from 'dotenv'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Load environment variables
config()

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite'

async function testGeminiDirect() {
  console.log('\n' + '═'.repeat(60))
  console.log('       🤖 TEST GEMINI API DIRECT')
  console.log('═'.repeat(60))

  // Check if API key exists
  console.log('\n📋 Configuration:')
  if (!GEMINI_API_KEY) {
    console.log('   ❌ GEMINI_API_KEY non configuré dans .env')
    console.log('   💡 Ajoute GEMINI_API_KEY=ta_clé dans le fichier .env')
    return { success: false, error: 'Missing API key' }
  }
  console.log(`   ✅ GEMINI_API_KEY: ${GEMINI_API_KEY.substring(0, 10)}...`)
  console.log(`   📝 Model: ${GEMINI_MODEL}`)

  // Test direct API call
  console.log('\n🔌 Test connexion Gemini...')
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL })

    const startTime = Date.now()
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: 'Dis "Bonjour" en une seule ligne.' }] }],
      generationConfig: {
        maxOutputTokens: 50,
        temperature: 0.5
      }
    })
    const elapsed = Date.now() - startTime

    const response = result.response.text()?.trim()

    if (response) {
      console.log(`   ✅ Réponse reçue en ${elapsed}ms`)
      console.log(`   📢 "${response}"`)
      return { success: true, response, elapsed }
    }
    else {
      console.log('   ❌ Réponse vide')
      return { success: false, error: 'Empty response' }
    }
  }
  catch (error) {
    console.log(`   ❌ Erreur: ${error instanceof Error ? error.message : error}`)
    return { success: false, error: String(error) }
  }
}

async function testNarrationGeneration() {
  console.log('\n' + '═'.repeat(60))
  console.log('       🎙️ TEST GÉNÉRATION NARRATION')
  console.log('═'.repeat(60))

  if (!GEMINI_API_KEY) {
    console.log('\n   ⏭️  Ignoré (pas de clé API)')
    return { success: false, skipped: true }
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: `Tu es le maître du jeu d'une partie de Loup-Garou.
RÈGLES:
- Maximum 2 phrases (40 mots max)
- Style: conte macabre, voix grave
- JAMAIS d'emojis
Réponds UNIQUEMENT avec la narration.`
  })

  const testCases = [
    {
      name: 'Début de nuit',
      prompt: 'THÈME: Village de pêcheurs.\nSCÈNE: La nuit 1 commence. Le village s\'endort.'
    },
    {
      name: 'Mort annoncée',
      prompt: 'THÈME: Village de pêcheurs.\nÉVÉNEMENTS: Marie est morte (loups)\nSCÈNE: Annoncer la mort de Marie, dévorée par les loups.'
    },
    {
      name: 'Vote du village',
      prompt: 'THÈME: Village de pêcheurs.\nÉVÉNEMENTS: Marie morte, Pierre suspecté\nSCÈNE: Pierre est condamné par le village.'
    }
  ]

  console.log('')
  let passed = 0

  for (const test of testCases) {
    process.stdout.write(`   🎭 ${test.name}... `)
    try {
      const startTime = Date.now()
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: test.prompt }] }],
        generationConfig: {
          maxOutputTokens: 80,
          temperature: 0.85
        }
      })
      const elapsed = Date.now() - startTime
      const response = result.response.text()?.trim()

      if (response && response.length > 10) {
        console.log(`✅ (${elapsed}ms)`)
        console.log(`      → "${response}"`)
        passed++
      }
      else {
        console.log('❌ Réponse trop courte')
      }
    }
    catch (error) {
      console.log(`❌ ${error instanceof Error ? error.message : error}`)
    }
  }

  console.log(`\n   📊 Résultat: ${passed}/${testCases.length} tests passés`)
  return { success: passed === testCases.length, passed, total: testCases.length }
}

async function testNarrationVariation() {
  console.log('\n' + '═'.repeat(60))
  console.log('       🎲 TEST VARIATION DES NARRATIONS')
  console.log('═'.repeat(60))

  if (!GEMINI_API_KEY) {
    console.log('\n   ⏭️  Ignoré (pas de clé API)')
    return { success: false, skipped: true }
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: `Tu es un conteur de Loup-Garou. Max 2 phrases. Style macabre. Pas d'emoji.`
  })

  console.log('\n   Génération de 3 narrations pour la même scène...\n')

  const prompt = 'THÈME: Village de mineurs.\nSCÈNE: La nuit tombe sur le village.'
  const responses: string[] = []

  for (let i = 0; i < 3; i++) {
    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 80,
          temperature: 0.9 // High temperature for variation
        }
      })
      const response = result.response.text()?.trim()
      if (response) {
        responses.push(response)
        console.log(`   ${i + 1}. "${response}"`)
      }
    }
    catch {
      console.log(`   ${i + 1}. ❌ Erreur`)
    }
  }

  // Check for variation
  const uniqueResponses = new Set(responses)
  const hasVariation = uniqueResponses.size > 1

  console.log(`\n   📊 Variation: ${uniqueResponses.size}/${responses.length} réponses uniques`)

  if (hasVariation) {
    console.log('   ✅ Les narrations varient correctement')
  }
  else {
    console.log('   ⚠️  Les narrations sont identiques (augmente la température)')
  }

  return { success: hasVariation, uniqueCount: uniqueResponses.size }
}

async function main() {
  const results = {
    direct: await testGeminiDirect(),
    narration: await testNarrationGeneration(),
    variation: await testNarrationVariation()
  }

  // Summary
  console.log('\n' + '═'.repeat(60))
  console.log('       📊 RÉSUMÉ DES TESTS GEMINI')
  console.log('═'.repeat(60))
  console.log(`   🔌 Connexion API: ${results.direct.success ? '✅' : '❌'}`)
  console.log(`   🎙️ Génération: ${results.narration.success ? '✅' : results.narration.skipped ? '⏭️' : '❌'}`)
  console.log(`   🎲 Variation: ${results.variation.success ? '✅' : results.variation.skipped ? '⏭️' : '❌'}`)
  console.log('═'.repeat(60) + '\n')

  // Exit with error if any test failed (and wasn't skipped)
  const hasFailure = !results.direct.success ||
    (!results.narration.success && !results.narration.skipped) ||
    (!results.variation.success && !results.variation.skipped)

  if (hasFailure) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})
