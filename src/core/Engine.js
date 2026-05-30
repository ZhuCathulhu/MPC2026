import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshBVH, StaticGeometryGenerator } from 'three-mesh-bvh'

import { CharacterController } from '../systems/CharacterController.js'
import { InputManager } from '../systems/InputManager.js'
import { DialogueSystem } from '../systems/DialogueSystem.js'
import { NPCManager } from '../systems/NPCManager.js'
import { HUD } from '../ui/HUD.js'
import { setProgress } from '../ui/Loading.js'

export class Engine {
  constructor() {
    this.scene = null
    this.camera = null
    this.renderer = null
    this.clock = new THREE.Clock()

    this.character = null
    this.input = null
    this.dialogue = null
    this.npcs = null
    this.hud = null

    this.collider = null       // BVH collider mesh
    this.worldGroup = null     // all loaded world meshes
  }

  async init() {
    this._setupRenderer()
    this._setupScene()
    this._setupCamera()
    this._setupLights()

    this.input     = new InputManager()
    this.dialogue  = new DialogueSystem()
    this.hud       = new HUD(this.dialogue)

    await this._loadWorld()

    this.character = new CharacterController({
      scene:    this.scene,
      camera:   this.camera,
      collider: this.collider,
      input:    this.input,
    })

    this.npcs = new NPCManager({
      scene:    this.scene,
      dialogue: this.dialogue,
      character: this.character,
    })

    // Hide loading screen
    const loading = document.getElementById('loading')
    loading.classList.add('hidden')
    setTimeout(() => loading.remove(), 1000)

    this._startLoop()
    window.addEventListener('resize', () => this._onResize())
  }

  // ─── Renderer ────────────────────────────────────────────────────────────
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
    // Camera is parented to the character controller later
  }

  _setupLights() {
    const ambient = new THREE.AmbientLight(0xfff4e0, 0.6)
    this.scene.add(ambient)

    const sun = new THREE.DirectionalLight(0xfff4e0, 2.0)
    sun.position.set(50, 80, 30)
    sun.castShadow = true
    sun.shadow.mapSize.setScalar(2048)
    sun.shadow.camera.near = 0.1
    sun.shadow.camera.far = 200
    sun.shadow.camera.left = -50
    sun.shadow.camera.right = 50
    sun.shadow.camera.top = 50
    sun.shadow.camera.bottom = -50
    sun.shadow.bias = -0.001
    this.scene.add(sun)
  }

  // ─── World Loading ────────────────────────────────────────────────────────
  async _loadWorld() {
    setProgress(10, 'Loading world...')

    // Check if a GLB exists; if not, build a placeholder world
    let worldLoaded = false
    try {
      const loader = new GLTFLoader()
      const gltf = await new Promise((resolve, reject) => {
        loader.load(
          '/assets/world.glb',
          resolve,
          (e) => setProgress(10 + (e.loaded / e.total) * 50, 'Loading mesh...'),
          reject
        )
      })
      this.worldGroup = gltf.scene
      worldLoaded = true
      setProgress(60, 'World loaded')
    } catch {
      console.warn('[Engine] No world.glb found — using placeholder geometry')
      this.worldGroup = this._buildPlaceholderWorld()
      setProgress(60, 'Using placeholder world')
    }

    this.scene.add(this.worldGroup)
    this.worldGroup.updateMatrixWorld(true)

    // ── Build BVH collider ──────────────────────────────────────────────────
    setProgress(70, 'Building collision...')
    const staticGen = new StaticGeometryGenerator(this.worldGroup)
    staticGen.attributes = ['position']

    const mergedGeometry = staticGen.generate()
    mergedGeometry.boundsTree = new MeshBVH(mergedGeometry)

    this.collider = new THREE.Mesh(mergedGeometry)
    this.collider.material.wireframe = true
    this.collider.material.visible = false   // set true to debug collisions
    this.collider.name = 'collider'
    this.scene.add(this.collider)

    // Shadows on world meshes
    this.worldGroup.traverse(obj => {
      if (obj.isMesh) {
        obj.castShadow = true
        obj.receiveShadow = true
      }
    })

    setProgress(90, 'Spawning NPCs...')
  }

  // ─── Placeholder world (used when no GLB is present) ─────────────────────
  _buildPlaceholderWorld() {
    const group = new THREE.Group()

    // Ground plane
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshLambertMaterial({ color: 0x4a7c40 })
    )
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    group.add(ground)

    // Scattered boxes as stand-in buildings
    const buildingMat = new THREE.MeshLambertMaterial({ color: 0xb08060 })
    const positions = [
      [6, 1.5, -8], [-10, 2, -12], [14, 1, -6],
      [-5, 3, -18], [20, 2, -14], [-16, 1.5, -8]
    ]
    for (const [x, h, z] of positions) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(4, h * 2, 4),
        buildingMat
      )
      mesh.position.set(x, h, z)
      mesh.castShadow = true
      mesh.receiveShadow = true
      group.add(mesh)
    }

    // Low wall / ramp to test collision
    const ramp = new THREE.Mesh(
      new THREE.BoxGeometry(8, 0.5, 3),
      new THREE.MeshLambertMaterial({ color: 0x888888 })
    )
    ramp.position.set(-3, 0.25, -4)
    ramp.rotation.z = 0.15
    group.add(ramp)

    return group
  }

  // ─── Loop ─────────────────────────────────────────────────────────────────
  _startLoop() {
    this.renderer.setAnimationLoop(() => {
      const delta = this.clock.getDelta()
      this.character.update(delta)
      this.npcs.update(delta)
      this.renderer.render(this.scene, this.camera)
    })
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }
}
