/* MERLIN / Oronath — gameplay loop. Pure logic. No DOM, no localStorage. */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.OronathLoop = api;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";

  function diceApi() {
    if (root && root.OronathDice) return root.OronathDice;
    if (typeof require === "function") return require("./dice.js");
    throw new Error("OronathDice not loaded");
  }

  function castApi() {
    if (root && root.OronathCast) return root.OronathCast;
    if (typeof require === "function") return require("./characters.js");
    throw new Error("OronathCast not loaded");
  }

  function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function findById(list, id) {
    var i;
    for (i = 0; i < list.length; i++) {
      if (list[i] && list[i].id === id) return list[i];
    }
    return null;
  }

  function chapterIndex(arc, chapterId) {
    var chapters = arc.chapters || [];
    var i;
    for (i = 0; i < chapters.length; i++) {
      if (chapters[i] && chapters[i].id === chapterId) return i;
    }
    return -1;
  }

  function findCharacter(run, id) {
    return findById(run.characters || [], id);
  }

  function findChoice(chapter, choiceId) {
    var choices = (chapter && chapter.choices) || [];
    return findById(choices, choiceId);
  }

  function consequenceFor(choice, branch) {
    var cons = (choice && choice.consequences) || {};
    if (branch === "complication") {
      return cons.complication || cons.failure || null;
    }
    if (branch === "bonus") {
      return cons.bonus || cons.success || null;
    }
    if (branch === "success") return cons.success || null;
    if (branch === "failure") return cons.failure || null;
    return cons[branch] || null;
  }

  function unionResolves(resolved, resolves) {
    var out = resolved.slice();
    var r = resolves || [];
    var i;
    for (i = 0; i < r.length; i++) {
      if (out.indexOf(r[i]) === -1) out.push(r[i]);
    }
    return out;
  }

  function createRun(arc, opts) {
    opts = opts || {};
    if (!arc || !arc.id) throw new Error("createRun requires an arc");
    var chapters = arc.chapters || [];
    if (!chapters.length || !chapters[0] || !chapters[0].id) {
      throw new Error("arc has no starting chapter");
    }
    var seed = opts.seed != null ? opts.seed >>> 0 : Date.now() >>> 0;
    var Dice = diceApi();
    var Cast = castApi();
    var characters;
    if (opts.characters) {
      characters = deepCopy(opts.characters);
    } else {
      characters = [
        Cast.pregen("john"),
        Cast.pregen("joel"),
        Cast.pregen("rafe")
      ];
    }
    var rng = Dice.createRng(seed);
    return {
      arcId: arc.id,
      arc: arc,
      seed: seed,
      rng: rng,
      nodeId: chapters[0].id,
      phase: "choose",
      outcome: null,
      history: [],
      diceLog: [],
      characters: characters,
      resolvedThreads: []
    };
  }

  function attachRng(run, Dice) {
    if (run.rng && typeof run.rng.int === "function") return run.rng;
    if (run.rng && run.rng.a != null) {
      run.rng = Dice.rngFromState(run.rng);
      return run.rng;
    }
    run.rng = Dice.createRng(run.seed >>> 0);
    return run.rng;
  }

  function choose(run, choiceId, opts) {
    opts = opts || {};
    if (!run) throw new Error("choose requires a run");
    if (run.phase !== "choose") {
      throw new Error("cannot choose while phase is " + run.phase);
    }
    var arc = run.arc;
    var chapter = findById(arc.chapters || [], run.nodeId);
    if (!chapter) throw new Error("unknown chapter: " + run.nodeId);
    var choice = findChoice(chapter, choiceId);
    if (!choice) throw new Error("unknown choice: " + choiceId);

    var actor = findCharacter(run, choice.actor);
    if (!actor) throw new Error("unknown actor: " + choice.actor);

    var Dice = diceApi();
    var Cast = castApi();
    var check = Cast.resolveCheck(actor, choice.roll);
    var rng = opts.rng != null ? opts.rng : attachRng(run, Dice);

    var rollOpts = {
      die: check.die,
      advantage: check.advantage,
      modifier: check.modifier,
      rng: rng
    };
    if (check.die === "d20") {
      rollOpts.tier = check.tier;
    } else {
      rollOpts.dc = check.dc;
    }

    var result = Dice.roll(rollOpts);
    var branch = result.branch;
    var consequence = consequenceFor(choice, branch);
    if (!consequence || !consequence.next) {
      throw new Error("missing consequence for branch " + branch);
    }

    run.resolvedThreads = unionResolves(
      run.resolvedThreads,
      consequence.resolves
    );
    run.history.push({
      chapterId: chapter.id,
      choiceId: choice.id,
      actorId: choice.actor,
      branch: branch,
      kept: result.kept,
      die: result.die,
      next: consequence.next,
      retry: false
    });
    run.diceLog.push(result);
    run.outcome = {
      chapterId: chapter.id,
      choiceId: choice.id,
      actorId: choice.actor,
      branch: branch,
      result: result,
      check: check,
      consequence: consequence
    };
    run.phase = "outcome";
    return run;
  }

  function continueRun(run) {
    if (!run) throw new Error("continueRun requires a run");
    if (run.phase !== "outcome") {
      throw new Error("cannot continue while phase is " + run.phase);
    }
    if (!run.outcome || !run.outcome.consequence) {
      throw new Error("no outcome to continue from");
    }
    var next = run.outcome.consequence.next;
    var arc = run.arc;
    var ending = findById(arc.endings || [], next);
    run.nodeId = next;
    run.outcome = null;
    if (ending) {
      run.resolvedThreads = unionResolves(
        run.resolvedThreads,
        ending.resolves
      );
      run.phase = "resolved";
    } else {
      run.phase = "choose";
    }
    return run;
  }

  function openThreads(run) {
    var threads = (run.arc && run.arc.threads) || [];
    var open = [];
    var i;
    for (i = 0; i < threads.length; i++) {
      if (!threads[i] || !threads[i].id) continue;
      if (run.resolvedThreads.indexOf(threads[i].id) === -1) {
        open.push(threads[i].id);
      }
    }
    return open;
  }

  function choiceViews(run, chapter) {
    var Cast = castApi();
    var choices = chapter.choices || [];
    var out = [];
    var i;
    for (i = 0; i < choices.length; i++) {
      var choice = choices[i];
      if (!choice) continue;
      var actor = findCharacter(run, choice.actor);
      var check = Cast.resolveCheck(actor, choice.roll);
      out.push({
        id: choice.id,
        label: choice.label,
        actorId: choice.actor,
        actorName: actor ? actor.name : choice.actor,
        roll: choice.roll,
        check: check
      });
    }
    return out;
  }

  function equationLine(result, check) {
    var parts = [];
    parts.push(result.die);
    if (result.labels && result.labels.length) {
      parts.push(result.labels.join(" / "));
    } else if (result.faces && result.faces.length) {
      parts.push(result.faces.join(" / "));
    }
    parts.push("kept " + result.kept);
    if (result.dc != null) parts.push("vs DC " + result.dc);
    parts.push("— " + result.branch);
    var line = parts.join(" ");
    if (check && check.advantage) {
      var traits = (check.matchedTraits || []).join(", ");
      line +=
        ". Advantage due to build" +
        (traits ? " (" + traits + ")" : "") +
        ".";
    } else {
      line += ".";
    }
    return line;
  }

  function toMerlinRoll(result) {
    if (!result) return null;
    if (result.die === "d20") {
      return {
        kind: "d20",
        dice: result.faces.slice(),
        kept: result.kept,
        critSuccess: result.branch === "bonus",
        critFail: result.branch === "complication"
      };
    }
    if (result.die === "d10") {
      var keptLabel = result.kept === 10 ? "00" : String(result.kept);
      if (result.labels && result.faces) {
        var i;
        for (i = 0; i < result.faces.length; i++) {
          var val =
            result.faces[i] === 0 || result.faces[i] === 10
              ? 10
              : Number(result.faces[i]);
          if (val === result.kept) {
            keptLabel = result.labels[i];
            break;
          }
        }
      }
      return {
        kind: "d10",
        dice: [keptLabel],
        kept: result.kept
      };
    }
    if (result.die === "2d6") {
      var faces;
      if (result.advantage && result.pools && result.pools.length === 2) {
        var keptPool =
          result.pools[1].sum > result.pools[0].sum
            ? result.pools[1]
            : result.pools[0];
        faces = keptPool.faces.slice();
      } else {
        faces = result.faces.slice();
      }
      return {
        kind: "d6",
        dice: faces,
        total: result.kept,
        kept: result.kept
      };
    }
    return {
      kind: result.die,
      dice: result.faces ? result.faces.slice() : [result.kept],
      kept: result.kept
    };
  }

  function view(run) {
    if (!run || !run.arc) throw new Error("view requires a run with arc");
    var arc = run.arc;
    var chapter = findById(arc.chapters || [], run.nodeId);
    var ending = findById(arc.endings || [], run.nodeId);
    var idx = chapter ? chapterIndex(arc, chapter.id) : -1;
    var base = {
      arcId: arc.id,
      title: arc.title,
      phase: run.phase,
      nodeId: run.nodeId,
      characters: run.characters,
      resolvedThreads: run.resolvedThreads.slice(),
      openThreads: openThreads(run),
      history: run.history,
      diceLog: run.diceLog,
      chapterCount: (arc.chapters || []).length
    };

    if (run.phase === "choose" && chapter) {
      base.chapter = {
        id: chapter.id,
        title: chapter.title,
        setting: chapter.setting,
        objective: chapter.objective,
        index: idx,
        number: idx + 1
      };
      base.choices = choiceViews(run, chapter);
      base.outcome = null;
      base.ending = null;
      return base;
    }

    if (run.phase === "outcome" && run.outcome) {
      base.chapter = chapter
        ? {
            id: chapter.id,
            title: chapter.title,
            setting: chapter.setting,
            objective: chapter.objective,
            index: idx,
            number: idx + 1
          }
        : null;
      base.choices = [];
      base.outcome = {
        chapterId: run.outcome.chapterId,
        choiceId: run.outcome.choiceId,
        actorId: run.outcome.actorId,
        branch: run.outcome.branch,
        result: run.outcome.result,
        check: run.outcome.check,
        consequence: run.outcome.consequence,
        equation: equationLine(run.outcome.result, run.outcome.check),
        merlinRoll: toMerlinRoll(run.outcome.result),
        next: run.outcome.consequence.next
      };
      base.ending = null;
      return base;
    }

    if (run.phase === "resolved" && ending) {
      base.chapter = null;
      base.choices = [];
      base.outcome = null;
      base.ending = {
        id: ending.id,
        title: ending.title,
        text: ending.text,
        resolves: ending.resolves || [],
        allClosed: openThreads(run).length === 0
      };
      return base;
    }

    base.chapter = null;
    base.choices = [];
    base.outcome = null;
    base.ending = null;
    return base;
  }

  function exportRngState(run) {
    var Dice = diceApi();
    var rng = attachRng(run, Dice);
    if (typeof rng.exportState === "function") return rng.exportState();
    return { a: 0 };
  }

  return {
    createRun: createRun,
    choose: choose,
    continueRun: continueRun,
    view: view,
    consequenceFor: consequenceFor,
    toMerlinRoll: toMerlinRoll,
    equationLine: equationLine,
    openThreads: openThreads,
    exportRngState: exportRngState,
    chapterIndex: chapterIndex
  };
});
