import nipplejs from 'nipplejs'

export class InputManager {
  constructor() {
    this.keys = {
      forward: false,
      back:    false,
      left:    false,
      right:   false,
      jump:    false,
      run:     false,
      interact: false,
    }

    // Joystick vector (normalized, from nipplejs)
    this._joystickX = 0
    this._joystickZ = 0

    this._setupKeyboard()
    this._setupJoystick()
  }

  // ── Keyboard ──────────────────────────────────────────────────────────────
  _setupKeyboard() {
    const map = {
      KeyW: 'forward', ArrowUp:    'forward',
      KeyS: 'back',    ArrowDown:  'back',
      KeyA: 'left',    ArrowLeft:  'left',
      KeyD: 'right',   ArrowRight: 'right',
      Space: 'jump',
      ShiftLeft: 'run', ShiftRight: 'run',
      KeyE: 'interact', KeyF: 'interact',
    }

    window.addEventListener('keydown', (e) => {
      if (map[e.code]) {
        this.keys[map[e.code]] = true
        e.preventDefault()
      }
    })
    window.addEventListener('keyup', (e) => {
      if (map[e.code]) {
        this.keys[map[e.code]] = false
      }
      // Clear interact immediately (single-press)
      if (e.code === 'KeyE' || e.code === 'KeyF') {
        this.keys.interact = false
      }
    })
  }

  // ── On-screen joystick (mobile + desktop fallback) ────────────────────────
  _setupJoystick() {
    // Create joystick zone
    const zone = document.createElement('div')
    zone.id = 'joystick-zone'
    zone.style.cssText = `
      position: fixed;
      bottom: 30px; left: 30px;
      width: 120px; height: 120px;
      z-index: 50;
      touch-action: none;
    `
    document.getElementById('app').appendChild(zone)

    const manager = nipplejs.create({
      zone,
      mode:       'static',
      position:   { left: '50%', top: '50%' },
      color:      'rgba(200,184,154,0.5)',
      size:        100,
      restJoystick: true,
    })

    manager.on('move', (_, data) => {
      if (!data.vector) return
      this._joystickX = data.vector.x   // left/right
      this._joystickZ = -data.vector.y  // forward is -z in three.js
    })

    manager.on('end', () => {
      this._joystickX = 0
      this._joystickZ = 0
    })

    // Action buttons (jump, interact)
    this._buildActionButtons()
  }

  _buildActionButtons() {
    const btns = document.createElement('div')
    btns.style.cssText = `
      position: fixed;
      bottom: 40px; right: 30px;
      display: flex; gap: 12px;
      z-index: 50;
    `

    const btnStyle = (color) => `
      width: 54px; height: 54px;
      border-radius: 50%;
      border: 2px solid ${color};
      background: rgba(0,0,0,0.35);
      color: ${color};
      font-size: 0.75rem;
      letter-spacing: 0.1em;
      cursor: pointer;
      user-select: none;
      touch-action: manipulation;
      display: flex; align-items: center; justify-content: center;
      font-family: Georgia, serif;
      text-transform: uppercase;
    `

    const jumpBtn = document.createElement('button')
    jumpBtn.style.cssText = btnStyle('rgba(200,184,154,0.8)')
    jumpBtn.textContent = 'jump'
    jumpBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.keys.jump = true  })
    jumpBtn.addEventListener('touchend',   ()  => { this.keys.jump = false })
    jumpBtn.addEventListener('mousedown',  ()  => { this.keys.jump = true  })
    jumpBtn.addEventListener('mouseup',    ()  => { this.keys.jump = false })

    const interactBtn = document.createElement('button')
    interactBtn.style.cssText = btnStyle('rgba(120,200,160,0.8)')
    interactBtn.textContent = 'talk'
    interactBtn.addEventListener('touchstart',  (e) => { e.preventDefault(); this.keys.interact = true })
    interactBtn.addEventListener('touchend',    ()  => { setTimeout(() => this.keys.interact = false, 50) })
    interactBtn.addEventListener('click',       ()  => { this.keys.interact = true; setTimeout(() => this.keys.interact = false, 50) })

    btns.appendChild(jumpBtn)
    btns.appendChild(interactBtn)
    document.getElementById('app').appendChild(btns)
  }

  // ── Public API ────────────────────────────────────────────────────────────
  /**
   * Returns a normalized {x, z} movement vector merging keyboard + joystick.
   * x = strafe (positive = right), z = forward/back (negative = forward in Three.js)
   */
  getMovement() {
    let x = this._joystickX
    let z = this._joystickZ

    if (this.keys.right)   x += 1
    if (this.keys.left)    x -= 1
    if (this.keys.forward) z -= 1
    if (this.keys.back)    z += 1

    // Normalize if both axes active
    const len = Math.sqrt(x * x + z * z)
    if (len > 1) { x /= len; z /= len }

    return { x, z }
  }

  consumeInteract() {
    const was = this.keys.interact
    this.keys.interact = false
    return was
  }
}
