/* Oronath arc validator — table-driven tests. Node or browser. */
(function () {
  "use strict";

  var Arc;
  var Cast;
  if (typeof require === "function") {
    Arc = require("../arc.js");
    Cast = require("../characters.js");
  } else {
    Arc = window.OronathArc;
    Cast = window.OronathCast;
  }

  var fails = 0;

  function assert(cond, msg) {
    if (!cond) {
      fails += 1;
      console.error("FAIL: " + msg);
    }
  }

  function hasRule(result, rule) {
    for (var i = 0; i < result.errors.length; i++) {
      if (result.errors[i].rule === rule) return true;
    }
    return false;
  }

  function expectRule(arc, rule, label) {
    var r = Arc.validateArc(arc);
    assert(!r.ok, label + " should fail");
    assert(hasRule(r, rule), label + " should report " + rule);
  }

  function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function baseArc() {
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

  // Valid
  var ok = Arc.validateArc(baseArc());
  assert(ok.ok, "valid arc accepted");
  eqLen(ok.errors, 0, "valid arc no errors");

  function eqLen(arr, n, msg) {
    assert(arr.length === n, msg + " (got " + arr.length + ")");
  }

  // chapter-count: 2
  var two = deepCopy(baseArc());
  two.chapters = two.chapters.slice(0, 2);
  two.chapters[1].choices[0].consequences.success.next = "end-core";
  two.chapters[1].choices[0].consequences.failure.next = "end-core";
  two.chapters[1].choices[1].consequences.success.next = "end-core";
  two.chapters[1].choices[1].consequences.failure.next = "end-core";
  expectRule(two, "chapter-count", "two chapters");

  // chapter-count: 6
  var six = deepCopy(baseArc());
  var i;
  for (i = 0; i < 3; i++) {
    six.chapters.push({
      id: "extra-" + i,
      title: "Extra",
      setting: "More salt.",
      objective: "Keep walking.",
      choices: [
        {
          id: "a",
          label: "A",
          roll: { die: "d20", tier: "easy", tags: [] },
          consequences: {
            success: { text: "ok", next: "end-core", resolves: [] },
            failure: { text: "no", next: "end-core", resolves: [] }
          }
        },
        {
          id: "b",
          label: "B",
          roll: { die: "d20", tier: "easy", tags: [] },
          consequences: {
            success: { text: "ok", next: "end-core", resolves: [] },
            failure: { text: "no", next: "end-core", resolves: [] }
          }
        }
      ]
    });
  }
  // point last real chapter into first extra so they aren't unreachable noise
  six.chapters[2].choices[0].consequences.success.next = "extra-0";
  six.chapters[2].choices[0].consequences.failure.next = "extra-0";
  six.chapters[2].choices[1].consequences.success.next = "extra-0";
  six.chapters[2].choices[1].consequences.failure.next = "extra-0";
  six.chapters[3].choices[0].consequences.success.next = "extra-1";
  six.chapters[3].choices[0].consequences.failure.next = "extra-1";
  six.chapters[3].choices[1].consequences.success.next = "extra-1";
  six.chapters[3].choices[1].consequences.failure.next = "extra-1";
  six.chapters[4].choices[0].consequences.success.next = "extra-2";
  six.chapters[4].choices[0].consequences.failure.next = "extra-2";
  six.chapters[4].choices[1].consequences.success.next = "extra-2";
  six.chapters[4].choices[1].consequences.failure.next = "extra-2";
  expectRule(six, "chapter-count", "six chapters");

  // choice-count: 1
  var oneChoice = deepCopy(baseArc());
  oneChoice.chapters[0].choices = oneChoice.chapters[0].choices.slice(0, 1);
  expectRule(oneChoice, "choice-count", "one choice");

  // choice-count: 5
  var fiveChoice = deepCopy(baseArc());
  var pad;
  for (pad = 0; pad < 3; pad++) {
    fiveChoice.chapters[0].choices.push({
      id: "extra-choice-" + pad,
      label: "Extra",
      roll: { die: "d20", tier: "easy", tags: [] },
      consequences: {
        success: { text: "ok", next: "echo-field", resolves: [] },
        failure: { text: "no", next: "echo-field", resolves: [] }
      }
    });
  }
  expectRule(fiveChoice, "choice-count", "five choices");

  // missing-setting
  var noSet = deepCopy(baseArc());
  noSet.chapters[0].setting = "  ";
  expectRule(noSet, "missing-setting", "blank setting");

  // missing-objective
  var noObj = deepCopy(baseArc());
  noObj.chapters[0].objective = "";
  expectRule(noObj, "missing-objective", "blank objective");

  // missing-roll
  var noRoll = deepCopy(baseArc());
  delete noRoll.chapters[0].choices[0].roll;
  expectRule(noRoll, "missing-roll", "no roll");

  // bad-tier
  var badTier = deepCopy(baseArc());
  badTier.chapters[0].choices[0].roll.tier = "unfair";
  expectRule(badTier, "bad-tier", "unfair tier");

  // missing-dc
  var noDc = deepCopy(baseArc());
  delete noDc.chapters[0].choices[1].roll.dc;
  expectRule(noDc, "missing-dc", "d10 without dc");

  // missing-success
  var noSuccess = deepCopy(baseArc());
  delete noSuccess.chapters[0].choices[0].consequences.success;
  expectRule(noSuccess, "missing-success", "no success");

  // missing-failure
  var noFailure = deepCopy(baseArc());
  delete noFailure.chapters[0].choices[0].consequences.failure;
  expectRule(noFailure, "missing-failure", "no failure");

  // dangling-next
  var dang = deepCopy(baseArc());
  dang.chapters[0].choices[0].consequences.failure.next = "no-such-node";
  expectRule(dang, "dangling-next", "dangling next");

  // unreachable chapter (still 3–5 count)
  var unreach = deepCopy(baseArc());
  unreach.chapters.push({
    id: "orphan",
    title: "Orphan",
    setting: "Nowhere.",
    objective: "Be found.",
    choices: [
      {
        id: "x",
        label: "X",
        roll: { die: "d20", tier: "easy", tags: [] },
        consequences: {
          success: { text: "ok", next: "end-core", resolves: [] },
          failure: { text: "no", next: "end-core", resolves: [] }
        }
      },
      {
        id: "y",
        label: "Y",
        roll: { die: "d20", tier: "easy", tags: [] },
        consequences: {
          success: { text: "ok", next: "end-core", resolves: [] },
          failure: { text: "no", next: "end-core", resolves: [] }
        }
      }
    ]
  });
  expectRule(unreach, "unreachable", "orphan chapter");

  // self-next
  var self = deepCopy(baseArc());
  self.chapters[0].choices[0].consequences.failure.next = "signal-tree";
  expectRule(self, "self-next", "self next");

  // cycle: A -> B -> A (keep ending reachable via other edges)
  var cycle = deepCopy(baseArc());
  // signal-tree failure -> echo-field (keep)
  // echo-field success -> signal-tree (creates cycle)
  // echo-field failure still -> signal-core -> end
  cycle.chapters[1].choices[0].consequences.success.next = "signal-tree";
  expectRule(cycle, "cycle", "A/B cycle");

  // missing-thread
  var missThread = deepCopy(baseArc());
  missThread.threads = missThread.threads.filter(function (t) {
    return t.characterId !== "rafe";
  });
  // also drop from ending resolves so we don't mix rules; still missing-thread
  missThread.endings[0].resolves = ["john-memory", "joel-legacy"];
  expectRule(missThread, "missing-thread", "rafe without thread");

  // unknown-character
  var unk = deepCopy(baseArc());
  unk.threads.push({
    id: "ghost",
    characterId: "no-one",
    label: "ghost"
  });
  // ending must resolve new thread or we also get unresolved-thread — add it
  unk.endings[0].resolves.push("ghost");
  expectRule(unk, "unknown-character", "unknown characterId");

  // thread-mismatch
  var mismatch = deepCopy(baseArc());
  mismatch.characters[0].threadId = "joel-legacy";
  expectRule(mismatch, "thread-mismatch", "john points at joel thread");

  // unresolved-thread
  var unresolved = deepCopy(baseArc());
  unresolved.endings[0].resolves = ["john-memory", "joel-legacy"];
  expectRule(unresolved, "unresolved-thread", "rafe thread open");

  if (fails === 0) {
    console.log("arc ok");
  } else {
    console.error("arc FAILED (" + fails + ")");
    if (typeof process !== "undefined") process.exitCode = 1;
    if (typeof window !== "undefined") window.__oronathFail = true;
  }
})();
