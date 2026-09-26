/* Oronath dice engine — table-driven tests. Node or browser. */
(function () {
  "use strict";

  var Dice =
    typeof require === "function"
      ? require("../dice.js")
      : typeof window !== "undefined"
        ? window.OronathDice
        : null;

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

  function rollFace(tier, face, mod) {
    return Dice.rollD20({
      tier: tier,
      modifier: mod || 0,
      rng: Dice.sequence([face])
    });
  }

  // Tier boundaries
  eq(rollFace("easy", 7).branch, "failure", "easy 7 fails");
  eq(rollFace("easy", 8).branch, "success", "easy 8 succeeds");
  eq(rollFace("medium", 10).branch, "failure", "medium 10 fails");
  eq(rollFace("medium", 11).branch, "success", "medium 11 succeeds");
  eq(rollFace("hard", 13).branch, "failure", "hard 13 fails");
  eq(rollFace("hard", 14).branch, "success", "hard 14 succeeds");
  eq(rollFace("veryHard", 15).branch, "failure", "veryHard 15 fails");
  eq(rollFace("veryHard", 16).branch, "success", "veryHard 16 succeeds");

  // Crit boundaries
  var nat1 = rollFace("easy", 1);
  eq(nat1.complication, true, "nat1 complication");
  eq(nat1.success, false, "nat1 success false");
  eq(nat1.branch, "complication", "nat1 branch");
  eq(nat1.retry, false, "nat1 retry false");

  var nat20 = rollFace("veryHard", 20);
  eq(nat20.bonus, true, "nat20 bonus");
  eq(nat20.success, true, "nat20 success");
  eq(nat20.branch, "bonus", "nat20 branch");

  // Modifier shifts DC
  var modFail = rollFace("medium", 8, -2);
  eq(modFail.dc, 9, "modifier effective dc");
  eq(modFail.branch, "failure", "medium+mod face 8 fails");
  var modOk = rollFace("medium", 9, -2);
  eq(modOk.branch, "success", "medium+mod face 9 succeeds");

  // Advantage
  var advBonus = Dice.rollD20({
    tier: "medium",
    advantage: true,
    rng: Dice.sequence([1, 20])
  });
  eq(advBonus.kept, 20, "advantage keep 20");
  assert(
    advBonus.faces[0] === 1 && advBonus.faces[1] === 20,
    "advantage faces"
  );
  eq(advBonus.branch, "bonus", "advantage [1,20] bonus");
  eq(advBonus.complication, false, "advantage discarded 1 is not complication");

  var advComp = Dice.rollD20({
    tier: "easy",
    advantage: true,
    rng: Dice.sequence([1, 1])
  });
  eq(advComp.branch, "complication", "advantage [1,1] complication");

  // d10 value / 00
  eq(Dice.d10Value(0), 10, "d10Value 0");
  eq(Dice.d10Value("0"), 10, "d10Value '0'");
  eq(Dice.d10Value("00"), 10, "d10Value '00'");
  eq(Dice.d10Value(10), 10, "d10Value 10");
  eq(Dice.d10Value(1), 1, "d10Value 1");

  var d10Max = Dice.rollD10({ dc: 6, rng: Dice.sequence([0]) });
  eq(d10Max.labels[0], "00", "d10 label 00");
  eq(d10Max.kept, 10, "d10 kept 10");
  eq(d10Max.branch, "bonus", "d10 00 is bonus");

  var d10Comp = Dice.rollD10({ dc: 6, rng: Dice.sequence([1]) });
  eq(d10Comp.branch, "complication", "d10 face 1 complication");

  eq(Dice.rollD10({ dc: 6, rng: Dice.sequence([5]) }).branch, "failure", "d10 5 fail");
  eq(Dice.rollD10({ dc: 6, rng: Dice.sequence([6]) }).branch, "success", "d10 6 ok");

  // 2d6
  var twoLow = Dice.roll2d6({ dc: 7, rng: Dice.sequence([1, 1]) });
  eq(twoLow.kept, 2, "2d6 [1,1] kept");
  eq(twoLow.branch, "complication", "2d6 [1,1] complication");

  var twoHigh = Dice.roll2d6({ dc: 7, rng: Dice.sequence([6, 6]) });
  eq(twoHigh.kept, 12, "2d6 [6,6] kept");
  eq(twoHigh.branch, "bonus", "2d6 [6,6] bonus");

  var twoMid = Dice.roll2d6({ dc: 7, rng: Dice.sequence([1, 6]) });
  eq(twoMid.kept, 7, "2d6 [1,6] kept");
  eq(twoMid.complication, false, "2d6 [1,6] not complication");
  eq(twoMid.bonus, false, "2d6 [1,6] not bonus");
  eq(twoMid.branch, "success", "2d6 [1,6] vs 7 success");

  eq(Dice.roll2d6({ dc: 7, rng: Dice.sequence([1, 5]) }).branch, "failure", "2d6 sum 6 fail");
  eq(Dice.roll2d6({ dc: 7, rng: Dice.sequence([2, 5]) }).branch, "success", "2d6 sum 7 ok");

  // Distribution shape: all 36 pairs
  var freq = {};
  var a;
  var b;
  for (a = 1; a <= 6; a++) {
    for (b = 1; b <= 6; b++) {
      var sum = Dice.roll2d6({ rng: Dice.sequence([a, b]) }).kept;
      freq[sum] = (freq[sum] || 0) + 1;
    }
  }
  var expected = {
    2: 1,
    3: 2,
    4: 3,
    5: 4,
    6: 5,
    7: 6,
    8: 5,
    9: 4,
    10: 3,
    11: 2,
    12: 1
  };
  var s;
  for (s = 2; s <= 12; s++) {
    eq(freq[s], expected[s], "2d6 freq " + s);
  }

  // Seeded RNG reproducibility + exportState
  var r1 = Dice.createRng(1);
  var r2 = Dice.createRng(1);
  var f1 = Dice.rollD20({ tier: "easy", rng: r1 }).kept;
  var f2 = Dice.rollD20({ tier: "easy", rng: r2 }).kept;
  eq(f1, f2, "same seed same first face");

  var r3 = Dice.createRng(42);
  Dice.rollD20({ tier: "easy", rng: r3 });
  var snap = r3.exportState();
  var nextA = Dice.rollD20({ tier: "easy", rng: r3 }).kept;
  var r4 = Dice.rngFromState(snap);
  var nextB = Dice.rollD20({ tier: "easy", rng: r4 }).kept;
  eq(nextA, nextB, "rngFromState continues");

  // Dispatcher
  eq(
    Dice.roll({ die: "d20", tier: "easy", rng: Dice.sequence([8]) }).branch,
    "success",
    "roll() d20"
  );

  if (fails === 0) {
    console.log("dice ok");
  } else {
    console.error("dice FAILED (" + fails + ")");
    if (typeof process !== "undefined" && process.exitCode !== undefined) {
      process.exitCode = 1;
    } else if (typeof process !== "undefined") {
      process.exitCode = 1;
    }
    if (typeof window !== "undefined") window.__oronathFail = true;
  }
})();
