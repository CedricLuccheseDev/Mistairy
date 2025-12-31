import { TextToSpeechClient } from '@google-cloud/text-to-speech'

interface TTSRequest {
  text: string
  voice?: 'male' | 'female'
  speakingRate?: number
  pitch?: number
}

// Lazy-loaded client instance
let ttsClient: TextToSpeechClient | null = null

function getClient(): TextToSpeechClient | null {
  if (ttsClient) return ttsClient

  const config = useRuntimeConfig()

  // Check for Google Cloud credentials
  if (!config.googleCloudApiKey && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return null
  }

  try {
    if (config.googleCloudApiKey) {
      // Use API key authentication
      ttsClient = new TextToSpeechClient({
        apiKey: config.googleCloudApiKey
      })
    }
    else {
      // Use default credentials (service account JSON)
      ttsClient = new TextToSpeechClient()
    }
    return ttsClient
  }
  catch (error) {
    console.error('Failed to initialize TTS client:', error)
    return null
  }
}

// French neural voices (WaveNet = best quality)
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

export default defineEventHandler(async (event) => {
  const body = await readBody<TTSRequest>(event)

  if (!body.text || body.text.trim().length === 0) {
    throw createError({
      statusCode: 400,
      message: 'Text is required'
    })
  }

  // Limit text length to prevent abuse
  if (body.text.length > 1000) {
    throw createError({
      statusCode: 400,
      message: 'Text too long (max 1000 characters)'
    })
  }

  const client = getClient()

  if (!client) {
    // No TTS configured, return a flag indicating fallback to browser TTS
    return {
      success: false,
      useFallback: true,
      message: 'Cloud TTS not configured, use browser fallback'
    }
  }

  try {
    const voiceConfig = VOICES[body.voice || 'male']

    const [response] = await client.synthesizeSpeech({
      input: { text: body.text },
      voice: {
        languageCode: 'fr-FR',
        name: voiceConfig.name,
        ssmlGender: voiceConfig.ssmlGender
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: body.speakingRate ?? 0.9, // Slightly slower for narration
        pitch: body.pitch ?? -2.0, // Lower pitch for dramatic effect
        effectsProfileId: ['headphone-class-device'] // Optimized for headphones
      }
    })

    if (!response.audioContent) {
      throw new Error('No audio content returned')
    }

    // Return base64 encoded audio
    const audioBase64 = Buffer.from(response.audioContent).toString('base64')

    return {
      success: true,
      audio: audioBase64,
      contentType: 'audio/mpeg'
    }
  }
  catch (error) {
    console.error('TTS generation error:', error)

    // Return fallback flag on error
    return {
      success: false,
      useFallback: true,
      message: error instanceof Error ? error.message : 'TTS generation failed'
    }
  }
})
