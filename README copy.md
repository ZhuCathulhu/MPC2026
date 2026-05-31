# RPG Engine

A browser-based 3D RPG with:
- Three.js + three-mesh-bvh character movement & collision
- WASD keyboard + on-screen nipplejs joystick
- Blender GLB world import
- Hand-written NPC dialogue (your scripts run first)
- Gemini AI fallback for off-script player questions
- ElevenLabs per-character voice synthesis
- MongoDB: voice audio cache + player save state + NPC conversation memory

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env and fill in your API keys

# 3. Run (client + server together)
npm run dev
```

Client runs at `http://localhost:5173`  
Server runs at `http://localhost:3001`

---

## Project structure

```
rpg-engine/
├── index.html               # Entry point
├── src/
│   ├── main.js              # Boot
│   ├── core/
│   │   └── Engine.js        # Three.js scene, world loading, BVH build, game loop
│   ├── systems/
│   │   ├── CharacterController.js  # BVH capsule movement, camera, pointer lock
│   │   ├── InputManager.js         # WASD + nipplejs joystick
│   │   ├── DialogueSystem.js       # Scripted + AI dialogue orchestration
│   │   └── NPCManager.js           # NPC spawn, proximity, interaction
│   ├── ui/
│   │   ├── HUD.js           # Dialogue box DOM overlay
│   │   └── Loading.js       # Loading screen progress
│   └── data/
│       └── npcs.js          # ← YOUR DIALOGUE LIVES HERE
├── server/
│   ├── index.js             # Express server
│   ├── db.js                # MongoDB connection + Mongoose models
│   └── routes/
│       ├── dialogue.js      # Gemini AI NPC responses
│       ├── voice.js         # ElevenLabs TTS + audio cache
│       └── save.js          # Player save/load
└── public/
    └── assets/
        └── world.glb        # ← DROP YOUR BLENDER EXPORT HERE
```

---

## Adding your Blender world

1. In Blender: **File → Export → glTF 2.0**
2. Settings:
   - Format: **glTF Binary (.glb)**  
   - Include: Geometry, Materials, Lights  
   - Transform: **+Y Up** (three.js convention)
3. Save as `public/assets/world.glb`
4. Reload the game — the world loads and BVH collision is built automatically

If no `world.glb` is found, a placeholder world is generated so you can develop immediately.

---

## Writing dialogue (`src/data/npcs.js`)

Each NPC looks like:

```js
{
  id:           'innkeeper',
  name:         'Mira',
  personality:  'You are Mira, a tired innkeeper...',  // Gemini system prompt
  voiceId:      'EXAVITQu4vr4xnSDxMaL',               // ElevenLabs voice ID
  spawnPosition: [2, 0, -6],
  script: {
    opening: {
      text: "You look tired. Hungry?",
      choices: [
        { id: 'hungry_yes', label: 'Starving.' },
        { id: '__end__',    label: 'Just passing through.' },
      ]
    },
    responses: {
      hungry_yes: {
        text: "Stew's two copper.",
        choices: [{ id: '__end__', label: 'Thank you.' }]
      }
    }
  }
}
```

**Scripted dialogue always runs first.** Gemini only activates when the player types something in the free-text input that doesn't match a choice ID.

Always include `{ id: '__end__', label: '...' }` as an exit option in every `choices` array.

---

## API keys

| Service | Where to get it | .env key |
|---------|----------------|---------|
| MongoDB | [mongodb.com](https://mongodb.com) → Atlas free tier | `MONGODB_URI` |
| Gemini  | [aistudio.google.com](https://aistudio.google.com) | `GEMINI_API_KEY` |
| ElevenLabs | [elevenlabs.io](https://elevenlabs.io) → Profile → API key | `ELEVENLABS_API_KEY` |

MongoDB and ElevenLabs are optional — the game runs without them (no persistence, no voice).  
Gemini is optional too — AI responses are silently skipped if the key is missing.

---

## Controls

| Action | Keyboard | Mobile |
|--------|----------|--------|
| Move | WASD / Arrow keys | Left joystick |
| Look | Mouse (click canvas to lock) | Drag canvas |
| Jump | Space | Jump button |
| Talk | E or F | Talk button |

---

## MongoDB — what it stores

Three collections, all optional (graceful fallback if DB is offline):

| Collection | Purpose |
|------------|---------|
| `voicecaches` | ElevenLabs audio keyed by MD5(text+voiceId). Never re-generates the same line. |
| `playersaves` | Player position + quest flags. |
| `npcmemories` | Per-player NPC conversation history. Gemini reads this for cross-session context. |
