/* MERLIN / Oronath — story registry. Lists bundled arcs. Peeks the save; never writes it. */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.OronathStories = api;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";

  function persistApi() {
    if (root && root.OronathPersist) return root.OronathPersist;
    if (typeof require === "function") return require("./persist.js");
    throw new Error("OronathPersist not loaded");
  }

  function bundleMap() {
    if (root && root.OronathArcBundles) return root.OronathArcBundles;
    return {};
  }

  function defaultStorage() {
    if (typeof localStorage !== "undefined") return localStorage;
    return null;
  }

  function actorIds(arc) {
    var seen = {};
    var chapters = (arc && arc.chapters) || [];
    var ci;
    var ch;
    for (ci = 0; ci < chapters.length; ci++) {
      var choices = (chapters[ci] && chapters[ci].choices) || [];
      for (ch = 0; ch < choices.length; ch++) {
        var choice = choices[ch];
        if (choice && choice.actor) seen[choice.actor] = true;
      }
    }
    return seen;
  }

  function pathChapter(phase, historyLength) {
    var n = historyLength || 0;
    if (phase === "outcome") return n < 1 ? 1 : n;
    return n + 1;
  }

  function entryFor(arc) {
    var seen = actorIds(arc);
    var cast = [];
    var chars = (arc && arc.characters) || [];
    var i;
    for (i = 0; i < chars.length; i++) {
      if (chars[i] && chars[i].name && seen[chars[i].id]) cast.push(chars[i].name);
    }
    return {
      id: arc.id,
      title: arc.title || "",
      blurb: arc.blurb || "",
      pitch: arc.pitch || "",
      chapterCount: (arc.chapters || []).length,
      cast: cast,
      arc: arc
    };
  }

  var DOOR = [
    { id: "cinder-mile" },
    { id: "pale-hand" },
    { awaiting: true, title: "A third story", note: "Not chosen yet." }
  ];

  function list() {
    var map = bundleMap();
    var out = [];
    var id;
    for (id in map) {
      if (!Object.prototype.hasOwnProperty.call(map, id)) continue;
      var arc = map[id];
      if (!arc || !arc.id) continue;
      out.push(entryFor(arc));
    }
    return out;
  }

  function door() {
    var out = [];
    var i;
    for (i = 0; i < DOOR.length; i++) {
      var row = DOOR[i];
      if (row.awaiting) {
        out.push({
          awaiting: true,
          playable: false,
          title: row.title,
          note: row.note
        });
        continue;
      }
      var got = get(row.id);
      if (got) {
        var playable = Object.assign({ playable: true }, got);
        out.push(playable);
      } else {
        out.push({
          playable: false,
          missing: true,
          id: row.id,
          cast: []
        });
      }
    }
    return out;
  }

  function get(id) {
    var entries = list();
    var i;
    for (i = 0; i < entries.length; i++) {
      if (entries[i].id === id) return entries[i];
    }
    return null;
  }

  function fallback() {
    if (root && root.OronathArcBundle) return root.OronathArcBundle;
    if (root && root.OronathSample) return root.OronathSample;
    return null;
  }

  function registeredArc(arcId) {
    var map = bundleMap();
    if (!arcId || !map[arcId]) return null;
    return map[arcId];
  }

  function chapterInfo(arc, nodeId) {
    var chapters = arc.chapters || [];
    var i;
    for (i = 0; i < chapters.length; i++) {
      if (chapters[i] && chapters[i].id === nodeId) {
        return {
          chapterNumber: i + 1,
          chapterTitle: chapters[i].title || ""
        };
      }
    }
    var endings = arc.endings || [];
    for (i = 0; i < endings.length; i++) {
      if (endings[i] && endings[i].id === nodeId) {
        return {
          chapterNumber: null,
          chapterTitle: endings[i].title || ""
        };
      }
    }
    return null;
  }

  function readRaw(storage) {
    if (!storage) return { empty: true, raw: null };
    var key = persistApi().SAVE_KEY;
    var raw;
    try {
      raw = storage.getItem(key);
    } catch (e) {
      return { empty: false, broken: true, raw: null };
    }
    if (raw == null || raw === "") return { empty: true, raw: null };
    return { empty: false, raw: raw };
  }

  function classify(storage) {
    var got = readRaw(storage);
    if (got.empty) return { status: "empty", saved: null };
    if (got.broken) return { status: "unusable", saved: null };

    var blob;
    try {
      blob = JSON.parse(got.raw);
    } catch (e) {
      return { status: "unusable", saved: null };
    }
    if (!blob || typeof blob !== "object") {
      return { status: "unusable", saved: null };
    }

    var Persist = persistApi();
    if (blob.version !== Persist.VERSION) {
      return { status: "unusable", saved: null };
    }

    var arc = registeredArc(blob.arcId);
    if (!arc) {
      return { status: "foreign", arcId: blob.arcId, saved: null };
    }

    if (!blob.rng || typeof blob.rng.a !== "number" || isNaN(blob.rng.a)) {
      return { status: "unusable", saved: null };
    }
    if (
      blob.phase !== "choose" &&
      blob.phase !== "outcome" &&
      blob.phase !== "resolved"
    ) {
      return { status: "unusable", saved: null };
    }
    if (!blob.nodeId) return { status: "unusable", saved: null };

    var where = chapterInfo(arc, blob.nodeId);
    if (!where) return { status: "unusable", saved: null };

    if (
      !Array.isArray(blob.history) ||
      !Array.isArray(blob.diceLog) ||
      blob.history.length !== blob.diceLog.length
    ) {
      return { status: "unusable", saved: null };
    }
    if (blob.phase === "outcome") {
      if (
        !blob.outcome ||
        !blob.outcome.result ||
        !blob.outcome.result.faces ||
        !blob.outcome.consequence
      ) {
        return { status: "unusable", saved: null };
      }
    }

    var chapterNumber = where.chapterNumber;
    if (blob.phase === "resolved") chapterNumber = null;
    else chapterNumber = pathChapter(blob.phase, blob.history.length);

    return {
      status: blob.phase === "resolved" ? "resolved" : "ready",
      saved: {
        arc: arc,
        arcId: blob.arcId,
        nodeId: blob.nodeId,
        phase: blob.phase,
        chapterNumber: chapterNumber,
        chapterTitle: where.chapterTitle
      }
    };
  }

  function savedArc(storage) {
    storage = storage || defaultStorage();
    return classify(storage).saved;
  }

  function saveStatus(storage) {
    storage = storage || defaultStorage();
    return classify(storage).status;
  }

  return {
    list: list,
    door: door,
    get: get,
    fallback: fallback,
    savedArc: savedArc,
    saveStatus: saveStatus,
    pathChapter: pathChapter
  };
});
