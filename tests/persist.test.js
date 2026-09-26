/* Oronath persistence — table-driven tests. Node or browser. */
(function () {
  "use strict";

  var Dice;
  var Sample;
  var Loop;
  var Persist;

  if (typeof require === "function") {
    Dice = require("../dice.js");
    require("../characters.js");
    Sample = require("../sample-arc.js");
    Loop = require("../loop.js");
    Persist = require("../persist.js");
  } else {
    Dice = window.OronathDice;
    Sample = window.OronathSample;
    Loop = window.OronathLoop;
    Persist = window.OronathPersist;
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

  function memoryStorage() {
    var map = {};
    return {
      getItem: function (k) {
        return Object.prototype.hasOwnProperty.call(map, k) ? map[k] : null;
      },
      setItem: function (k, v) {
        map[k] = String(v);
      },
      removeItem: function (k) {
        delete map[k];
      },
      _map: map
    };
  }

  // Resume continues the dice stream
  var store = memoryStorage();
  var twin = Dice.createRng(99);
  var run = Loop.createRun(Sample, { seed: 99 });
  // Align twin with run's rng by rolling the same first choice on both
  Loop.choose(run, "dark-stair");
  // Consume the same number of int() calls on twin: dark-stair has advantage = 2 faces
  Dice.rollD20({ tier: "medium", advantage: true, modifier: -2, rng: twin });

  Persist.save(run, store);
  var loaded = Persist.load(Sample, store);
  assert(loaded.ok, "load after save ok");
  assert(loaded.run, "loaded run present");

  // Continue to choose, then next roll from restored vs twin
  Loop.continueRun(loaded.run);
  eq(loaded.run.phase, "choose", "resumed then continued to choose");

  var snapA = Loop.exportRngState(loaded.run).a;
  var snapTwin = twin.exportState().a;
  eq(snapA, snapTwin, "rng state matches twin after first roll");

  var nextRestored = Dice.rollD20({
    tier: "easy",
    rng: loaded.run.rng
  }).kept;
  var nextTwin = Dice.rollD20({ tier: "easy", rng: twin }).kept;
  eq(nextRestored, nextTwin, "resumed run continues dice stream");

  // Outcome-phase restore does not re-roll
  var store2 = memoryStorage();
  var run2 = Loop.createRun(Sample, { seed: 7 });
  Loop.choose(run2, "dark-stair", { rng: Dice.sequence([14, 10]) });
  eq(run2.phase, "outcome", "run2 outcome");
  var logLen = run2.diceLog.length;
  // After sequence rng, exportState may not have .a — attach a seeded rng state for save
  // Rebuild with real rng so exportState works
  var run2b = Loop.createRun(Sample, { seed: 7 });
  Loop.choose(run2b, "dark-stair");
  var aBefore = Loop.exportRngState(run2b).a;
  Persist.save(run2b, store2);
  var loaded2 = Persist.load(Sample, store2);
  assert(loaded2.ok, "outcome load ok");
  eq(loaded2.run.phase, "outcome", "restored outcome phase");
  eq(loaded2.run.diceLog.length, logLen, "diceLog length unchanged");
  eq(Loop.exportRngState(loaded2.run).a, aBefore, "rng.a unchanged until continue");
  // Choosing again must throw
  var threw = false;
  try {
    Loop.choose(loaded2.run, "dark-stair");
  } catch (e) {
    threw = true;
  }
  assert(threw, "cannot choose on restored outcome");

  // Corrupt / older blobs
  function expectReject(blob, label) {
    var s = memoryStorage();
    s.setItem(Persist.SAVE_KEY, typeof blob === "string" ? blob : JSON.stringify(blob));
    var r = Persist.load(Sample, s);
    assert(!r.ok, label + " rejected");
    assert(s.getItem(Persist.SAVE_KEY) == null, label + " cleared");
  }

  expectReject("{not json", "bad-json");
  expectReject(
    {
      version: 0,
      arcId: Sample.id,
      seed: 1,
      rng: { a: 1 },
      nodeId: "candle-stair",
      phase: "choose",
      history: [],
      diceLog: [],
      characters: [],
      resolvedThreads: []
    },
    "version-0"
  );
  expectReject(
    {
      version: 2,
      arcId: Sample.id,
      seed: 1,
      rng: { a: 1 },
      nodeId: "candle-stair",
      phase: "choose",
      history: [],
      diceLog: [],
      characters: [],
      resolvedThreads: []
    },
    "version-2"
  );
  expectReject(
    {
      version: 1,
      arcId: "other-arc",
      seed: 1,
      rng: { a: 1 },
      nodeId: "candle-stair",
      phase: "choose",
      history: [],
      diceLog: [],
      characters: [],
      resolvedThreads: []
    },
    "foreign-arcId"
  );
  expectReject(
    {
      version: 1,
      arcId: Sample.id,
      seed: 1,
      rng: {},
      nodeId: "candle-stair",
      phase: "choose",
      history: [],
      diceLog: [],
      characters: [],
      resolvedThreads: []
    },
    "missing-rng-a"
  );
  expectReject(
    {
      version: 1,
      arcId: Sample.id,
      seed: 1,
      rng: { a: 1 },
      nodeId: "no-such-node",
      phase: "choose",
      history: [],
      diceLog: [],
      characters: [],
      resolvedThreads: []
    },
    "unknown-node"
  );

  // Only our key is written
  var store3 = memoryStorage();
  var run3 = Loop.createRun(Sample, { seed: 3 });
  Persist.save(run3, store3);
  var keys = Object.keys(store3._map);
  eq(keys.length, 1, "one key stored");
  eq(keys[0], Persist.SAVE_KEY, "key is oronath.save.v1");
  eq(Persist.SAVE_KEY, "oronath.save.v1", "SAVE_KEY constant");

  if (fails === 0) {
    console.log("persist ok");
  } else {
    console.error("persist FAILED (" + fails + ")");
    if (typeof process !== "undefined") process.exitCode = 1;
    if (typeof window !== "undefined") window.__oronathFail = true;
  }
})();
