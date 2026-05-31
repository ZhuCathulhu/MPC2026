/**
 * npcs.js — NPC definitions
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
    voiceId:     'tBOn8zI02n6aPY9syU4V',
    modelPath:   '/assets/man.glb',
    spawnPosition: [1, 0, 1],
    color:       0x0059ff,

    script: {
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
          choices: [
            { id: 'cynical',   label: "Not since the Kingdom's picked her to the bone." },
            { id: 'nostalgic', label: "It\'s the same town I knew and loved, Earl." },
          ],
        },
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
        nostalgic: {
          speaker: ' ',
          text:    'For a moment it seems like he might relent. He shakes his head, then shakes it again, like a flybitten mule.',
          next:    'nostalgic_02',
        },
        nostalgic_02: {
          speaker: 'Earl',
          text:    '"Maybe someday."',
          next:    'earl_farewell',
        },
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

  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'adriel',
    name: 'Adriel',
    personality: `Adriel is a local farmer and part-time smuggler. He's in his late 30s, with a weathered face and a quick smile. He's known for being friendly and talkative, always ready to share a story or lend a hand. He has a deep love for the land and often speaks about the importance of community and tradition. Despite his easygoing nature, Adriel is fiercely protective of his friends and family, and he's not afraid to stand up for what he believes in.`,
    voiceId: 'bPRk0A2kujWoAd7hWEGs',
    modelPath: '/assets/man.glb',
    spawnPosition: [-15, 0, 6],
    color: 0xff0000,

    script: {
      opening: {
        speaker: 'Adriel',
        text: '"Hey, Miss Affairs! You don\'t look so hot. Bad news?"',
        next: 'adriel_02',
      },

      responses: {
        adriel_02: { speaker: 'You',
          text: '"You could say that."',
          next: 'adriel_03',
        },
        adriel_03: { speaker: 'Adriel',
          text: '"And here I was thinking we could use your help with something."',
          next: 'adriel_04',
        },
        adriel_04: { speaker: 'Mannie',
          //voiceId: 'gNeA4yL2CYeVCa2Bv3Ax',
          text: '"You sure about this?"',
          choices: [
            { id: 'know',  label: 'I already know.' },
            { id: 'trust', label: "What, you don't trust me?" },
          ],
        },
        know: { speaker: 'Adriel',
          text: '"Ay, sure. Tell me what you know, then, big head."',
          next: 'adriel_05',
        },
        adriel_05: { speaker: 'You',
          text: '"You guys– as in, the farmers union– aren\'t planning to let the ships leave."',
          next: 'adriel_10',
        },
        trust: { speaker: 'Adriel',
          text: '"Be serious, Manuel! This is Miss Affairs! Last time we got one over the Kingdom was thanks to her."',
          next: 'adriel_06',
        },
        adriel_06: { speaker: 'Mannie',
          //voiceId: 'gNeA4yL2CYeVCa2Bv3Ax',
          text: '"We wouldn\'t need her if they\'d actually listen to us. No offense."',
          next: 'adriel_07',
        },
        adriel_07: { speaker: ' ',
          text: 'His eyes are dark.',
          next: 'adriel_08',
        },
        adriel_08: { speaker: 'You',
          text: '"I get it. This is about the 30th."',
          next: 'adriel_09',
        },
        adriel_09: { speaker: 'You',
          text: '"So you want to protest. I\'m no snitch. Do what you want."',
          next: 'adriel_10',
        },
        adriel_10: { speaker: 'Adriel',
          text: '"That\'s almost right."',
          setsFlag: { needFuel: true },
          next: 'adriel_11',
        },
        adriel_11: { speaker: 'Adriel',
          text: '"One way or another, we\'re going to get what we deserve."',
          next: 'adriel_12',
        },
        adriel_12: { speaker: 'You',
          text: '"Meaning?"',
          next: 'adriel_13',
        },
        adriel_13: { speaker: ' ',
          text: 'He leans in, the bite of liquor on his breath.',
          next: 'adriel_14',
        },
        adriel_14: { speaker: 'Adriel',
          text: '"Meaning we blow the fat bastards up."',
          setsFlag: { foundOut: true },
          choices: [
            { id: '__end__', label: 'Walk away.' },
          ],
        },
      }
    }
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'yolanda',
    name: 'Yolanda',
    personality: 'Yolanda is essentially the town\'s only landlord.',
    voiceId: 'o7J3eTgJUVXkmJ8TXcFI',
    modelPath: '/assets/base.glb',
    spawnPosition: [4, 1, -3],
    color: 0xf2e8cf,

    script: {
      // ── Checked first — if foundOut is set, skip straight into the plot ──
      openingIf: [
        {
          requiresFlag: 'foundOut',
          opening: {
            speaker: 'Yolanda',
            text: '"Finally! I was worried when you missed lunch. I wanted to check on you, but the work takes forever."',
            next: 'yolanda_02',
          },
        },
      ],

      // ── Default: player hasn't spoken to Adriel yet ───────────────────────
      opening: {
        speaker: 'Yolanda',
        text: '"Finally! I was worried when you missed lunch. I wanted to check on you, but the work takes forever."',
        next: 'yolanda_11',
      },

      // ── All responses in one flat object ─────────────────────────────────
      responses: {

        // ── foundOut branch (yolanda_02–10) ──────────────────────────────
        yolanda_02: { speaker: 'Yolanda',
          text: '"Come in, come in."',
          next: 'yolanda_03',
        },
        yolanda_03: { speaker: 'You',
          text: '"How long have you been in the heat?"',
          next: 'yolanda_04',
        },
        yolanda_04: { speaker: ' ',
          text: 'She ignores me in favour of bustling me to the kitchen chair. Her breath is coming fast as she draws the curtains and turns around.',
          next: 'yolanda_05',
        },
        yolanda_05: { speaker: 'Yolanda',
          text: '"It\'s happening. I don\'t like it, but it was inevitable."',
          next: 'yolanda_06',
        },
        yolanda_06: { speaker: 'You',
          text: '"So you\'re on board with the bombing too?"',
          next: 'yolanda_07',
        },
        yolanda_07: { speaker: 'Yolanda',
          text: '"B-bombing! No, no, it\'s more of a, er, controlled detonation."',
          next: 'yolanda_08',
        },
        yolanda_08: { speaker: 'Yolanda',
          text: '"Did your contacts at the EDK–"',
          next: 'yolanda_09',
        },
        yolanda_09: { speaker: 'You',
          text: '"No. I just heard of the plan today."',
          next: 'yolanda_10',
        },
        yolanda_10: { speaker: 'Yolanda',
          text: '"I know it\'s dangerous, but my friend, please. We need your help. Can you find a reason, any reason for the EDK to send us dynamite?"',
          setsFlag: { needFuel: true },
          next: 'yolanda_fired',
        },
        yolanda_fired: { speaker: 'You',
          text: '"Yolanda — I\'ve been fired."',
          next: 'yolanda_fired_02',
        },
        yolanda_fired_02: { speaker: 'Yolanda',
          text: '"What?"',
          next: 'yolanda_fired_03',
        },
        yolanda_fired_03: { speaker: 'Yolanda',
          text: '"Oh no… oh no… I told them you could help."',
          choices: [
            { id: '__end__', label: 'Walk away.' },
          ],
        },

        // ── Default branch (yolanda_11–14) ────────────────────────────────
        yolanda_11: { speaker: 'Yolanda',
          text: '"Come in, come in."',
          next: 'yolanda_12',
        },
        yolanda_12: { speaker: 'You',
          text: '"How long have you been in the heat?"',
          next: 'yolanda_13',
        },
        yolanda_13: { speaker: ' ',
          text: 'She ignores me in favour of bustling me to the kitchen chair. Her breath is coming fast as she draws the curtains and turns around.',
          next: 'yolanda_14',
        },
        yolanda_14: { speaker: 'Yolanda',
          text: '"The farmers are planning an attack on the 30th. They\'re going to smuggle explosives in with the fruit crates. The problem is we can barely afford water. Adriel\'s been shaking down the town, putting together these awful concoctions… it can\'t continue."',
          next: 'yolanda_10',
        },
      },
    },
  },
]