/**
 * DialogueSystem
 *
 * Extended from the original to support item-gated choices and item rewards:
 *
 *   choice.requires     — array of item IDs; choice hidden if player lacks any
 *   choice.requiresFlag — flag key; choice hidden if flag is falsy
 *   response.gives      — array of item IDs to add on this response
 *   response.takesItems — array of item IDs to remove on this response
 *   response.setsFlag   — plain object of flags to set on this response
 */

export class DialogueSystem extends EventTarget {
  /**
   * @param {InventoryManager} inventory
   */
  constructor(inventory) {
    super()
    this.inventory   = inventory
    this.active      = false
    this.currentNPC  = null
    this.audio       = null
  }

  // ── Start conversation ─────────────────────────────────────────────────────
  async startConversation(npc) {
    if (this.active) return
    this.active     = true
    this.currentNPC = npc
    document.exitPointerLock?.()

    const opening = npc.getOpening()
    await this.showLine(opening, npc)
    this.dispatchEvent(new CustomEvent('conversation-start', { detail: { npc } }))
  }

  // ── Show a line ────────────────────────────────────────────────────────────
  async showLine(line, npc) {
    // Filter choices based on inventory / flags
    const visibleChoices = (line.choices ?? []).filter(c => this._choiceVisible(c))

    this.dispatchEvent(new CustomEvent('line', {
      detail: {
        speaker:  npc?.data.name ?? 'Narrator',
        text:     line.text,
        choices:  visibleChoices,
      }
    }))

    if (npc?.data.voiceId) {
      this._playVoice(line.text, npc.data.voiceId).catch(() => {})
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
      // Apply side-effects before showing the line
      this._applyResponseEffects(scripted)
      await this.showLine(scripted, npc)
    } else {
      await this._aiResponse(choiceId, npc)
    }
  }

  // ── Choice visibility ──────────────────────────────────────────────────────

  _choiceVisible(choice) {
    // Item requirement
    if (choice.requires?.length) {
      if (!this.inventory.hasAll(choice.requires)) return false
    }
    // Flag requirement
    if (choice.requiresFlag !== undefined) {
      if (!this.inventory.getFlag(choice.requiresFlag)) return false
    }
    return true
  }

  // ── Response side-effects ──────────────────────────────────────────────────

  _applyResponseEffects(response) {
    if (response.gives?.length) {
      for (const id of response.gives) {
        this.inventory.add(id)
        this.dispatchEvent(new CustomEvent('item-gained', { detail: { itemId: id } }))
      }
    }
    if (response.takesItems?.length) {
      for (const id of response.takesItems) {
        this.inventory.remove(id)
      }
    }
    if (response.setsFlag) {
      this.inventory.applyFlags(response.setsFlag)
    }
  }

  // ── AI fallback ────────────────────────────────────────────────────────────
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
          // Pass inventory context so Gemini can react to items
          inventoryContext: this._buildInventoryContext(),
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

  /** Summarise inventory for Gemini so it can reference what the player carries */
  _buildInventoryContext() {
    const items = this.inventory.list()
    if (!items.length) return 'The player is carrying nothing.'
    const names = items.map(({ item, quantity }) =>
      quantity > 1 ? `${item.name} ×${quantity}` : item.name
    ).join(', ')
    return `The player is currently carrying: ${names}.`
  }

  // ── ElevenLabs voice ──────────────────────────────────────────────────────
  async _playVoice(text, voiceId) {
    if (this.audio) { this.audio.pause(); this.audio = null }

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

  // ── End conversation ───────────────────────────────────────────────────────
  endConversation() {
    this.active     = false
    this.currentNPC = null
    if (this.audio) { this.audio.pause(); this.audio = null }
    this.dispatchEvent(new CustomEvent('conversation-end'))
  }
}