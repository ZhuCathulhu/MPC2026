/**
 * HUD
 *
 * Extended to show:
 *   - Inventory panel (toggle with Tab / I)
 *   - Item-gained toast ("You received: X")
 *   - Dialogue box (unchanged from original, with item-filtered choices)
 */

export class HUD {
  constructor(dialogue, inventory) {
    this.dialogue  = dialogue
    this.inventory = inventory
    this._build()
    this._listen()
  }

  _build() {
    const style = document.createElement('style')
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');

      /* ── Dialogue ────────────────────────────────────────────────────────── */
      #dialogue-box {
        position: fixed; bottom: 0; left: 0; right: 0;
        padding: 0 0 env(safe-area-inset-bottom);
        z-index: 200; display: none; pointer-events: none;
        animation: slide-up 0.25s ease;
      }
      @keyframes slide-up {
        from { transform: translateY(20px); opacity: 0; }
        to   { transform: translateY(0);    opacity: 1; }
      }
      #dialogue-inner {
        margin: 0 auto; max-width: 780px;
        background: linear-gradient(180deg, rgba(10,8,6,0.92) 0%, rgba(6,5,3,0.97) 100%);
        border-top: 1px solid rgba(200,184,154,0.3);
        border-left: 1px solid rgba(200,184,154,0.15);
        border-right: 1px solid rgba(200,184,154,0.15);
        border-radius: 12px 12px 0 0;
        padding: 20px 28px 24px;
        backdrop-filter: blur(10px);
        pointer-events: all;
      }
      #dialogue-speaker {
        font-family: 'IM Fell English', serif;
        font-size: 0.75rem; letter-spacing: 0.25em; text-transform: uppercase;
        color: #c8b89a; margin-bottom: 8px; opacity: 0.85;
      }
      #dialogue-text {
        font-family: 'Crimson Text', serif;
        font-size: 1.25rem; line-height: 1.6;
        color: #e8ddd0; min-height: 2.5em; margin-bottom: 16px;
      }
      #dialogue-text.thinking::after {
        content: ''; display: inline-block;
        width: 4px; height: 4px; border-radius: 50%;
        background: #c8b89a; margin-left: 6px;
        animation: pulse 0.8s ease infinite; vertical-align: middle;
      }
      @keyframes pulse {
        0%,100% { opacity: 0.3; transform: scale(0.8); }
        50%      { opacity: 1;   transform: scale(1.2); }
      }
      #dialogue-choices {
        display: flex; flex-direction: column; gap: 6px;
        border-top: 1px solid rgba(200,184,154,0.12);
        padding-top: 14px;
      }
      .choice-btn {
        background: none;
        border: 1px solid rgba(200,184,154,0.18); border-radius: 6px;
        color: #c8d4b0; font-family: 'Crimson Text', serif; font-size: 1.05rem;
        padding: 8px 16px; text-align: left; cursor: pointer;
        transition: background 0.15s, border-color 0.15s, color 0.15s;
      }
      .choice-btn::before { content: '›'; margin-right: 10px; color: rgba(200,184,154,0.5); }
      .choice-btn:hover   { background: rgba(200,184,154,0.08); border-color: rgba(200,184,154,0.4); color: #e8ddd0; }
      .choice-btn[data-id="__end__"]       { color: rgba(200,184,154,0.5); border-color: rgba(200,184,154,0.1); }
      .choice-btn[data-id="__end__"]:hover { color: rgba(200,184,154,0.9); }
      #dialogue-free-input-wrap {
        display: flex; gap: 8px;
        margin-top: 8px; border-top: 1px solid rgba(200,184,154,0.1); padding-top: 12px;
      }
      #dialogue-free-input {
        flex: 1; background: rgba(255,255,255,0.04);
        border: 1px solid rgba(200,184,154,0.2); border-radius: 6px;
        color: #e8ddd0; font-family: 'Crimson Text', serif; font-size: 1.05rem;
        padding: 7px 12px; outline: none; transition: border-color 0.15s;
      }
      #dialogue-free-input:focus { border-color: rgba(200,184,154,0.5); }
      #dialogue-free-input::placeholder { color: rgba(200,184,154,0.25); font-style: italic; }
      #dialogue-free-send {
        background: rgba(200,184,154,0.1); border: 1px solid rgba(200,184,154,0.25);
        border-radius: 6px; color: #c8b89a; font-family: 'Crimson Text', serif;
        font-size: 0.9rem; padding: 7px 14px; cursor: pointer;
        transition: background 0.15s;
      }
      #dialogue-free-send:hover { background: rgba(200,184,154,0.18); }

      /* ── Inventory panel ─────────────────────────────────────────────────── */
      #inventory-panel {
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        width: min(480px, 90vw);
        background: linear-gradient(160deg, rgba(12,9,6,0.97) 0%, rgba(6,4,2,0.99) 100%);
        border: 1px solid rgba(200,184,154,0.25);
        border-radius: 10px; padding: 24px 28px;
        z-index: 300; display: none; pointer-events: all;
        backdrop-filter: blur(14px);
      }
      #inventory-panel.open { display: block; }
      #inventory-title {
        font-family: 'IM Fell English', serif;
        font-size: 0.7rem; letter-spacing: 0.3em; text-transform: uppercase;
        color: rgba(200,184,154,0.6); margin-bottom: 16px;
      }
      #inventory-list {
        display: flex; flex-direction: column; gap: 8px;
        max-height: 320px; overflow-y: auto;
      }
      .inv-item {
        display: flex; align-items: center; gap: 12px;
        padding: 8px 10px; border-radius: 6px;
        border: 1px solid rgba(200,184,154,0.1);
        background: rgba(200,184,154,0.03);
      }
      .inv-icon { font-size: 1.4rem; line-height: 1; width: 28px; text-align: center; }
      .inv-info { flex: 1; }
      .inv-name {
        font-family: 'Crimson Text', serif; font-size: 1rem;
        color: #e8ddd0; font-weight: 600;
      }
      .inv-desc {
        font-family: 'Crimson Text', serif; font-size: 0.85rem;
        color: rgba(200,184,154,0.5); margin-top: 1px;
      }
      .inv-qty {
        font-family: 'IM Fell English', serif; font-size: 0.75rem;
        color: rgba(200,184,154,0.45); letter-spacing: 0.1em;
        min-width: 24px; text-align: right;
      }
      #inventory-empty {
        font-family: 'Crimson Text', serif; font-size: 1rem;
        color: rgba(200,184,154,0.3); font-style: italic; padding: 8px 0;
      }
      #inventory-close-hint {
        margin-top: 16px;
        font-family: 'IM Fell English', serif; font-size: 0.65rem;
        letter-spacing: 0.2em; text-transform: uppercase;
        color: rgba(200,184,154,0.3); text-align: center;
      }

      /* ── Item-gained toast ───────────────────────────────────────────────── */
      #item-toast {
        position: fixed; top: 60px; left: 50%; transform: translateX(-50%);
        background: rgba(10,8,6,0.92); border: 1px solid rgba(200,184,154,0.3);
        border-radius: 8px; padding: 10px 18px;
        font-family: 'Crimson Text', serif; font-size: 1rem;
        color: #e8ddd0; pointer-events: none;
        opacity: 0; transition: opacity 0.3s;
        z-index: 400; white-space: nowrap;
      }
      #item-toast.visible { opacity: 1; }

      /* ── Inventory toggle hint ───────────────────────────────────────────── */
      #inv-hint {
        position: fixed; top: 16px; right: 16px;
        font-family: 'IM Fell English', serif;
        font-size: 0.65rem; letter-spacing: 0.2em; text-transform: uppercase;
        color: rgba(200,184,154,0.35); pointer-events: none;
        display: none;
      }
      #inv-hint.visible { display: block; }
    `
    document.head.appendChild(style)

    // ── Dialogue DOM ──────────────────────────────────────────────────────────
    this.box = document.createElement('div')
    this.box.id = 'dialogue-box'
    this.box.innerHTML = `
      <div id="dialogue-inner">
        <div id="dialogue-speaker"></div>
        <div id="dialogue-text"></div>
        <div id="dialogue-choices"></div>
        <div id="dialogue-free-input-wrap">
          <input id="dialogue-free-input" type="text" placeholder="Ask something else…" maxlength="200" />
          <button id="dialogue-free-send">Ask</button>
        </div>
      </div>`
    document.getElementById('app').appendChild(this.box)

    this.elSpeaker   = this.box.querySelector('#dialogue-speaker')
    this.elText      = this.box.querySelector('#dialogue-text')
    this.elChoices   = this.box.querySelector('#dialogue-choices')
    this.elFreeWrap  = this.box.querySelector('#dialogue-free-input-wrap')
    this.elFreeInput = this.box.querySelector('#dialogue-free-input')
    this.elFreeSend  = this.box.querySelector('#dialogue-free-send')

    const sendFree = () => {
      const t = this.elFreeInput.value.trim()
      if (!t) return
      this.elFreeInput.value = ''
      this.dialogue.playerChoice(t)
    }
    this.elFreeSend.addEventListener('click', sendFree)
    this.elFreeInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendFree() })

    // ── Inventory DOM ─────────────────────────────────────────────────────────
    this.invPanel = document.createElement('div')
    this.invPanel.id = 'inventory-panel'
    this.invPanel.innerHTML = `
      <div id="inventory-title">Inventory</div>
      <div id="inventory-list"></div>
      <div id="inventory-close-hint">Tab / I to close</div>`
    document.getElementById('app').appendChild(this.invPanel)

    this.elInvList = this.invPanel.querySelector('#inventory-list')

    // ── Toast DOM ─────────────────────────────────────────────────────────────
    this.toast = document.createElement('div')
    this.toast.id = 'item-toast'
    document.getElementById('app').appendChild(this.toast)

    // ── Inv hint ─────────────────────────────────────────────────────────────
    this.invHint = document.createElement('div')
    this.invHint.id = 'inv-hint'
    this.invHint.textContent = 'Tab — Inventory'
    document.getElementById('app').appendChild(this.invHint)

    // ── Keyboard toggle ───────────────────────────────────────────────────────
    window.addEventListener('keydown', e => {
      if (e.code === 'Tab' || e.code === 'KeyI') {
        e.preventDefault()
        this._toggleInventory()
      }
    })

    // Close inventory on click outside
    this.invPanel.addEventListener('click', e => e.stopPropagation())
    document.addEventListener('click', () => {
      if (this.invPanel.classList.contains('open')) this._toggleInventory()
    })
  }

  // ── Event listeners ────────────────────────────────────────────────────────
  _listen() {
    this.dialogue.addEventListener('line', e => {
      const { speaker, text, choices } = e.detail
      this._showLine(speaker, text, choices)
    })
    this.dialogue.addEventListener('thinking', () => {
      this.elText.classList.add('thinking')
      this.elChoices.innerHTML = ''
    })
    this.dialogue.addEventListener('conversation-start', () => {
      this.box.style.display = 'block'
    })
    this.dialogue.addEventListener('conversation-end', () => {
      this.box.style.display = 'none'
      this.elChoices.innerHTML = ''
      this.elText.textContent = ''
    })
    this.dialogue.addEventListener('item-gained', e => {
      this._showItemToast(e.detail.itemId)
    })

    // Re-render inventory whenever it changes
    this.inventory.addEventListener('change', () => {
      this._renderInventory()
      this.invHint.classList.add('visible')
    })
  }

  // ── Dialogue rendering ─────────────────────────────────────────────────────
  _showLine(speaker, text, choices) {
    this.elText.classList.remove('thinking')
    this.elSpeaker.textContent = speaker
    this.elChoices.innerHTML = ''
    this.elText.textContent = ''
    let i = 0
    const iv = setInterval(() => {
      this.elText.textContent += text[i++]
      if (i >= text.length) { clearInterval(iv); this._showChoices(choices) }
    }, 18)
  }

  _showChoices(choices) {
    this.elChoices.innerHTML = ''
    for (const c of choices) {
      const btn = document.createElement('button')
      btn.className  = 'choice-btn'
      btn.dataset.id = c.id
      btn.textContent = c.label
      btn.addEventListener('click', () => this.dialogue.playerChoice(c.id))
      this.elChoices.appendChild(btn)
    }
    this.elFreeWrap.style.display = 'flex'
    this.elFreeInput.focus()
  }

  // ── Inventory panel ────────────────────────────────────────────────────────
  _toggleInventory() {
    this.invPanel.classList.toggle('open')
    if (this.invPanel.classList.contains('open')) this._renderInventory()
  }

  _renderInventory() {
    const items = this.inventory.list()
    if (!items.length) {
      this.elInvList.innerHTML = '<div id="inventory-empty">Nothing yet.</div>'
      return
    }
    this.elInvList.innerHTML = items.map(({ item, quantity }) => `
      <div class="inv-item">
        <div class="inv-icon">${item.icon ?? '📦'}</div>
        <div class="inv-info">
          <div class="inv-name">${item.name}</div>
          <div class="inv-desc">${item.desc}</div>
        </div>
        ${item.stackable || quantity > 1
          ? `<div class="inv-qty">×${quantity}</div>`
          : ''}
      </div>`).join('')
  }

  // ── Item toast ─────────────────────────────────────────────────────────────
  _showItemToast(itemId) {
    const { ITEM_MAP } = window.__itemMap__ ?? {}
    // Import lazily from the module we already loaded
    import('../data/items.js').then(({ ITEM_MAP }) => {
      const item = ITEM_MAP[itemId]
      if (!item) return
      this.toast.textContent = `${item.icon ?? '📦'}  Received: ${item.name}`
      this.toast.classList.add('visible')
      clearTimeout(this._toastTimer)
      this._toastTimer = setTimeout(() => this.toast.classList.remove('visible'), 3000)
    })
  }
}