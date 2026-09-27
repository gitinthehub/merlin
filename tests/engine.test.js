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

  /* ——— Daily share line: identity, squares, attempts ——— */
  var URL = "https://merlin-dnd.netlify.app";
  var VELLUM_TOMB = "Vellum, nun. Mauled to death in the churchyard. Owed 9 gold.";

  function checks(oks) {
    var out = [];
    for (var i = 0; i < oks.length; i++) out.push({ face: 10, ok: oks[i] });
    return out;
  }

  function freshVellum(daily) {
    resetStore();
    E.newGame();
    E.selectCharacter("vellum");
    var st = E.getState();
    st.gold = 9;
    st.daily = daily || null;
    return st;
  }

  function vellumDeath(daily, oks) {
    var st = freshVellum(daily);
    st.diceLog = checks(oks);
    st.deathCause = "ghoul";
    st.nodeId = "death";
    return st;
  }

  (function () {
    var st = freshVellum({ date: "2026-09-26", number: 269, seed: 1, attempts: 1 });
    st.diceLog = checks([true, true, false, true]);
    st.nodeId = "end_stake";
    var line = E.shareLine("end_stake");
    eq(
      line,
      "MERLIN #269 🧛 Vellum · 🎲 🟩🟩🟥🟩 · Ending: The Stake · " + URL,
      "daily first-attempt ending share"
    );
    contains(line, "🟩🟩🟥🟩", "daily ending squares");
    notContains(line, "Attempt", "first attempt has no attempt count");
  })();

  (function () {
    vellumDeath({ date: "2026-09-26", number: 269, seed: 1, attempts: 1 }, [false, false, false]);
    var line = E.shareLine("death");
    eq(
      line,
      "MERLIN #269 🧛 Vellum · 🎲 🟥🟥🟥 · Ending: An Epitaph · " + VELLUM_TOMB + " · " + URL,
      "daily first-attempt death share"
    );
    contains(line, "MERLIN #269", "daily death keeps number");
    contains(line, "🟥🟥🟥", "daily death squares");
    notContains(line, "Attempt", "daily first death has no attempt count");
  })();

  (function () {
    vellumDeath({ date: "2026-09-26", number: 269, seed: 1, attempts: 2 }, [false, true, false]);
    eq(
      E.shareLine("death"),
      "MERLIN #269 🧛 Vellum · 🎲 🟥🟩🟥 · Ending: An Epitaph · " + VELLUM_TOMB + " · Attempt 2 · " + URL,
      "daily second-attempt death share"
    );
    E.getState().daily.attempts = 3;
    eq(
      E.shareLine("death"),
      "MERLIN #269 🧛 Vellum · 🎲 🟥🟩🟥 · Ending: An Epitaph · " + VELLUM_TOMB + " · Attempt 3 · " + URL,
      "daily third-attempt death share"
    );
  })();

  (function () {
    vellumDeath(null, [false, true, false]);
    var line = E.shareLine("death");
    eq(line, VELLUM_TOMB + " · " + URL, "non-daily vellum death share");
    notContains(line, "MERLIN #", "non-daily death has no daily number");
    eq(E.tombstoneLine(), VELLUM_TOMB, "vellum ghoul tombstone unchanged");
  })();

  freshPip();
  (function () {
    setDeath("gate");
    eq(
      E.tombstoneLine(),
      "Pip, clerk. Schooled to death at the castle gate. Owed 3 gold.",
      "pip gate tombstone unchanged"
    );
  })();

  freshPip();
  (function () {
    var st = E.getState();
    st.nodeId = "end_stake";
    eq(E.shareLine("end_stake"), "Pip · The Stake · " + URL, "non-daily ending share unchanged");
  })();

  freshPip();
  (function () {
    var st = E.getState();
    st.daily = { date: "2026-09-26", number: 41, seed: 1 };
    st.diceLog = [20, 7, 2, 17];
    st.nodeId = "end_clause";
    eq(
      E.shareLine("end_clause"),
      "MERLIN #41 🧛 Pip · 🎲 20 · 7 · 2 · 17 · Ending: The Correction · " + URL,
      "numeric dice log keeps number list"
    );
  })();

  resetStore();
  (function () {
    store["merlin.daily.v1"] = JSON.stringify({
      v: 1,
      date: "2026-09-26",
      number: 269,
      heroId: "vellum",
      endingId: "death",
      shareLine: VELLUM_TOMB + " · " + URL,
      review: "A short visit. One star."
    });
    var rec = E.readDailyRecord();
    assert(rec !== null, "v1 daily record still readable");
    eq(rec && rec.attempts, 1, "v1 daily record reads as one attempt");
    eq(rec && rec.shareLine, VELLUM_TOMB + " · " + URL, "v1 daily share line preserved");
  })();

  resetStore();
  (function () {
    var day = new Date(Date.UTC(2026, 8, 26, 12));
    E.startDaily(day);
    E.goTo("end_stake");
    E.startDaily(day);
    eq(E.getState().daily.attempts, 2, "second startDaily is attempt 2");
    E.goTo("end_stake");
    var raw = store["merlin.daily.v1"];
    contains(raw, "\"v\":2", "daily record is v2");
    contains(raw, "\"attempts\":2", "daily record counts attempts");
  })();

  resetStore();
  (function () {
    E.startDaily(new Date(Date.UTC(2026, 8, 26, 12)));
    E.goTo("gate");
    assert(E.restoreGate(), "daily restore 1");
    assert(E.restoreGate(), "daily restore 2");
    var st = E.getState();
    eq(st.daily.attempts, 3, "two gate restores make attempt 3");
    st.diceLog = checks([false, true, false]);
    st.deathCause = "ghoul";
    st.nodeId = "death";
    contains(E.shareLine("death"), "Attempt 3", "restored daily death shows attempt 3");
  })();

  (function () {
    var st = vellumDeath({ date: "2026-09-26", number: 269, seed: 1, attempts: 2 }, [false, true, false]);
    E.save();
    E.load();
    contains(E.shareLine("death"), "Attempt 2", "attempt count survives reload");
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

  /* ——— every death cause is complete ———

     A death cause is only half-wired if the tombstone knows it but the guest
     book does not: the run records nothing, the book shows a blank line, and the
     death scene falls back to the generic "The night keeps you." This caught
     arrival/mayor/churchyard, which had tombstones for a full pass while staying
     invisible in the book. */
  (function () {
    var D = sandbox.window.MERLIN;
    var book = D.guestBook;
    var causes = Object.keys(D.tombstone);
    assert(causes.length >= 12, "tombstone has every cause");
    for (var i = 0; i < causes.length; i++) {
      var c = causes[i];
      assert(
        book.order.indexOf(c) !== -1,
        "guest book lists cause " + c
      );
      assert(
        typeof book.hints[c] === "string" && book.hints[c].length > 20,
        "guest book hint for " + c
      );
      assert(
        typeof book.titles[c] === "string" && book.titles[c].length > 2,
        "guest book title for " + c
      );
    }
    /* every cause except the fall-through "count" has its own death scene */
    var variants = (D.nodes.death.variants || []).map(function (v) {
      return v.if && v.if.deathCause;
    });
    for (var k = 0; k < causes.length; k++) {
      if (causes[k] === "count") continue;
      assert(
        variants.indexOf(causes[k]) !== -1,
        "death scene variant for " + causes[k]
      );
    }
    /* and its own epitaph in the book — the default line is not good enough */
    var epi = (D.epitaphs && D.epitaphs.death) || {};
    for (var e = 0; e < causes.length; e++) {
      assert(
        typeof epi[causes[e]] === "string" && epi[causes[e]].length > 10,
        "guest book epitaph for " + causes[e]
      );
    }
  })();

  /* ——— the three causes added in pass 11, driven for real ———

     Seed 7 crit-fails each of these checks at 1 HP, so the death, its cause, its
     tombstone and its guest-book entry are all produced by the engine rather than
     asserted by hand. Before emptyDeaths() knew these causes they rendered a
     tombstone but recorded nothing in the book. */
  [
    ["arrival", "Tell me something I can use",
      "Pip, clerk. Quoted to death at the village gate. Owed 3 gold."],
    ["mayor", "Pay me first",
      "Pip, clerk. Taxed to death in the square. Owed 3 gold."],
    ["churchyard", "Sneak the long way past",
      "Pip, clerk. Shovelled to death in the churchyard. Owed 3 gold."]
  ].forEach(function (t) {
    var cause = t[0], label = t[1], epitaph = t[2];
    freshPip();
    E.goTo(cause);
    var st = E.getState();
    st.hp = 1;
    st.gold = 3;
    var opts = E.visibleOptions(E.resolveNode(cause));
    var idx = -1;
    for (var i = 0; i < opts.length; i++) {
      if (opts[i].label === label) { idx = i; break; }
    }
    assert(idx >= 0, cause + ": option '" + label + "' is offered");
    E.installRng(7);
    E.chooseOption(idx, false);

    st = E.getState();
    eq(st.nodeId, "death", cause + ": a real roll kills at 1 HP");
    eq(st.deathCause, cause, cause + ": the death carries its own cause");
    eq(E.tombstoneLine(), epitaph, cause + ": tombstone names the place");

    /* recorded in the guest book, and shown as a death (not as an ending) */
    var view = E.fatesView();
    var row = null;
    for (var r = 0; r < view.rows.length; r++) {
      if (view.rows[r].id === cause) { row = view.rows[r]; break; }
    }
    assert(row !== null, cause + ": has a guest book row");
    eq(row.found, true, cause + ": recorded in the guest book");
    assert(row.title !== "—", cause + ": row shows a title, not a dash");
    assert(
      typeof row.line === "string" && row.line.length > 10,
      cause + ": row shows the Count's epitaph for this death"
    );
    var others = view.rows.filter(function (x) {
      return x.id !== cause && x.found && x.id !== "polite_bat";
    });
    eq(others.length, 0, cause + ": records no other cause");

    /* and the death screen shows this cause's own line, not the generic one */
    var snap = E.snapshot();
    var body = JSON.stringify(snap);
    assert(
      body.indexOf("The night keeps you.") === -1,
      cause + ": death scene is not the generic line"
    );
  });

  /* ——— a square means "that roll succeeded" ——— */
  freshPip();
  (function () {
    var st = E.getState();
    st.daily = { date: "2026-09-27", number: 270, seed: 1, attempts: 1 };
    /* every roll marked => squares */
    st.diceLog = [
      { face: 15, ok: true },
      { face: 17, ok: true },
      { face: 5, ok: false }
    ];
    contains(E.shareLine("end_stake"), "🎲 🟩🟩🟥", "marked log renders squares");
    /* a save written before squares existed: marked rolls still square up,
       unmarked ones show the face, and the join switches to " · " */
    st.diceLog = [{ face: 15, ok: true }, { face: 17, ok: null }];
    contains(E.shareLine("end_stake"), "🎲 🟩 · 17", "mixed log interleaves square and face");
    /* bare numbers only (an all-unmarked old save) */
    st.diceLog = [15, 17];
    contains(E.shareLine("end_stake"), "🎲 15 · 17", "old save renders numbers only");
    notContains(E.shareLine("end_stake"), "🟩", "no squares when nothing is marked");
    /* empty log */
    st.diceLog = [];
    contains(E.shareLine("end_stake"), "🎲 —", "empty log renders a dash");
  })();

  if (fails === 0) {
    console.log("engine ok");
  } else {
    console.error("engine FAILED (" + fails + ")");
    process.exitCode = 1;
  }
})();
