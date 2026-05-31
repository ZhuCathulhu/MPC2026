/**
 * InventoryManager
 *
 * Single source of truth for the player's inventory on the CLIENT.
 * - Holds items and quest flags in memory
 * - Syncs to the server (MongoDB via /api/save/:playerId) on every change
 * - Emits 'change' events so the HUD can react without polling
 *
 * Usage:
 *   const inv = new InventoryManager('player_abc')
 *   await inv.load()               // hydrate from MongoDB on game start
 *   inv.add('sulfur_sample')
 *   inv.has('sulfur_sample')       // true
 *   inv.setFlag('mira_knows', true)
 *   inv.getFlag('mira_knows')      // true
 */

import { ITEM_MAP } from '../data/items.js'

export class InventoryManager extends EventTarget {
  /**
   * @param {string} playerId  — persistent player ID (stored in localStorage)
   */
  constructor(playerId) {
    super()
    this.playerId = playerId
    this._items   = {}   // { item_id: quantity }
    this._flags   = {}   // { flag_name: any }
    this._dirty   = false
    this._saveTimer = null
  }

  // ── Persistence ────────────────────────────────────────────────────────────

  /** Load save from MongoDB. Call once on game boot. */
  async load(retries = 5, delay = 800) {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(`/api/save/${this.playerId}`)
        if (!res.ok) return
        const data = await res.json()
        if (!data) return
        this._items = data.inventory ?? {}
        this._flags = data.flags     ?? {}
        this._emit()
        return
      } catch (err) {
        console.warn(`[Inventory] Load attempt ${i + 1} failed:`, err.message)
        if (i < retries - 1) await new Promise(r => setTimeout(r, delay))
      }
    }
    console.warn('[Inventory] Could not load save after retries — starting fresh')
  }

  /** Debounced save — fires 1 s after the last change */
  _scheduleSave() {
    clearTimeout(this._saveTimer)
    this._saveTimer = setTimeout(() => this._flush(), 1000)
  }

  async _flush() {
    try {
      await fetch(`/api/save/${this.playerId}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          inventory: this._items,
          flags:     this._flags,
        }),
      })
    } catch (err) {
      console.warn('[Inventory] Save failed:', err.message)
    }
  }

  // ── Items ──────────────────────────────────────────────────────────────────

  /** Add one (or qty) of an item. Emits 'change'. */
  add(itemId, qty = 1) {
    if (!ITEM_MAP[itemId]) {
      console.warn(`[Inventory] Unknown item: ${itemId}`)
      return
    }
    this._items[itemId] = (this._items[itemId] ?? 0) + qty
    this._emit()
    this._scheduleSave()
  }

  /** Remove one (or qty) of an item. Silently clamps at 0. */
  remove(itemId, qty = 1) {
    if (!this._items[itemId]) return
    this._items[itemId] = Math.max(0, this._items[itemId] - qty)
    if (this._items[itemId] === 0) delete this._items[itemId]
    this._emit()
    this._scheduleSave()
  }

  /** Returns true if the player has at least `qty` of the item. */
  has(itemId, qty = 1) {
    return (this._items[itemId] ?? 0) >= qty
  }

  /** Returns true if the player has ALL items in the array. */
  hasAll(itemIds = []) {
    return itemIds.every(id => this.has(id))
  }

  /** Returns quantity (0 if not held). */
  count(itemId) {
    return this._items[itemId] ?? 0
  }

  /** Returns an array of { item, quantity } for all held items. */
  list() {
    return Object.entries(this._items).map(([id, qty]) => ({
      item: ITEM_MAP[id],
      quantity: qty,
    }))
  }

  // ── Quest flags ────────────────────────────────────────────────────────────

  setFlag(key, value) {
    this._flags[key] = value
    this._scheduleSave()
  }

  getFlag(key) {
    return this._flags[key]
  }

  /** Set multiple flags at once from a plain object */
  applyFlags(obj = {}) {
    Object.assign(this._flags, obj)
    this._scheduleSave()
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  _emit() {
    this.dispatchEvent(new CustomEvent('change', {
      detail: { items: this.list(), flags: { ...this._flags } }
    }))
  }

  // ── Player ID helpers ──────────────────────────────────────────────────────

  /** Generate or retrieve a persistent player ID via localStorage */
  static getOrCreatePlayerId() {
    const KEY = 'rpg_player_id'
    let id = localStorage.getItem(KEY)
    if (!id) {
      id = 'p_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
      localStorage.setItem(KEY, id)
    }
    return id
  }
}
