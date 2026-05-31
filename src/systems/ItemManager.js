/**
 * ItemManager
 *
 * Spawns collectable items in the Three.js scene.
 * Each world item is a spinning gem/orb. When the player walks within
 * PICKUP_RANGE, it's automatically collected and added to InventoryManager.
 *
 * World item definitions live in data/worldItems.js (see below).
 * The list of already-collected IDs comes from PlayerSave so items
 * don't respawn after they've been picked up.
 */

import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { ITEM_MAP } from '../data/items.js'

const PICKUP_RANGE  = 1.6   // metres
const BOB_AMPLITUDE = 0.15
const BOB_SPEED     = 1.8
const SPIN_SPEED    = 1.2

const _gltfLoader = new GLTFLoader()

export class ItemManager {
  /**
   * @param {object} opts
   * @param {THREE.Scene}       opts.scene
   * @param {InventoryManager}  opts.inventory
   * @param {WorldItem[]}       opts.worldItems  — from data/worldItems.js
   */
  constructor({ scene, inventory, worldItems }) {
    this.scene      = scene
    this.inventory  = inventory
    this.worldItems = worldItems
    this._spawned   = []   // { def, mesh, collected }

    this._spawnAll()
  }

  // ── Spawn ──────────────────────────────────────────────────────────────────

  _spawnAll() {
    for (const def of this.worldItems) {
      // Don't respawn items that were already picked up this session
      // (InventoryManager loaded them from MongoDB on init)
      if (def.oneShot && this.inventory.getFlag(`item_collected_${def.uid}`)) continue

      const entry = { def, mesh: null, collected: false, age: Math.random() * Math.PI * 2 }
      this._buildMesh(def, entry)
      this._spawned.push(entry)
    }
  }

  _buildMesh(def, entry) {
    const itemData = ITEM_MAP[def.itemId]
    if (!itemData) {
      console.warn(`[ItemManager] Unknown itemId "${def.itemId}" in worldItems`)
      return
    }

    const root = new THREE.Group()
    root.position.set(...def.position)
    this.scene.add(root)
    entry.mesh = root

    // Try loading a GLB first
    if (itemData.modelPath) {
      _gltfLoader.load(
        itemData.modelPath,
        (gltf) => {
          gltf.scene.scale.setScalar(0.3)
          root.add(gltf.scene)
          this._addGlow(root, itemData.color ?? 0xffffff)
        },
        undefined,
        () => this._buildGemMesh(root, itemData)
      )
    } else {
      this._buildGemMesh(root, itemData)
    }

    // Pickup radius indicator (thin ring on the ground)
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(PICKUP_RANGE - 0.05, PICKUP_RANGE, 32),
      new THREE.MeshBasicMaterial({
        color: itemData.color ?? 0xffffff,
        transparent: true, opacity: 0.08,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    )
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.02
    root.add(ring)
    entry.ring = ring
  }

  _buildGemMesh(root, itemData) {
    const geo = new THREE.OctahedronGeometry(0.22, 0)
    const mat = new THREE.MeshLambertMaterial({
      color:       itemData.color ?? 0xffffff,
      emissive:    itemData.color ?? 0xffffff,
      emissiveIntensity: 0.3,
    })
    const gem = new THREE.Mesh(geo, mat)
    gem.position.y = 0.5
    gem.castShadow = true
    root.add(gem)
    entry._gem = gem

    this._addGlow(root, itemData.color ?? 0xffffff)
  }

  _addGlow(root, color) {
    // Point light so the item illuminates nearby geometry
    const light = new THREE.PointLight(color, 0.6, 3)
    light.position.y = 0.5
    root.add(light)
  }

  // ── Per-frame update ───────────────────────────────────────────────────────

  update(delta, playerPosition) {
    const t = performance.now() / 1000

    for (const entry of this._spawned) {
      if (entry.collected || !entry.mesh) continue

      // Bob and spin
      entry.mesh.position.y = entry.def.position[1] + Math.sin(t * BOB_SPEED + entry.age) * BOB_AMPLITUDE
      entry.mesh.rotation.y += SPIN_SPEED * delta

      // Proximity pickup
      const dist = playerPosition.distanceTo(entry.mesh.position)
      if (dist < PICKUP_RANGE) {
        this._collect(entry)
      }
    }
  }

  // ── Collection ─────────────────────────────────────────────────────────────

  _collect(entry) {
    entry.collected = true

    // Pop animation — scale up then vanish
    const mesh = entry.mesh
    let scale = 1
    const pop = () => {
      scale += 0.08
      mesh.scale.setScalar(scale)
      mesh.children.forEach(c => {
        if (c.material) c.material.opacity = Math.max(0, (2 - scale))
      })
      if (scale < 2) requestAnimationFrame(pop)
      else this.scene.remove(mesh)
    }
    pop()

    // Add to inventory
    this.inventory.add(entry.def.itemId)

    // Mark as collected so it doesn't respawn
    if (entry.def.oneShot) {
      this.inventory.setFlag(`item_collected_${entry.def.uid}`, true)
    }

    console.log(`[ItemManager] Collected: ${entry.def.itemId}`)
  }

  /**
   * Programmatically give an item to the player (called by DialogueSystem).
   * Does NOT spawn a mesh — just adds to inventory.
   */
  giveItem(itemId) {
    this.inventory.add(itemId)
  }

  /**
   * Take an item from the player (called by DialogueSystem for trade/consume).
   */
  takeItem(itemId) {
    this.inventory.remove(itemId)
  }
}

/**
 * WorldItem definition shape (put your actual list in data/worldItems.js):
 *
 * {
 *   uid:       'mill_sulfur_1',     // unique ID for this world instance
 *   itemId:    'sulfur_sample',     // key from ITEM_MAP
 *   position:  [x, y, z],
 *   oneShot:   true,                // if true, never respawns once collected
 * }
 */
