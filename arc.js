/* MERLIN / Oronath — arc schema validator. Pure logic. No dice, no DOM. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.OronathArc = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function blank(s) {
    return s == null || String(s).replace(/^\s+|\s+$/g, "") === "";
  }

  function pushError(errors, rule, path, message) {
    errors.push({ rule: rule, path: path, message: message });
  }

  function chapterIndex(chapters) {
    var map = {};
    for (var i = 0; i < chapters.length; i++) {
      if (chapters[i] && chapters[i].id) map[chapters[i].id] = chapters[i];
    }
    return map;
  }

  function endingIndex(endings) {
    var map = {};
    for (var i = 0; i < endings.length; i++) {
      if (endings[i] && endings[i].id) map[endings[i].id] = endings[i];
    }
    return map;
  }

  function characterIndex(characters) {
    var map = {};
    for (var i = 0; i < characters.length; i++) {
      if (characters[i] && characters[i].id) map[characters[i].id] = characters[i];
    }
    return map;
  }

  function threadIndex(threads) {
    var map = {};
    for (var i = 0; i < threads.length; i++) {
      if (threads[i] && threads[i].id) map[threads[i].id] = threads[i];
    }
    return map;
  }

  function checkRoll(choice, path, errors) {
    var roll = choice.roll;
    if (!roll || !roll.die) {
      pushError(errors, "missing-roll", path + ".roll", "choice has no roll.die");
      return;
    }
    if (roll.die !== "d20" && roll.die !== "d10" && roll.die !== "2d6") {
      pushError(
        errors,
        "missing-roll",
        path + ".roll.die",
        "roll.die must be d20, d10, or 2d6"
      );
      return;
    }
    if (roll.die === "d20") {
      if (
        roll.tier !== "easy" &&
        roll.tier !== "medium" &&
        roll.tier !== "hard" &&
        roll.tier !== "veryHard"
      ) {
        pushError(
          errors,
          "bad-tier",
          path + ".roll.tier",
          "d20 tier must be easy|medium|hard|veryHard"
        );
      }
    } else if (typeof roll.dc !== "number" || isNaN(roll.dc)) {
      pushError(
        errors,
        "missing-dc",
        path + ".roll.dc",
        roll.die + " roll requires numeric dc"
      );
    }
  }

  function checkConsequence(conseq, path, errors, requiredRule) {
    if (!conseq) {
      if (requiredRule) {
        pushError(errors, requiredRule, path, "missing consequence");
      }
      return null;
    }
    if (blank(conseq.text)) {
      pushError(
        errors,
        requiredRule || "missing-success",
        path + ".text",
        "consequence text is blank"
      );
    }
    if (blank(conseq.next)) {
      pushError(
        errors,
        requiredRule || "missing-success",
        path + ".next",
        "consequence next is blank"
      );
      return null;
    }
    return conseq;
  }

  function validateArc(arc) {
    var errors = [];
    if (!arc || typeof arc !== "object") {
      pushError(errors, "chapter-count", "", "arc is missing");
      return { ok: false, errors: errors };
    }

    var chapters = arc.chapters || [];
    var endings = arc.endings || [];
    var characters = arc.characters || [];
    var threads = arc.threads || [];
    var byChapter = chapterIndex(chapters);
    var byEnding = endingIndex(endings);
    var byChar = characterIndex(characters);
    var byThread = threadIndex(threads);

    if (chapters.length < 3 || chapters.length > 5) {
      pushError(
        errors,
        "chapter-count",
        "chapters",
        "chapter count " + chapters.length + " outside 3–5"
      );
    }

    var ci;
    for (ci = 0; ci < chapters.length; ci++) {
      var chapter = chapters[ci];
      var cpath = "chapters[" + ci + "]";
      if (!chapter) continue;

      if (blank(chapter.setting)) {
        pushError(
          errors,
          "missing-setting",
          cpath + ".setting",
          "setting is blank"
        );
      }
      if (blank(chapter.objective)) {
        pushError(
          errors,
          "missing-objective",
          cpath + ".objective",
          "objective is blank"
        );
      }

      var choices = chapter.choices || [];
      if (choices.length < 2 || choices.length > 4) {
        pushError(
          errors,
          "choice-count",
          cpath + ".choices",
          "choice count " + choices.length + " outside 2–4"
        );
      }

      var ch;
      for (ch = 0; ch < choices.length; ch++) {
        var choice = choices[ch];
        var chpath = cpath + ".choices[" + ch + "]";
        if (!choice) continue;
        checkRoll(choice, chpath, errors);

        var cons = choice.consequences || {};
        var success = checkConsequence(
          cons.success,
          chpath + ".consequences.success",
          errors,
          "missing-success"
        );
        var failure = checkConsequence(
          cons.failure,
          chpath + ".consequences.failure",
          errors,
          "missing-failure"
        );
        if (cons.complication) {
          checkConsequence(
            cons.complication,
            chpath + ".consequences.complication",
            errors,
            null
          );
        }
        if (cons.bonus) {
          checkConsequence(
            cons.bonus,
            chpath + ".consequences.bonus",
            errors,
            null
          );
        }

        var keys = ["success", "failure", "complication", "bonus"];
        var ki;
        for (ki = 0; ki < keys.length; ki++) {
          var key = keys[ki];
          var node = cons[key];
          if (!node || blank(node.next)) continue;
          var next = node.next;
          var npath = chpath + ".consequences." + key + ".next";
          if (chapter.id && next === chapter.id) {
            pushError(
              errors,
              "self-next",
              npath,
              "next equals owning chapter id"
            );
          }
          if (!byChapter[next] && !byEnding[next]) {
            pushError(
              errors,
              "dangling-next",
              npath,
              "next '" + next + "' is not a chapter or ending"
            );
          }
        }

        // silence unused if linted
        void success;
        void failure;
      }
    }

    // Characters / threads
    var ti;
    for (ti = 0; ti < characters.length; ti++) {
      var chObj = characters[ti];
      if (!chObj || !chObj.id) continue;
      var found = false;
      var tj;
      for (tj = 0; tj < threads.length; tj++) {
        if (threads[tj] && threads[tj].characterId === chObj.id) {
          found = true;
          break;
        }
      }
      if (!found) {
        pushError(
          errors,
          "missing-thread",
          "characters[" + ti + "]",
          "character '" + chObj.id + "' has no thread"
        );
      }
      if (chObj.threadId) {
        var thr = byThread[chObj.threadId];
        if (!thr || thr.characterId !== chObj.id) {
          pushError(
            errors,
            "thread-mismatch",
            "characters[" + ti + "].threadId",
            "character threadId does not match threads entry"
          );
        }
      }
    }

    for (ti = 0; ti < threads.length; ti++) {
      var thread = threads[ti];
      if (!thread) continue;
      if (!thread.characterId || !byChar[thread.characterId]) {
        pushError(
          errors,
          "unknown-character",
          "threads[" + ti + "].characterId",
          "thread references unknown character"
        );
      }
    }

    // Graph walk: reachability, cycles, unresolved threads
    if (chapters.length > 0 && chapters[0] && chapters[0].id) {
      var startId = chapters[0].id;
      var visitedChapters = {};
      var visitedEndings = {};
      var threadIds = [];
      for (ti = 0; ti < threads.length; ti++) {
        if (threads[ti] && threads[ti].id) threadIds.push(threads[ti].id);
      }
      var unresolved = {};
      for (ti = 0; ti < threadIds.length; ti++) {
        unresolved[threadIds[ti]] = false;
      }

      function addResolves(set, resolves) {
        var next = {};
        var k;
        for (k in set) {
          if (Object.prototype.hasOwnProperty.call(set, k)) next[k] = true;
        }
        var r = resolves || [];
        var ri;
        for (ri = 0; ri < r.length; ri++) next[r[ri]] = true;
        return next;
      }

      function walk(nodeId, pathSet, resolved) {
        if (byEnding[nodeId]) {
          visitedEndings[nodeId] = true;
          var endRes = addResolves(resolved, byEnding[nodeId].resolves);
          var uid;
          for (uid = 0; uid < threadIds.length; uid++) {
            var tid = threadIds[uid];
            if (!endRes[tid]) unresolved[tid] = true;
          }
          return;
        }
        var chap = byChapter[nodeId];
        if (!chap) return;
        if (pathSet[nodeId]) {
          pushError(
            errors,
            "cycle",
            "chapters",
            "cycle involving chapter '" + nodeId + "'"
          );
          return;
        }
        visitedChapters[nodeId] = true;
        var nextPath = {};
        var pk;
        for (pk in pathSet) {
          if (Object.prototype.hasOwnProperty.call(pathSet, pk)) {
            nextPath[pk] = true;
          }
        }
        nextPath[nodeId] = true;

        var chs = chap.choices || [];
        var xi;
        for (xi = 0; xi < chs.length; xi++) {
          var choice = chs[xi];
          if (!choice || !choice.consequences) continue;
          var keys2 = ["success", "failure", "complication", "bonus"];
          var yi;
          for (yi = 0; yi < keys2.length; yi++) {
            var consNode = choice.consequences[keys2[yi]];
            if (!consNode || blank(consNode.next)) continue;
            walk(
              consNode.next,
              nextPath,
              addResolves(resolved, consNode.resolves)
            );
          }
        }
      }

      walk(startId, {}, {});

      for (ci = 0; ci < chapters.length; ci++) {
        if (!chapters[ci] || !chapters[ci].id) continue;
        if (ci === 0) continue;
        if (!visitedChapters[chapters[ci].id]) {
          pushError(
            errors,
            "unreachable",
            "chapters[" + ci + "]",
            "chapter '" + chapters[ci].id + "' is unreachable"
          );
        }
      }
      for (ci = 0; ci < endings.length; ci++) {
        if (!endings[ci] || !endings[ci].id) continue;
        if (!visitedEndings[endings[ci].id]) {
          pushError(
            errors,
            "unreachable",
            "endings[" + ci + "]",
            "ending '" + endings[ci].id + "' is unreachable"
          );
        }
      }

      for (ti = 0; ti < threadIds.length; ti++) {
        if (unresolved[threadIds[ti]]) {
          pushError(
            errors,
            "unresolved-thread",
            "threads",
            "thread '" + threadIds[ti] + "' left unresolved on some path"
          );
        }
      }
    }

    return { ok: errors.length === 0, errors: errors };
  }

  return {
    validateArc: validateArc
  };
});
