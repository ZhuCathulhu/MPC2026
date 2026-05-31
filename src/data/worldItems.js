/**
 * worldItems.js — Where collectible items are placed in the world
 *
 * Each entry:
 *   uid      — unique string, used as a flag key in MongoDB to track collection
 *   itemId   — must match an id in data/items.js
 *   position — [x, y, z] in world space
 *   oneShot  — if true, the item never respawns after collection (default true)
 *
 * Add entries here whenever you place a new pickup in your map.
 * The ItemManager reads this list on boot and spawns the meshes.
 */
export const WORLD_ITEMS = [
  // Sulfur scraped from the burned mill floor
  {
    uid:      'mill_sulfur_01',
    itemId:   'sulfur_sample',
    position: [8, 0.1, -14],
    oneShot:  true,
  },

  // A coin someone dropped near the inn entrance
  {
    uid:      'coin_inn_01',
    itemId:   'copper_coin',
    position: [1.5, 0.1, -3],
    oneShot:  false,   // respawns (useful for farmable coins in testing)
  },

  // Another coin near the blacksmith
  {
    uid:      'coin_smith_01',
    itemId:   'copper_coin',
    position: [-5, 0.1, -6],
    oneShot:  false,
  },
]
