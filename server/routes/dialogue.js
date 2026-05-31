/**
 * server/routes/dialogue.js
 *
 * POST /api/dialogue/ai
 *
 * Uses Groq (free tier) instead of Gemini.
 * Body accepts inventoryContext (a string summary of what the player carries)
 * which is injected into the system prompt so the NPC can react to items.
 */
import { Router }  from 'express'
import Groq        from 'groq-sdk'
import { NPCMemory } from '../db.js'

const router = Router()
const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null

router.post('/ai', async (req, res) => {
  const { npcId, personality, history, playerText, playerId, inventoryContext } = req.body

  if (!groq) {
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

  // Build messages array from combined history
  const turns = [...persistedHistory, ...history].slice(-12)
  const messages = [{ role: 'system', content: systemPrompt }]
  for (const turn of turns) {
    messages.push({
      role:    turn.role === 'player' ? 'user' : 'assistant',
      content: turn.text,
    })
  }
  messages.push({ role: 'user', content: playerText })

  try {
    const response = await groq.chat.completions.create({
      model:      'llama-3.1-8b-instant',  // fast, free, good for NPC dialogue
      max_tokens: 512,
      messages,
    })

    const raw = response.choices[0].message.content
    const { text, choices } = parseResponse(raw)

    // Persist to MongoDB
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
    console.error('[Dialogue] Groq error:', err.message)
    res.status(500).json({ text: "I can't speak right now.", choices: [{ id: '__end__', label: 'Alright.' }] })
  }
})

function parseResponse(raw) {
  // Match ```choices ... ``` with or without closing backticks
  const choicesMatch = raw.match(/```choices\s*([\s\S]*?)(?:```|$)/)
  let choices = [{ id: '__end__', label: 'Alright.' }]
  if (choicesMatch) {
    try {
      // Extract just the JSON array, even if there's trailing junk
      const jsonMatch = choicesMatch[1].match(/\[[\s\S]*\]/)
      if (jsonMatch) choices = JSON.parse(jsonMatch[0])
    } catch { /* use default */ }
  }
  const text = raw.replace(/```choices[\s\S]*$/g, '').trim().replace(/\n{2,}/g, '\n')
  return { text, choices }
}

export default router