import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshBVH, StaticGeometryGenerator } from 'three-mesh-bvh'

import { CharacterController } from '../systems/CharacterController.js'
import { InputManager }        from '../systems/InputManager.js'
import { DialogueSystem }      from '../systems/DialogueSystem.js'
import { NPCManager }          from '../systems/NPCManager.js'
import { ItemManager }         from '../systems/ItemManager.js'
import { InventoryManager }    from '../systems/InventoryManager.js'
import { WORLD_ITEMS }         from '../data/worldItems.js'

const STORY_SLIDES = [
  "It's the roaring 1950s in the island of Diécada. The European Democratic Kingdom is cracking down on their exports: sugar, bananas, slave labour, cocaine. Produce rots in sheds. Resentment boils in empty pots and empty stomachs.",
  "You are the last remaining EDK diplomat still operating. \n\nYou're hiding out in Diécada and you're not going back.",
  "Things are primed to reach an explosive point on August 30th, when the ships from the capital come in for their last harvest of blood fruit. \n\nThere are 3 days remaining.",
]

export class Engine {
  constructor() {
    this.scene      = null
    this.camera     = null
    this.renderer   = null
    this.clock      = new THREE.Clock()
    this.character  = null
    this.input      = null
    this.dialogue   = null
    this.npcs       = null
    this.items      = null
    this.inventory  = null
    this.collider   = null
    this.worldGroup = null
    this._gameRunning  = false
    this._currentSlide = 0
  }

  async init() {
    this._setupRenderer()
    this._setupScene()
    this._setupCamera()
    this._setupLights()
    this._setupGrain()
    this._setupMenuEvents()

    const playerId = InventoryManager.getOrCreatePlayerId()
    this.inventory = new InventoryManager(playerId)
    await this.inventory.load()

    this.input    = new InputManager()
    this.dialogue = new DialogueSystem(this.inventory)
    this._setupDialogueUI()

    await this._loadWorld()

    this.character = new CharacterController({
      scene:    this.scene,
      camera:   this.camera,
      collider: this.collider,
      input:    this.input,
    })
    this.npcs = new NPCManager({
      scene:     this.scene,
      dialogue:  this.dialogue,
      character: this.character,
    })

    this.items = new ItemManager({
      scene:      this.scene,
      inventory:  this.inventory,
      worldItems: WORLD_ITEMS,
    })

    this._setLoading(false)
    document.getElementById('main-menu').classList.remove('hidden')

    this._startLoop()
    window.addEventListener('resize', () => this._onResize())
  }

  _setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap
    this.renderer.toneMapping       = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0
    this.renderer.outputColorSpace  = THREE.SRGBColorSpace
    document.getElementById('app').appendChild(this.renderer.domElement)
  }

  _setupScene() {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x100806)
    this.scene.fog = new THREE.Fog(0x100806, 22, 60)
  }

  _setupCamera() {
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 200)
    this.camera.position.set(0, 3, 6)
  }

  _setupLights() {
    /*this.scene.add(new THREE.AmbientLight(0x331108, 1.0))
    const key = new THREE.DirectionalLight(0xff4422, 1.8)*/
    this.scene.add(new THREE.AmbientLight(0x998877, 0.6))          // warm but not bleeding red
    const key = new THREE.DirectionalLight(0xffd4aa, 1.2)          // golden rather than fire-red

    key.position.set(-8, 16, 6)
    key.castShadow = true
    key.shadow.mapSize.setScalar(1024)
    this.scene.add(key)

    //const rim = new THREE.DirectionalLight(0x220000, 0.6)
    const rim = new THREE.DirectionalLight(0x446688, 0.4)          // cool blue-grey rim
    
    rim.position.set(10, 4, -8)
    this.scene.add(rim)
  }

  _setupGrain() {
    const canvas = document.getElementById('menu-grain')
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const draw = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
      const id = ctx.createImageData(window.innerWidth, window.innerHeight)
      const d  = id.data
      for (let i = 0; i < d.length; i += 4) {
        const v = Math.random() * 255 | 0
        d[i] = v; d[i+1] = v * 0.15 | 0; d[i+2] = v * 0.08 | 0
        d[i+3] = Math.random() * 38 | 0
      }
      ctx.putImageData(id, 0, 0)
    }
    draw()
    window.addEventListener('resize', draw)
  }

  _setLoading(visible, pct = 0, label = 'Loading…') {
    const el = document.getElementById('loading')
    if (!el) return
    if (!visible) {
      el.style.opacity = '0'
      setTimeout(() => el.remove(), 700)
      return
    }
    document.getElementById('loading-label').textContent = label
    document.getElementById('loading-bar').style.width   = pct + '%'
  }

  _setupMenuEvents() {
    document.getElementById('btn-play').addEventListener('click', () => this._showStory())
    document.getElementById('btn-back').addEventListener('click', () => {
      if (this._currentSlide > 0) { this._currentSlide--; this._renderSlide() }
    })
    document.getElementById('btn-next').addEventListener('click', () => {
      if (this._currentSlide < STORY_SLIDES.length - 1) {
        this._currentSlide++; this._renderSlide()
      } else {
        this._enterGame()
      }
    })
  }

  _showStory() {
    document.getElementById('main-menu').classList.add('hidden')
    const screen = document.getElementById('story-screen')
    screen.classList.remove('hidden')
    screen.classList.add('animate')
    this._currentSlide = 0
    this._renderSlide()
  }

  _renderSlide() {
    const text    = document.getElementById('story-text')
    const counter = document.getElementById('story-counter')
    const btnBack = document.getElementById('btn-back')
    text.classList.remove('visible')
    setTimeout(() => {
      text.innerText      = STORY_SLIDES[this._currentSlide]
      counter.textContent = `${this._currentSlide + 1} / ${STORY_SLIDES.length}`
      btnBack.disabled    = this._currentSlide === 0
      text.classList.add('visible')
    }, 600)
  }

  _enterGame() {
    document.getElementById('story-screen').classList.add('hidden')
    setTimeout(() => {
      document.getElementById('story-screen').remove()
      document.body.classList.add('game-active')
      document.getElementById('hint').style.display = 'block'
      document.getElementById('joystick-zone').classList.add('visible')
      document.getElementById('btn-jump').classList.add('visible')
      document.getElementById('btn-talk').classList.add('visible')
      this.input.initJoystick()
      this._gameRunning = true
    }, 600)
  }

  _setupDialogueUI() {
    const dlgBox       = document.getElementById('dialogue-box')
    const dlgSpeaker   = document.getElementById('dialogue-speaker')
    const dlgText      = document.getElementById('dialogue-text')
    const dlgChoices   = document.getElementById('dialogue-choices')
    const dlgFreeWrap  = document.getElementById('dialogue-free-wrap')
    const dlgFreeInput = document.getElementById('dialogue-free-input')
    const dlgFreeSend  = document.getElementById('dialogue-free-send')

    // ── Skip button (always visible in conversation) ───────────────────────
    const dlgSkip = document.createElement('button')
    dlgSkip.id        = 'dialogue-skip'
    dlgSkip.textContent = 'Skip'
    document.getElementById('dialogue-inner').appendChild(dlgSkip)
    dlgSkip.addEventListener('click', () => this.dialogue.endConversation())

    let typewriterTimer = null
    let currentFullText = ''
    let isChained       = false

    // Instantly complete the typewriter and optionally advance
    const flushTypewriter = () => {
      if (typewriterTimer) {
        clearInterval(typewriterTimer)
        typewriterTimer = null
        dlgText.textContent = currentFullText
        if (isChained) {
          showContinueHint()
        } else {
          showChoices(_pendingChoices)
        }
      }
    }

    let _pendingChoices = []

    const showLine = (speaker, text, choices, chained) => {
      dlgSpeaker.textContent = speaker
      dlgText.classList.remove('thinking')
      dlgChoices.innerHTML   = ''
      dlgFreeWrap.style.display = 'none'
      hideContinueHint()
      if (typewriterTimer) clearInterval(typewriterTimer)

      currentFullText = text
      isChained       = chained
      _pendingChoices = choices ?? []

      dlgText.textContent = ''
      let i = 0
      typewriterTimer = setInterval(() => {
        dlgText.textContent += text[i++]
        if (i >= text.length) {
          clearInterval(typewriterTimer)
          typewriterTimer = null
          if (chained) {
            showContinueHint()
          } else {
            showChoices(_pendingChoices)
          }
        }
      }, 18)
    }

    const showChoices = (choices) => {
      dlgChoices.innerHTML = ''
      for (const c of (choices ?? [])) {
        const btn = document.createElement('button')
        btn.className   = 'choice-btn'
        btn.dataset.id  = c.id
        btn.textContent = c.label
        btn.addEventListener('click', () => this.dialogue.playerChoice(c.id))
        dlgChoices.appendChild(btn)
      }
      dlgFreeWrap.style.display = 'flex'
    }

    // Subtle "press Enter" hint shown after chained lines finish typing
    const continueHint = document.createElement('div')
    continueHint.id = 'dialogue-continue-hint'
    continueHint.textContent = 'Enter to continue'
    document.getElementById('dialogue-inner').appendChild(continueHint)

    const showContinueHint = () => continueHint.classList.add('visible')
    const hideContinueHint = () => continueHint.classList.remove('visible')

    // ── Space bar handler ─────────────────────────────────────────────────
    window.addEventListener('keydown', e => {
      if (!this.dialogue.active) return

      if (e.code === 'Enter') {
        e.preventDefault()
        if (typewriterTimer) {
          // Still typing — complete instantly
          flushTypewriter()
        } else if (isChained) {
          // Waiting on a chained line — advance
          hideContinueHint()
          this.dialogue.advanceChain()
        }
        // Real choices visible — Space does nothing; player must click
      }

      if (e.code === 'Escape') this.dialogue.endConversation()
    })

    // ── Tap / click on the text area also advances chained lines ─────────
    dlgText.style.cursor = 'default'
    dlgText.addEventListener('click', () => {
      if (!this.dialogue.active) return
      if (typewriterTimer) { flushTypewriter(); return }
      if (isChained) { hideContinueHint(); this.dialogue.advanceChain() }
    })

    this.dialogue.addEventListener('line', e => {
      dlgBox.classList.add('open')
      showLine(e.detail.speaker, e.detail.text, e.detail.choices, e.detail.isChained)
    })
    this.dialogue.addEventListener('thinking', () => {
      dlgText.classList.add('thinking')
      dlgChoices.innerHTML = ''
      dlgFreeWrap.style.display = 'none'
      hideContinueHint()
    })
    this.dialogue.addEventListener('conversation-end', () => {
      dlgBox.classList.remove('open')
      dlgChoices.innerHTML = ''
      dlgText.textContent  = ''
      hideContinueHint()
      if (typewriterTimer) { clearInterval(typewriterTimer); typewriterTimer = null }
      document.getElementById('joystick-zone').classList.add('visible')
      document.getElementById('btn-jump').classList.add('visible')
      document.getElementById('btn-talk').classList.add('visible')
    })
    this.dialogue.addEventListener('conversation-start', () => {
      document.getElementById('joystick-zone').classList.remove('visible')
      document.getElementById('btn-jump').classList.remove('visible')
      document.getElementById('btn-talk').classList.remove('visible')
    })

    const sendFree = () => {
      const t = dlgFreeInput.value.trim()
      if (!t) return
      dlgFreeInput.value = ''
      this.dialogue.playerChoice(t)
    }
    dlgFreeSend.addEventListener('click', sendFree)
    dlgFreeInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') sendFree()
      e.stopPropagation()
    })
    dlgFreeInput.addEventListener('keyup', e => e.stopPropagation())

    document.addEventListener('pointerlockchange', () => {
      const locked = document.pointerLockElement === this.renderer.domElement
      document.getElementById('hint').textContent = locked
        ? 'WASD to move · Shift to release mouse'
        : 'WASD to move · Click canvas to look'
    })
  }

  async _loadWorld() {
    this._setLoading(true, 10, 'Loading world…')
    try {
      const loader = new GLTFLoader()
      const gltf   = await new Promise((resolve, reject) => {
        loader.load(
          '/assets/world.glb', resolve,
          e => { if (e.total) this._setLoading(true, 10 + (e.loaded / e.total) * 50, 'Loading mesh…') },
          reject
        )
      })
      this.worldGroup = gltf.scene
    } catch {
      console.warn('[Engine] No world.glb — using placeholder')
      this.worldGroup = this._buildPlaceholderWorld()
    }

    this.scene.add(this.worldGroup)
    this.worldGroup.updateMatrixWorld(true)

    this._setLoading(true, 70, 'Building collision…')
    const staticGen      = new StaticGeometryGenerator(this.worldGroup)
    staticGen.attributes = ['position']
    const merged         = staticGen.generate()
    merged.boundsTree    = new MeshBVH(merged)
    this.collider        = new THREE.Mesh(merged)
    this.collider.material.visible = false
    this.scene.add(this.collider)

    this.worldGroup.traverse(o => {
      if (o.isMesh) { o.castShadow = true; o.receiveShadow = true }
    })
  }

  _buildPlaceholderWorld() {
    const group  = new THREE.Group()
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshLambertMaterial({ color: 0x2d4a2d })
    )
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    group.add(ground)
    const mat = new THREE.MeshLambertMaterial({ color: 0xb08060 })
    for (const [x, h, z] of [[6,1.5,-8],[-10,2,-12],[14,1,-6],[-5,3,-18],[20,2,-14],[-16,1.5,-8]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(4, h * 2, 4), mat)
      m.position.set(x, h, z); m.castShadow = true; m.receiveShadow = true
      group.add(m)
    }
    return group
  }

  _startLoop() {
    this.renderer.setAnimationLoop(() => {
      const delta = Math.min(this.clock.getDelta(), 0.1)
      if (!this._gameRunning) { this.renderer.render(this.scene, this.camera); return }
      this.character.update(delta)
      this.npcs.update(delta)
      this.items.update(delta, this.character.getPosition())
      this.renderer.render(this.scene, this.camera)
    })
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }
}