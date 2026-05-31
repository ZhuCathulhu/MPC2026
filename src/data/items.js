/**
 * items.js — Master item registry
 *
 * Every collectible/giveable item in the game lives here.
 * Fields:
 *   id        — unique string key, used everywhere in code
 *   name      — display name shown in HUD
 *   desc      — one-line flavour text shown on hover / inspect
 *   icon      — emoji fallback (used until you have real sprites)
 *   modelPath — optional GLB in public/assets/items/ for a 3-D pickup mesh
 *   color     — hex for the placeholder spinning gem if no model
 *   stackable — if true, quantity > 1 is allowed (default false)
 */
export const ITEMS = [
  {
    id:        'copper_coin',
    name:      'Copper Coin',
    desc:      'Worn smooth. Worth almost nothing.',
    icon:      '🪙',
    color:     0xb87333,
    stackable: true,
  },
  {
    id:        'mill_key',
    name:      'Mill Key',
    desc:      "A heavy iron key stamped with Rennick's crest.",
    icon:      '🗝️',
    color:     0x888888,
  },
  {
    id:        'sulfur_sample',
    name:      'Sulfur Sample',
    desc:      'Scraped from the burned mill floor. Smells foul.',
    icon:      '🧪',
    color:     0xddcc00,
  },
  {
    id:        'gareth_note',
    name:      "Gareth's Note",
    desc:      'A hasty message — "Master never came back. Be careful."',
    icon:      '📜',
    color:     0xc8a87a,
  },
  {
    id:        'silver_hare_token',
    name:      'Silver Hare Token',
    desc:      "Mira's loyalty token. Good for one free meal.",
    icon:      '🪬',
    color:     0xdddddd,
  },
]

/** Convenience lookup by id */
export const ITEM_MAP = Object.fromEntries(ITEMS.map(i => [i.id, i]))
