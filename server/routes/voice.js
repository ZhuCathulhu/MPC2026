import { Router }  from 'express'
import { createHash } from 'crypto'
import { VoiceCache } from '../db.js'

const router = Router()
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY

/**
 * POST /api/voice/speak
 * Body: { text: string, voiceId: string }
 * Returns: audio/mpeg stream
 *
 * Cache strategy:
 *   1. Check MongoDB for (text+voiceId) hash
 *   2. If hit → stream cached bytes
 *   3. If miss → call ElevenLabs, save to MongoDB, stream to client
 */
router.post('/speak', async (req, res) => {
  const { text, voiceId } = req.body
  if (!text || !voiceId || !ELEVEN_KEY) {
    return res.status(400).json({ error: 'Missing text, voiceId, or API key' })
  }

  const hash = createHash('md5').update(`${voiceId}:${text}`).digest('hex')

  // ── Cache lookup ───────────────────────────────────────────────────────────
  try {
    const cached = await VoiceCache.findOne({ hash })
    if (cached) {
      res.set('Content-Type', 'audio/mpeg')
      res.set('X-Cache', 'HIT')
      return res.send(cached.audio)
    }
  } catch { /* DB offline — fall through to ElevenLabs */ }

  // ── ElevenLabs call ────────────────────────────────────────────────────────
  try {
    const eleven = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key':   ELEVEN_KEY,
          'Content-Type': 'application/json',
          'Accept':       'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability:         0.5,
            similarity_boost:  0.75,
            style:             0.0,
            use_speaker_boost: true,
          }
        })
      }
    )

    if (!eleven.ok) {
      const err = await eleven.text()
      console.error('[Voice] ElevenLabs error:', err)
      return res.status(502).json({ error: 'ElevenLabs failed' })
    }

    // Collect audio bytes
    const arrayBuffer = await eleven.arrayBuffer()
    const audioBuffer = Buffer.from(arrayBuffer)

    // Save to MongoDB cache (fire and forget)
    VoiceCache.create({
      hash,
      voiceId,
      textSnip: text.slice(0, 80),
      audio:    audioBuffer,
    }).catch(() => { /* DB might be offline */ })

    res.set('Content-Type', 'audio/mpeg')
    res.set('X-Cache', 'MISS')
    res.send(audioBuffer)

  } catch (err) {
    console.error('[Voice] Error:', err.message)
    res.status(500).json({ error: 'Voice synthesis failed' })
  }
})

export default router
