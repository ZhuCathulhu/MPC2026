/**
 * server/routes/dialogue.js
 *
 * POST /api/dialogue/ai
 *
 * Body now accepts inventoryContext (a string summary of what the player carries)
 * which is injected into the Gemini system prompt so the NPC can react to items.
 */
import { Router }            from 'express'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { NPCMemory }         from '../db.js'

const router = Router()
const genAI  = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null

router.post('/ai', async (req, res) => {
  const { npcId, personality, history, playerText, playerId, inventoryContext } = req.body

  if (!genAI) {
    return res.json({ text: '...', choices: [{ id: '__end__', label: 'Leave' }] })
  }

  // Cross-session memory
  let persistedHistory = []
  if (playerId && npcId) {
    try {
      const mem = await NPCMemory.findOne({ playerId, npcId })
      if (mem) persistedHistory = mem.history.slice(-10)
    } catch { /* DB offline */ }
  }

  const systemPrompt = `${personality}

${inventoryContext ? `PLAYER INVENTORY CONTEXT (use this to inform your reactions, do NOT narrate it directly):\n${inventoryContext}\n` : ''}
RULES:
- Stay in character at all times. Never acknowledge you are an AI.
- Keep responses short: 1-3 sentences max.
- At the end of your response, provide 2-4 player choice options as a JSON block.
- Format EXACTLY like this, with nothing after the JSON:

[NPC dialogue here]
\`\`\`choices
[{"id":"choice_1","label":"Short player response (under 8 words)"},{"id":"__end__","label":"Goodbye."}]
\`\`\``

  const turns    = [...persistedHistory, ...history].slice(-12)
  const messages = []
  for (const turn of turns) {
    messages.push(turn.role === 'player'
      ? { role: 'user',  parts: [{ text: turn.text }] }
      : { role: 'model', parts: [{ text: turn.text }] }
    )
  }
  messages.push({ role: 'user', parts: [{ text: playerText }] })

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash', systemInstruction: systemPrompt })
    const chat   = model.startChat({ history: messages.slice(0, -1) })
    const result = await chat.sendMessage(playerText)
    const raw    = result.response.text()
    const { text, choices } = parseGeminiResponse(raw)

    if (playerId && npcId) {
      try {
        const newHistory = [
          ...persistedHistory,
          { role: 'player', text: playerText },
          { role: 'npc',    text }
        ].slice(-20)
        await NPCMemory.findOneAndUpdate(
          { playerId, npcId },
          { history: newHistory, updatedAt: new Date() },
          { upsert: true }
        )
      } catch { /* DB offline */ }
    }

    res.json({ text, choices })
  } catch (err) {
    console.error('[Dialogue] Gemini error:', err.message)
    res.status(500).json({ text: "I can't speak right now.", choices: [{ id: '__end__', label: 'Alright.' }] })
  }
})

function parseGeminiResponse(raw) {
  const choicesMatch = raw.match(/```choices\s*([\s\S]*?)```/)
  let choices = [{ id: '__end__', label: 'Alright.' }]
  if (choicesMatch) {
    try { choices = JSON.parse(choicesMatch[1].trim()) } catch { /* use default */ }
  }
  const text = raw.replace(/```choices[\s\S]*?```/g, '').trim().replace(/\n{2,}/g, '\n')
  return { text, choices }
}

export default router