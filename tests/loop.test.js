/* Oronath gameplay loop — table-driven tests. Node or browser. */
(function () {
  "use strict";

  var Dice;
  var Arc;
  var Cast;
  var Sample;
  var Loop;

  if (typeof require === "function") {
    Dice = require("../dice.js");
    Arc = require("../arc.js");
    Cast = require("../characters.js");
    Sample = require("../sample-arc.js");
    Loop = require("../loop.js");
  } else {
    Dice = window.OronathDice;
    Arc = window.OronathArc;
    Cast = window.OronathCast;
    Sample = window.OronathSample;
    Loop = window.OronathLoop;
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

  function findChoice(chapterId, choiceId) {
    var chapters = Sample.chapters;
    var i;
    var j;
    for (i = 0; i < chapters.length; i++) {
      if (chapters[i].id !== chapterId) continue;
      for (j = 0; j < chapters[i].choices.length; j++) {
        if (chapters[i].choices[j].id === choiceId) {
          return chapters[i].choices[j];
        }
      }
    }
    return null;
  }

  // Sample validates
  var validated = Arc.validateArc(Sample);
  assert(validated.ok, "sample arc validates");
  eq(validated.errors.length, 0, "sample arc no errors");
  eq(Sample.chapters.length, 3, "three chapters");
  eq(Sample.chapters[0].choices.length, 2, "ch1 two choices");
  eq(Sample.chapters[1].choices.length, 2, "ch2 two choices");
  eq(Sample.chapters[2].choices.length, 2, "ch3 two choices");

  // dark-stair check: advantage + mod -2
  var john = Cast.pregen("john");
  var dark = findChoice("candle-stair", "dark-stair");
  var check = Cast.resolveCheck(john, dark.roll);
  eq(check.advantage, true, "dark-stair advantage");
  eq(check.modifier, -2, "dark-stair modifier -2");

  // success path: sequence [9,4] keep 9 vs DC 9
  var runOk = Loop.createRun(Sample, { seed: 1 });
  Loop.choose(runOk, "dark-stair", { rng: Dice.sequence([9, 4]) });
  eq(runOk.phase, "outcome", "success phase outcome");
  eq(runOk.outcome.branch, "success", "success branch");
  eq(runOk.outcome.result.dc, 9, "effective dc 9");
  eq(runOk.outcome.consequence.next, "whisper-gallery", "success next gallery");
  var vOk = Loop.view(runOk);
  eq(vOk.choices.length, 0, "outcome view has no choices");
  assert(vOk.outcome && vOk.outcome.consequence, "outcome has consequence");

  // failure: [2,3] keep 3 < 9
  var runFail = Loop.createRun(Sample, { seed: 1 });
  Loop.choose(runFail, "dark-stair", { rng: Dice.sequence([2, 3]) });
  eq(runFail.outcome.branch, "failure", "failure branch");
  eq(
    runFail.outcome.consequence.next,
    "whisper-gallery",
    "failure next gallery"
  );
  var vFail = Loop.view(runFail);
  eq(vFail.choices.length, 0, "failure outcome no choices");

  // complication: [1,1] — different next from failure
  var runComp = Loop.createRun(Sample, { seed: 1 });
  Loop.choose(runComp, "dark-stair", { rng: Dice.sequence([1, 1]) });
  eq(runComp.outcome.branch, "complication", "nat1 complication");
  eq(runComp.outcome.consequence.next, "last-wick", "complication skips gallery");
  assert(
    runComp.outcome.consequence.next !==
      dark.consequences.failure.next ||
      dark.consequences.complication.next !==
        dark.consequences.failure.next,
    "complication next differs from failure next structurally"
  );
  eq(
    dark.consequences.complication.next,
    "last-wick",
    "schema complication next last-wick"
  );
  eq(
    dark.consequences.failure.next,
    "whisper-gallery",
    "schema failure next gallery"
  );
  assert(
    dark.consequences.complication.next !==
      dark.consequences.failure.next,
    "schema: complication.next !== failure.next"
  );

  // Second choose before continue throws
  var threw = false;
  try {
    Loop.choose(runComp, "dark-stair", { rng: Dice.sequence([10, 10]) });
  } catch (e) {
    threw = true;
  }
  assert(threw, "choose while outcome throws");

  // Continue after complication never visits gallery
  Loop.continueRun(runComp);
  eq(runComp.phase, "choose", "after complication choose");
  eq(runComp.nodeId, "last-wick", "landed on last-wick");
  var histHasGallery = false;
  var hi;
  for (hi = 0; hi < runComp.history.length; hi++) {
    if (runComp.history[hi].chapterId === "whisper-gallery") {
      histHasGallery = true;
    }
  }
  assert(!histHasGallery, "complication path never entered gallery");

  // bonus: [20,1] keep 20
  var runBonus = Loop.createRun(Sample, { seed: 1 });
  Loop.choose(runBonus, "dark-stair", { rng: Dice.sequence([20, 1]) });
  eq(runBonus.outcome.branch, "bonus", "bonus branch");
  eq(runBonus.outcome.consequence.next, "whisper-gallery", "bonus next gallery");

  // break-rail complication: advantage 2d6 needs four faces
  var runRail = Loop.createRun(Sample, { seed: 1 });
  Loop.choose(runRail, "break-rail", {
    rng: Dice.sequence([1, 1, 1, 1])
  });
  eq(runRail.outcome.branch, "complication", "2d6 complication");
  eq(runRail.outcome.consequence.next, "last-wick", "2d6 comp to last-wick");

  // Scripted path to end-kept with all threads closed
  var runEnd = Loop.createRun(Sample, { seed: 1 });
  Loop.choose(runEnd, "dark-stair", { rng: Dice.sequence([20, 20]) });
  Loop.continueRun(runEnd);
  eq(runEnd.nodeId, "whisper-gallery", "to gallery");
  Loop.choose(runEnd, "outpace-echo", { rng: Dice.sequence([0, 0]) });
  eq(runEnd.outcome.branch, "bonus", "d10 bonus");
  Loop.continueRun(runEnd);
  eq(runEnd.nodeId, "last-wick", "to last-wick");
  Loop.choose(runEnd, "loose-the-axe", {
    rng: Dice.sequence([6, 6, 1, 1])
  });
  eq(runEnd.outcome.branch, "bonus", "2d6 bonus end");
  Loop.continueRun(runEnd);
  eq(runEnd.phase, "resolved", "resolved");
  eq(runEnd.nodeId, "end-kept", "end-kept");
  var vEnd = Loop.view(runEnd);
  assert(vEnd.ending.allClosed, "all threads closed");
  eq(Loop.openThreads(runEnd).length, 0, "no open threads");

  // toMerlinRoll mappings
  var m20 = Loop.toMerlinRoll({
    die: "d20",
    faces: [20, 1],
    kept: 20,
    branch: "bonus"
  });
  eq(m20.kind, "d20", "merlin d20 kind");
  eq(m20.critSuccess, true, "merlin d20 critSuccess");
  assert(m20.dice[0] === 20 && m20.dice[1] === 1, "merlin d20 faces");

  var m1 = Loop.toMerlinRoll({
    die: "d20",
    faces: [1],
    kept: 1,
    branch: "complication"
  });
  eq(m1.critFail, true, "merlin d20 critFail");

  var m10 = Loop.toMerlinRoll({
    die: "d10",
    faces: [0],
    labels: ["00"],
    kept: 10,
    branch: "bonus"
  });
  eq(m10.kind, "d10", "merlin d10 kind");
  eq(m10.dice[0], "00", "merlin d10 kept 00");

  var m2 = Loop.toMerlinRoll({
    die: "2d6",
    faces: [1, 2, 6, 6],
    kept: 12,
    advantage: true,
    pools: [
      { faces: [1, 2], sum: 3 },
      { faces: [6, 6], sum: 12 }
    ],
    branch: "bonus"
  });
  eq(m2.kind, "d6", "merlin 2d6 kind");
  eq(m2.total, 12, "merlin 2d6 total kept");
  assert(m2.dice[0] === 6 && m2.dice[1] === 6, "merlin 2d6 kept pair");

  // Every history entry retry false
  var ri;
  for (ri = 0; ri < runEnd.history.length; ri++) {
    eq(runEnd.history[ri].retry, false, "history[" + ri + "] retry false");
  }
  for (ri = 0; ri < runEnd.diceLog.length; ri++) {
    eq(runEnd.diceLog[ri].retry, false, "diceLog[" + ri + "] retry false");
  }

  // self-next structurally impossible on sample (validator already); spot-check
  var ci;
  var cj;
  var keys = ["success", "failure", "complication", "bonus"];
  for (ci = 0; ci < Sample.chapters.length; ci++) {
    var ch = Sample.chapters[ci];
    for (cj = 0; cj < ch.choices.length; cj++) {
      var choice = ch.choices[cj];
      var k;
      for (k = 0; k < keys.length; k++) {
        var cons = choice.consequences[keys[k]];
        if (!cons) continue;
        assert(
          cons.next !== ch.id,
          ch.id + "/" + choice.id + "/" + keys[k] + " not self-next"
        );
      }
    }
  }

  if (fails === 0) {
    console.log("loop ok");
  } else {
    console.error("loop FAILED (" + fails + ")");
    if (typeof process !== "undefined") process.exitCode = 1;
    if (typeof window !== "undefined") window.__oronathFail = true;
  }
})();
