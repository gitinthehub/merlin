/* MERLIN — game content. Assigns window.MERLIN. No DOM. */
(function () {
  "use strict";

  var characters = {
    bram: {
      id: "bram",
      name: "Bram Hollow",
      role: "Gravedigger",
      voice: "Short, literal, treats monsters as a workplace hazard.",
      might: 3,
      wits: 1,
      spirit: 0,
      maxHp: 16,
      gold: 12,
      special: "Occupational Hazard",
      glyph: "🪦"
    },
    vellum: {
      id: "vellum",
      name: "Sister Vellum",
      role: "Defrocked nun",
      voice: "Liturgical cadence, mercenary content.",
      might: 0,
      wits: 2,
      spirit: 3,
      maxHp: 11,
      gold: 12,
      special: "Unkind Blessing",
      glyph: "🕯️"
    },
    pip: {
      id: "pip",
      name: "Pip Ledger",
      role: "Failed accountant",
      voice: "Apologetic precision. Invoices the monster.",
      might: 0,
      wits: 3,
      spirit: 1,
      maxHp: 12,
      gold: 15,
      special: "Revised Estimate",
      glyph: "📒"
    }
  };

  var items = {
    tonic: {
      id: "tonic",
      name: "Tallow Tonic",
      price: 5,
      kind: "heal",
      heal: 8,
      blurb: "Warm grease in a bottle. Heals 8 HP."
    },
    cudgel: {
      id: "cudgel",
      name: "Cudgel of Complaints",
      price: 12,
      kind: "weapon",
      bonus: 3,
      blurb: "A club that remembers every slight. +3 Might damage."
    },
    jack: {
      id: "jack",
      name: "Quilted Jack",
      price: 9,
      kind: "armor",
      maxHp: 6,
      reduction: 1,
      blurb: "+6 max HP while worn, −1 incoming damage."
    },
    nails: {
      id: "nails",
      name: "Bag of Nails",
      price: 4,
      kind: "thrown",
      damage: 5,
      blurb: "Combat only. Deal 5 damage, no roll."
    },
    draught: {
      id: "draught",
      name: "Black Draught",
      price: 8,
      kind: "heal",
      heal: 12,
      vellumHeal: 16,
      blurb: "Heals 12 HP. Sister Vellum gets 16."
    },
    opener: {
      id: "opener",
      name: "Silver Letter-Opener",
      price: 15,
      kind: "weapon",
      bonus: 2,
      vampireBonus: 4,
      blurb: "+2 damage, +6 vs Count Merlin."
    },
    coin: {
      id: "coin",
      name: "Twice-Lucky Coin",
      price: 16,
      kind: "charm",
      blurb: "Once per scene: roll the next d20 with advantage."
    },
    pardon: {
      id: "pardon",
      name: "Forged Indulgence",
      price: 10,
      kind: "indulgence",
      blurb: "Next Spirit check succeeds without rolling. Consumed."
    }
  };

  var shops = {
    hearth: {
      id: "hearth",
      keeper: "Marta Cobb",
      leave: "inn",
      stock: ["tonic", "cudgel", "jack", "nails"]
    },
    pox: {
      id: "pox",
      keeper: "Cousin Pox",
      leave: "marsh",
      stock: ["draught", "opener", "coin", "pardon"]
    }
  };

  var encounters = {
    ghoul: {
      name: "Churchyard Ghoul",
      hp: 12,
      ac: 10,
      spiritDc: 12,
      fleeDc: 11,
      xp: 18,
      gold: 6,
      moves: [
        { id: "slam", telegraph: "It winds up the wreath like a mace.", damage: 4 },
        { id: "claw", telegraph: "Grave-dirt nails flex.", damage: 3 }
      ]
    },
    wight: {
      name: "Toll-Wight",
      hp: 18,
      ac: 13,
      spiritDc: 14,
      fleeDc: 13,
      xp: 16,
      gold: 10,
      moves: [
        { id: "bell", telegraph: "The submerged bell rings once.", damage: 5 },
        { id: "drown", telegraph: "Cold hands reach for your purse.", damage: 4, goldSteal: 2 }
      ]
    },
    count: {
      name: "Count Merlin",
      hp: 26,
      ac: 14,
      spiritDc: 15,
      fleeDc: 16,
      xp: 0,
      gold: 0,
      moves: [
        { id: "backhand", telegraph: "He adjusts his cuff, then his aim.", damage: 5 },
        { id: "lecture", telegraph: '"I am not a wizard" gathers like a storm.', damage: 4 },
        { id: "drain", telegraph: "His shadow lengthens toward your throat.", damage: 6, heal: 3 },
        {
          id: "mesmer",
          telegraph: "His eyes ask you to be still.",
          save: { stat: "spirit", dc: 14 },
          fail: "skipTurn"
        }
      ]
    }
  };

  var nodes = {
    select: {
      id: "select",
      title: "Choose Your Burden",
      type: "select",
      lines: [
        {
          speaker: null,
          text: "Three travelers arrive at dusk. Pick a body. The night will not wait."
        }
      ],
      options: []
    },

    arrival: {
      id: "arrival",
      title: "Hallowmere Gate",
      type: "scene",
      lines: [
        {
          speaker: null,
          text: "The cart wheel snaps at dusk. The sign reads: Hallowmere. Birthplace of No Wizards."
        },
        {
          speaker: "Mags",
          text: "You're the moon's guest. Try not to be interesting. He collects interesting."
        }
      ],
      options: [
        {
          label: "Ask who 'he' is",
          check: null,
          success: {
            lines: [
              {
                speaker: "Mags",
                text: "Count Merlin. Vampire. Not a wizard. If you say the other name, he fines the air."
              }
            ],
            effects: [{ op: "flag", key: "heardName", value: true }],
            next: "inn"
          }
        },
        {
          label: "Tell me something I can use",
          check: { stat: "wits", dc: 12 },
          success: {
            lines: [
              {
                speaker: "Mags",
                text: "The doorman is a bat named Clarence. Correct the Count at the door — he is not a wizard — and Clarence lets you through like a receipt."
              }
            ],
            effects: [
              { op: "flag", key: "knowsPassword", value: true },
              { op: "xp", amount: 8 }
            ],
            next: "inn"
          },
          failure: {
            lines: [
              {
                speaker: "Mags",
                text: "Listening tax. Two gold. I told you something: don't look interesting."
              }
            ],
            effects: [{ op: "gold", amount: -2 }],
            next: "inn"
          },
          critSuccess: {
            effects: [{ op: "flag", key: "knowsPox", value: true }],
            lines: [
              {
                speaker: "Mags",
                text: "And if you see Marta's cousin in the marsh, don't call him honest. He'll overcharge out of spite."
              }
            ]
          },
          critFail: {
            effects: [{ op: "damage", amount: 2 }],
            lines: [
              {
                speaker: null,
                text: "The signboard swings. You learn the hard way that 'No Wizards' has corners."
              }
            ]
          }
        },
        {
          label: "The churchyard looks quieter",
          check: null,
          success: {
            lines: [
              {
                speaker: "Mags",
                text: "Quieter isn't safer. But I won't stop a tourist with a death wish."
              }
            ],
            effects: [],
            next: "churchyard"
          }
        },
        {
          label: "He's a wizard, then",
          hideIf: { flag: "jabArrival" },
          check: null,
          success: {
            lines: [
              {
                speaker: "Mags",
                text: "Say that nearer the castle. He fines the air, and then the speaker."
              }
            ],
            effects: [
              { op: "flag", key: "jabArrival", value: true },
              { op: "wizardJab", mood: "fluster" }
            ],
            next: "inn"
          }
        }
      ]
    },

    inn: {
      id: "inn",
      title: "The Gutted Goose",
      type: "scene",
      lines: [
        {
          speaker: null,
          text: "The Gutted Goose smells of beet soup and damp wool. Hob beams like a man who has never heard of vampires."
        },
        {
          speaker: "Hob",
          text: "Soup is complimentary. The soup is mostly beet. Mind the aftertaste."
        }
      ],
      options: [
        {
          label: "Take a room (3 gold)",
          showIf: { all: [{ notFlag: "rested" }] },
          check: null,
          requireGold: 3,
          success: {
            lines: [
              {
                speaker: "Hob",
                text: "Key's under the mat. The mat is theoretical. Sleep anyway."
              }
            ],
            effects: [
              { op: "gold", amount: -3 },
              { op: "heal", amount: 5 },
              { op: "flag", key: "rested", value: true }
            ],
            next: "inn"
          }
        },
        {
          label: "Sleep in the stable (free)",
          showIf: { all: [{ notFlag: "stableSmell" }] },
          check: null,
          success: {
            lines: [
              {
                speaker: null,
                text: "You wake smelling of hay and opinion. The horses do not respect you."
              }
            ],
            effects: [
              { op: "heal", amount: 2 },
              { op: "flag", key: "stableSmell", value: true }
            ],
            next: "inn"
          }
        },
        {
          label: "Who's hiring panic?",
          check: null,
          success: {
            lines: [
              {
                speaker: "Hob",
                text: "Mayor Lane. He's in the square, rehearsing his panic. Don't clap."
              }
            ],
            effects: [],
            next: "mayor"
          }
        },
        {
          label: "I need supplies",
          check: null,
          success: {
            lines: [
              {
                speaker: "Hob",
                text: "Marta's shop. She'll sell you courage in bottle form. Results vary."
              }
            ],
            effects: [],
            next: "hearth"
          }
        },
        {
          label: "I'll walk the churchyard",
          showIf: {
            all: [
              { notFlag: "ghoulDead" },
              { notFlag: "ghoulPeace" },
              { notFlag: "ghoulLoose" }
            ]
          },
          check: null,
          success: {
            lines: [
              {
                speaker: "Hob",
                text: "Bring back the wreath if you can. Or don't. I'm flexible."
              }
            ],
            effects: [],
            next: "churchyard"
          }
        }
      ]
    },

    hearth: {
      id: "hearth",
      title: "Hearth & Nail",
      type: "shop",
      shopId: "hearth",
      leave: "inn",
      lines: [
        {
          speaker: "Marta Cobb",
          text: "Welcome to Hearth & Nail. Touch nothing sticky. Buy something useful. Leave before you become interesting."
        }
      ]
    },

    mayor: {
      id: "mayor",
      title: "The Square",
      type: "scene",
      lines: [
        {
          speaker: null,
          text: "Mayor Cuthbert Lane stands on a crate that used to hold beets. His campaign wreath is missing. So is his composure."
        },
        {
          speaker: "Cuthbert",
          text: "A ghoul is wearing my wreath. I am polling at three percent. Handle it and I will handle coin."
        }
      ],
      variants: [
        {
          if: { flag: "mayorPaid" },
          lines: [
            {
              speaker: null,
              text: "Mayor Cuthbert Lane stands on his crate like a man who has already spent the credit."
            },
            {
              speaker: "Cuthbert",
              text: "The wreath is handled. My polling is not. Do try not to die somewhere photogenic."
            }
          ],
          options: [
            {
              label: "Return to the inn",
              check: null,
              success: { lines: [], effects: [], next: "inn" }
            },
            {
              label: "Take the marsh road",
              check: null,
              success: {
                lines: [
                  {
                    speaker: "Cuthbert",
                    text: "Go. Polling starts again at dawn, unfortunately."
                  }
                ],
                effects: [],
                next: "marsh"
              }
            }
          ]
        },
        {
          if: {
            all: [
              { flag: "questGhoul" },
              { notFlag: "mayorPaid" },
              { anyFlag: ["ghoulDead", "ghoulPeace"] }
            ]
          },
          lines: [
            {
              speaker: "Cuthbert",
              text: "The wreath is back. My numbers are not. Still — payment, as discussed, before I invent a different discussion."
            }
          ],
          options: [
            {
              label: "Collect your pay",
              check: null,
              success: {
                lines: [
                  {
                    speaker: "Cuthbert",
                    text: "Take it. And if anyone asks, I solved this myself. From a distance. With leadership."
                  }
                ],
                effects: [
                  { op: "flag", key: "mayorPaid", value: true },
                  { op: "mayorPay" }
                ],
                next: "inn"
              }
            },
            {
              label: "Take the marsh road instead",
              check: null,
              success: {
                lines: [
                  {
                    speaker: "Cuthbert",
                    text: "Take it. Go. The marsh will not invoice me for you."
                  }
                ],
                effects: [
                  { op: "flag", key: "mayorPaid", value: true },
                  { op: "mayorPay" }
                ],
                next: "marsh"
              }
            }
          ]
        }
      ],
      options: [
        {
          label: "I'll handle it",
          showIf: {
            all: [
              { notFlag: "questGhoul" },
              { notFlag: "ghoulDead" },
              { notFlag: "ghoulPeace" },
              { notFlag: "ghoulLoose" }
            ]
          },
          check: null,
          success: {
            lines: [
              {
                speaker: "Cuthbert",
                text: "Excellent. I will prepare a speech thanking myself for hiring you."
              }
            ],
            effects: [{ op: "flag", key: "questGhoul", value: true }],
            next: "churchyard"
          }
        },
        {
          label: "Pay me first",
          showIf: {
            all: [
              { notFlag: "questGhoul" },
              { notFlag: "ghoulDead" },
              { notFlag: "ghoulPeace" },
              { notFlag: "ghoulLoose" }
            ]
          },
          check: { stat: "wits", dc: 13 },
          success: {
            lines: [
              {
                speaker: "Cuthbert",
                text: "Six gold. Up front. If you die, I will consider it a campaign donation."
              }
            ],
            effects: [
              { op: "flag", key: "questGhoul", value: true },
              { op: "flag", key: "paidUpfront", value: true },
              { op: "gold", amount: 6 }
            ],
            next: "churchyard"
          },
          failure: {
            lines: [
              {
                speaker: "Cuthbert",
                text: "After. And don't look at me like that. I invented after."
              }
            ],
            effects: [
              { op: "flag", key: "questGhoul", value: true },
              { op: "flag", key: "mayorSore", value: true }
            ],
            next: "churchyard"
          },
          critFail: {
            effects: [{ op: "damage", amount: 2 }],
            lines: [
              {
                speaker: null,
                text: "He gestures with the crate. The crate wins."
              }
            ]
          }
        },
        {
          label: "Not my wreath",
          showIf: { all: [{ notFlag: "questGhoul" }] },
          check: null,
          success: {
            lines: [
              {
                speaker: "Cuthbert",
                text: "Cowards shop at Marta's. Tell her I sent you. She will charge you extra."
              }
            ],
            effects: [],
            next: "hearth"
          }
        },
        {
          label: "Return to the inn",
          showIf: { all: [{ flag: "questGhoul" }] },
          check: null,
          success: {
            lines: [],
            effects: [],
            next: "inn"
          }
        },
        {
          label: "Take the marsh road",
          showIf: {
            all: [{ anyFlag: ["ghoulDead", "ghoulPeace", "ghoulLoose"] }]
          },
          check: null,
          success: {
            lines: [
              {
                speaker: "Cuthbert",
                text: "Go. Polling starts again at dawn, unfortunately."
              }
            ],
            effects: [],
            next: "marsh"
          }
        }
      ]
    },

    churchyard: {
      id: "churchyard",
      title: "The Churchyard",
      type: "scene",
      lines: [
        {
          speaker: null,
          text: "The churchyard gate is tied shut with a ribbon that once meant celebration. The ghoul wears the mayor's wreath as a hat."
        },
        {
          speaker: "Ghoul",
          text: "I am between appointments."
        }
      ],
      options: [
        {
          label: "Fight",
          check: null,
          success: {
            lines: [{ speaker: "Ghoul", text: "Then we are both employed." }],
            effects: [],
            next: "fight_ghoul"
          }
        },
        {
          label: "That plot is two feet short",
          check: { stat: "spirit", dc: 14 },
          dcAdjust: [{ if: { character: "bram" }, delta: -5 }],
          success: {
            lines: [
              {
                speaker: "Ghoul",
                text: "…It is. Thank you. I hate when the living notice before I do."
              },
              {
                speaker: null,
                text: "It sets the wreath down carefully, like a resignation letter, and walks into the fog."
              }
            ],
            effects: [
              { op: "flag", key: "ghoulPeace", value: true },
              { op: "xp", amount: 20 },
              { op: "gold", amount: 4 }
            ],
            next: "after_ghoul"
          },
          failure: {
            lines: [
              {
                speaker: "Ghoul",
                text: "The plot is fine. Your manners are not."
              }
            ],
            effects: [
              { op: "damage", amount: 3 },
              { op: "combat", encounter: "ghoul", surprised: true }
            ],
            next: "fight_ghoul"
          },
          critSuccess: {
            effects: [{ op: "flag", key: "cryptTip", value: true }],
            lines: [
              {
                speaker: "Ghoul",
                text: "There's a soft place in the castle wall, if you must. I used to dig. Now I… undig."
              }
            ]
          },
          critFail: {
            effects: [
              { op: "damage", amount: 2 },
              { op: "gold", amount: -2 }
            ],
            lines: [
              {
                speaker: null,
                text: "It takes your coin as a consultation fee, then your balance."
              }
            ]
          }
        },
        {
          label: "Sneak the long way past",
          check: { stat: "wits", dc: 15 },
          success: {
            lines: [
              {
                speaker: null,
                text: "You leave the wreath, the ghoul, and your dignity behind a headstone. The marsh road waits."
              }
            ],
            effects: [
              { op: "flag", key: "ghoulLoose", value: true },
              { op: "xp", amount: 8 }
            ],
            next: "marsh"
          },
          failure: {
            lines: [
              {
                speaker: "Ghoul",
                text: "The long way is still my appointment."
              }
            ],
            effects: [{ op: "combat", encounter: "ghoul", surprised: true }],
            next: "fight_ghoul"
          },
          critFail: {
            effects: [{ op: "damage", amount: 4 }],
            lines: [
              {
                speaker: null,
                text: "You trip on a root that has waited years for this."
              }
            ]
          }
        }
      ]
    },

    fight_ghoul: {
      id: "fight_ghoul",
      title: "Churchyard Fight",
      type: "combat",
      encounter: "ghoul",
      onWin: "after_ghoul",
      onFlee: "inn",
      winFlag: "ghoulDead",
      fleeFlag: "ghoulLoose",
      deathCause: "ghoul",
      lines: [
        {
          speaker: null,
          text: "The wreath tilts. The ghoul decides you are the appointment."
        }
      ]
    },

    after_ghoul: {
      id: "after_ghoul",
      title: "After the Churchyard",
      type: "scene",
      lines: [
        {
          speaker: null,
          text: "The wreath is a wreath again. The fog smells faintly of victory and damp wool."
        }
      ],
      variants: [
        {
          if: { flag: "ghoulPeace" },
          lines: [
            {
              speaker: null,
              text: "The wreath sits on a headstone like a polite resignation. Somewhere, a mayor is still polling at three percent."
            }
          ]
        },
        {
          if: { flag: "ghoulDead" },
          lines: [
            {
              speaker: null,
              text: "The wreath is a wreath again. The churchyard is quieter in the wrong way."
            }
          ]
        }
      ],
      options: [
        {
          label: "Search the loose earth",
          showIf: { all: [{ notFlag: "searchedGrave" }] },
          check: { stat: "wits", dc: 11 },
          success: {
            lines: [
              {
                speaker: null,
                text: "Four gold and a note: 'Pox sells luck that isn't.' You pocket both."
              }
            ],
            effects: [
              { op: "flag", key: "searchedGrave", value: true },
              { op: "flag", key: "knowsPox", value: true },
              { op: "gold", amount: 4 }
            ],
            next: "after_ghoul"
          },
          failure: {
            lines: [
              {
                speaker: null,
                text: "A splinter. Dignity. Nothing else."
              }
            ],
            effects: [{ op: "flag", key: "searchedGrave", value: true }],
            next: "after_ghoul"
          },
          critFail: {
            effects: [{ op: "damage", amount: 2 }],
            lines: [
              {
                speaker: null,
                text: "The earth bites back. You learn why diggers wear gloves."
              }
            ]
          }
        },
        {
          label: "Tell the mayor",
          showIf: {
            all: [
              { flag: "questGhoul" },
              { notFlag: "ghoulLoose" },
              { notFlag: "mayorPaid" }
            ]
          },
          check: null,
          success: {
            lines: [],
            effects: [],
            next: "mayor"
          }
        },
        {
          label: "Take the marsh road",
          check: null,
          success: {
            lines: [
              {
                speaker: null,
                text: "The path sinks. Somewhere ahead, a bell argues with water."
              }
            ],
            effects: [],
            next: "marsh"
          }
        },
        {
          label: "Return to the inn",
          check: null,
          success: {
            lines: [],
            effects: [],
            next: "inn"
          }
        }
      ]
    },

    marsh: {
      id: "marsh",
      title: "The Marsh Road",
      type: "scene",
      lines: [
        {
          speaker: null,
          text: "A bell hangs under the water. The reeds lean in like creditors."
        },
        {
          speaker: "Toll-Wight",
          text: "Toll is eight. I do not make change."
        }
      ],
      variants: [
        {
          if: { flag: "wightDead" },
          lines: [
            {
              speaker: null,
              text: "The marsh is quieter. The bell does not ring. A cart lantern flickers among the reeds."
            }
          ],
          options: [
            {
              label: "Onward to the castle gate",
              check: null,
              success: { lines: [], effects: [], next: "gate" }
            },
            {
              label: "Those merchant-lights",
              check: null,
              success: { lines: [], effects: [], next: "pox" }
            }
          ]
        },
        {
          if: { flag: "wightAngry" },
          lines: [
            {
              speaker: null,
              text: "The water is colder. The bell rings without permission."
            },
            {
              speaker: "Toll-Wight",
              text: "Toll is twelve now. Fleeing is a surcharge."
            }
          ]
        }
      ],
      options: [
        {
          label: "Pay the toll",
          check: null,
          requireToll: true,
          success: {
            lines: [
              {
                speaker: "Toll-Wight",
                text: "Receipts float. You may proceed. Do not splash."
              }
            ],
            effects: [
              { op: "payToll" },
              { op: "flag", key: "wightPaid", value: true }
            ],
            next: "gate"
          }
        },
        {
          label: "I don't see anyone",
          check: { stat: "wits", dc: 13 },
          dcAdjust: [{ if: { flag: "wightAngry" }, delta: 2 }],
          success: {
            lines: [
              {
                speaker: null,
                text: "You walk on water you pretend not to hear. The bell sulks."
              }
            ],
            effects: [
              { op: "flag", key: "wightSnuck", value: true },
              { op: "xp", amount: 8 }
            ],
            next: "gate"
          },
          failure: {
            lines: [
              {
                speaker: "Toll-Wight",
                text: "Seeing is optional. Paying is not. Fighting is the third option."
              }
            ],
            effects: [
              { op: "damage", amount: 2 },
              { op: "combat", encounter: "wight" }
            ],
            next: "fight_wight"
          },
          critFail: {
            effects: [
              { op: "damage", amount: 2 },
              { op: "gold", amount: -3 }
            ],
            lines: [
              {
                speaker: null,
                text: "A hand finds your purse before it finds your throat."
              }
            ]
          }
        },
        {
          label: "Come up and say that",
          check: null,
          success: {
            lines: [
              { speaker: "Toll-Wight", text: "I accepted." }
            ],
            effects: [],
            next: "fight_wight"
          }
        },
        {
          label: "Those merchant-lights",
          showIf: { all: [{ flag: "knowsPox" }] },
          check: null,
          success: {
            lines: [
              {
                speaker: null,
                text: "A cart hunches among the reeds like a guilty secret."
              }
            ],
            effects: [],
            next: "pox"
          }
        }
      ]
    },

    pox: {
      id: "pox",
      title: "Cousin Pox's Cart",
      type: "shop",
      shopId: "pox",
      leave: "marsh",
      lines: [
        {
          speaker: "Cousin Pox",
          text: "Marta's cousin. Don't tell her I said that. Luck for sale. Honesty is extra and I don't stock it."
        }
      ],
      onEnter: [{ op: "vellumPox" }]
    },

    fight_wight: {
      id: "fight_wight",
      title: "Marsh Fight",
      type: "combat",
      encounter: "wight",
      onWin: "after_wight",
      onFlee: "marsh",
      winFlag: "wightDead",
      fleeFlag: "wightAngry",
      deathCause: "wight",
      lines: [
        {
          speaker: null,
          text: "The water rises to your ankles. The toll has teeth."
        }
      ]
    },

    after_wight: {
      id: "after_wight",
      title: "After the Toll",
      type: "scene",
      onEnter: [{ op: "flag", key: "knowsBoard", value: true }],
      lines: [
        {
          speaker: null,
          text: "A wet locket. Inside, a complaint written in neat copperplate: the tourism board still prints his name on tea towels."
        },
        {
          speaker: null,
          text: "Also: Clarence at the gate accepts one correction. Say the Count is not a wizard. Do not improvise."
        }
      ],
      options: [
        {
          label: "Continue to the castle gate",
          check: null,
          success: { lines: [], effects: [], next: "gate" }
        },
        {
          label: "Visit the merchant cart",
          check: null,
          success: { lines: [], effects: [], next: "pox" }
        }
      ]
    },

    gate: {
      id: "gate",
      title: "Castle Gate",
      type: "scene",
      lines: [
        {
          speaker: null,
          text: "A bat in a waistcoat hangs from the knocker like a punctuation mark."
        },
        {
          speaker: "Clarence",
          text: "State your correction."
        }
      ],
      options: [
        {
          label: "He is not a wizard",
          showIf: { all: [{ anyFlag: ["knowsPassword", "knowsBoard"] }] },
          check: null,
          success: {
            lines: [
              {
                speaker: "Clarence",
                text: "Accepted. Wipe your boots. The carpet has opinions."
              }
            ],
            effects: [
              { op: "flag", key: "politeEntry", value: true },
              { op: "xp", amount: 8 }
            ],
            next: "foyer"
          }
        },
        {
          label: "Invent a correction",
          check: { stat: "wits", dc: 14 },
          success: {
            lines: [
              {
                speaker: "Clarence",
                text: "…Creative. Accepted under protest. I am logging this."
              }
            ],
            effects: [
              { op: "flag", key: "politeEntry", value: true },
              { op: "xp", amount: 8 }
            ],
            next: "foyer"
          },
          failure: {
            lines: [
              {
                speaker: "Clarence",
                text: "Educational bats. You'll live. Probably. Enter."
              }
            ],
            effects: [
              { op: "damage", amount: 3 },
              { op: "flag", key: "rudeEntry", value: true }
            ],
            next: "foyer"
          },
          critFail: {
            effects: [
              { op: "damage", amount: 2 },
              { op: "gold", amount: -2 }
            ],
            lines: [
              {
                speaker: null,
                text: "A bat takes tuition. Another takes coin."
              }
            ]
          }
        },
        {
          label: "Tunnel the wall",
          check: { stat: "might", dc: 16 },
          deathCause: "fall",
          dcAdjust: [
            { if: { character: "bram" }, delta: -4 },
            { if: { flag: "cryptTip" }, delta: -2 }
          ],
          success: {
            lines: [
              {
                speaker: null,
                text: "Stone yields. Dust congratulates you. Oswald will notice the footprint, and soften."
              }
            ],
            effects: [
              { op: "flag", key: "viaRampart", value: true },
              { op: "flag", key: "oswaldSoft", value: true },
              { op: "xp", amount: 8 }
            ],
            next: "foyer"
          },
          failure: {
            lines: [
              {
                speaker: "Clarence",
                text: "Gravity is a tutor. Enter the long way. I have paperwork either way."
              }
            ],
            effects: [
              { op: "damage", amount: 5 },
              { op: "flag", key: "rudeEntry", value: true }
            ],
            next: "foyer"
          },
          critFail: {
            effects: [
              { op: "damage", amount: 6 },
              { op: "flag", key: "rudeEntry", value: true }
            ],
            lines: [
              {
                speaker: null,
                text: "The wall declines. So does the ground. Clarence writes 'declined' in the guest book."
              }
            ]
          }
        },
        {
          label: "He is Merlin the wizard",
          hideIf: { flag: "jabGate" },
          check: null,
          success: {
            lines: [
              {
                speaker: "Clarence",
                text: "Logged. He will hate the spelling, and the noun. Enter."
              }
            ],
            effects: [
              { op: "flag", key: "jabGate", value: true },
              { op: "wizardJab", mood: "fury" }
            ],
            next: "foyer"
          }
        }
      ]
    },

    foyer: {
      id: "foyer",
      title: "The Foyer",
      type: "scene",
      onEnter: [{ op: "vellumOswald" }],
      lines: [
        {
          speaker: null,
          text: "Every portrait is captioned NOT A WIZARD in worse handwriting than the last. Oswald the butler waits with a silver tray and a long career."
        },
        {
          speaker: "Oswald",
          text: "If you say the other name, I ring a small bell. I hate the bell."
        }
      ],
      variants: [
        {
          if: { flag: "oswaldSoft" },
          lines: [
            {
              speaker: null,
              text: "Every portrait is captioned NOT A WIZARD. Oswald's tray is polished. His patience is not."
            },
            {
              speaker: "Oswald",
              text: "If you say the other name, I ring a small bell. I hate the bell. The latch-clause is in the ledger. I am… permitted to look at the door."
            }
          ]
        }
      ],
      options: [
        {
          label: "What does he want?",
          showIf: { all: [{ notFlag: "knowsMotive" }] },
          check: null,
          success: {
            lines: [
              {
                speaker: "Oswald",
                text: "The tourism board sold this castle as the wizard's. The curse holds until the sign's lie is struck out in his presence, he is ended, or someone joins the board. I recommend none of those. I am a professional."
              }
            ],
            effects: [{ op: "flag", key: "knowsMotive", value: true }],
            next: "foyer"
          }
        },
        {
          label: "Steal the silver candlestick",
          showIf: {
            all: [{ notFlag: "stoleSilver" }, { notFlag: "stealFailed" }]
          },
          check: { stat: "wits", dc: 13 },
          success: {
            lines: [
              {
                speaker: null,
                text: "Seven gold of silver. Oswald does not turn. He invents a cough that sounds like a lawsuit."
              }
            ],
            effects: [
              { op: "flag", key: "stoleSilver", value: true },
              { op: "gold", amount: 7 },
              { op: "xp", amount: 6 }
            ],
            next: "foyer"
          },
          failure: {
            lines: [
              {
                speaker: "Oswald",
                text: "Take it. He will notice. He always notices silver."
              }
            ],
            effects: [
              { op: "damage", amount: 4 },
              { op: "flag", key: "stoleSilver", value: true }
            ],
            next: "foyer"
          },
          critFail: {
            effects: [
              { op: "damage", amount: 2 },
              { op: "flag", key: "stealFailed", value: true }
            ],
            lines: [
              {
                speaker: null,
                text: "The candlestick stays. Your dignity does not. Four points of pride leave with the bruise."
              }
            ]
          }
        },
        {
          label: "The ledger, if you please",
          showIf: { all: [{ character: "pip" }] },
          check: null,
          success: {
            lines: [
              {
                speaker: "Oswald",
                text: "An accountant. How novel. Try not to invent late fees."
              }
            ],
            effects: [],
            next: "ledger"
          }
        },
        {
          label: "I'm going in",
          check: null,
          success: {
            lines: [
              {
                speaker: "Oswald",
                text: "He is practicing. Do not applaud."
              }
            ],
            effects: [],
            next: "throne"
          }
        }
      ]
    },

    ledger: {
      id: "ledger",
      title: "The Ledger",
      type: "scene",
      lines: [
        {
          speaker: null,
          text: "Four hundred units of souvenir garlic. Seventeen unpaid invoices for 'atmospheric mist.' One clause, written small, like a secret that bills hourly."
        }
      ],
      options: [
        {
          label: "Read for the latch-clause",
          check: { stat: "wits", dc: 12 },
          success: {
            lines: [
              {
                speaker: null,
                text: "Strike the lie aloud, in his presence, while not on the board. Oswald has kept the sign in his coat all evening. Of course he has."
              }
            ],
            effects: [
              { op: "flag", key: "knowsClause", value: true },
              { op: "xp", amount: 12 }
            ],
            next: "throne"
          },
          failure: {
            lines: [
              {
                speaker: null,
                text: "Ink spills. The garlic column becomes a landscape. You invent a fee you already owe."
              }
            ],
            effects: [{ op: "flag", key: "inkSpill", value: true }],
            next: "throne"
          },
          critSuccess: {
            effects: [{ op: "flag", key: "countWeakness", value: true }],
            lines: [
              {
                speaker: null,
                text: "A margin note in Oswald's hand: he weakens when corrected properly. You file that under assets."
              }
            ]
          },
          critFail: {
            effects: [
              { op: "damage", amount: 2 },
              { op: "gold", amount: -3 }
            ],
            lines: [
              {
                speaker: null,
                text: "Late fees. Invented. Collected. The ink laughs."
              }
            ]
          }
        }
      ]
    },

    throne: {
      id: "throne",
      title: "The Throne Room",
      type: "scene",
      lines: [
        {
          speaker: null,
          text: "Count Merlin practices 'I am not—' at a mirror that has learned not to interrupt."
        },
        {
          speaker: "Count Merlin",
          text: "Ask whether I know any wizards and I will eat your shoes, and then you."
        }
      ],
      options: [
        {
          label: "Fight",
          check: null,
          success: {
            lines: [
              {
                speaker: "Count Merlin",
                text: "Finally. Something honest."
              }
            ],
            effects: [{ op: "prepareCount" }],
            next: "fight_count"
          }
        },
        {
          label: "Announce yourself properly",
          showIf: { all: [{ notCharacter: "vellum" }] },
          check: { stat: "spirit", dc: 13 },
          dcAdjust: [{ if: { flag: "stableSmell" }, delta: 1 }],
          success: {
            lines: [
              {
                speaker: "Count Merlin",
                text: "Adequate etiquette. I am almost impressed. Almost."
              }
            ],
            effects: [
              { op: "flag", key: "announced", value: true },
              { op: "xp", amount: 8 },
              { op: "prepareCount" }
            ],
            next: "fight_count"
          },
          failure: {
            lines: [
              {
                speaker: "Count Merlin",
                text: "Your manners are a suggestion. Be still."
              }
            ],
            effects: [
              { op: "flag", key: "badAnnounce", value: true },
              { op: "prepareCount" }
            ],
            next: "fight_count"
          },
          critFail: {
            effects: [{ op: "damage", amount: 4 }],
            lines: [
              {
                speaker: null,
                text: "The mirror disagrees with your posture. So does he."
              }
            ]
          }
        },
        {
          label: "I formally withdraw the comparison",
          showIf: { all: [{ character: "vellum" }] },
          check: { stat: "spirit", dc: 11 },
          success: {
            lines: [
              {
                speaker: "Count Merlin",
                text: "A professional retraction. How rare. Keep your eyes — for now."
              }
            ],
            effects: [
              { op: "flag", key: "vellumSermon", value: true },
              { op: "flag", key: "announced", value: true },
              { op: "xp", amount: 8 },
              { op: "prepareCount" }
            ],
            next: "fight_count"
          },
          failure: {
            lines: [
              {
                speaker: "Count Merlin",
                text: "Almost. Be still while I finish the thought."
              }
            ],
            effects: [
              { op: "flag", key: "badAnnounce", value: true },
              { op: "prepareCount" }
            ],
            next: "fight_count"
          },
          critSuccess: {
            effects: [{ op: "flag", key: "firstLecture", value: true }],
            lines: [
              {
                speaker: "Count Merlin",
                text: "I will begin with the lecture. You have earned the soft opening."
              }
            ]
          }
        },
        {
          label: "Invoke the latch-clause",
          showIf: { all: [{ anyFlag: ["knowsMotive", "knowsClause"] }] },
          check: { stat: "wits", dc: 15 },
          dcAdjust: [
            { if: { flag: "knowsClause" }, delta: -4 },
            {
              if: {
                all: [{ flag: "oswaldSoft" }, { notFlag: "knowsClause" }]
              },
              delta: -2
            }
          ],
          success: {
            lines: [
              {
                speaker: "Oswald",
                text: "The sign, my lord. From my coat. As always."
              }
            ],
            effects: [],
            next: "end_clause"
          },
          failure: {
            lines: [
              {
                speaker: "Count Merlin",
                text: "Almost a lawyer. Almost alive. Choose the second carefully."
              }
            ],
            effects: [
              { op: "flag", key: "clauseFailed", value: true },
              { op: "prepareCount" }
            ],
            next: "fight_count"
          },
          critFail: {
            effects: [{ op: "damage", amount: 4 }],
            lines: [
              {
                speaker: null,
                text: "The clause bites. So does the air."
              }
            ]
          }
        },
        {
          label: "I have a business proposal",
          check: { stat: "wits", dc: 16 },
          success: {
            lines: [
              {
                speaker: "Count Merlin",
                text: "A seat on the board. Eternal proofreading. You understand the trade."
              }
            ],
            effects: [],
            next: "end_board"
          },
          failure: {
            lines: [
              {
                speaker: "Count Merlin",
                text: "Your pitch is soft. My patience is not."
              }
            ],
            effects: [
              { op: "flag", key: "clauseFailed", value: true },
              { op: "prepareCount" }
            ],
            next: "fight_count"
          }
        },
        {
          label: "You are Merlin the wizard",
          hideIf: { flag: "jabThrone" },
          wizardUnlock: true,
          check: null,
          success: {
            lines: [
              {
                speaker: "Count Merlin",
                text: "I am not. I am not. I am—"
              }
            ],
            effects: [
              { op: "flag", key: "jabThrone", value: true },
              { op: "wizardJab", mood: "fluster" }
            ],
            next: "fight_count"
          }
        }
      ]
    },

    fight_count: {
      id: "fight_count",
      title: "Count Merlin",
      type: "combat",
      encounter: "count",
      onWin: "end_stake",
      onFlee: "end_fled",
      winFlag: "countDead",
      deathCause: "count",
      lines: [
        {
          speaker: "Count Merlin",
          text: "I am Count Merlin. Not that one. Repeat it incorrectly and I will correct you. Permanently."
        }
      ]
    },

    end_stake: {
      id: "end_stake",
      title: "The Stake",
      type: "ending",
      lines: [
        {
          speaker: null,
          text: "You put him down. His last instruction is about the headstone's wording."
        },
        {
          speaker: "Count Merlin",
          text: "Not a wizard. Larger."
        },
        {
          speaker: null,
          text: "The bells ring. The tourism board is already drafting: Former Residence of Definitely Not Merlin."
        }
      ],
      variants: [
        {
          if: { equippedWeapon: "opener" },
          lines: [
            {
              speaker: null,
              text: "You put him down with stationery. He is offended to the last."
            },
            {
              speaker: "Count Merlin",
              text: "Not a wizard. Larger. And never a letter."
            },
            {
              speaker: null,
              text: "The bells ring. The board drafts another lie with better kerning."
            }
          ]
        }
      ],
      options: []
    },

    end_clause: {
      id: "end_clause",
      title: "The Correction",
      type: "ending",
      lines: [
        {
          speaker: null,
          text: "Oswald produces the gate sign from his coat, where it has been all evening. You strike the lie in front of the Count."
        },
        {
          speaker: "Count Merlin",
          text: "The curse lifts. I remain a vampire with better door policy. Drink? The kerning on that sign was a crime."
        },
        {
          speaker: null,
          text: "Dawn. You are alive. This is the best ending, and he will never admit it."
        }
      ],
      options: []
    },

    end_board: {
      id: "end_board",
      title: "The Board",
      type: "ending",
      lines: [
        {
          speaker: null,
          text: "You take the seat. Pay is a room, board, and not being eaten. Eternity is proofreading tea towels."
        },
        {
          speaker: "Oswald",
          text: "Welcome. I am relieved. And a little jealous."
        },
        {
          speaker: null,
          text: "You are alive. You are also worse."
        }
      ],
      options: []
    },

    end_fled: {
      id: "end_fled",
      title: "Flight",
      type: "ending",
      lines: [
        {
          speaker: null,
          text: "Clarence holds the door. You run. Hallowmere puts its lights out one by one, thriftily."
        },
        {
          speaker: "Clarence",
          text: "Logged as: guest declined. Do not request a refund."
        },
        {
          speaker: null,
          text: "You are alive, and smaller. The curse stays."
        }
      ],
      options: []
    },

    end_wizard: {
      id: "end_wizard",
      title: "The Misnomer",
      type: "ending",
      lines: [
        {
          speaker: null,
          text: "The mirror finishes the sentence for him, and gets it wrong. The curse hiccups. Dawn gets in."
        },
        {
          speaker: "Count Merlin",
          text: "I am not a wizard. I am not. You may leave while the word is stuck."
        },
        {
          speaker: "Clarence",
          text: "Logged under the wrong column. On purpose. Do not request a refund."
        }
      ],
      options: []
    },

    death: {
      id: "death",
      title: "An Epitaph",
      type: "ending",
      lines: [
        {
          speaker: null,
          text: "The night keeps you."
        }
      ],
      variants: [
        {
          if: { deathCause: "ghoul" },
          lines: [
            {
              speaker: null,
              text: "The wreath fits. Hob puts out one less bowl. Somewhere, a mayor polls at three percent and does not notice the difference."
            }
          ]
        },
        {
          if: { deathCause: "wight" },
          lines: [
            {
              speaker: null,
              text: "The marsh files you under paid. The bell rings once, for the receipt."
            }
          ]
        },
        {
          if: { deathCause: "count" },
          lines: [
            {
              speaker: null,
              text: "He rejects three epitaph drafts for implying wizardry. Then he writes your name and the dates. He is, annoyingly, gentle."
            }
          ]
        },
        {
          if: { deathCause: "fall" },
          lines: [
            {
              speaker: null,
              text: "Clarence writes 'declined' in the guest book. The wall remains unimpressed."
            }
          ]
        }
      ],
      options: []
    }
  };

  window.MERLIN = {
    characters: characters,
    items: items,
    shops: shops,
    encounters: encounters,
    nodes: nodes,
    xpThresholds: [0, 20, 50],
    saveKey: "merlin.save.v1",
    fatesKey: "merlin.fates.v1",
    siteUrl: "https://merlin-dnd.netlify.app",
    wizardUnlockAt: 3,
    wizardMoodDelta: { fluster: -2, fury: 2 },
    fateOrder: [
      "end_stake",
      "end_clause",
      "end_board",
      "end_fled",
      "death",
      "end_wizard"
    ],
    fateHints: {
      end_stake:
        "There is an ending where I stop talking. It takes a weapon and worse judgment than running.",
      end_clause:
        "There is an ending where you live and I am improved. You won't find it.",
      end_board:
        "Oswald keeps a seat that pays in not being eaten. Bring a proposal, not a stake.",
      end_fled: "Clarence holds a door. Running is a kind of paperwork.",
      death:
        "Many nights end with a name and two dates. The churchyard, the marsh, the wall, and I are all hiring.",
      end_wizard:
        "Call me the other profession three times in one night, and say it to my face. I keep count."
    },
    epitaphs: {
      end_stake: "You put me down. Write vampire. I will haunt the kerning.",
      end_clause:
        "You lived, and I am improved. I will never thank you. The sign, however, is corrected.",
      end_board:
        "You took the seat. Eternity is proofreading. Try not to enjoy it.",
      end_fled:
        "You ran. Clarence logged it. I will pretend I did not read the log.",
      end_wizard:
        "You said wizard until the word stuck. I am not improved. I am, regrettably, speechless. You live.",
      death: {
        ghoul: "Died to a ghoul. A GHOUL. Not a wizard.",
        wight:
          "The marsh filed you under paid. I would have charged more, and spelled it correctly.",
        count:
          "I wrote your name and the dates. Three drafts implied wizardry. I rejected all three.",
        fall: "The wall declined you. Clarence wrote declined. I agree with the wall.",
        default: "The night kept you. I did not request the company."
      }
    },
    memoryLines: {
      clarence: {
        end_fled:
          "You again. Last time you fled. Clarence logged it. The previous entry is {name}.",
        end_stake:
          "You again. Last time you put him down. Clarence logged the sequel under {name}.",
        end_clause:
          "You again. Last time you improved him. Clarence logged the improvement under {name}.",
        end_board:
          "You again. Last time you joined the board. Clarence logged the badge under {name}.",
        end_wizard:
          "You again. Last time you used the other noun. Clarence logged it under {name}, in the wrong column.",
        death: {
          ghoul:
            "You again. Last time a ghoul kept you. Clarence logged the wreath under {name}.",
          wight:
            "You again. Last time the marsh filed you under paid. Clarence logged the receipt under {name}.",
          count:
            "You again. Last time he wrote your dates. Clarence logged the rejected draft under {name}.",
          fall:
            "You again. Last time the wall declined you. Clarence logged declined under {name}.",
          default:
            "You again. Last time the night kept you. Clarence logged the gap under {name}."
        }
      },
      count: {
        end_fled:
          "You again. Last time you fled. Clarence logged it, and I read the log. The name was {name}.",
        end_stake: "You again. Last time {name} ended me. Rude, and accurate.",
        end_clause:
          "You again. Last time {name} improved me. I remain ungrateful.",
        end_board:
          "You again. Last time {name} took the seat. The badge mouldered.",
        end_wizard:
          "You again. Last time {name} said the other noun to my face. I am still not a wizard.",
        death: {
          ghoul: "You again. Last time {name} died to a ghoul. A ghoul.",
          wight:
            "You again. Last time the marsh kept {name}. I would have charged more.",
          count:
            "You again. Last time I wrote the dates for {name}. Gently. Annoyingly.",
          fall:
            "You again. Last time the wall declined {name}. I agreed with the wall.",
          default: "You again. Last time the night kept {name}."
        }
      }
    }
  };
})();
