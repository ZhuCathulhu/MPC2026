import * as THREE from 'three'
import { NPCS } from '../data/npcs.js'

const INTERACT_RANGE = 3.0    // metres

export class NPCManager {
  constructor({ scene, dialogue, character }) {
    this.scene     = scene
    this.dialogue  = dialogue
    this.character = character
    this.npcs      = []

    this._spawnAll()
  }

  _spawnAll() {
    for (const data of NPCS) {
      const npc = new NPC(data, this.scene)
      this.npcs.push(npc)
    }
  }

  update(delta) {
    if (this.dialogue.active) return   // don't trigger new convos mid-dialogue

    const playerPos = this.character.getPosition()

    for (const npc of this.npcs) {
      npc.update(delta, playerPos)

      // Proximity prompt
      const dist = playerPos.distanceTo(npc.getPosition())
      npc.setPromptVisible(dist < INTERACT_RANGE)

      // Interact trigger (E key or talk button)
      if (dist < INTERACT_RANGE && this.character.input.consumeInteract()) {
        this.dialogue.startConversation(npc)
        break
      }
    }
  }
}

// ─── NPC ──────────────────────────────────────────────────────────────────────
export class NPC {
  constructor(data, scene) {
    this.data    = data            // from npcs.js
    this.scene   = scene
    this.history = []              // conversation history for Gemini context

    this._buildMesh()
    this._buildPromptLabel()
  }

  _buildMesh() {
    // Simple box figure as placeholder — replace with your GLTF NPC mesh
    const group = new THREE.Group()

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.3, 1.0, 4, 8),
      new THREE.MeshLambertMaterial({ color: this.data.color ?? 0xa0785a })
    )
    body.castShadow = true
    body.position.y = 0.95

    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 8, 6),
      new THREE.MeshLambertMaterial({ color: 0xd4a882 })
    )
    head.position.y = 1.9

    group.add(body, head)
    group.position.copy(new THREE.Vector3(...(this.data.spawnPosition ?? [0, 0, -5])))
    this.scene.add(group)
    this.mesh = group
  }

  _buildPromptLabel() {
    // World-space HTML label via CSS2DRenderer alternative: simple sprite
    const canvas = document.createElement('canvas')
    canvas.width  = 256
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.roundRect(4, 4, 248, 56, 8)
    ctx.fill()
    ctx.fillStyle = '#c8d8a0'
    ctx.font = '600 16px Georgia'
    ctx.textAlign = 'center'
    ctx.fillText(`[E] Talk to ${this.data.name}`, 128, 36)

    const texture  = new THREE.CanvasTexture(canvas)
    const mat      = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false })
    this.prompt    = new THREE.Sprite(mat)
    this.prompt.scale.set(2, 0.5, 1)
    this.prompt.position.set(0, 2.8, 0)
    this.prompt.visible = false
    this.mesh.add(this.prompt)
  }

  update(delta, playerPos) {
    // Soft look-at: rotate to face player
    const dir = playerPos.clone().sub(this.mesh.position)
    dir.y = 0
    if (dir.lengthSq() > 0.01) {
      const targetAngle = Math.atan2(dir.x, dir.z)
      this.mesh.rotation.y += (targetAngle - this.mesh.rotation.y) * 0.05
    }

    // Idle bob
    this.mesh.children[0].position.y = 0.95 + Math.sin(Date.now() * 0.001) * 0.03
  }

  setPromptVisible(v) {
    this.prompt.visible = v
  }

  getPosition() {
    return this.mesh.position
  }

  // ── Dialogue helpers ──────────────────────────────────────────────────────
  getOpening() {
    const script = this.data.script ?? {}
    return script.opening ?? { text: 'Hello.', choices: [{ id: '__end__', label: 'Goodbye.' }] }
  }

  getResponse(choiceId) {
    const script = this.data.script ?? {}
    return script.responses?.[choiceId] ?? null
  }

  getHistory()       { return [...this.history] }
  addToHistory(entry){ this.history.push(entry); if (this.history.length > 20) this.history.shift() }
}
