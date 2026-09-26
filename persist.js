/* MERLIN / Oronath — arc-run persistence. Separate key from v1 merlin.save.v1. */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.OronathPersist = api;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";

  var SAVE_KEY = "oronath.save.v1";
  var VERSION = 1;

  function loopApi() {
    if (root && root.OronathLoop) return root.OronathLoop;
    if (typeof require === "function") return require("./loop.js");
    throw new Error("OronathLoop not loaded");
  }

  function diceApi() {
    if (root && root.OronathDice) return root.OronathDice;
    if (typeof require === "function") return require("./dice.js");
    throw new Error("OronathDice not loaded");
  }

  function defaultStorage() {
    if (typeof localStorage !== "undefined") return localStorage;
    return null;
  }

  function findById(list, id) {
    var i;
    for (i = 0; i < (list || []).length; i++) {
      if (list[i] && list[i].id === id) return list[i];
    }
    return null;
  }

  function serialize(run) {
    var Loop = loopApi();
    var rngState = Loop.exportRngState(run);
    return {
      version: VERSION,
      arcId: run.arcId,
      seed: run.seed,
      rng: { a: rngState.a >>> 0 },
      nodeId: run.nodeId,
      phase: run.phase,
      outcome: run.outcome
        ? {
            chapterId: run.outcome.chapterId,
            choiceId: run.outcome.choiceId,
            actorId: run.outcome.actorId,
            branch: run.outcome.branch,
            result: run.outcome.result,
            check: run.outcome.check,
            consequence: run.outcome.consequence
          }
        : null,
      history: run.history || [],
      diceLog: run.diceLog || [],
      characters: run.characters || [],
      resolvedThreads: run.resolvedThreads || []
    };
  }

  function save(run, storage) {
    storage = storage || defaultStorage();
    if (!storage) return false;
    try {
      storage.setItem(SAVE_KEY, JSON.stringify(serialize(run)));
      return true;
    } catch (e) {
      return false;
    }
  }

  function clear(storage) {
    storage = storage || defaultStorage();
    if (!storage) return;
    try {
      storage.removeItem(SAVE_KEY);
    } catch (e) {
      /* ignore */
    }
  }

  function reject(storage, reason) {
    clear(storage);
    return { ok: false, reason: reason, run: null };
  }

  function load(arc, storage) {
    storage = storage || defaultStorage();
    if (!storage || !arc) return { ok: false, reason: "missing", run: null };

    var raw;
    try {
      raw = storage.getItem(SAVE_KEY);
    } catch (e) {
      return reject(storage, "storage-error");
    }
    if (raw == null || raw === "") {
      return { ok: false, reason: "empty", run: null };
    }

    var blob;
    try {
      blob = JSON.parse(raw);
    } catch (e) {
      return reject(storage, "bad-json");
    }

    if (!blob || typeof blob !== "object") {
      return reject(storage, "not-object");
    }
    if (blob.version !== VERSION) {
      return reject(storage, "version");
    }
    if (blob.arcId !== arc.id) {
      return reject(storage, "arcId");
    }
    if (!blob.rng || typeof blob.rng.a !== "number" || isNaN(blob.rng.a)) {
      return reject(storage, "rng");
    }
    if (
      blob.phase !== "choose" &&
      blob.phase !== "outcome" &&
      blob.phase !== "resolved"
    ) {
      return reject(storage, "phase");
    }
    if (!blob.nodeId) {
      return reject(storage, "nodeId");
    }
    var chapter = findById(arc.chapters, blob.nodeId);
    var ending = findById(arc.endings, blob.nodeId);
    if (!chapter && !ending) {
      return reject(storage, "unknown-node");
    }
    if (
      !Array.isArray(blob.history) ||
      !Array.isArray(blob.diceLog) ||
      blob.history.length !== blob.diceLog.length
    ) {
      return reject(storage, "history-mismatch");
    }
    if (blob.phase === "outcome") {
      if (
        !blob.outcome ||
        !blob.outcome.result ||
        !blob.outcome.result.faces ||
        !blob.outcome.consequence
      ) {
        return reject(storage, "outcome");
      }
    }

    var Dice = diceApi();
    var run = {
      arcId: arc.id,
      arc: arc,
      seed: blob.seed >>> 0,
      rng: Dice.rngFromState({ a: blob.rng.a >>> 0 }),
      nodeId: blob.nodeId,
      phase: blob.phase,
      outcome: blob.phase === "outcome" ? blob.outcome : null,
      history: blob.history,
      diceLog: blob.diceLog,
      characters: blob.characters || [],
      resolvedThreads: blob.resolvedThreads || []
    };
    return { ok: true, reason: null, run: run };
  }

  function hasSave(storage) {
    storage = storage || defaultStorage();
    if (!storage) return false;
    try {
      return !!storage.getItem(SAVE_KEY);
    } catch (e) {
      return false;
    }
  }

  return {
    SAVE_KEY: SAVE_KEY,
    VERSION: VERSION,
    serialize: serialize,
    save: save,
    load: load,
    clear: clear,
    hasSave: hasSave
  };
});
