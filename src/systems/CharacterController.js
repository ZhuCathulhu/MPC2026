import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { computeBoundsTree } from 'three-mesh-bvh'

const GRAVITY        = -25
const JUMP_SPEED     = 10
const WALK_SPEED     = 5
const RUN_SPEED      = 10
const CAPSULE_RADIUS = 0.35
const CAPSULE_HEIGHT = 1.6
const CAM_DISTANCE   = 5
const CAM_HEIGHT     = 2.5
const CAM_LERP       = 0.15
const MOUSE_SENS     = 0.002

export class CharacterController {
  constructor({ scene, camera, collider, input }) {
    this.scene    = scene
    this.camera   = camera
    this.collider = collider
    this.input    = input

    this.velocity = new THREE.Vector3()
    this.onGround = false
    this.yaw      = 0
    this.pitch    = 0

    this.position = new THREE.Vector3(0, 0, 4)

    this._buildMesh()
    this._setupPointerLock()
  }

  _buildMesh() {
    // Invisible physics capsule
    const geo = new THREE.CapsuleGeometry(CAPSULE_RADIUS, CAPSULE_HEIGHT - CAPSULE_RADIUS * 2, 4, 8)
    this.mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial())
    this.mesh.visible = false
    this.scene.add(this.mesh)

    // Visual GLB group
    this._modelGroup = new THREE.Group()
    this.scene.add(this._modelGroup)

    new GLTFLoader().load('/assets/base.glb', (gltf) => {
      const model = gltf.scene
      this._modelGroup.add(model)
      this._modelGroup.updateMatrixWorld(true)

      const box  = new THREE.Box3().setFromObject(this._modelGroup)
      const size = new THREE.Vector3()
      box.getSize(size)

      if (size.y > 0.01) {
        model.scale.setScalar(CAPSULE_HEIGHT / size.y)
        this._modelGroup.updateMatrixWorld(true)
        const box2 = new THREE.Box3().setFromObject(this._modelGroup)
        model.position.y -= box2.min.y
      }
      model.traverse(o => {
        if (o.isMesh) { o.castShadow = true; o.receiveShadow = true }
      })
      console.log('[Character] base.glb loaded OK')
    }, undefined, () => {
      // Fallback: show the capsule
      this.mesh.visible = true
    })
  }

  _setupPointerLock() {
    const canvas = document.querySelector('#app canvas')

    canvas.addEventListener('click', () => {
      if (!document.pointerLockElement) canvas.requestPointerLock()
    })

    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement !== canvas) return
      this.yaw   -= e.movementX * MOUSE_SENS
      this.pitch -= e.movementY * MOUSE_SENS
      this.pitch  = Math.max(-0.5, Math.min(0.4, this.pitch))
    })

    document.addEventListener('keydown', (e) => {
      if (e.code === 'ShiftLeft' && document.pointerLockElement === canvas) {
        document.exitPointerLock()
      }
    })
  }

  update(delta) {
    this._applyGravity(delta)
    this._applyMovement(delta)
    this._resolveCollisions()
    this._updateCamera()

    this.mesh.position.copy(this.position)
    if (this._modelGroup) {
      this._modelGroup.position.copy(this.position)
      // Face direction of travel
      const { x, z } = this.input.getMovement()
      if (Math.abs(x) > 0.01 || Math.abs(z) > 0.01) {
        const angle = Math.atan2(
          -Math.sin(this.yaw) * (-z) + Math.cos(this.yaw) * x,
          -Math.cos(this.yaw) * (-z) - Math.sin(this.yaw) * x
        )
        this._modelGroup.rotation.y += (angle - this._modelGroup.rotation.y) * 0.2
      }
    }
  }

  _applyGravity(delta) {
    if (!this.onGround) this.velocity.y += GRAVITY * delta
    if (this.input.keys.jump && this.onGround) {
      this.velocity.y = JUMP_SPEED
      this.onGround = false
    }
  }

  _applyMovement(delta) {
    const speed   = this.input.keys.run ? RUN_SPEED : WALK_SPEED
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw))
    const right   = new THREE.Vector3( Math.cos(this.yaw), 0, -Math.sin(this.yaw))
    const move    = new THREE.Vector3()
    const { x, z } = this.input.getMovement()
    move.addScaledVector(forward, -z)
    move.addScaledVector(right, x)
    if (move.lengthSq() > 0) move.normalize().multiplyScalar(speed * delta)
    this.velocity.x = move.x / delta
    this.velocity.z = move.z / delta
    this.position.addScaledVector(this.velocity, delta)
  }

  _resolveCollisions() {
    if (!this.collider?.geometry?.boundsTree) {
      // No BVH — simple floor snap
      if (this.position.y < 0) { this.position.y = 0; this.velocity.y = 0; this.onGround = true }
      return
    }

    const HALF    = CAPSULE_HEIGHT / 2
    const segment = new THREE.Line3(
      this.position.clone().add(new THREE.Vector3(0, CAPSULE_RADIUS, 0)),
      this.position.clone().add(new THREE.Vector3(0, HALF, 0))
    )
    const aabb = new THREE.Box3().setFromCenterAndSize(
      this.position.clone().add(new THREE.Vector3(0, HALF / 2, 0)),
      new THREE.Vector3(CAPSULE_RADIUS * 2 + 0.1, CAPSULE_HEIGHT + 0.1, CAPSULE_RADIUS * 2 + 0.1)
    )

    let didCollide = false
    this.collider.geometry.boundsTree.shapecast({
      intersectsBounds: box => box.intersectsBox(aabb),
      intersectsTriangle: tri => {
        const point = new THREE.Vector3(), onLine = new THREE.Vector3()
        tri.closestPointToSegment(segment, point, onLine)
        const dist = point.distanceTo(onLine)
        if (dist < CAPSULE_RADIUS) {
          const push  = onLine.clone().sub(point).normalize()
          const depth = CAPSULE_RADIUS - dist
          this.position.addScaledVector(push, depth)
          segment.start.copy(this.position).add(new THREE.Vector3(0, CAPSULE_RADIUS, 0))
          segment.end.copy(this.position).add(new THREE.Vector3(0, HALF, 0))
          if (push.y > 0.5) { this.onGround = true; this.velocity.y = Math.max(0, this.velocity.y) }
          didCollide = true
        }
      }
    })
    if (!didCollide) this.onGround = false
    if (this.position.y < -20) { this.position.set(0, 2, 0); this.velocity.set(0, 0, 0) }
  }

  _updateCamera() {
    const offset = new THREE.Vector3(
      Math.sin(this.yaw)   * Math.cos(this.pitch) * CAM_DISTANCE,
      Math.sin(this.pitch) * CAM_DISTANCE + CAM_HEIGHT,
      Math.cos(this.yaw)   * Math.cos(this.pitch) * CAM_DISTANCE
    )
    const target = this.position.clone().add(new THREE.Vector3(0, 1, 0))
    this.camera.position.lerp(target.clone().add(offset), CAM_LERP)
    this.camera.lookAt(target)
  }

  getPosition() { return this.position.clone() }
}