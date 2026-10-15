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
assert(arc.endings && arc.endings.length === 3, "three endings");

var choiceCount = 0;
var ci;
var ch;
var choices;
for (ci = 0; ci < arc.chapters.length; ci++) {
  choices = arc.chapters[ci].choices || [];
  choiceCount += choices.length;
  for (ch = 0; ch < choices.length; ch++) {
    var c = choices[ch];
    var cons = c.consequences;
    if (cons && cons.complication && cons.failure) {
      assert(
        cons.complication.next !== cons.failure.next,
        "no complication next equals its failure next for " + c.id
      );
    }
  }
}
assert(choiceCount === 14, "fourteen choices");

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
Loop.choose(runHour, "nim-water-tower", { rng: Dice.sequence([11]) });
Loop.continueRun(runHour);
assert(runHour.nodeId === "switch-house", "hour path switch-house");
Loop.choose(runHour, "pell-crank", { rng: Dice.sequence([14, 2]) });
Loop.continueRun(runHour);
assert(runHour.nodeId === "relay-tower", "hour path relay-tower");
Loop.choose(runHour, "nim-read-plate", { rng: Dice.sequence([8]) });
Loop.continueRun(runHour);
assert(runHour.nodeId === "end-hour", "seed 7 path reaches end-hour");

var runStatic = Loop.createRun(bundle, { characters: bundle.characters, seed: 7 });
Loop.choose(runStatic, "nim-water-tower", { rng: Dice.sequence([1]) });
Loop.continueRun(runStatic);
assert(runStatic.nodeId === "salt-flat", "static path salt-flat");
Loop.choose(runStatic, "nim-follow-paint", { rng: Dice.sequence([15]) });
Loop.continueRun(runStatic);
assert(runStatic.nodeId === "relay-tower-dark", "static path dark relay");
Loop.choose(runStatic, "nim-count-the-plate", { rng: Dice.sequence([5]) });
Loop.continueRun(runStatic);
assert(runStatic.nodeId === "end-static", "seed 7 missed-Pell path reaches end-static");

var runTrade = Loop.createRun(bundle, { characters: bundle.characters, seed: 7 });
var threw = false;
try {
  Loop.choose(runTrade, "nim-trade-water", { rng: Dice.sequence([1]) });
} catch (e) {
  threw = true;
}
assert(threw, "nim-trade-water sequence([1]) throws sequence exhausted");

var runTradeC = Loop.createRun(bundle, { characters: bundle.characters, seed: 7 });
Loop.choose(runTradeC, "nim-trade-water", { rng: Dice.sequence([1, 1]) });
var view = Loop.view(runTradeC);
assert(
  view.outcome && view.outcome.next === "relay-tower-dark",
  "nim-trade-water sequence([1, 1]) next is relay-tower-dark"
);

var badRun = Loop.createRun(bundle, { seed: 7 });
var actorFail = false;
try {
  Loop.choose(badRun, "nim-water-tower", { rng: Dice.sequence([10]) });
} catch (e) {
  actorFail = true;
}
assert(actorFail, "createRun without characters throws unknown actor on nim-water-tower");

if (fails === 0) {
  console.log("cinder-mile ok");
} else {
  console.error("cinder-mile FAILED (" + fails + ")");
  process.exitCode = 1;
}
