import * as THREE from 'three'
import { MeshBVHHelper, computeBoundsTree } from 'three-mesh-bvh'

// Gravity & movement constants
const GRAVITY        = -25
const JUMP_SPEED     = 10
const WALK_SPEED     = 5
const RUN_SPEED      = 10
const CAPSULE_RADIUS = 0.35
const CAPSULE_HEIGHT = 1.6   // total height
const STEP_HEIGHT    = 0.4   // max step-up

// Camera settings
const CAM_DISTANCE  = 4
const CAM_HEIGHT    = 1.8
const CAM_LERP      = 0.12
const MOUSE_SENS    = 0.002

export class CharacterController {
  constructor({ scene, camera, collider, input }) {
    this.scene    = scene
    this.camera   = camera
    this.collider = collider
    this.input    = input

    // State
    this.velocity    = new THREE.Vector3()
    this.onGround    = false
    this.yaw         = 0      // horizontal camera rotation
    this.pitch       = -0.2   // vertical camera rotation

    // Capsule definition (two sphere centers)
    this.capsuleTop    = new THREE.Vector3()
    this.capsuleBottom = new THREE.Vector3()

    // Spawn position
    this.position = new THREE.Vector3(0, 2, 0)

    // Visual mesh (simple capsule proxy)
    this._buildMesh()

    // Pointer lock for mouse look
    this._setupPointerLock()
  }

  _buildMesh() {
    // Simple visible capsule so you can see yourself in debug mirrors
    const geo = new THREE.CapsuleGeometry(CAPSULE_RADIUS, CAPSULE_HEIGHT - CAPSULE_RADIUS * 2, 4, 8)
    const mat = new THREE.MeshLambertMaterial({ color: 0xe8d5b0, wireframe: false })
    this.mesh = new THREE.Mesh(geo, mat)
    this.mesh.castShadow = true
    this.mesh.visible = false   // first-person — hide self; set true for third-person debug
    this.scene.add(this.mesh)
  }

  _setupPointerLock() {
    const canvas = document.querySelector('canvas')
    canvas.addEventListener('click', () => {
      // Don't lock if dialogue is open
      if (document.getElementById('dialogue-box')?.style.display !== 'none') return
      canvas.requestPointerLock()
    })
    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement !== canvas) return
      this.yaw   -= e.movementX * MOUSE_SENS
      this.pitch -= e.movementY * MOUSE_SENS
      this.pitch  = Math.max(-Math.PI / 3, Math.min(Math.PI / 4, this.pitch))
    })
  }

  // ── Called every frame ────────────────────────────────────────────────────
  update(delta) {
    this._applyGravity(delta)
    this._applyMovement(delta)
    this._resolveCollisions()
    this._updateCamera()
    this.mesh.position.copy(this.position)
  }

  _applyGravity(delta) {
    if (!this.onGround) {
      this.velocity.y += GRAVITY * delta
    }
    // Jump
    if (this.input.keys.jump && this.onGround) {
      this.velocity.y = JUMP_SPEED
      this.onGround = false
    }
  }

  _applyMovement(delta) {
    const speed = this.input.keys.run ? RUN_SPEED : WALK_SPEED

    // Camera-relative forward/right
    const forward = new THREE.Vector3(
      -Math.sin(this.yaw), 0, -Math.cos(this.yaw)
    )
    const right = new THREE.Vector3(
      Math.cos(this.yaw), 0, -Math.sin(this.yaw)
    )

    const move = new THREE.Vector3()
    const { x, z } = this.input.getMovement()  // [-1,1] from WASD or joystick
    move.addScaledVector(forward, -z)
    move.addScaledVector(right, x)

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(speed * delta)
    }

    this.velocity.x = move.x / delta
    this.velocity.z = move.z / delta
    this.position.addScaledVector(this.velocity, delta)
  }

  _resolveCollisions() {
    if (!this.collider?.geometry?.boundsTree) return

    const HALF = CAPSULE_HEIGHT / 2
    const segment = new THREE.Line3(
      this.position.clone().add(new THREE.Vector3(0, CAPSULE_RADIUS, 0)),
      this.position.clone().add(new THREE.Vector3(0, HALF, 0))
    )

    const capsuleAABB = new THREE.Box3()
    capsuleAABB.setFromCenterAndSize(
      this.position.clone().add(new THREE.Vector3(0, HALF / 2, 0)),
      new THREE.Vector3(
        CAPSULE_RADIUS * 2 + 0.1,
        CAPSULE_HEIGHT + 0.1,
        CAPSULE_RADIUS * 2 + 0.1
      )
    )

    let didCollide = false

    this.collider.geometry.boundsTree.shapecast({
      intersectsBounds: (box) => box.intersectsBox(capsuleAABB),
      intersectsTriangle: (tri) => {
        const point  = new THREE.Vector3()
        const onLine = new THREE.Vector3()

        tri.closestPointToSegment(segment, point, onLine)
        const dist = point.distanceTo(onLine)

        if (dist < CAPSULE_RADIUS) {
          const push = onLine.clone().sub(point).normalize()
          const depth = CAPSULE_RADIUS - dist
          this.position.addScaledVector(push, depth)

          // Rebuild segment after push
          segment.start.copy(this.position).add(new THREE.Vector3(0, CAPSULE_RADIUS, 0))
          segment.end.copy(this.position).add(new THREE.Vector3(0, HALF, 0))

          if (push.y > 0.5) {
            this.onGround = true
            this.velocity.y = Math.max(0, this.velocity.y)
          }
          didCollide = true
        }
      }
    })

    if (!didCollide) this.onGround = false

    // Safety net
    if (this.position.y < -20) {
      this.position.set(0, 2, 0)
      this.velocity.set(0, 0, 0)
    }
  }
  
  _updateCamera() {
    // Orbit camera around player
    const offset = new THREE.Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch) * CAM_DISTANCE,
      Math.sin(this.pitch) * CAM_DISTANCE + CAM_HEIGHT,
      Math.cos(this.yaw) * Math.cos(this.pitch) * CAM_DISTANCE
    )

    const target = this.position.clone().add(new THREE.Vector3(0, 1, 0))
    this.camera.position.lerp(target.clone().add(offset), CAM_LERP)
    this.camera.lookAt(target)
  }

  getPosition() {
    return this.position.clone()
  }
}
