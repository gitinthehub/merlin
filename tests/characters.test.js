/* Oronath character system — table-driven tests. Node or browser. */
(function () {
  "use strict";

  var Cast;
  var Dice;
  var Arc;
  if (typeof require === "function") {
    Dice = require("../dice.js");
    Cast = require("../characters.js");
    Arc = require("../arc.js");
  } else {
    Dice = window.OronathDice;
    Cast = window.OronathCast;
    Arc = window.OronathArc;
  }

  var fails = 0;

  function assert(cond, msg) {
    if (!cond) {
      fails += 1;
      console.error("FAIL: " + msg);
    }
  }

  function eq(a, b, msg) {
    assert(a === b, msg + " (got " + a + ", expected " + b + ")");
  }

  var john = Cast.pregen("john");
  var joel = Cast.pregen("joel");
  var rafe = Cast.pregen("rafe");

  // Deep copy
  john.name = "mutated";
  eq(Cast.PREGENS[0].name, "John", "pregen is a copy");
  john = Cast.pregen("john");

  // Build examples
  var night = Cast.resolveCheck(john, {
    die: "d20",
    tier: "medium",
    tags: ["night-vision"]
  });
  eq(night.modifier, 0, "night-vision modifier 0");
  eq(night.advantage, true, "night-vision advantage");
  eq(night.dc, 11, "night-vision base dc");

  var stealth = Cast.resolveCheck(john, {
    die: "d20",
    tier: "medium",
    tags: ["stealth"]
  });
  eq(stealth.modifier, -2, "stealth modifier");
  eq(stealth.advantage, false, "stealth no advantage");
  eq(stealth.dc, 11, "stealth base dc");

  var stacked = Cast.resolveCheck(john, {
    die: "d20",
    tier: "medium",
    tags: ["stealth", "endurance"]
  });
  eq(stacked.modifier, -3, "stealth+endurance stacks");

  var strength = Cast.resolveCheck(joel, {
    die: "2d6",
    dc: 7,
    tags: ["strength"]
  });
  eq(strength.modifier, -2, "joel strength modifier");
  eq(strength.advantage, true, "joel strength advantage");

  var axe = Cast.resolveCheck(joel, {
    die: "2d6",
    dc: 7,
    tags: ["carved-axe"]
  });
  eq(axe.modifier, 0, "carved-axe modifier 0");
  eq(axe.advantage, false, "carved-axe no advantage");

  var speed = Cast.resolveCheck(rafe, {
    die: "d10",
    dc: 6,
    tags: ["speed"]
  });
  eq(speed.modifier, -2, "rafe speed modifier");
  eq(speed.advantage, true, "rafe speed advantage");

  var sniper = Cast.resolveCheck(rafe, {
    die: "d10",
    dc: 6,
    tags: ["sniper"]
  });
  eq(sniper.modifier, -1, "rafe sniper modifier");
  eq(sniper.advantage, true, "rafe sniper advantage");

  var alien = Cast.resolveCheck(rafe, {
    die: "d10",
    dc: 6,
    tags: ["alien-origin"]
  });
  eq(alien.modifier, 0, "rafe alien modifier");
  eq(alien.advantage, true, "rafe alien advantage");

  // Stealth check rolls with effective DC 9
  var check = Cast.resolveCheck(john, {
    die: "d20",
    tier: "medium",
    tags: ["stealth"]
  });
  var rolled = Dice.roll({
    die: check.die,
    tier: check.tier,
    dc: check.dc,
    modifier: check.modifier,
    advantage: check.advantage,
    rng: Dice.sequence([9])
  });
  eq(rolled.dc, 9, "stealth roll effective dc 9");
  eq(rolled.branch, "success", "stealth face 9 succeeds");

  // Arc embedding all three pregens validates
  function validArc() {
    return {
      id: "oronath-fixture",
      version: 1,
      title: "The Last Signal of Oronath",
      characters: [
        Cast.pregen("john"),
        Cast.pregen("joel"),
        Cast.pregen("rafe")
      ],
      threads: [
        { id: "john-memory", characterId: "john", label: "memory/identity" },
        { id: "joel-legacy", characterId: "joel", label: "legacy" },
        { id: "rafe-return", characterId: "rafe", label: "return-home" }
      ],
      chapters: [
        {
          id: "signal-tree",
          title: "The Signal Tree",
          setting: "A black lattice above the salt flat.",
          objective: "Reach the lamp before the pulse dies.",
          choices: [
            {
              id: "climb",
              label: "Climb the lattice",
              roll: { die: "d20", tier: "medium", tags: ["stealth"] },
              consequences: {
                success: {
                  text: "John clears the spar.",
                  next: "echo-field",
                  resolves: []
                },
                failure: {
                  text: "The spar shears.",
                  next: "echo-field",
                  resolves: []
                },
                complication: {
                  text: "His grip goes.",
                  next: "echo-field",
                  resolves: []
                },
                bonus: {
                  text: "He marks the blink.",
                  next: "echo-field",
                  resolves: []
                }
              }
            },
            {
              id: "sprint",
              label: "Sprint the rung line",
              roll: { die: "d10", dc: 6, tags: ["speed"] },
              consequences: {
                success: {
                  text: "Rafe beats the blink.",
                  next: "echo-field",
                  resolves: []
                },
                failure: {
                  text: "The pulse skips.",
                  next: "echo-field",
                  resolves: []
                }
              }
            }
          ]
        },
        {
          id: "echo-field",
          title: "The Echo Field",
          setting: "Salt wind carries a second heartbeat.",
          objective: "Cross without waking the echo.",
          choices: [
            {
              id: "axe",
              label: "Cut the tether with the carved axe",
              roll: { die: "2d6", dc: 7, tags: ["strength"] },
              consequences: {
                success: {
                  text: "The tether snaps.",
                  next: "signal-core",
                  resolves: []
                },
                failure: {
                  text: "The echo answers.",
                  next: "signal-core",
                  resolves: []
                }
              }
            },
            {
              id: "watch",
              label: "Read the pulse through the scope",
              roll: { die: "d10", dc: 5, tags: ["sniper"] },
              consequences: {
                success: {
                  text: "The pattern holds.",
                  next: "signal-core",
                  resolves: []
                },
                failure: {
                  text: "The pattern slips.",
                  next: "signal-core",
                  resolves: []
                }
              }
            }
          ]
        },
        {
          id: "signal-core",
          title: "The Signal Core",
          setting: "A chamber of cold light and old metal.",
          objective: "Open the core and claim the signal.",
          choices: [
            {
              id: "name",
              label: "Speak John's true name",
              roll: { die: "d20", tier: "hard", tags: ["endurance"] },
              consequences: {
                success: {
                  text: "The core answers in his voice.",
                  next: "end-core",
                  resolves: []
                },
                failure: {
                  text: "The core answers in another's.",
                  next: "end-core",
                  resolves: []
                }
              }
            },
            {
              id: "home",
              label: "Aim Rafe's star home",
              roll: { die: "d10", dc: 7, tags: ["alien-origin"] },
              consequences: {
                success: {
                  text: "The star maps a way out.",
                  next: "end-core",
                  resolves: []
                },
                failure: {
                  text: "The star maps a longer road.",
                  next: "end-core",
                  resolves: []
                }
              }
            }
          ]
        }
      ],
      endings: [
        {
          id: "end-core",
          title: "The Signal Core",
          text: "The core answers in John's voice, Joel's carving, and Rafe's star.",
          resolves: ["john-memory", "joel-legacy", "rafe-return"]
        }
      ]
    };
  }

  var v = Arc.validateArc(validArc());
  assert(v.ok, "arc with three pregens validates");

  if (fails === 0) {
    console.log("characters ok");
  } else {
    console.error("characters FAILED (" + fails + ")");
    if (typeof process !== "undefined") process.exitCode = 1;
    if (typeof window !== "undefined") window.__oronathFail = true;
  }
})();
