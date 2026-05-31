/**
 * DialogueSystem
 *
 * Line fields:
 *   text          — displayed text
 *   speaker       — overrides NPC name ('You', 'Narrator', etc.)
 *   next          — key of next response; UI advances on Space / tap, no choice buttons shown
 *   choices       — player choice buttons (used when next is absent)
 *   gives / takesItems / setsFlag / requires / requiresFlag — side-effects
 *
 * Events emitted:
 *   'line'              — { speaker, text, choices, isChained }
 *   'thinking'          — AI is fetching
 *   'conversation-start'
 *   'conversation-end'
 *   'item-gained'       — { itemId }
 */

export class DialogueSystem extends EventTarget {
  constructor(inventory) {
    super()
    this.inventory  = inventory
    this.active     = false
    this.currentNPC = null
    this.audio      = null
    this._pendingNext = null   // next-key waiting for Space/tap to fire
  }

  // ── Start conversation ─────────────────────────────────────────────────────
  async startConversation(npc) {
    if (this.active) return
    this.active       = true
    this.currentNPC   = npc
    this._pendingNext = null
    document.exitPointerLock?.()

    const opening = npc.getOpening()
    await this.showLine(opening, npc)
    this.dispatchEvent(new CustomEvent('conversation-start', { detail: { npc } }))
  }

  // ── Show a line ────────────────────────────────────────────────────────────
  async showLine(line, npc) {
    const isChained = !!line.next
    this._pendingNext = line.next ?? null

    const choices = isChained
      ? []
      : (line.choices ?? []).filter(c => this._choiceVisible(c))

    // Guarantee an exit on real-choice lines
    if (!isChained && !choices.find(c => c.id === '__end__')) {
      choices.push({ id: '__end__', label: 'Leave.' })
    }

    const speaker = line.speaker ?? npc?.data.name ?? 'Narrator'

    this.dispatchEvent(new CustomEvent('line', {
      detail: { speaker, text: line.text, choices, isChained }
    }))

    // Voice for NPC lines: play when no speaker override, or when speaker matches the NPC's own name
    // line.voiceId overrides the NPC's voice (use for secondary characters like Mannie)
    const voiceToUse = line.voiceId ?? ((!line.speaker || line.speaker === npc?.data.name) ? npc?.data.voiceId : null)
    if (voiceToUse) {
      this._playVoice(line.text, voiceToUse).catch(() => {})
    }
  }

  // ── Space / tap advance (called by UI for chained lines) ──────────────────
  async advanceChain() {
    if (!this._pendingNext || !this.currentNPC) return
    const key = this._pendingNext
    this._pendingNext = null
    const line = this.currentNPC.getResponse(key)
    if (line) {
      this._applyResponseEffects(line)
      await this.showLine(line, this.currentNPC)
    }
  }

  // ── Player chose a response ────────────────────────────────────────────────
  async playerChoice(choiceId) {
    if (!this.currentNPC) return
    const npc = this.currentNPC

    if (choiceId === '__end__') {
      this.endConversation()
      return
    }

    const scripted = npc.getResponse(choiceId)
    if (scripted) {
      this._applyResponseEffects(scripted)
      await this.showLine(scripted, npc)
    } else {
      await this._aiResponse(choiceId, npc)
    }
  }

  // ── Choice visibility ──────────────────────────────────────────────────────
  _choiceVisible(choice) {
    if (choice.requires?.length && !this.inventory.hasAll(choice.requires)) return false
    if (choice.requiresFlag !== undefined && !this.inventory.getFlag(choice.requiresFlag)) return false
    return true
  }

  // ── Response side-effects ──────────────────────────────────────────────────
  _applyResponseEffects(response) {
    for (const id of response.gives ?? []) {
      this.inventory.add(id)
      this.dispatchEvent(new CustomEvent('item-gained', { detail: { itemId: id } }))
    }
    for (const id of response.takesItems ?? []) {
      this.inventory.remove(id)
    }
    if (response.setsFlag) this.inventory.applyFlags(response.setsFlag)
  }

  // ── AI fallback ────────────────────────────────────────────────────────────
  async _aiResponse(playerText, npc) {
    this.dispatchEvent(new CustomEvent('thinking', { detail: { npc } }))
    try {
      const res = await fetch('/api/dialogue/ai', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          npcId:            npc.data.id,
          personality:      npc.data.personality,
          history:          npc.getHistory(),
          playerText,
          inventoryContext: this._buildInventoryContext(),
        })
      })
      const { text, choices } = await res.json()
      npc.addToHistory({ role: 'player', text: playerText })
      npc.addToHistory({ role: 'npc',    text })
      await this.showLine({ text, choices }, npc)
    } catch (err) {
      console.error('[Dialogue] AI request failed', err)
      await this.showLine({ text: '...', choices: [{ id: '__end__', label: 'Leave' }] }, npc)
    }
  }

  _buildInventoryContext() {
    const items = this.inventory.list()
    if (!items.length) return 'The player is carrying nothing.'
    return 'The player is currently carrying: ' +
      items.map(({ item, quantity }) => quantity > 1 ? `${item.name} ×${quantity}` : item.name).join(', ') + '.'
  }

  // ── ElevenLabs voice ──────────────────────────────────────────────────────
  async _playVoice(text, voiceId) {
    if (this.audio) { this.audio.pause(); this.audio = null }
    const res = await fetch('/api/voice/speak', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text, voiceId })
    })
    if (!res.ok) return
    const blob = await res.blob()
    const url  = URL.createObjectURL(blob)
    this.audio = new Audio(url)
    this.audio.play()
    this.audio.onended = () => URL.revokeObjectURL(url)
  }

  // ── End conversation ───────────────────────────────────────────────────────
  endConversation() {
    this.active       = false
    this.currentNPC   = null
    this._pendingNext = null
    if (this.audio) { this.audio.pause(); this.audio = null }
    this.dispatchEvent(new CustomEvent('conversation-end'))
  }
}