/* Oronath play surface — Node-only. A document stand-in, not a browser. */
"use strict";

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var fails = 0;
var root = path.join(__dirname, "..");
var SAVE_KEY = "oronath.save.v1";
var SAME_WARN =
  "This story has a run in progress at Chapter 2 — Crosshaven Market. Beginning again replaces it.";

function assert(cond, msg) {
  if (!cond) {
    fails += 1;
    console.error("FAIL: " + msg);
  }
}

function makeNode(tag) {
  var node = {
    tagName: tag,
    className: "",
    id: "",
    type: "",
    href: "",
    disabled: false,
    textContent: "",
    children: [],
    parentNode: null,
    style: {},
    listeners: {},
    appendChild: function (child) {
      if (child.parentNode) {
        var old = child.parentNode.children;
        var at = old.indexOf(child);
        if (at !== -1) old.splice(at, 1);
      }
      child.parentNode = node;
      node.children.push(child);
      return child;
    },
    removeChild: function (child) {
      var at = node.children.indexOf(child);
      if (at !== -1) node.children.splice(at, 1);
      child.parentNode = null;
      return child;
    },
    addEventListener: function (type, fn) {
      node.listeners[type] = fn;
    },
    setAttribute: function (k, v) {
      node[k] = v;
    },
    click: function () {
      if (node.disabled) return;
      if (node.listeners.click) node.listeners.click();
    }
  };
  Object.defineProperty(node, "firstChild", {
    get: function () {
      return node.children[0] || null;
    }
  });
  return node;
}

function makeStorage() {
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
    }
  };
}

function textOf(node) {
  if (!node) return "";
  var s = node.textContent || "";
  var i;
  for (i = 0; i < node.children.length; i++) s += textOf(node.children[i]);
  return s;
}

function walk(node, fn) {
  fn(node);
  var i;
  for (i = 0; i < node.children.length; i++) walk(node.children[i], fn);
}

function buttonsIn(node) {
  var out = [];
  walk(node, function (n) {
    if (n.tagName === "button") out.push(n);
  });
  return out;
}

function byText(list, text) {
  var i;
  for (i = 0; i < list.length; i++) {
    if (list[i].textContent === text) return list[i];
  }
  return null;
}

function buttonStarts(node, prefix) {
  var list = buttonsIn(node);
  var i;
  for (i = 0; i < list.length; i++) {
    if (list[i].textContent.indexOf(prefix) === 0) return list[i];
  }
  return null;
}

function articleTitled(node, title) {
  var found = null;
  walk(node, function (n) {
    if (found || n.tagName !== "article") return;
    var headed = false;
    walk(n, function (c) {
      if (!headed && c.tagName === "h2" && c.textContent === title) headed = true;
    });
    if (headed) found = n;
  });
  return found;
}

function kickerText(node) {
  var found = null;
  walk(node, function (n) {
    if (found) return;
    if (n.className && String(n.className).indexOf("oronath-kicker") !== -1) {
      found = n.textContent;
    }
  });
  return found;
}

function loadScript(sandbox, rel) {
  vm.runInNewContext(fs.readFileSync(path.join(root, rel), "utf8"), sandbox, {
    filename: rel
  });
}

function boot(prep) {
  var store = makeStorage();
  var app = makeNode("div");
  app.id = "app";
  var document = {
    getElementById: function (id) {
      return id === "app" ? app : null;
    },
    createElement: function (tag) {
      return makeNode(tag);
    }
  };
  var sandbox = {
    console: console,
    localStorage: store,
    document: document
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  var files = [
    "dice.js",
    "arc.js",
    "characters.js",
    "sample-arc.js",
    "arcs/last-signal.js",
    "arcs/pale-hand.js",
    "loop.js",
    "persist.js",
    "stories.js"
  ];
  var i;
  for (i = 0; i < files.length; i++) loadScript(sandbox, files[i]);
  if (prep) prep(sandbox, store);
  loadScript(sandbox, "oronath-ui.js");
  return { app: app, store: store, sandbox: sandbox };
}

function parkCrosshaven(sandbox, store) {
  var Loop = sandbox.OronathLoop;
  var Persist = sandbox.OronathPersist;
  var Dice = sandbox.OronathDice;
  var arc = sandbox.OronathArcBundles["pale-hand"];
  var run = Loop.createRun(arc, { characters: arc.characters, seed: 1 });
  Loop.choose(run, "jin-sewers", { rng: Dice.sequence([10]) });
  Loop.continueRun(run);
  Persist.save(run, store);
}

var parked = boot(parkCrosshaven);
var storiesBtn = byText(buttonsIn(parked.app), "Stories");
assert(storiesBtn, "mid-run screen has Stories");
storiesBtn.click();
var picker = textOf(parked.app);
assert(picker.indexOf(SAME_WARN) !== -1, "same-story warning on the card");
assert(
  picker.indexOf("Your run in The Pale Hand is saved") !== -1,
  "other card warns about the saved run"
);
var paleCard = articleTitled(parked.app, "The Pale Hand");
assert(paleCard, "pale hand card");
var paleBegin = byText(buttonsIn(paleCard), "Begin");
assert(paleBegin, "pale hand Begin");
paleBegin.click();
assert(textOf(parked.app).indexOf(SAME_WARN) !== -1, "warning on the title");
var titleBegin = byText(buttonsIn(parked.app), "Begin");
assert(titleBegin, "title Begin");
titleBegin.click();
var replaced = JSON.parse(parked.store.getItem(SAVE_KEY));
assert(replaced && replaced.nodeId === "lantern-quarter", "title Begin replaces the run");

var armed = boot(parkCrosshaven);
var newRun = byText(buttonsIn(armed.app), "New Run");
assert(newRun, "footer New Run");
newRun.click();
assert(armed.store.getItem(SAVE_KEY), "key still present after one click");
var again = byText(buttonsIn(armed.app), "Press again to start over");
assert(again, "armed label");
again.click();
assert(armed.store.getItem(SAVE_KEY) == null, "second click clears the key");
assert(
  textOf(armed.app).indexOf("Choose a story") !== -1,
  "second click opens the picker"
);

var pathUi = boot(function (sandbox, store) {
  var Loop = sandbox.OronathLoop;
  var Persist = sandbox.OronathPersist;
  var Dice = sandbox.OronathDice;
  var arc = sandbox.OronathArcBundles["pale-hand"];
  var run = Loop.createRun(arc, { characters: arc.characters, seed: 4 });
  Loop.choose(run, "jin-rooftops", { rng: Dice.sequence([1]) });
  Persist.save(run, store);
});
assert(kickerText(pathUi.app) === "Chapter 1", "outcome kicker is Chapter 1");
assert(
  kickerText(pathUi.app).indexOf("of") === -1,
  "outcome kicker drops of M"
);
var cont = buttonStarts(pathUi.app, "Continue");
assert(cont, "continue button");
cont.click();
assert(kickerText(pathUi.app) === "Chapter 2", "toll-bridge kicker is Chapter 2");
assert(
  kickerText(pathUi.app).indexOf("of") === -1,
  "choose kicker drops of M"
);

var finished = boot(function (sandbox, store) {
  store.setItem(
    SAVE_KEY,
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
});
var finishedText = textOf(finished.app);
assert(finishedText.indexOf("Choose a story") !== -1, "resolved save lands on the picker");
assert(finishedText.indexOf("Ended: The Hand Turns") !== -1, "card names the ending");
assert(finishedText.indexOf("RESOLUTION") === -1, "resolved save does not open the resolution");
var finishedPale = articleTitled(finished.app, "The Pale Hand");
assert(byText(buttonsIn(finishedPale), "Begin"), "finished card offers Begin");
assert(!buttonStarts(finishedPale, "Resume"), "finished card has no Resume");
var other = articleTitled(finished.app, "The Last Signal of Oronath");
assert(
  textOf(other).indexOf("is saved — beginning this story will replace it.") === -1,
  "other card does not warn about a finished run"
);

if (fails === 0) {
  console.log("oronath-ui ok");
} else {
  console.error("oronath-ui FAILED (" + fails + ")");
  process.exitCode = 1;
}
