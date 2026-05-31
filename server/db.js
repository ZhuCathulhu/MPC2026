/**
 * server/db.js
 *
 * MongoDB models. Added `inventory` field to PlayerSave.
 */
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

// ── Voice cache ────────────────────────────────────────────────────────────────
const voiceCacheSchema = new mongoose.Schema({
  hash:      { type: String, unique: true, index: true },
  voiceId:   String,
  textSnip:  String,
  audio:     Buffer,
  createdAt: { type: Date, default: Date.now },
})
export const VoiceCache = mongoose.model('VoiceCache', voiceCacheSchema)

// ── Player save ────────────────────────────────────────────────────────────────
//
// inventory: { item_id: quantity }
//   e.g. { copper_coin: 3, mill_key: 1 }
//
// flags: arbitrary key/value quest state
//   e.g. { has_room: true, mira_knows_sulfur: true, item_collected_mill_sulfur_01: true }
//
const saveSchema = new mongoose.Schema({
  playerId:  { type: String, unique: true, index: true },
  position:  { x: Number, y: Number, z: Number },
  inventory: { type: mongoose.Schema.Types.Mixed, default: {} },
  flags:     { type: mongoose.Schema.Types.Mixed, default: {} },
  updatedAt: { type: Date, default: Date.now },
})
export const PlayerSave = mongoose.model('PlayerSave', saveSchema)

// ── NPC conversation memory ────────────────────────────────────────────────────
const npcMemorySchema = new mongoose.Schema({
  playerId:  String,
  npcId:     String,
  history:   [{ role: String, text: String }],
  updatedAt: { type: Date, default: Date.now },
})
npcMemorySchema.index({ playerId: 1, npcId: 1 }, { unique: true })
export const NPCMemory = mongoose.model('NPCMemory', npcMemorySchema)