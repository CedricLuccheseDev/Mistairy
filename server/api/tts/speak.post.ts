import { TextToSpeechClient } from '@google-cloud/text-to-speech'

interface TTSRequest {
  text: string
  ssml?: string // SSML markup for natural speech
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

// French voices - Neural2 voices with SSML for natural speech
// Neural2 is the best quality available for French on Google Cloud TTS
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

// Check if text already contains SSML tags
function containsSSML(text: string): boolean {
  return /<(break|emphasis|prosody|speak)[^>]*>/i.test(text)
}

// Convert plain text to SSML with natural pauses and emphasis
function textToSSML(text: string): string {
  // If text already contains SSML, just wrap it in <speak>
  if (containsSSML(text)) {
    // Remove existing <speak> tags if present, we'll add our own
    const cleanText = text.replace(/<\/?speak>/gi, '')
    return `<speak>${cleanText}</speak>`
  }

  // Convert plain text to SSML
  const ssml = text
    // Add pause after periods
    .replace(/\.\s+/g, '.<break time="400ms"/> ')
    // Add shorter pause after commas
    .replace(/,\s+/g, ',<break time="200ms"/> ')
    // Add pause after exclamation/question marks
    .replace(/!\s+/g, '!<break time="350ms"/> ')
    .replace(/\?\s+/g, '?<break time="350ms"/> ')
    // Emphasize dramatic words
    .replace(/\b(mort|tué|dévoré|assassiné|victime)\b/gi, '<emphasis level="moderate">$1</emphasis>')
    .replace(/\b(loups?-garous?|loup|louve)\b/gi, '<emphasis level="moderate">$1</emphasis>')
    .replace(/\b(village|villageois)\b/gi, '<emphasis level="reduced">$1</emphasis>')

  return `<speak>${ssml}</speak>`
}

// Synthesize speech with Google Cloud TTS
async function synthesizeSpeech(
  client: TextToSpeechClient,
  ssmlContent: string,
  voiceName: string,
  ssmlGender: 'MALE' | 'FEMALE',
  speakingRate: number,
  pitch: number
) {
  const [response] = await client.synthesizeSpeech({
    input: { ssml: ssmlContent },
    voice: {
      languageCode: 'fr-FR',
      name: voiceName,
      ssmlGender
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate,
      pitch,
      effectsProfileId: ['headphone-class-device']
    }
  })
  return response
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
    const voiceType = body.voice || 'male'
    const voiceConfig = VOICES[voiceType]
    const speakingRate = body.speakingRate ?? 0.9
    const pitch = body.pitch ?? -2.0

    // Convert text to SSML for natural pauses and emphasis
    const ssmlContent = body.ssml || textToSSML(body.text)

    const response = await synthesizeSpeech(
      client,
      ssmlContent,
      voiceConfig.name,
      voiceConfig.ssmlGender,
      speakingRate,
      pitch
    )

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
