/**
 * DialogueSystem
 *
 * Manages the full dialogue lifecycle:
 *  1. Scripted lines from your JSON files (always the primary source)
 *  2. AI fallback via Gemini when the player asks something off-script
 *  3. ElevenLabs voice synthesis (with server-side caching)
 *
 * Emits events so the HUD can react without tight coupling.
 */

export class DialogueSystem extends EventTarget {
  constructor() {
    super()
    this.active      = false
    this.currentNPC  = null
    this.audio       = null       // currently playing Audio instance
  }

  // ── Start a conversation ──────────────────────────────────────────────────
  async startConversation(npc) {
    if (this.active) return
    this.active     = true
    this.currentNPC = npc

    // Exit pointer lock so mouse works on dialogue choices
    document.exitPointerLock?.()

    const opening = npc.getOpening()
    await this.showLine(opening, npc)

    this.dispatchEvent(new CustomEvent('conversation-start', { detail: { npc } }))
  }

  // ── Show a single line ────────────────────────────────────────────────────
  async showLine(line, npc) {
    this.dispatchEvent(new CustomEvent('line', {
      detail: {
        speaker:  npc?.data.name ?? 'Narrator',
        text:     line.text,
        choices:  line.choices ?? [],
      }
    }))

    // Voice synthesis (non-blocking — don't await, fire and forget)
    if (npc?.data.voiceId) {
      this._playVoice(line.text, npc.data.voiceId).catch(() => {})
    }
  }

  // ── Player chose a response ───────────────────────────────────────────────
  async playerChoice(choiceId) {
    if (!this.currentNPC) return
    const npc = this.currentNPC

    // Special choice IDs
    if (choiceId === '__end__') {
      this.endConversation()
      return
    }

    // Check scripted response
    const scripted = npc.getResponse(choiceId)

    if (scripted) {
      await this.showLine(scripted, npc)
    } else {
      // Off-script: ask Gemini
      await this._aiResponse(choiceId, npc)
    }
  }

  // ── Free-text player input → Gemini ──────────────────────────────────────
  async _aiResponse(playerText, npc) {
    this.dispatchEvent(new CustomEvent('thinking', { detail: { npc } }))

    try {
      const res = await fetch('/api/dialogue/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          npcId:       npc.data.id,
          personality: npc.data.personality,
          history:     npc.getHistory(),
          playerText,
        })
      })

      const { text, choices } = await res.json()
      npc.addToHistory({ role: 'player', text: playerText })
      npc.addToHistory({ role: 'npc',    text })
      await this.showLine({ text, choices }, npc)

    } catch (err) {
      console.error('[Dialogue] AI request failed', err)
      await this.showLine({
        text: '...',
        choices: [{ id: '__end__', label: 'Leave' }]
      }, npc)
    }
  }

  // ── ElevenLabs voice ──────────────────────────────────────────────────────
  async _playVoice(text, voiceId) {
    // Stop any playing audio
    if (this.audio) {
      this.audio.pause()
      this.audio = null
    }

    const res = await fetch('/api/voice/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceId })
    })

    if (!res.ok) return

    const blob = await res.blob()
    const url  = URL.createObjectURL(blob)
    this.audio = new Audio(url)
    this.audio.play()
    this.audio.onended = () => URL.revokeObjectURL(url)
  }

  // ── End conversation ──────────────────────────────────────────────────────
  endConversation() {
    this.active     = false
    this.currentNPC = null
    if (this.audio) { this.audio.pause(); this.audio = null }
    this.dispatchEvent(new CustomEvent('conversation-end'))
  }
}
