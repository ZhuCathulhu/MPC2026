import { Router } from 'express'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { NPCMemory } from '../db.js'

const router = Router()
const genAI  = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null

/**
 * POST /api/dialogue/ai
 *
 * Body: {
 *   npcId:       string,
 *   personality: string,   // your character description from npcs.js
 *   history:     [{role, text}],   // in-session history
 *   playerText:  string,
 *   playerId?:   string,   // if present, cross-session memory is loaded/saved
 * }
 */
router.post('/ai', async (req, res) => {
  const { npcId, personality, history, playerText, playerId } = req.body

  if (!genAI) {
    return res.json({
      text: '...',
      choices: [{ id: '__end__', label: 'Leave' }]
    })
  }

  // Load cross-session memory if playerId is provided and MongoDB is connected
  let persistedHistory = []
  if (playerId && npcId) {
    try {
      const mem = await NPCMemory.findOne({ playerId, npcId })
      if (mem) persistedHistory = mem.history.slice(-10)  // last 10 turns
    } catch { /* DB might be offline */ }
  }

  // Build Gemini prompt
  const systemPrompt = `${personality}

RULES:
- Stay in character at all times. Never acknowledge you are an AI.
- Keep responses short: 1-3 sentences max.  
- At the end of your response, provide 2-4 player choice options as a JSON block.
- Format EXACTLY like this, with nothing after the JSON:

[NPC dialogue here]
\`\`\`choices
[{"id":"choice_1","label":"Short player response (under 8 words)"},{"id":"__end__","label":"Goodbye."}]
\`\`\``

  // Build conversation history for Gemini
  const turns = [...persistedHistory, ...history].slice(-12)  // keep last 12 turns
  const messages = []

  for (const turn of turns) {
    if (turn.role === 'player') {
      messages.push({ role: 'user',  parts: [{ text: turn.text }] })
    } else {
      messages.push({ role: 'model', parts: [{ text: turn.text }] })
    }
  }
  messages.push({ role: 'user', parts: [{ text: playerText }] })

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: systemPrompt,
    })

    const chat  = model.startChat({ history: messages.slice(0, -1) })
    const result = await chat.sendMessage(playerText)
    const raw   = result.response.text()

    // Parse NPC text and choices from response
    const { text, choices } = parseGeminiResponse(raw)

    // Persist memory to MongoDB
    if (playerId && npcId) {
      try {
        const newHistory = [
          ...persistedHistory,
          { role: 'player', text: playerText },
          { role: 'npc',    text }
        ].slice(-20)  // keep last 20 turns in DB

        await NPCMemory.findOneAndUpdate(
          { playerId, npcId },
          { history: newHistory, updatedAt: new Date() },
          { upsert: true }
        )
      } catch { /* DB might be offline */ }
    }

    res.json({ text, choices })

  } catch (err) {
    console.error('[Dialogue] Gemini error:', err.message)
    res.status(500).json({
      text: "I... can't speak right now.",
      choices: [{ id: '__end__', label: 'Alright.' }]
    })
  }
})

function parseGeminiResponse(raw) {
  // Extract choices JSON block
  const choicesMatch = raw.match(/```choices\s*([\s\S]*?)```/)
  let choices = [{ id: '__end__', label: 'Alright.' }]

  if (choicesMatch) {
    try {
      choices = JSON.parse(choicesMatch[1].trim())
    } catch { /* use default */ }
  }

  // Everything before the choices block is the NPC text
  const text = raw
    .replace(/```choices[\s\S]*?```/g, '')
    .trim()
    .replace(/\n{2,}/g, '\n')

  return { text, choices }
}

export default router
