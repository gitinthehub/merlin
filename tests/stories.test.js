/* Oronath — story registry and save peek. Node-only. */
"use strict";

var fs = require("fs");
var path = require("path");
var Arc = require("../arc.js");
var Loop = require("../loop.js");
var Persist = require("../persist.js");

var fails = 0;

function assert(cond, msg) {
  if (!cond) {
    fails += 1;
    console.error("FAIL: " + msg);
  }
}

function memoryStorage() {
  var map = {};
  var sets = 0;
  var removes = 0;
  return {
    getItem: function (k) {
      return Object.prototype.hasOwnProperty.call(map, k) ? map[k] : null;
    },
    setItem: function (k, v) {
      sets += 1;
      map[k] = String(v);
    },
    removeItem: function (k) {
      removes += 1;
      delete map[k];
    },
    sets: function () {
      return sets;
    },
    removes: function () {
      return removes;
    }
  };
}

function loadBundles() {
  global.OronathArcBundles = {};
  global.OronathArcBundle = undefined;
  var lastPath = path.join(__dirname, "..", "arcs", "last-signal.js");
  var palePath = path.join(__dirname, "..", "arcs", "pale-hand.js");
  delete require.cache[require.resolve(lastPath)];
  delete require.cache[require.resolve(palePath)];
  require(lastPath);
  require(palePath);
}

loadBundles();
var Stories = require("../stories.js");

var list = Stories.list();
assert(list.length === 2, "two stories registered, got " + list.length);
assert(global.OronathArcBundle && global.OronathArcBundle.id === "pale-hand", "singular bundle is last writer");
assert(list[0] && list[0].id === "last-signal", "first id last-signal");
assert(list[1] && list[1].id === "pale-hand", "second id pale-hand");

assert(list[0] && list[0].title === "The Last Signal of Oronath", "last-signal title");
assert(
  list[0] && list[0].blurb === "Three travellers. A signal that should have died.",
  "last-signal blurb"
);
assert(list[0] && list[0].pitch && list[0].pitch.length > 0, "last-signal pitch");
assert(list[0] && list[0].chapterCount === 4, "last-signal chapters");
assert(
  list[0] && list[0].cast.join(",") === "John,Joel,Rafe",
  "last-signal cast"
);

assert(list[1] && list[1].title === "The Pale Hand", "pale-hand title");
assert(
  list[1] &&
    list[1].blurb === "A stolen ledger, and the Pale Hand already on the north road.",
  "pale-hand blurb"
);
assert(list[1] && list[1].pitch && list[1].pitch.length > 0, "pale-hand pitch");
assert(list[1] && list[1].chapterCount === 5, "pale-hand chapters");
assert(
  list[1] && list[1].cast.join(",") === "Jin,Wren,Thorne",
  "pale-hand cast"
);

var i;
for (i = 0; i < list.length; i++) {
  var validated = Arc.validateArc(list[i].arc);
  assert(validated.ok, "listed arc validates " + list[i].id);
}

global.OronathArcBundles = {};
global.OronathArcBundle = undefined;
global.OronathSample = require("../sample-arc.js");
assert(Stories.list().length === 0, "empty registry lists nothing");
assert(Stories.fallback() && Stories.fallback().id === "sample-wick", "sample fallback");

loadBundles();
assert(Stories.list().length === 2, "registry restored");
var lastEntry = Stories.get("last-signal");
var paleEntry = Stories.get("pale-hand");
assert(lastEntry && lastEntry.id === "last-signal", "get last-signal");
assert(Stories.get("missing") === null, "get missing");

var lastArc = lastEntry ? lastEntry.arc : null;
var paleArc = paleEntry ? paleEntry.arc : null;
if (!lastArc || !paleArc) {
  assert(false, "both arcs present for save peek");
} else {
var savedRun = Loop.createRun(lastArc, { characters: lastArc.characters, seed: 1 });
var store = memoryStorage();
Persist.save(savedRun, store);
var beforeSets = store.sets();
var beforeRemoves = store.removes();
var beforeRaw = store.getItem(Persist.SAVE_KEY);
var ready = Stories.savedArc(store);
assert(Stories.saveStatus(store) === "ready", "status ready");
assert(ready && ready.arc && ready.arc.id === "last-signal", "saved arc last-signal");
assert(ready && ready.nodeId === "signal-tree", "saved node signal-tree");
assert(ready && ready.chapterNumber === 1, "signal-tree is chapter 1");
assert(ready && ready.chapterTitle === "The Signal Tree", "signal-tree title");
assert(ready && ready.phase === "choose", "saved phase choose");
assert(store.sets() === beforeSets, "ready peek did not setItem");
assert(store.removes() === beforeRemoves, "ready peek did not removeItem");
assert(store.getItem(Persist.SAVE_KEY) === beforeRaw, "ready peek left bytes");

var paleRun = Loop.createRun(paleArc, { characters: paleArc.characters, seed: 2 });
Loop.choose(paleRun, "jin-sewers", { rng: require("../dice.js").sequence([10]) });
Loop.continueRun(paleRun);
assert(paleRun.nodeId === "crosshaven", "setup parked on crosshaven");
var paleStore = memoryStorage();
Persist.save(paleRun, paleStore);
var paleSaved = Stories.savedArc(paleStore);
assert(Stories.saveStatus(paleStore) === "ready", "pale status ready");
assert(paleSaved && paleSaved.chapterNumber === 2, "crosshaven is chapter 2");
assert(paleSaved && paleSaved.arcId === "pale-hand", "pale saved arcId");

var endStore = memoryStorage();
endStore.setItem(
  Persist.SAVE_KEY,
  JSON.stringify({
    version: 1,
    arcId: "pale-hand",
    seed: 1,
    rng: { a: 1 },
    nodeId: "end-hand-turns",
    phase: "resolved",
    outcome: null,
    history: [],
    diceLog: [],
    characters: [],
    resolvedThreads: ["jin-ledger", "wren-band", "thorne-resistance"]
  })
);
var endSaved = Stories.savedArc(endStore);
assert(Stories.saveStatus(endStore) === "ready", "ending status ready");
assert(endSaved && endSaved.chapterNumber === null, "ending has no chapter number");
assert(endSaved && endSaved.nodeId === "end-hand-turns", "ending node");
}

function peekUntouched(raw, status, label) {
  var s = memoryStorage();
  s.setItem(Persist.SAVE_KEY, raw);
  var snapshot = s.getItem(Persist.SAVE_KEY);
  var sets = s.sets();
  var removes = s.removes();
  var got = Stories.savedArc(s);
  assert(got === null, label + " savedArc null");
  assert(Stories.saveStatus(s) === status, label + " status " + status);
  assert(s.getItem(Persist.SAVE_KEY) === snapshot, label + " bytes unchanged");
  assert(s.sets() === sets, label + " no setItem");
  assert(s.removes() === removes, label + " no removeItem");
}

var empty = memoryStorage();
assert(Stories.savedArc(empty) === null, "empty savedArc null");
assert(Stories.saveStatus(empty) === "empty", "empty status");
assert(empty.sets() === 0 && empty.removes() === 0, "empty peek writes nothing");

peekUntouched("{not json", "unusable", "bad-json");
peekUntouched(
  JSON.stringify({
    version: 2,
    arcId: "last-signal",
    seed: 1,
    rng: { a: 1 },
    nodeId: "signal-tree",
    phase: "choose",
    history: [],
    diceLog: []
  }),
  "unusable",
  "version-2"
);
peekUntouched(
  JSON.stringify({
    version: 1,
    arcId: "no-such-story",
    seed: 1,
    rng: { a: 1 },
    nodeId: "signal-tree",
    phase: "choose",
    history: [],
    diceLog: []
  }),
  "foreign",
  "foreign-arc"
);
peekUntouched(
  JSON.stringify({
    version: 1,
    arcId: "last-signal",
    seed: 1,
    rng: { a: 1 },
    nodeId: "no-such-node",
    phase: "choose",
    history: [],
    diceLog: []
  }),
  "unusable",
  "unknown-node"
);

var otherKey = memoryStorage();
otherKey.setItem(
  "not-the-save-key",
  JSON.stringify({
    version: 1,
    arcId: "last-signal",
    seed: 1,
    rng: { a: 1 },
    nodeId: "signal-tree",
    phase: "choose",
    history: [],
    diceLog: []
  })
);
assert(Stories.savedArc(otherKey) === null, "ignores a key other than SAVE_KEY");
assert(Stories.saveStatus(otherKey) === "empty", "other key is empty slot");
assert(
  otherKey.getItem("not-the-save-key") !== null,
  "other key left in place"
);

if (fails === 0) {
  console.log("stories ok");
} else {
  console.error("stories FAILED (" + fails + ")");
  process.exitCode = 1;
}
