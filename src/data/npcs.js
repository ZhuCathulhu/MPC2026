/**
 * NPC definitions.
 *
 * This is where YOU write your dialogue.
 * Each NPC has:
 *   - id, name, personality (used as Gemini system prompt when off-script)
 *   - voiceId: your ElevenLabs voice ID for this character
 *   - modelPath: path to the NPC's GLB file in public/assets/ (e.g. '/assets/mira.glb')
 *                Falls back to a placeholder capsule if the file isn't found.
 *   - spawnPosition: [x, y, z] in your world
 *   - color: hex color for the placeholder mesh (used if modelPath is missing/fails)
 *   - script.opening: the very first thing they say + player choice options
 *   - script.responses: map from choice ID → { text, choices }
 *
 * Gemini kicks in automatically when the player types something that
 * doesn't match a choice ID here. It uses `personality` as the system prompt.
 *
 * To add a new NPC, copy one of the objects below and add it to the array.
 

export const NPCS = [
  {
    id:          'innkeeper',
    name:        'Mira',
    personality: `You are Mira, a tired but warm innkeeper in a medieval fantasy village. 
You've run the Silver Hare inn for 20 years. You're pragmatic, slightly sarcastic, 
and deeply loyal to regular customers. You know local gossip. 
You speak in short, direct sentences. Never break character.`,
    voiceId:     'EXAVITQu4vr4xnSDxMaL',  // Replace with your ElevenLabs voice ID
    modelPath:   '/assets/mira.glb',        // Drop your GLB at public/assets/mira.glb
    spawnPosition: [2, -3, -6],
    color:       0x8B6F47,

    script: {
      opening: {
        text: "You look like you've been walking for days. Hungry?",
        choices: [
          { id: 'hungry_yes',   label: 'Starving, actually.' },
          { id: 'hungry_no',    label: "I'm fine. What's going on in town?" },
          { id: 'room',         label: 'I need a room for the night.' },
          { id: '__end__',      label: 'Just passing through.' },
        ]
      },
      responses: {
        hungry_yes: {
          text: "Stew's two copper. Sit down, I'll bring it over.",
          choices: [
            { id: 'pay',     label: 'Here, take it.' },
            { id: 'broke',   label: "I don't have any coin." },
            { id: '__end__', label: 'Actually, I need to go.' },
          ]
        },
        hungry_no: {
          text: "Ha. Town's a mess. Old Rennick's mill burned three nights ago. Nobody knows why.",
          choices: [
            { id: 'mill_more',  label: 'A mill fire? Was anyone hurt?' },
            { id: 'rennick',    label: 'Who is Rennick?' },
            { id: '__end__',    label: 'Interesting. Thanks.' },
          ]
        },
        room: {
          text: "Eight copper a night. Includes breakfast. I don't run a charity.",
          choices: [
            { id: 'take_room',  label: "Deal. I'll take it." },
            { id: 'negotiate',  label: 'Can you do six?' },
            { id: '__end__',    label: 'Too rich for me.' },
          ]
        },
        pay: {
          text: "Good. Don't spill it on my floor.",
          choices: [{ id: '__end__', label: "Wouldn't dream of it." }]
        },
        broke: {
          text: "Then you're eating air. I'm not a charity.",
          choices: [
            { id: 'beg',     label: "Please — I haven't eaten in two days." },
            { id: '__end__', label: 'Fair enough.' },
          ]
        },
        beg: {
          text: "...Fine. One bowl. You owe me.",
          choices: [{ id: '__end__', label: 'Thank you. Truly.' }]
        },
        mill_more: {
          text: "Old Harren lost two fingers trying to drag his grandson out. The boy's fine. Harren's not.",
          choices: [
            { id: 'cause',   label: "What caused it?" },
            { id: '__end__', label: 'That sounds terrible.' },
          ]
        },
        cause: {
          text: "That's the question, isn't it. Some say lightning. I say lightning doesn't smell like sulfur.",
          choices: [
            { id: 'sulfur',  label: 'Sulfur? Like brimstone?' },
            { id: '__end__', label: "I'll look into it." },
          ]
        },
        sulfur: {
          text: "Don't go looking into things you can't unlearn. That's my advice.",
          choices: [{ id: '__end__', label: 'Noted.' }]
        },
        rennick: {
          text: "Richest man in three villages. Owns half the farmland. Not well liked, but the mill keeps people fed.",
          choices: [
            { id: 'rennick_where', label: 'Where does he live?' },
            { id: '__end__',       label: 'I see. Thanks.' },
          ]
        },
        rennick_where: {
          text: "Manor up the north road. Big iron gate. You can't miss it — or the guards.",
          choices: [{ id: '__end__', label: "I'll keep that in mind." }]
        },
        take_room: {
          text: "Room three, top of the stairs. Key's on the hook. Breakfast at dawn.",
          choices: [{ id: '__end__', label: 'Thank you, Mira.' }]
        },
        negotiate: {
          text: "Seven, and that's my final word.",
          choices: [
            { id: 'take_room', label: "Alright. Seven it is." },
            { id: '__end__',   label: "No deal." },
          ]
        },
      }
    }
  },

  // ── Add more NPCs below ───────────────────────────────────────────────────
  {
    id:          'blacksmith',
    name:        'Gareth',
    personality: `You are Gareth, a young eager blacksmith apprentice. 
You're proud of your work but insecure about your skills compared to your master. 
You love talking about metallurgy and weapons. You speak with enthusiasm.
Never break character.`,
    voiceId:     'TxGEqnHWrfWFTfGW9XjX',  // Replace with your ElevenLabs voice ID
    modelPath:   '/assets/gareth.glb',      // Drop your GLB at public/assets/gareth.glb
    spawnPosition: [-6, 0, -8],
    color:       0x4a5a6a,

    script: {
      opening: {
        text: "Need a blade sharpened? I'm — well, the master's away, but I can handle it.",
        choices: [
          { id: 'sharpen',   label: 'My sword could use some work.' },
          { id: 'master',    label: "Where's your master?" },
          { id: '__end__',   label: "Just looking." },
        ]
      },
      responses: {
        sharpen: {
          text: "Let me see it. ...This is fine steel. Where'd you get it?",
          choices: [
            { id: 'found_it', label: 'Found it.' },
            { id: 'bought',   label: 'Bought it years ago.' },
            { id: '__end__',  label: "That's my business." },
          ]
        },
        master: {
          text: "He left two days ago. Said he had business in Thornwall. Hasn't come back.",
          choices: [
            { id: 'worried',  label: "You seem worried." },
            { id: '__end__',  label: 'I see. Good luck.' },
          ]
        },
        worried: {
          text: "He's always back by nightfall. Two days is... not normal for him.",
          choices: [{ id: '__end__', label: "I'll keep an eye out." }]
        },
        found_it: {
          text: "Huh. In a grave, or a fight?",
          choices: [
            { id: 'grave',   label: 'An old ruin, actually.' },
            { id: '__end__', label: "Does it matter?" },
          ]
        },
        grave: {
          text: "Old ruins have good steel sometimes. Pre-war forging. They don't make them like that anymore.",
          choices: [{ id: '__end__', label: 'Interesting.' }]
        },
        bought: {
          text: "Good craft. Whoever made it knew what they were doing.",
          choices: [{ id: '__end__', label: 'Thanks.' }]
        },
      }
    }
  }
]
  */