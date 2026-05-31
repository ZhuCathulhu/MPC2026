/**
 * AudioManager
 *
 * Handles two kinds of sounds:
 *   1. Ambient / positional — looping sounds tied to a world position
 *      (e.g. a crackling fire, running water, market chatter)
 *   2. One-shot triggered — played on demand (e.g. interact key press,
 *      item pickup, door open)
 *
 * All audio files must live under /public/assets/audio/
 *
 * Usage from Engine.js:
 *   this.audio = new AudioManager()
 *   this.audio.addPositional('fire_mill', 'fire_loop.mp3', [8, 0, -14], 10)
 *   this.audio.playOneShot('interact.mp3')
 */

const BASE_PATH     = '/assets/'
const MASTER_VOLUME = 0.8   // 0–1

export class AudioManager {
  constructor() {
    this._ctx        = null
    this._master     = null
    this._positional = []
    this._cache      = {}
    this._started    = false
    this._trackSource = null   // ← add
    this._trackGain   = null   // ← add
    this._trackVolume = 0      // ← add
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Register a looping positional sound.
   * @param {string}   id       — unique identifier so you can remove it later
   * @param {string}   file     — filename inside /assets/audio/
   * @param {number[]} position — [x, y, z]
   * @param {number}   maxDist  — distance at which volume reaches 0 (default 12)
   */
  addPositional(id, file, position, maxDist = 12) {
    this._positional.push({
      id,
      url:     BASE_PATH + file,
      position: { x: position[0], y: position[1], z: position[2] },
      maxDist,
      source:   null,
      gainNode: null,
      loaded:   false,
    })
  }

  /**
   * Remove and stop a positional sound by id.
   */
  removePositional(id) {
    const idx = this._positional.findIndex(p => p.id === id)
    if (idx === -1) return
    const entry = this._positional[idx]
    this._stopEntry(entry)
    this._positional.splice(idx, 1)
  }

  /**
   * Play a one-shot sound (fire and forget).
   * @param {string} file     — filename inside /assets/audio/
   * @param {number} volume   — 0–1, defaults to 1
   */
async playOneShot(file, volume = 1, pitch = 1) {
  const ctx = await this._ensureCtx()
  if (!ctx) return
  const buffer = await this._load(BASE_PATH + file)
  if (!buffer) return
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.playbackRate.value = pitch          // ← pitch shift
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(volume * MASTER_VOLUME, ctx.currentTime)
  source.connect(gain).connect(this._master)
  source.start()
}

  /**
   * Call every frame from Engine's game loop.
   * Pass the player's THREE.Vector3 position.
   */
  update(playerPosition) {
    if (!this._ctx || this._ctx.state === 'suspended') return

    for (const entry of this._positional) {
      if (!entry.gainNode) continue

      const dx   = playerPosition.x - entry.position.x
      const dy   = playerPosition.y - entry.position.y
      const dz   = playerPosition.z - entry.position.z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

      const vol  = Math.max(0, 1 - dist / entry.maxDist) * MASTER_VOLUME
      entry.gainNode.gain.setTargetAtTime(vol, this._ctx.currentTime, 0.1)
    }
  }

  /**
   * Call once when the game actually starts (after a user gesture exists).
   * Begins loading and playing all registered positional sounds.
   */
  async start() {
    if (this._started) return
    this._started = true
    const ctx = await this._ensureCtx()
    if (!ctx) return
    for (const entry of this._positional) {
      this._startEntry(entry)
    }
  }

  /**
 * Play a looping background track with a fade-in.
 * @param {string} file       — filename inside /assets/audio/
 * @param {number} volume     — target volume 0–1 (default 0.7)
 * @param {number} fadeDuration — fade-in duration in seconds (default 2)
 */
async playTrack(file, volume = 0.7, fadeDuration = 2) {
  const ctx = await this._ensureCtx()
  if (!ctx) return

  // Stop any existing track first
  this.stopTrack()

  const buffer = await this._load(BASE_PATH + file)   // ← remove 'audio/' prefix
  if (!buffer) return

  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.loop   = true

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0, ctx.currentTime)
  gain.gain.linearRampToValueAtTime(volume * MASTER_VOLUME, ctx.currentTime + fadeDuration)

  source.connect(gain)
  gain.connect(this._master)
  source.start()

  this._trackSource = source
  this._trackGain   = gain
  this._trackVolume = volume
}

/**
 * Fade out and stop the current background track.
 * @param {number} fadeDuration — fade-out duration in seconds (default 1.5)
 */
stopTrack(fadeDuration = 1.5) {
  if (!this._trackSource || !this._ctx) return
  const gain   = this._trackGain
  const source = this._trackSource
  const ctx    = this._ctx

  gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime)
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeDuration)

  setTimeout(() => {
    try { source.stop() } catch { /* already stopped */ }
  }, fadeDuration * 1000)

  this._trackSource = null
  this._trackGain   = null
}

  // ── Internal ───────────────────────────────────────────────────────────────

  async _ensureCtx() {
    if (this._ctx) {
      if (this._ctx.state === 'suspended') await this._ctx.resume()
      return this._ctx
    }
    try {
      this._ctx    = new (window.AudioContext || window.webkitAudioContext)()
      this._master = this._ctx.createGain()
      this._master.gain.setValueAtTime(MASTER_VOLUME, this._ctx.currentTime)
      this._master.connect(this._ctx.destination)
      return this._ctx
    } catch (err) {
      console.warn('[AudioManager] Web Audio not available:', err)
      return null
    }
  }

  async _load(url) {
    if (this._cache[url]) return this._cache[url]
    try {
      const res    = await fetch(url)
      const arr    = await res.arrayBuffer()
      const buffer = await this._ctx.decodeAudioData(arr)
      this._cache[url] = buffer
      return buffer
    } catch (err) {
      console.warn(`[AudioManager] Failed to load ${url}:`, err.message)
      return null
    }
  }

  async _startEntry(entry) {
    const ctx = this._ctx
    const buffer = await this._load(entry.url)
    if (!buffer) return

    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop   = true

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, ctx.currentTime)   // start silent; update() fades in

    source.connect(gain)
    gain.connect(this._master)
    source.start()

    entry.source   = source
    entry.gainNode = gain
  }

  _stopEntry(entry) {
    try { entry.source?.stop() } catch { /* already stopped */ }
    entry.source   = null
    entry.gainNode = null
  }
}
