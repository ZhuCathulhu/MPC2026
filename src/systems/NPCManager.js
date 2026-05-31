import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { NPCS } from '../data/npcs.js'

const INTERACT_RANGE = 3.0    // metres

const _gltfLoader = new GLTFLoader()

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
    if (this.dialogue.active) return

    const playerPos = this.character.getPosition()

    for (const npc of this.npcs) {
      npc.update(delta, playerPos)

      const dist = playerPos.distanceTo(npc.getPosition())
      npc.setPromptVisible(dist < INTERACT_RANGE)

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
    this.data    = data
    this.scene   = scene
    this.history = []

    this.mesh = new THREE.Group()
    this.mesh.position.copy(new THREE.Vector3(...(data.spawnPosition ?? [0, 1, -5])))
    this.scene.add(this.mesh)

    this._loadModel()
    this._buildPromptLabel()
  }

  // ── Model loading ──────────────────────────────────────────────────────────
  _loadModel() {
    console.log(`[NPC:${this.data.name}] _loadModel, modelPath=${this.data.modelPath}`)
    console.log(`[NPC:${this.data.name}] spawnPosition:`, this.mesh.position)

    if (!this.data.modelPath) {
      console.log(`[NPC:${this.data.name}] no modelPath — using placeholder`)
      this._buildPlaceholderMesh()
      return
    }

    _gltfLoader.load(
      this.data.modelPath,
      (gltf) => {
        console.log(`[NPC:${this.data.name}] GLB loaded OK`)
        const model = gltf.scene

        // Clear the scene-wrapper transform
        model.position.set(0, 0, 0)
        model.rotation.set(0, 0, 0)
        model.scale.set(1, 1, 1)

        let meshCount = 0
        model.traverse(obj => {
          if (!obj.isMesh) return
          meshCount++
          obj.castShadow    = true
          obj.receiveShadow = true

          // Fallback material
          if (!obj.material || (Array.isArray(obj.material) && obj.material.length === 0)) {
            console.log(`[NPC:${this.data.name}] no material — applying fallback`)
            obj.material = new THREE.MeshLambertMaterial({ color: this.data.color ?? 0xa0785a })
          }
        })

        // Add the model first so world transforms are computed correctly,
        // then floor the whole model by its world-space bounding box minimum.
        this.mesh.add(model)
        this._model = model

        const box = new THREE.Box3().setFromObject(model)
        if (box.min.y < -0.05 || box.min.y > 0.05) {
          console.log(`[NPC:${this.data.name}] flooring model: bbox minY=${box.min.y.toFixed(3)}, shifting by ${(-box.min.y).toFixed(3)}`)
          model.position.y -= box.min.y
        }

        console.log(`[NPC:${this.data.name}] mesh nodes found: ${meshCount}`)
        const wp = new THREE.Vector3()
        this.mesh.getWorldPosition(wp)
        console.log(`[NPC:${this.data.name}] final world pos: ${wp.x.toFixed(2)}, ${wp.y.toFixed(2)}, ${wp.z.toFixed(2)}`)
      },
      undefined,
      (err) => {
        console.error(`[NPC:${this.data.name}] GLB LOAD FAILED:`, err)
        this._buildPlaceholderMesh()
      }
    )
  }

  _buildPlaceholderMesh() {
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.3, 1.0, 4, 8),
      new THREE.MeshLambertMaterial({ color: this.data.color ?? 0xa0785a })
    )
    body.castShadow = true
    body.position.y = 0.95

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 8, 6),
      new THREE.MeshLambertMaterial({ color: 0xd4a882 })
    )
    head.position.y = 1.9

    this.mesh.add(body, head)
    this._model = null
    this._placeholderBody = body
  }

  // ── Prompt sprite ──────────────────────────────────────────────────────────
  _buildPromptLabel() {
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

    const texture = new THREE.CanvasTexture(canvas)
    const mat     = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false })
    this.prompt   = new THREE.Sprite(mat)
    this.prompt.scale.set(2, 0.5, 1)
    this.prompt.position.set(0, 2.8, 0)
    this.prompt.visible = false
    this.mesh.add(this.prompt)
  }

  // ── Per-frame update ───────────────────────────────────────────────────────
  update(delta, playerPos) {
    const dir = playerPos.clone().sub(this.mesh.position)
    dir.y = 0
    if (dir.lengthSq() > 0.01) {
      const targetAngle = Math.atan2(dir.x, dir.z)
      this.mesh.rotation.y += (targetAngle - this.mesh.rotation.y) * 0.05
    }

    if (this._placeholderBody) {
      this._placeholderBody.position.y = 0.95 + Math.sin(Date.now() * 0.001) * 0.03
    }
  }

  setPromptVisible(v) { this.prompt.visible = v }
  getPosition()       { return this.mesh.position }

  getOpening(inventory) {
    const script = this.data.script ?? {}
    // openingIf: array of { requiresFlag, requiresCount, opening } checked in order.
    // First matching entry wins; falls back to script.opening.
    if (script.openingIf?.length && inventory) {
      for (const branch of script.openingIf) {
        let match = true
        if (branch.requiresFlag !== undefined && !inventory.getFlag(branch.requiresFlag)) match = false
        if (branch.requiresCount) {
          const { itemId, min } = branch.requiresCount
          if (inventory.count(itemId) < min) match = false
        }
        if (match) return branch.opening
      }
    }
    return script.opening ?? { text: 'Hello.', choices: [{ id: '__end__', label: 'Goodbye.' }] }
  }

  getResponse(choiceId) {
    return (this.data.script ?? {}).responses?.[choiceId] ?? null
  }

  getHistory()        { return [...this.history] }
  addToHistory(entry) { this.history.push(entry); if (this.history.length > 20) this.history.shift() }
}