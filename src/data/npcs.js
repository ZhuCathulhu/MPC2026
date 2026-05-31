/**
 * npcs.js — NPC definitions
 *
 * Line fields:
 *   text        — displayed text
 *   speaker     — overrides NPC name. Use 'You', 'Narrator', or omit for NPC voice.
 *   next        — key of the next response to auto-advance to (shows "…" button)
 *   choices     — player choice buttons (omit when using `next`)
 *   gives / takesItems / setsFlag / requires / requiresFlag — as before
 */

export const NPCS = [
  {
    id:          'earl',
    name:        'Earl',
    personality: `You are Earl, a tired, pragmatic fixer and mid-level diplomat for the EDK.
You've been stationed in Diécada for twenty years running intelligence out of the town hall.
You are about to fire the player character — a fellow diplomat — for her own safety.
You feel guilty but won't show it. You speak in short, careful sentences.
Never break character.`,
    voiceId:     'EXAVITQu4vr4xnSDxMaL',
    modelPath:   '/assets/base.glb',
    spawnPosition: [1, 0, 1],
    color:       0x8B6F47,

    script: {
      // ── Opening: first line of the cutscene ──────────────────────────────
      opening: {
        speaker: 'You',
        text:    '"That\'s it? After five years?"',
        next:    'earl_02',
      },

      responses: {

        earl_02: {
          speaker: 'Earl',
          text:    '"It\'s the best I can do for you."',
          next:    'narr_01',
        },

        narr_01: {
          speaker: ' ',
          text:    'We\'re standing in Diécada\'s town hall. It\'s a sweltering early August, and the air conditioning blows softly through the room. Goosebumps rise across my back as I stand sweating in my Dolce suit, watching my boss wring his hands.',
          next:    'earl_03',
        },

        earl_03: {
          speaker: 'Earl',
          text:    '"Don\'t look like that. C\'mon — you\'re a smart girl. Plenty of spots in the world for you. I\'d bet all of them are better than this backwater town."',
          next:    'you_01',
        },

        you_01: {
          speaker: 'You',
          text:    '"Oh, right. Like the Kingdom? They just love me back there. I\'ve been flushing their recall papers for the last three months. You\'ve helped me cover it up!"',
          next:    'you_02',
        },

        you_02: {
          speaker: 'You',
          text:    '"What the hell is this? Really, now?"',
          next:    'earl_silence',
        },

        earl_silence: {
          speaker: 'Earl',
          text:    '"..."',
          next:    'narr_02',
        },

        narr_02: {
          speaker: ' ',
          text:    'He looks out the window nervously. There\'s nobody out there — the sun beating down on empty pavement.',
          next:    'earl_04',
        },

        earl_04: {
          speaker: 'Earl',
          text:    '"... Five years is a long time. Diécada isn\'t what she used to be, you know."',
          // Branch point — player speaks
          choices: [
            { id: 'cynical',    label: "Not since the Kingdom's picked her to the bone." },
            { id: 'nostalgic',  label: "It\'s the same town I knew and loved, Earl." },
          ],
        },

        // ── Cynical branch ────────────────────────────────────────────────
        cynical: {
          speaker: 'Earl',
          text:    '"Please. You\'re starting to sound like Jimm. It\'s talk like that… that makes me sure you can\'t stay."',
          next:    'cynical_02',
        },
        cynical_02: {
          speaker: 'Earl',
          text:    '"It\'s too violent here. Too reckless. This place is a powder keg."',
          next:    'earl_farewell',
        },

        // ── Nostalgic branch ──────────────────────────────────────────────
        nostalgic: {
          speaker: ' ',
          text:    'For a moment it seems like he might relent. He shakes his head, then shakes it again, like a flybitten mule.',
          next:    'nostalgic_02',
        },
        nostalgic_02: {
          speaker: 'Earl',
          text:    '"Maybe someday."',
          next:    'earl_farewell',
          /*takesItems: ['copper_coin'],
          // Give a loyalty token after paying twice (flag tracks it)
          choices: [{ id: '__end__', label: "Wouldn't dream of it." }]
        },*/
        },

        // ── Shared closing sequence ────────────────────────────────────────
        earl_farewell: {
          speaker: 'Earl',
          text:    '"Go on. Pack up. Come visit us again — when this is all over."',
          next:    'you_farewell',
        },
        you_farewell: {
          speaker: 'You',
          text:    '"And if the EDK doesn\'t send me to jail first. Right. Thanks for nothing, guv\'ner."',
          next:    'narr_exit',
        },
        narr_exit: {
          speaker: ' ',
          text:    'The world slams me like a tide as I exit the town hall. The smell of salt air, tequila, and the rotting sweetness of a hundred crushed mangoes. A pair of farmers across the street nod at me, blowing clouds of wet white smoke. Diécada\'s harvest has just finished. The air is heavy with endings.',
          next:    'narr_exit2',
        },
        narr_exit2: {
          speaker: ' ',
          text:    'I should get my things from Yolanda\'s down the street.',
          choices: [
            { id: '__end__', label: 'Walk away.' },
          ],
        },
      }
    }
  },

  {
    id: 'adriel',
    name: 'Adriel',
    personality: `Adriel is a local farmer and part-time smuggler. He\'s in his late 30s, with a weathered face and a quick smile. He\'s known for being friendly and talkative, always ready to share a story or lend a hand. He has a deep love for the land and often speaks about the importance of community and tradition. Despite his easygoing nature, Adriel is fiercely protective of his friends and family, and he\'s not afraid to stand up for what he believes in.`,
    voiceId: 'EXAVITQu4vr4xnSDxMaL',
    modelPath: '/assets/base.glb',
    spawnPosition: [-2, 0, -1],
    color: 0x6A994E,

      script: {
        opening: { speaker: 'Adriel', 
          text: "“Hey, Miss Affairs! You don’t look so hot. Bad news?”",
          next: 'adriel_02',
        },

        responses: {
          adriel_02: { speaker: 'You',
            text: "“You could say that.”",
            next: 'adriel_03',
          },

          adriel_03: { speaker: 'Adriel',
            text: " “And here I was thinking we could use your help with something.”",
            next: 'adriel_04',
          },
          
          adriel_04: { speaker: 'Mannie',
            text: "“You sure about this?”",
            choices: [
              { id: 'know', label: 'I already know.' },
              { id: 'trust', label: 'What, you don’t trust me?'},
            ],
          },
          
          know : { speaker: 'Adriel',
            text: "“Ay, sure. Tell me what you know, then, big head.”",
            next: 'adriel_05',
          },
          adriel_05: { speaker: 'You',
            text: "“You guys– as in, the farmers union– aren’t planning to let the ships leave.”",
            next: 'adriel_10',
          },

          trust : { speaker: 'Adriel',
            text: " “Be serious, Manuel! This is Miss Affairs! Last time we got one over the Kingdom was thanks to her.”",
            next: 'adriel_06',
          },
          adriel_06: { speaker: 'Mannie',
            text: " “We wouldn’t need her if they’d actually listen to us. No offense.”",
            next: 'adriel_07',
          },
          adriel_07: { speaker: ' ',
            text: "His eyes are dark.",
            next: 'adriel_08',
          },
          adriel_08: { speaker: 'You',
            text: "“I get it. This is about the 30th.”",
            next: 'adriel_09',
          },
          adriel_09: { speaker: 'You',
            text: "“So you want to protest. I’m no snitch. Do what you want.”",
            next: 'adriel_10',
          },

          adriel_10: { speaker: 'Adriel',
            text: "“That’s almost right.”",
            next: 'adriel_11',
          },
          adriel_11: { speaker: 'Adriel',
            text: "“One way or another, we’re going to get what we deserve.”",
            next: 'adriel_12',
          },
          adriel_12: { speaker: 'You',
            text: "“Meaning?”",
            next: 'adriel_13',
          },
          adriel_13: { speaker: ' ',
            text: "He leans in, the bite of liquor on his breath: \n	Adriel. “Meaning we blow the fat bastards up.”",
            takeItems: ['FoundOut'],
            choices: [
              { id: '__end__', label: 'Walk away.' },
            ],
        },
      }
    }
  }
]