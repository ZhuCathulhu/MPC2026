import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshBVH, StaticGeometryGenerator } from 'three-mesh-bvh'

import { CharacterController } from '../systems/CharacterController.js'
import { InputManager }        from '../systems/InputManager.js'
import { DialogueSystem }      from '../systems/DialogueSystem.js'
import { NPCManager }          from '../systems/NPCManager.js'
import { ItemManager }         from '../systems/ItemManager.js'
import { InventoryManager }    from '../systems/InventoryManager.js'
import { HUD }                 from '../ui/HUD.js'
import { setProgress }         from '../ui/Loading.js'
import { WORLD_ITEMS }         from '../data/worldItems.js'

export class Engine {
  constructor() {
    this.scene    = null
    this.camera   = null
    this.renderer = null
    this.clock    = new THREE.Clock()

    this.character = null
    this.input     = null
    this.dialogue  = null
    this.npcs      = null
    this.items     = null
    this.inventory = null
    this.hud       = null

    this.collider   = null
    this.worldGroup = null
  }

  async init() {
    this._setupRenderer()
    this._setupScene()
    this._setupCamera()
    this._setupLights()

    // ── Inventory (load from MongoDB before anything else) ──────────────────
    const playerId   = InventoryManager.getOrCreatePlayerId()
    this.inventory   = new InventoryManager(playerId)
    await this.inventory.load()

    // ── Systems ─────────────────────────────────────────────────────────────
    this.input    = new InputManager()
    this.dialogue = new DialogueSystem(this.inventory)
    this.hud      = new HUD(this.dialogue, this.inventory)

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

    // ── Item pickups ─────────────────────────────────────────────────────────
    this.items = new ItemManager({
      scene:      this.scene,
      inventory:  this.inventory,
      worldItems: WORLD_ITEMS,
    })

    // Hide loading screen
    const loading = document.getElementById('loading')
    loading.classList.add('hidden')
    setTimeout(() => loading.remove(), 1000)

    this._startLoop()
    window.addEventListener('resize', () => this._onResize())
  }

  // ─── Renderer ─────────────────────────────────────────────────────────────
  _setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    document.getElementById('app').appendChild(this.renderer.domElement)
  }

  _setupScene() {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x87ceeb)
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.018)
  }

  _setupCamera() {
    this.camera = new THREE.PerspectiveCamera(
      70, window.innerWidth / window.innerHeight, 0.01, 300
    )
  }

  _setupLights() {
    this.scene.add(new THREE.AmbientLight(0xfff4e0, 0.6))
    const sun = new THREE.DirectionalLight(0xfff4e0, 2.0)
    sun.position.set(50, 80, 30)
    sun.castShadow = true
    sun.shadow.mapSize.setScalar(2048)
    sun.shadow.camera.near = 0.1
    sun.shadow.camera.far = 200
    sun.shadow.camera.left = -50; sun.shadow.camera.right = 50
    sun.shadow.camera.top  =  50; sun.shadow.camera.bottom = -50
    sun.shadow.bias = -0.001
    this.scene.add(sun)
  }

  // ─── World loading ─────────────────────────────────────────────────────────
  async _loadWorld() {
    setProgress(10, 'Loading world...')
    let worldLoaded = false
    try {
      const loader = new GLTFLoader()
      const gltf   = await new Promise((resolve, reject) => {
        loader.load(
          '/assets/world.glb', resolve,
          e => setProgress(10 + (e.loaded / e.total) * 50, 'Loading mesh...'),
          reject
        )
      })
      this.worldGroup = gltf.scene
      worldLoaded = true
      setProgress(60, 'World loaded')
    } catch {
      console.warn('[Engine] No world.glb — using placeholder')
      this.worldGroup = this._buildPlaceholderWorld()
      setProgress(60, 'Using placeholder world')
    }

    this.scene.add(this.worldGroup)
    this.worldGroup.updateMatrixWorld(true)

    setProgress(70, 'Building collision...')
    const staticGen = new StaticGeometryGenerator(this.worldGroup)
    staticGen.attributes = ['position']
    const mergedGeometry = staticGen.generate()
    mergedGeometry.boundsTree = new MeshBVH(mergedGeometry)
    this.collider = new THREE.Mesh(mergedGeometry)
    this.collider.material.wireframe = true
    this.collider.material.visible   = false
    this.collider.name = 'collider'
    this.scene.add(this.collider)

    this.worldGroup.traverse(obj => {
      if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true }
    })

    setProgress(90, 'Spawning NPCs...')
  }

  _buildPlaceholderWorld() {
    const group = new THREE.Group()
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshLambertMaterial({ color: 0x4a7c40 })
    )
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    group.add(ground)

    const buildingMat = new THREE.MeshLambertMaterial({ color: 0xb08060 })
    for (const [x, h, z] of [[6,1.5,-8],[-10,2,-12],[14,1,-6],[-5,3,-18],[20,2,-14],[-16,1.5,-8]]) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(4, h * 2, 4), buildingMat)
      mesh.position.set(x, h, z); mesh.castShadow = true; mesh.receiveShadow = true
      group.add(mesh)
    }
    return group
  }

  // ─── Loop ──────────────────────────────────────────────────────────────────
  _startLoop() {
    this.renderer.setAnimationLoop(() => {
      const delta = this.clock.getDelta()
      this.character.update(delta)
      this.npcs.update(delta)
      // Pass player position so ItemManager can do proximity checks
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