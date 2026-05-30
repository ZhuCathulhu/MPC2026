/**
 * HUD
 *
 * Builds the dialogue UI as DOM elements over the canvas.
 * Listens to DialogueSystem events and renders lines/choices.
 * No Three.js — pure HTML/CSS for crisp text.
 */

export class HUD {
  constructor(dialogue) {
    this.dialogue = dialogue
    this._build()
    this._listen()
  }

  _build() {
    // Inject styles
    const style = document.createElement('style')
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');

      #dialogue-box {
        position: fixed;
        bottom: 0; left: 0; right: 0;
        padding: 0 0 env(safe-area-inset-bottom);
        z-index: 200;
        display: none;
        pointer-events: none;
        animation: slide-up 0.25s ease;
      }
      @keyframes slide-up {
        from { transform: translateY(20px); opacity: 0; }
        to   { transform: translateY(0);    opacity: 1; }
      }

      #dialogue-inner {
        margin: 0 auto;
        max-width: 780px;
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
        font-size: 0.75rem;
        letter-spacing: 0.25em;
        text-transform: uppercase;
        color: #c8b89a;
        margin-bottom: 8px;
        opacity: 0.85;
      }

      #dialogue-text {
        font-family: 'Crimson Text', serif;
        font-size: 1.25rem;
        line-height: 1.6;
        color: #e8ddd0;
        min-height: 2.5em;
        margin-bottom: 16px;
      }

      #dialogue-text.thinking::after {
        content: '';
        display: inline-block;
        width: 4px; height: 4px;
        border-radius: 50%;
        background: #c8b89a;
        margin-left: 6px;
        animation: pulse 0.8s ease infinite;
        vertical-align: middle;
      }
      @keyframes pulse {
        0%,100% { opacity: 0.3; transform: scale(0.8); }
        50%      { opacity: 1;   transform: scale(1.2); }
      }

      #dialogue-choices {
        display: flex;
        flex-direction: column;
        gap: 6px;
        border-top: 1px solid rgba(200,184,154,0.12);
        padding-top: 14px;
      }

      .choice-btn {
        background: none;
        border: 1px solid rgba(200,184,154,0.18);
        border-radius: 6px;
        color: #c8d4b0;
        font-family: 'Crimson Text', serif;
        font-size: 1.05rem;
        padding: 8px 16px;
        text-align: left;
        cursor: pointer;
        transition: background 0.15s, border-color 0.15s, color 0.15s;
        position: relative;
        overflow: hidden;
      }
      .choice-btn::before {
        content: '›';
        margin-right: 10px;
        color: rgba(200,184,154,0.5);
        font-size: 1.1em;
      }
      .choice-btn:hover {
        background: rgba(200,184,154,0.08);
        border-color: rgba(200,184,154,0.4);
        color: #e8ddd0;
      }
      .choice-btn:active {
        background: rgba(200,184,154,0.14);
        transform: scale(0.995);
      }
      .choice-btn[data-id="__end__"] {
        color: rgba(200,184,154,0.5);
        border-color: rgba(200,184,154,0.1);
      }
      .choice-btn[data-id="__end__"]:hover {
        color: rgba(200,184,154,0.9);
      }

      /* Free-text input for off-script questions */
      #dialogue-free-input-wrap {
        display: flex;
        gap: 8px;
        margin-top: 8px;
        border-top: 1px solid rgba(200,184,154,0.1);
        padding-top: 12px;
      }
      #dialogue-free-input {
        flex: 1;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(200,184,154,0.2);
        border-radius: 6px;
        color: #e8ddd0;
        font-family: 'Crimson Text', serif;
        font-size: 1.05rem;
        padding: 7px 12px;
        outline: none;
        transition: border-color 0.15s;
      }
      #dialogue-free-input:focus { border-color: rgba(200,184,154,0.5); }
      #dialogue-free-input::placeholder { color: rgba(200,184,154,0.25); font-style: italic; }
      #dialogue-free-send {
        background: rgba(200,184,154,0.1);
        border: 1px solid rgba(200,184,154,0.25);
        border-radius: 6px;
        color: #c8b89a;
        font-family: 'Crimson Text', serif;
        font-size: 0.9rem;
        padding: 7px 14px;
        cursor: pointer;
        transition: background 0.15s;
      }
      #dialogue-free-send:hover { background: rgba(200,184,154,0.18); }
    `
    document.head.appendChild(style)

    // DOM
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
      </div>
    `
    document.getElementById('app').appendChild(this.box)

    // Cache refs
    this.elSpeaker  = this.box.querySelector('#dialogue-speaker')
    this.elText     = this.box.querySelector('#dialogue-text')
    this.elChoices  = this.box.querySelector('#dialogue-choices')
    this.elFreeWrap = this.box.querySelector('#dialogue-free-input-wrap')
    this.elFreeInput= this.box.querySelector('#dialogue-free-input')
    this.elFreeSend = this.box.querySelector('#dialogue-free-send')

    // Free-text send
    const sendFree = () => {
      const t = this.elFreeInput.value.trim()
      if (!t) return
      this.elFreeInput.value = ''
      this.dialogue.playerChoice(t)   // passes raw text → triggers AI path
    }
    this.elFreeSend.addEventListener('click', sendFree)
    this.elFreeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendFree()
    })
  }

  _listen() {
    this.dialogue.addEventListener('line', (e) => {
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
  }

  _showLine(speaker, text, choices) {
    this.elText.classList.remove('thinking')
    this.elSpeaker.textContent = speaker
    this.elChoices.innerHTML = ''

    // Typewriter effect
    this.elText.textContent = ''
    let i = 0
    const interval = setInterval(() => {
      this.elText.textContent += text[i++]
      if (i >= text.length) {
        clearInterval(interval)
        this._showChoices(choices)
      }
    }, 18)
  }

  _showChoices(choices) {
    this.elChoices.innerHTML = ''
    for (const c of choices) {
      const btn = document.createElement('button')
      btn.className   = 'choice-btn'
      btn.dataset.id  = c.id
      btn.textContent = c.label
      btn.addEventListener('click', () => this.dialogue.playerChoice(c.id))
      this.elChoices.appendChild(btn)
    }
    // Always show the free-text input
    this.elFreeWrap.style.display = 'flex'
    this.elFreeInput.focus()
  }
}
