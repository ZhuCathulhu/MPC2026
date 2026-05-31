/**
 * server/routes/save.js
 *
 * GET  /api/save/:playerId  → returns { inventory, flags, position }
 * POST /api/save/:playerId  → body { inventory, flags, position? }
 */
import { Router }     from 'express'
import { PlayerSave } from '../db.js'

const router = Router()

// ── GET ────────────────────────────────────────────────────────────────────────
router.get('/:playerId', async (req, res) => {
  try {
    const save = await PlayerSave.findOne({ playerId: req.params.playerId })
    if (!save) return res.json(null)
    res.json({
      position:  save.position  ?? { x: 0, y: 2, z: 0 },
      inventory: save.inventory ?? {},
      flags:     save.flags     ?? {},
    })
  } catch (err) {
    console.error('[Save] GET error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── POST ───────────────────────────────────────────────────────────────────────
router.post('/:playerId', async (req, res) => {
  const { position, inventory, flags } = req.body
  try {
    const setFields = {
      inventory: inventory ?? {},
      flags:     flags     ?? {},
      updatedAt: new Date(),
    }
    if (position) setFields.position = position

    await PlayerSave.findOneAndUpdate(
      { playerId: req.params.playerId },
      {
        $set: setFields,
        $setOnInsert: { playerId: req.params.playerId },
      },
      { upsert: true, new: true, strict: false }
    )
    res.json({ ok: true })
  } catch (err) {
    console.error('[Save] POST error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

export default router