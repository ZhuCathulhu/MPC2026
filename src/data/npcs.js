/**
 * npcs.js — NPC definitions with item-aware dialogue
 *
 * New fields on choices / responses:
 *
 *   requires: ['item_id', ...]
 *     This choice/response is only shown if the player has ALL listed items.
 *
 *   requiresFlag: 'flag_name'
 *     Only shown if player.flags[flag_name] is truthy.
 *
 *   gives: ['item_id', ...]
 *     When this response plays, these items are added to the player's inventory.
 *
 *   takesItems: ['item_id', ...]
 *     When this response plays, these items are REMOVED from inventory.
 *
 *   setsFlag: { flag_name: value }
 *     Sets an arbitrary quest flag when this response plays.
 *     Use strings, booleans, or numbers. Flags persist to MongoDB.
 */

export const NPCS = [
  {
    id:          'innkeeper',
    name:        'Mira',
    personality: `You are Mira, a tired but warm innkeeper in a medieval fantasy village.
You've run the Silver Hare inn for 20 years. You're pragmatic, slightly sarcastic,
and deeply loyal to regular customers. You know local gossip.
You speak in short, direct sentences. Never break character.`,
    voiceId:     'EXAVITQu4vr4xnSDxMaL',
    modelPath:   '/assets/base.glb',
    spawnPosition: [2, 0, -6],
    color:       0x8B6F47,

    script: {
      opening: {
        text: "You look like you've been walking for days. Hungry?",
        choices: [
          { id: 'hungry_yes',        label: 'Starving, actually.' },
          { id: 'hungry_no',         label: "I'm fine. What's going on in town?" },
          { id: 'room',              label: 'I need a room for the night.' },
          // Only shown if player found the sulfur sample
          { id: 'show_sulfur',       label: 'I found something at the mill site.',
            requires: ['sulfur_sample'] },
          { id: '__end__',           label: 'Just passing through.' },
        ]
      },
      responses: {

        hungry_yes: {
          text: "Stew's two copper. Sit down, I'll bring it over.",
          choices: [
            { id: 'pay_stew',   label: 'Here, take it.',          requires: ['copper_coin'] },
            { id: 'broke',      label: "I don't have any coin." },
            { id: '__end__',    label: 'Actually, I need to go.' },
          ]
        },

        pay_stew: {
          text: "Good. Don't spill it on my floor.",
          takesItems: ['copper_coin'],
          // Give a loyalty token after paying twice (flag tracks it)
          choices: [{ id: '__end__', label: "Wouldn't dream of it." }]
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
            { id: 'take_room',  label: "Deal. I'll take it.",  requires: ['copper_coin'] },
            { id: 'negotiate',  label: 'Can you do six?' },
            { id: '__end__',    label: 'Too rich for me.' },
          ]
        },

        take_room: {
          text: "Room three, top of the stairs. Key's on the hook. Breakfast at dawn.",
          takesItems: ['copper_coin'],
          setsFlag:   { has_room: true },
          choices: [{ id: '__end__', label: 'Thank you, Mira.' }]
        },

        negotiate: {
          text: "Seven, and that's my final word.",
          choices: [
            { id: 'take_room', label: "Alright. Seven it is." },
            { id: '__end__',   label: "No deal." },
          ]
        },

        // ── Sulfur branch — only reachable if player has the sample ──────────
        show_sulfur: {
          text: "Where did you find this? ...That's from the mill floor, isn't it. "
               + "I knew it wasn't lightning. You need to talk to Rennick's steward.",
          takesItems: ['sulfur_sample'],
          setsFlag:   { mira_knows_sulfur: true },
          gives:      ['silver_hare_token'],    // rewards trust with a token
          choices: [
            { id: 'who_steward',  label: "Who is the steward?" },
            { id: '__end__',      label: "I will. Thanks." },
          ]
        },

        who_steward: {
          text: "Aldric. Thin man, grey beard. Usually at the manor gates around midday.",
          choices: [{ id: '__end__', label: "I'll find him." }]
        },

        // ── Standard branches ────────────────────────────────────────────────
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
          setsFlag: { mira_mentioned_sulfur: true },
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
          text: "Richest man in three villages. Owns half the farmland. Not well liked.",
          choices: [
            { id: 'rennick_where', label: 'Where does he live?' },
            { id: '__end__',       label: 'I see. Thanks.' },
          ]
        },
        rennick_where: {
          text: "Manor up the north road. Big iron gate. You can't miss it — or the guards.",
          choices: [{ id: '__end__', label: "I'll keep that in mind." }]
        },
      }
    }
  },

  {
    id:          'blacksmith',
    name:        'Gareth',
    personality: `You are Gareth, a young eager blacksmith apprentice.
You're proud of your work but insecure about your skills compared to your master.
You love talking about metallurgy and weapons. You speak with enthusiasm.
Never break character.`,
    voiceId:     'TxGEqnHWrfWFTfGW9XjX',
    modelPath:   '/assets/base.glb',
    spawnPosition: [-6, 0, -8],
    color:       0x4a5a6a,

    script: {
      opening: {
        text: "Need a blade sharpened? I'm — well, the master's away, but I can handle it.",
        choices: [
          { id: 'sharpen',     label: 'My sword could use some work.' },
          { id: 'master',      label: "Where's your master?" },
          // Only shown if Mira told you about the sulfur and you have the sample
          { id: 'ask_sulfur',  label: "Mira thinks the mill fire wasn't an accident.",
            requiresFlag: 'mira_mentioned_sulfur' },
          { id: '__end__',     label: "Just looking." },
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
          gives:    ['gareth_note'],   // slips you a note when he trusts you
          setsFlag: { gareth_worried: true },
          choices: [{ id: '__end__', label: "I'll keep an eye out." }]
        },

        ask_sulfur: {
          text: "Sulfur? I... yes. Master mentioned the same smell the morning before he left. "
               + "He seemed frightened. That's not like him at all.",
          setsFlag: { gareth_linked_master: true },
          choices: [
            { id: 'master_connection', label: "Do you think they're connected?" },
            { id: '__end__',           label: 'Stay safe, Gareth.' },
          ]
        },
        master_connection: {
          text: "I don't know. But if you find anything, please — come back and tell me.",
          gives:    ['mill_key'],    // trusts you with the key to the mill ruins
          setsFlag: { has_mill_key_source: 'gareth' },
          choices: [{ id: '__end__', label: "I will." }]
        },

        found_it:  { text: "Huh. In a grave, or a fight?",
          choices: [{ id: 'grave', label: 'An old ruin, actually.' }, { id: '__end__', label: "Does it matter?" }] },
        grave:     { text: "Old ruins have good steel sometimes. Pre-war forging.",
          choices: [{ id: '__end__', label: 'Interesting.' }] },
        bought:    { text: "Good craft. Whoever made it knew what they were doing.",
          choices: [{ id: '__end__', label: 'Thanks.' }] },
      }
    }
  }
]