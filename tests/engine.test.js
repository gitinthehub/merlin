/* MERLIN v1 engine — Node-only. Loads data.js + engine.js in a vm. */
(function () {
  "use strict";

  var fs = require("fs");
  var path = require("path");
  var vm = require("vm");

  var fails = 0;

  function assert(cond, msg) {
    if (!cond) {
      fails += 1;
      console.error("FAIL: " + msg);
    }
  }

  function eq(a, b, msg) {
    assert(a === b, msg + " (got " + JSON.stringify(a) + ", expected " + JSON.stringify(b) + ")");
  }

  function contains(hay, needle, msg) {
    assert(
      typeof hay === "string" && hay.indexOf(needle) !== -1,
      msg + " (haystack: " + JSON.stringify(hay) + ")"
    );
  }

  function notContains(hay, needle, msg) {
    assert(
      typeof hay === "string" && hay.indexOf(needle) === -1,
      msg + " (haystack: " + JSON.stringify(hay) + ")"
    );
  }

  var store = Object.create(null);
  var localStorage = {
    getItem: function (k) {
      return store[k] != null ? store[k] : null;
    },
    setItem: function (k, v) {
      store[k] = String(v);
    },
    removeItem: function (k) {
      delete store[k];
    }
  };

  var sandbox = {
    window: {},
    localStorage: localStorage,
    console: console
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;

  var root = path.join(__dirname, "..");
  vm.runInNewContext(
    fs.readFileSync(path.join(root, "data.js"), "utf8"),
    sandbox,
    { filename: "data.js" }
  );
  vm.runInNewContext(
    fs.readFileSync(path.join(root, "engine.js"), "utf8"),
    sandbox,
    { filename: "engine.js" }
  );

  var E = sandbox.MerlinEngine;
  var D = sandbox.MERLIN;
  assert(E && D, "engine and data loaded");

  function resetStore() {
    store = Object.create(null);
    localStorage.getItem = function (k) {
      return store[k] != null ? store[k] : null;
    };
    localStorage.setItem = function (k, v) {
      store[k] = String(v);
    };
    localStorage.removeItem = function (k) {
      delete store[k];
    };
  }

  function freshPip() {
    resetStore();
    E.newGame();
    E.selectCharacter("pip");
    var st = E.getState();
    st.gold = 3;
    return st;
  }

  function setDeath(cause, blow) {
    var st = E.getState();
    st.deathCause = cause;
    st.killingBlow = blow || null;
    st.nodeId = "death";
  }

  /* ——— Tombstones ——— */
  freshPip();
  setDeath("gate");
  eq(
    E.tombstoneLine(),
    "Pip, clerk. Schooled to death at the castle gate. Owed 3 gold.",
    "gate tombstone"
  );

  freshPip();
  setDeath("marsh");
  eq(
    E.tombstoneLine(),
    "Pip, clerk. Noticed to death in the marsh. Owed 3 gold.",
    "marsh tombstone"
  );

  freshPip();
  setDeath("foyer");
  eq(
    E.tombstoneLine(),
    "Pip, clerk. Bruised to death in the foyer. Owed 3 gold.",
    "foyer tombstone"
  );

  freshPip();
  setDeath("ledger");
  eq(
    E.tombstoneLine(),
    "Pip, clerk. Invoiced to death in the ledger. Owed 3 gold.",
    "ledger tombstone"
  );

  freshPip();
  setDeath("search");
  eq(
    E.tombstoneLine(),
    "Pip, clerk. Bitten to death in the churchyard earth. Owed 3 gold.",
    "search tombstone"
  );

  freshPip();
  setDeath("fall");
  eq(
    E.tombstoneLine(),
    "Pip, clerk. Dropped to death at the castle gate. Owed 3 gold.",
    "fall tombstone at"
  );

  freshPip();
  setDeath("count", "lecture");
  eq(
    E.tombstoneLine(),
    "Pip, clerk. Lectured to death in the throne room. Owed 3 gold.",
    "count lecture tombstone"
  );

  /* The remaining lethal checks that used to fall through to the count label:
     a crit-fail at the village gate, one at the square, and two in the
     churchyard. A death must name where it happened. */
  freshPip();
  setDeath("arrival");
  eq(
    E.tombstoneLine(),
    "Pip, clerk. Quoted to death at the village gate. Owed 3 gold.",
    "arrival tombstone"
  );

  freshPip();
  setDeath("mayor");
  eq(
    E.tombstoneLine(),
    "Pip, clerk. Taxed to death in the square. Owed 3 gold.",
    "mayor tombstone"
  );

  freshPip();
  setDeath("churchyard");
  eq(
    E.tombstoneLine(),
    "Pip, clerk. Shovelled to death in the churchyard. Owed 3 gold.",
    "churchyard tombstone"
  );

  /* ——— Visit review ——— */
  freshPip();
  (function () {
    var st = E.getState();
    st.flags.jabArrival = true;
    st.flags.jabMarsh = true;
    st.flags.jabGate = true;
    st.flags.jabThrone = true;
    st.wizardJabs = 4;
    st.nodeId = "end_stake";
    var rev = E.visitReview("end_stake");
    contains(rev, "four times", "four-jab says four times");
    notContains(rev, "three times", "four-jab does not say three times");
    var heard = rev.split("where you thought I couldn't hear").length - 1;
    eq(heard, 1, "overheard clause once");
    contains(
      rev,
      "at the village gate and in the marsh, where you thought I couldn't hear",
      "overheard places joined"
    );
    contains(rev, "at the castle gate", "castle gate place");
    contains(rev, "in the throne room, to my face", "throne place");
  })();

  freshPip();
  (function () {
    var st = E.getState();
    st.flags.jabArrival = true;
    st.flags.jabMarsh = true;
    st.wizardJabs = 2;
    var rev = E.visitReview("end_stake");
    contains(
      rev,
      "Called me the other thing twice, at the village gate and in the marsh, where you thought I couldn't hear.",
      "twice village+marsh"
    );
    notContains(rev, "three times", "twice path no three");
  })();

  freshPip();
  (function () {
    var st = E.getState();
    st.flags.jabMarsh = true;
    st.wizardJabs = 1;
    var rev = E.visitReview("end_stake");
    contains(
      rev,
      "Called me the other thing once, in the marsh, where you thought I couldn't hear.",
      "once marsh"
    );
    contains(rev, "Did not pay the toll.", "marsh jab toll line");
  })();

  /* ——— Share lines ——— */
  freshPip();
  (function () {
    var st = E.getState();
    st.daily = { date: "2026-09-26", number: 41, seed: 1 };
    st.diceLog = [20, 7, 2, 17];
    st.nodeId = "end_clause";
    var line = E.shareLine("end_clause");
    contains(line, "MERLIN #41", "daily share number");
    contains(line, "https://merlin-dnd.netlify.app", "daily share url");
    assert(line.indexOf("MERLIN #") === 0, "daily share starts MERLIN #");
  })();

  freshPip();
  (function () {
    var st = E.getState();
    st.nodeId = "end_stake";
    eq(
      E.shareLine("end_stake"),
      "Pip · The Stake · https://merlin-dnd.netlify.app",
      "non-daily share"
    );
  })();

  freshPip();
  (function () {
    setDeath("gate");
    eq(
      E.shareLine("death"),
      "Pip, clerk. Schooled to death at the castle gate. Owed 3 gold. · https://merlin-dnd.netlify.app",
      "death share"
    );
  })();

  /* ——— Gold wasted excludes toll and shop ——— */
  freshPip();
  (function () {
    var st = E.getState();
    st.gold = 20;
    st.flags = {};
    E.goTo("marsh");
    var opts = E.visibleOptions();
    var payIdx = -1;
    for (var i = 0; i < opts.length; i++) {
      if (opts[i].label === "Pay the toll") payIdx = i;
    }
    assert(payIdx >= 0, "pay the toll option present");
    E.chooseOption(payIdx, false);
    eq(E.getState().stats.goldWasted, 0, "toll does not waste gold");
  })();

  freshPip();
  (function () {
    var st = E.getState();
    st.gold = 30;
    E.goTo("hearth");
    var r = E.buyItem("tonic");
    assert(r.ok, "bought tonic");
    eq(E.getState().stats.goldWasted, 0, "shop buy does not waste gold");
  })();

  /* ——— Foyer steal crit-fail replaceLines ——— */
  freshPip();
  (function () {
    var st = E.getState();
    st.hp = 20;
    st.baseMaxHp = 20;
    E.goTo("foyer");
    var found = false;
    for (var seed = 1; seed < 8000 && !found; seed++) {
      E.installRng(seed);
      st = E.getState();
      st.nodeId = "foyer";
      st.flags = {};
      st.hp = 20;
      st.deathCause = null;
      lastRollClear();
      var opts = E.visibleOptions();
      var stealIdx = -1;
      for (var i = 0; i < opts.length; i++) {
        if (opts[i].label === "Steal the silver candlestick") stealIdx = i;
      }
      if (stealIdx < 0) continue;
      var beforeFlags = JSON.stringify(st.flags);
      var result = E.chooseOption(stealIdx, false);
      if (!result || !result.roll || !result.roll.critFail) {
        /* rewind by re-going without save pollution — reseed next */
        E.goTo("foyer");
        st = E.getState();
        st.flags = {};
        st.hp = 20;
        continue;
      }
      found = true;
      eq(result.lines.length, 1, "crit-fail steal one line");
      eq(
        result.lines[0].text,
        "The candlestick stays. Your dignity does not. Four points of pride leave with the bruise.",
        "candlestick stays only"
      );
      assert(st.flags.stealFailed, "stealFailed set");
      assert(!st.flags.stoleSilver, "stoleSilver not set on crit fail");
      void beforeFlags;
    }
    assert(found, "found a nat-1 steal within seed search");
  })();

  function lastRollClear() {
    /* goTo clears lastRoll; no direct API */
  }

  /* ——— Flee + mesmer telegraphed ——— */
  freshPip();
  (function () {
    var st = E.getState();
    st.hp = 1;
    st.baseMaxHp = 12;
    st.flags = {};
    E.goTo("fight_count");
    st = E.getState();
    assert(st.combat, "count combat started");
    st.combat.moveId = "mesmer";
    st.hp = 1;
    /* Force flee crit fail: seed until nat 1 */
    var died = false;
    for (var seed = 1; seed < 5000 && !died; seed++) {
      E.installRng(seed);
      st = E.getState();
      if (!st.combat) {
        E.goTo("fight_count");
        st = E.getState();
      }
      st.combat.moveId = "mesmer";
      st.hp = 1;
      st.deathCause = null;
      st.killingBlow = null;
      st.killingLine = null;
      var out = E.combatFlee(false);
      if (out && out.dead) {
        died = true;
        var line = E.tombstoneLine();
        contains(line, "Died running", "flee death Died running");
        notContains(line, "Stilled", "flee death not Stilled");
        eq(
          E.getState().killingLine,
          "The flight fails. You take 2.",
          "flee killingLine"
        );
      } else if (st.nodeId === "death") {
        /* already dead somehow */
        died = true;
      } else {
        /* restore combat for next try */
        if (st.nodeId !== "fight_count") {
          E.goTo("fight_count");
        }
      }
    }
    assert(died, "found flee nat-1 death");
  })();

  /* ——— restoreGate refills HP ——— */
  freshPip();
  (function () {
    var st = E.getState();
    st.hp = 1;
    st.baseMaxHp = 12;
    E.goTo("gate");
    assert(E.hasCheckpoint(), "checkpoint written");
    st.hp = 1;
    E.writeCheckpoint();
    /* die then restore */
    st.hp = 0;
    st.nodeId = "death";
    st.deathCause = "count";
    assert(E.restoreGate(), "restoreGate ok");
    st = E.getState();
    eq(st.hp, E.maxHp(), "restoreGate full HP");
    eq(st.nodeId, "gate", "restoreGate at gate");
  })();

  if (fails === 0) {
    console.log("engine ok");
  } else {
    console.error("engine FAILED (" + fails + ")");
    process.exitCode = 1;
  }
})();
