import nipplejs from 'nipplejs'

export class InputManager {
  constructor() {
    this.keys = {
      forward:  false,
      back:     false,
      left:     false,
      right:    false,
      jump:     false,
      run:      false,
      interact: false,
    }

    this._joystickX = 0
    this._joystickZ = 0

    this._setupKeyboard()
    this._wireButtons()
  }

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
      if (map[e.code]) { this.keys[map[e.code]] = true; e.preventDefault() }
    })
    window.addEventListener('keyup', (e) => {
      if (map[e.code]) this.keys[map[e.code]] = false
      if (e.code === 'KeyE' || e.code === 'KeyF') this.keys.interact = false
    })
  }

  _wireButtons() {
    const jumpBtn = document.getElementById('btn-jump')
    const talkBtn = document.getElementById('btn-talk')

    if (jumpBtn) {
      jumpBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.keys.jump = true })
      jumpBtn.addEventListener('touchend',   ()  => { this.keys.jump = false })
      jumpBtn.addEventListener('mousedown',  ()  => { this.keys.jump = true })
      jumpBtn.addEventListener('mouseup',    ()  => { this.keys.jump = false })
    }

    if (talkBtn) {
      talkBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.keys.interact = true })
      talkBtn.addEventListener('touchend',   ()  => { setTimeout(() => this.keys.interact = false, 50) })
      talkBtn.addEventListener('click',      ()  => { this.keys.interact = true; setTimeout(() => this.keys.interact = false, 50) })
    }
  }

  initJoystick() {
    const zone = document.getElementById('joystick-zone')
    nipplejs.create({
      zone,
      mode:         'static',
      position:     { left: '50%', top: '50%' },
      color:        'rgba(200,184,154,0.5)',
      size:          100,
      restJoystick:  true,
    }).on('move', (_, data) => {
      if (!data.vector) return
      this._joystickX =  data.vector.x
      this._joystickZ = -data.vector.y
    }).on('end', () => {
      this._joystickX = 0
      this._joystickZ = 0
    })
  }

  getMovement() {
    let x = this._joystickX
    let z = this._joystickZ

    if (this.keys.right)   x += 1
    if (this.keys.left)    x -= 1
    if (this.keys.forward) z -= 1
    if (this.keys.back)    z += 1

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