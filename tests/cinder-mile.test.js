/* Cinder Mile arc — Node-only. */
"use strict";

var fs = require("fs");
var path = require("path");
var Arc = require("../arc.js");
var Build = require("../tools/build-arc.js");
var Dice = require("../dice.js");
var Loop = require("../loop.js");

var fails = 0;
var root = path.join(__dirname, "..");
var headMode = !!process.env.MERLIN_HEAD;

function assert(cond, msg) {
  if (!cond) {
    fails += 1;
    console.error("FAIL: " + msg);
  }
}

var jsonPath = headMode
  ? path.join(process.env.MERLIN_HEAD, "arcs", "cinder-mile.json")
  : path.join(root, "arcs", "cinder-mile.json");
var jsPath = headMode
  ? path.join(process.env.MERLIN_HEAD, "arcs", "cinder-mile.js")
  : path.join(root, "arcs", "cinder-mile.js");

assert(fs.existsSync(jsonPath), "arcs/cinder-mile.json exists");
assert(fs.existsSync(jsPath), "arcs/cinder-mile.js exists");

if (!fs.existsSync(jsonPath) || !fs.existsSync(jsPath)) {
  if (fails === 0) {
    console.log("cinder-mile ok");
  } else {
    console.error("cinder-mile FAILED (" + fails + ")");
    process.exitCode = 1;
  }
  process.exit(process.exitCode || 0);
}

var arc = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
var v = Arc.validateArc(arc);
assert(v.ok, "validateArc ok");
assert(v.errors.length === 0, "validateArc errors length 0");

assert(arc.id === "cinder-mile", "id cinder-mile");
assert(arc.chapters && arc.chapters.length === 5, "five chapters");
assert(arc.endings && arc.endings.length === 6, "six endings");

var choiceCount = 0;
var actors = { nim: 0, pell: 0, maro: 0 };
var traitHits = {};
var ci;
var ch;
var choices;
for (ci = 0; ci < arc.chapters.length; ci++) {
  choices = arc.chapters[ci].choices || [];
  choiceCount += choices.length;
  for (ch = 0; ch < choices.length; ch++) {
    var c = choices[ch];
    if (actors[c.actor] != null) actors[c.actor] += 1;
    var tags = (c.roll && c.roll.tags) || [];
    var ti;
    for (ti = 0; ti < tags.length; ti++) traitHits[tags[ti]] = true;
    var cons = c.consequences;
    if (cons && cons.complication && cons.failure) {
      assert(
        cons.complication.next !== cons.failure.next,
        "no complication next equals its failure next for " + c.id
      );
    }
  }
}
assert(choiceCount === 15, "fifteen choices");
assert(actors.nim === 5, "nim acts in 5 choices, got " + actors.nim);
assert(actors.pell === 5, "pell acts in 5 choices, got " + actors.pell);
assert(actors.maro === 5, "maro acts in 5 choices, got " + actors.maro);
var needTraits = [
  "road-sense",
  "light-hands",
  "bad-knee",
  "solder",
  "night-shift",
  "wet-brush",
  "long-memory"
];
var tr;
for (tr = 0; tr < needTraits.length; tr++) {
  assert(traitHits[needTraits[tr]] === true, "trait covered " + needTraits[tr]);
}

var tmpOut = path.join(require("os").tmpdir(), "cinder-mile-build-" + process.pid + ".js");
var built = Build.bundleFromFile(jsonPath, tmpOut);
assert(built.written, "fresh bundle writes");
var builtBytes = fs.readFileSync(tmpOut, "utf8");
var committedBytes = fs.readFileSync(jsPath, "utf8");
assert(builtBytes === committedBytes, "fresh bundle matches committed cinder-mile.js");
try {
  fs.unlinkSync(tmpOut);
} catch (e) {
  /* ignore */
}

delete require.cache[require.resolve(jsPath)];
global.OronathArcBundles = {};
global.OronathArcBundle = undefined;
require(jsPath);
assert(global.OronathArcBundles["cinder-mile"], "bundle on map");
assert(
  global.OronathArcBundle && global.OronathArcBundle.id === "cinder-mile",
  "require of the bundle sets OronathArcBundles[\"cinder-mile\"] and OronathArcBundle.id cinder-mile"
);

var Stories = require("../stories.js");
var entry = Stories.get("cinder-mile");
assert(entry && entry.cast.join(", ") === "Nim, Pell, Maro", "Stories.list cast for cinder-mile is Nim, Pell, Maro");

var deny = [
  "Vault-Tec",
  "Pip-Boy",
  "Nuka-Cola",
  "Brotherhood of Steel",
  "Deathclaw",
  "Super Mutant"
];
var blob = (fs.readFileSync(jsonPath, "utf8") + builtBytes).toLowerCase();
var di;
for (di = 0; di < deny.length; di++) {
  assert(blob.indexOf(deny[di].toLowerCase()) === -1, "denylist absent " + deny[di]);
}

var bundle = global.OronathArcBundles["cinder-mile"];
var runHour = Loop.createRun(bundle, { characters: bundle.characters, seed: 7 });
Loop.choose(runHour, "nim-give-the-oil", { rng: Dice.sequence([11, 3]) });
Loop.continueRun(runHour);
assert(runHour.nodeId === "switch-house", "oil path switch-house");
Loop.choose(runHour, "pell-send-the-true", { rng: Dice.sequence([14, 2]) });
Loop.continueRun(runHour);
assert(runHour.nodeId === "end-hour", "oil path reaches end-hour");

var runSpill = Loop.createRun(bundle, { characters: bundle.characters, seed: 7 });
Loop.choose(runSpill, "nim-give-the-oil", { rng: Dice.sequence([4, 3]) });
Loop.continueRun(runSpill);
assert(runSpill.nodeId === "relay-dark", "spilled oil reaches relay-dark");
Loop.choose(runSpill, "nim-count-the-posts", { rng: Dice.sequence([12]) });
Loop.continueRun(runSpill);
assert(runSpill.nodeId === "end-map", "dark count reaches end-map");

var runSpoken = Loop.createRun(bundle, { characters: bundle.characters, seed: 7 });
Loop.choose(runSpoken, "maro-say-the-mile", { rng: Dice.sequence([11]) });
Loop.continueRun(runSpoken);
assert(runSpoken.nodeId === "salt-flat", "spoken mile salt-flat");
Loop.choose(runSpoken, "nim-keep-the-spoken", { rng: Dice.sequence([9]) });
Loop.continueRun(runSpoken);
assert(runSpoken.nodeId === "end-map", "spoken mile reaches end-map");

var runSolder = Loop.createRun(bundle, { characters: bundle.characters, seed: 7 });
Loop.choose(runSolder, "pell-burn-the-solder", { rng: Dice.sequence([12]) });
Loop.continueRun(runSolder);
assert(runSolder.nodeId === "relay", "spent solder relay");
Loop.choose(runSolder, "maro-overpaint", { rng: Dice.sequence([5]) });
Loop.continueRun(runSolder);
assert(runSolder.nodeId === "end-posts", "spent solder reaches end-posts");

var runLie = Loop.createRun(bundle, { characters: bundle.characters, seed: 7 });
Loop.choose(runLie, "maro-say-the-mile", { rng: Dice.sequence([11]) });
Loop.continueRun(runLie);
assert(runLie.nodeId === "salt-flat", "repainted lie salt-flat");
Loop.choose(runLie, "maro-take-it-back", { rng: Dice.sequence([3, 4]) });
Loop.continueRun(runLie);
assert(runLie.nodeId === "end-posts", "repainted lie reaches end-posts");

var runCold = Loop.createRun(bundle, { characters: bundle.characters, seed: 7 });
Loop.choose(runCold, "pell-burn-the-solder", { rng: Dice.sequence([1]) });
Loop.continueRun(runCold);
assert(runCold.nodeId === "end-ash", "cold-solder complication reaches end-ash");

var runTrade = Loop.createRun(bundle, { characters: bundle.characters, seed: 7 });
var threw = false;
try {
  Loop.choose(runTrade, "nim-give-the-oil", { rng: Dice.sequence([1]) });
} catch (e) {
  threw = true;
}
assert(threw, "nim-give-the-oil sequence([1]) throws sequence exhausted");

var runTradeC = Loop.createRun(bundle, { characters: bundle.characters, seed: 7 });
Loop.choose(runTradeC, "nim-give-the-oil", { rng: Dice.sequence([1, 1]) });
var view = Loop.view(runTradeC);
assert(
  view.outcome && view.outcome.next === "end-ash",
  "nim-give-the-oil sequence([1, 1]) next is end-ash"
);

var badRun = Loop.createRun(bundle, { seed: 7 });
var actorFail = false;
try {
  Loop.choose(badRun, "nim-give-the-oil", { rng: Dice.sequence([10]) });
} catch (e) {
  actorFail = true;
}
assert(actorFail, "createRun without characters throws unknown actor on nim-give-the-oil");

if (fails === 0) {
  console.log("cinder-mile ok");
} else {
  console.error("cinder-mile FAILED (" + fails + ")");
  process.exitCode = 1;
}
