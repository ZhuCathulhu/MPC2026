export class DialogueSystem extends EventTarget {
  constructor(inventory) {
    super()
    this.inventory  = inventory
    this.playerId   = inventory.playerId
    this.active     = false
    this.currentNPC = null
    this.audio      = null
    this._pendingNext = null
  }

  async startConversation(npc) {
    if (this.active) return
    this.active       = true
    this.currentNPC   = npc
    this._pendingNext = null
    document.exitPointerLock?.()

    const opening = npc.getOpening(this.inventory)
    await this.showLine(opening, npc)
    this.dispatchEvent(new CustomEvent('conversation-start', { detail: { npc } }))
  }

  async showLine(line, npc) {
    const isChained = !!line.next
    this._pendingNext = line.next ?? null

    const choices = isChained
      ? []
      : (line.choices ?? []).filter(c => this._choiceVisible(c))

    if (!isChained && !choices.find(c => c.id === '__end__')) {
      choices.push({ id: '__end__', label: 'Leave.' })
    }

    const speaker = line.speaker ?? npc?.data.name ?? 'Narrator'

    this.dispatchEvent(new CustomEvent('line', {
      detail: { speaker, text: line.text, choices, isChained }
    }))

    const voiceToUse = line.voiceId ?? ((!line.speaker || line.speaker === npc?.data.name) ? npc?.data.voiceId : null)
    if (voiceToUse) {
      this._playVoice(line.text, voiceToUse).catch(() => {})
    }
  }

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

  _choiceVisible(choice) {
    if (choice.requires?.length && !this.inventory.hasAll(choice.requires)) return false
    if (choice.requiresFlag !== undefined && !this.inventory.getFlag(choice.requiresFlag)) return false
    if (choice.requiresCount) {
      const { itemId, min } = choice.requiresCount
      if (this.inventory.count(itemId) < min) return false
    }
    return true
  }

  _applyResponseEffects(response) {
    let dirty = false
    for (const id of response.gives ?? []) {
      this.inventory.add(id)
      this.dispatchEvent(new CustomEvent('item-gained', { detail: { itemId: id } }))
      dirty = true
    }
    for (const id of response.takesItems ?? []) {
      this.inventory.remove(id)
      dirty = true
    }
    if (response.setsFlag) {
      this.inventory.applyFlags(response.setsFlag)
      dirty = true
    }
    if (dirty) this.inventory._flush()
  }

  async _aiResponse(playerText, npc) {
    this.dispatchEvent(new CustomEvent('thinking', { detail: { npc } }))
    try {
      const res = await fetch('/api/dialogue/ai', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          npcId:            npc.data.id,
          playerId:         this.playerId,
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

  endConversation() {
    this.active       = false
    this.currentNPC   = null
    this._pendingNext = null
    if (this.audio) { this.audio.pause(); this.audio = null }
    this.dispatchEvent(new CustomEvent('conversation-end'))
  }
}