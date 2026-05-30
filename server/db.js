import mongoose from 'mongoose'

export async function connectDB() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.warn('[DB] No MONGODB_URI set — running without persistence')
    return
  }
  try {
    await mongoose.connect(uri)
    console.log('[DB] Connected to MongoDB')
  } catch (err) {
    console.error('[DB] Connection failed:', err.message)
  }
}

// ── Voice cache ───────────────────────────────────────────────────────────────
// Stores generated ElevenLabs audio so we never pay to generate the same line twice.
const voiceCacheSchema = new mongoose.Schema({
  hash:      { type: String, unique: true, index: true }, // MD5 of text+voiceId
  voiceId:   String,
  textSnip:  String,   // first 80 chars for debugging
  audio:     Buffer,   // raw mp3 bytes
  createdAt: { type: Date, default: Date.now },
})
export const VoiceCache = mongoose.model('VoiceCache', voiceCacheSchema)

// ── Player save state ─────────────────────────────────────────────────────────
const saveSchema = new mongoose.Schema({
  playerId:  { type: String, unique: true, index: true },
  position:  { x: Number, y: Number, z: Number },
  flags:     mongoose.Schema.Types.Mixed,   // arbitrary quest flags
  updatedAt: { type: Date, default: Date.now },
})
export const PlayerSave = mongoose.model('PlayerSave', saveSchema)

// ── NPC conversation memory ───────────────────────────────────────────────────
// Lets Gemini remember what was said across sessions.
const npcMemorySchema = new mongoose.Schema({
  playerId:  String,
  npcId:     String,
  history:   [{ role: String, text: String }],  // last N turns
  updatedAt: { type: Date, default: Date.now },
})
npcMemorySchema.index({ playerId: 1, npcId: 1 }, { unique: true })
export const NPCMemory = mongoose.model('NPCMemory', npcMemorySchema)
