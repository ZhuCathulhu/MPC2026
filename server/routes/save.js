import { Router } from 'express'
import { PlayerSave } from '../db.js'

const router = Router()

// GET /api/save/:playerId
router.get('/:playerId', async (req, res) => {
  try {
    const save = await PlayerSave.findOne({ playerId: req.params.playerId })
    if (!save) return res.json(null)
    res.json({ position: save.position, flags: save.flags })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/save/:playerId
router.post('/:playerId', async (req, res) => {
  const { position, flags } = req.body
  try {
    await PlayerSave.findOneAndUpdate(
      { playerId: req.params.playerId },
      { position, flags, updatedAt: new Date() },
      { upsert: true }
    )
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
