/* MERLIN / Oronath — arc play surface. DOM only. Registry when two or more arcs are loaded. */
(function () {
  "use strict";

  var Loop = window.OronathLoop;
  var Persist = window.OronathPersist;
  var Arc = window.OronathArc;
  var Stories = window.OronathStories;
  var MerlinDice = window.MerlinDice;

  var app = document.getElementById("app");
  var run = null;
  var resumeNote = "";
  var active = null;
  var screen = "splash";

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function registered() {
    if (!Stories || typeof Stories.list !== "function") return [];
    return Stories.list();
  }

  function many() {
    return registered().length >= 2;
  }

  function threadList(host, v) {
    var wrap = el("ul", "oronath-threads");
    var threads = (active && active.threads) || [];
    var i;
    for (i = 0; i < threads.length; i++) {
      var t = threads[i];
      var closed = v.resolvedThreads.indexOf(t.id) !== -1;
      var li = el(
        "li",
        "oronath-thread" + (closed ? " is-closed" : " is-open"),
        t.label + (closed ? " — closed" : " — open")
      );
      wrap.appendChild(li);
    }
    host.appendChild(wrap);
  }

  function rollBlurb(check, roll) {
    var bits = [];
    var Dice = window.OronathDice;
    var baseDc = check.dc != null ? check.dc : roll.dc;
    var shownDc =
      Dice && typeof Dice.effectiveDc === "function"
        ? Dice.effectiveDc(baseDc, check.modifier)
        : baseDc;
    if (roll.die === "d20") {
      bits.push(
        "d20 · DC " +
          (shownDc != null ? shownDc : roll.tier || check.tier)
      );
    } else {
      bits.push(roll.die + " · DC " + shownDc);
    }
    if (check.advantage) bits.push("advantage due to build");
    if (check.matchedTraits && check.matchedTraits.length) {
      bits.push(check.matchedTraits.join(", "));
    }
    return bits.join(" · ");
  }

  function nextLabel(nextId) {
    var chapters = (active && active.chapters) || [];
    var endings = (active && active.endings) || [];
    var i;
    for (i = 0; i < chapters.length; i++) {
      if (chapters[i].id === nextId) return chapters[i].title;
    }
    for (i = 0; i < endings.length; i++) {
      if (endings[i].id === nextId) return endings[i].title;
    }
    return nextId;
  }

  function persist() {
    if (run) Persist.save(run);
  }

  function pitchFor(arc) {
    if (arc && arc.pitch && String(arc.pitch).replace(/^\s+|\s+$/g, "") !== "") {
      return arc.pitch;
    }
    if (arc && arc.id === "sample-wick") {
      return "Three heroes. One candle. Every choice is a real roll — failure opens a new road, never a retry.";
    }
    return "Three travellers. A signal that should have died. Every choice is a real roll — failure opens a new road, never a retry.";
  }

  function replaceWarning(forArcId) {
    if (!many() || !Stories) return "";
    var saved = Stories.savedArc();
    if (!saved || !saved.arc || saved.arcId === forArcId) return "";
    var title = saved.arc.title || saved.arcId;
    return (
      "Your run in " +
      title +
      " is saved — beginning this story will replace it."
    );
  }

  function resumeLabel(saved) {
    if (saved && saved.chapterNumber != null) {
      return "Resume — Chapter " + saved.chapterNumber;
    }
    return "Resume";
  }

  function startFresh() {
    Persist.clear();
    resumeNote = "";
    run = Loop.createRun(active, { characters: active.characters });
    screen = "play";
    persist();
    render();
  }

  function onNewRun() {
    Persist.clear();
    run = null;
    resumeNote = "";
    if (many()) {
      active = null;
      screen = "picker";
      renderPicker();
      return;
    }
    screen = "splash";
    renderTitle(null);
  }

  function onStories() {
    run = null;
    resumeNote = "";
    screen = "picker";
    renderPicker();
  }

  function onChoose(choiceId) {
    if (!run || run.phase !== "choose") return;
    Loop.choose(run, choiceId);
    persist();
    render();
  }

  function onContinue() {
    if (!run || run.phase !== "outcome") return;
    Loop.continueRun(run);
    persist();
    render();
  }

  function playFoot(host, primaryNew) {
    var foot = el("div", "oronath-foot");
    if (many()) {
      var storiesBtn = el("button", "btn ghost", "Stories");
      storiesBtn.type = "button";
      storiesBtn.addEventListener("click", onStories);
      foot.appendChild(storiesBtn);
    }
    var anew = el("button", primaryNew && !many() ? "btn primary" : "btn ghost", "New Run");
    anew.type = "button";
    anew.addEventListener("click", onNewRun);
    foot.appendChild(anew);
    host.appendChild(foot);
  }

  function renderPicker() {
    clear(app);
    var panel = el("section", "panel oronath-panel");
    panel.appendChild(el("p", "oronath-kicker", "ORONATH"));
    panel.appendChild(el("h1", "splash-title", "Choose a story"));

    var status = Stories ? Stories.saveStatus() : "empty";
    if (status === "foreign") {
      panel.appendChild(
        el("p", "muted", "A saved run for another story is still stored.")
      );
    } else if (status === "unusable") {
      panel.appendChild(el("p", "muted", "Saved run could not be resumed."));
    }

    var saved = Stories ? Stories.savedArc() : null;
    var entries = registered();
    var list = el("div", "oronath-stories");
    var i;
    for (i = 0; i < entries.length; i++) {
      (function (entry) {
        var card = el("article", "oronath-story-card");
        card.appendChild(el("h2", "scene-title", entry.title));
        if (entry.blurb) card.appendChild(el("p", "oronath-story-blurb", entry.blurb));
        var meta =
          entry.chapterCount +
          (entry.chapterCount === 1 ? " chapter" : " chapters");
        if (entry.cast && entry.cast.length) meta += " · " + entry.cast.join(", ");
        card.appendChild(el("p", "oronath-story-meta", meta));

        var validated = Arc.validateArc(entry.arc);
        var blocked = !validated.ok;
        if (blocked) {
          var err = el("div", "oronath-error");
          err.appendChild(el("p", null, "This arc failed validation. Play is blocked."));
          var ul = el("ul", null);
          var e;
          for (e = 0; e < validated.errors.length; e++) {
            ul.appendChild(
              el("li", null, validated.errors[e].rule + ": " + validated.errors[e].message)
            );
          }
          err.appendChild(ul);
          card.appendChild(err);
        }

        var warn = replaceWarning(entry.id);
        if (warn) card.appendChild(el("p", "muted oronath-story-warn", warn));

        var actions = el("div", "oronath-story-actions");
        var begin = el("button", "btn primary", "Begin");
        begin.type = "button";
        begin.disabled = blocked;
        begin.addEventListener("click", function () {
          if (blocked) return;
          active = entry.arc;
          run = null;
          resumeNote = "";
          screen = "splash";
          renderTitle(null);
        });
        actions.appendChild(begin);

        if (saved && saved.arcId === entry.id) {
          var resume = el("button", "btn", resumeLabel(saved));
          resume.type = "button";
          resume.disabled = blocked;
          resume.addEventListener("click", function () {
            if (blocked) return;
            var loaded = Persist.load(saved.arc);
            if (loaded.ok && loaded.run) {
              active = saved.arc;
              run = loaded.run;
              resumeNote = "";
              screen = "play";
              render();
            }
          });
          actions.appendChild(resume);
        }
        card.appendChild(actions);
        list.appendChild(card);
      })(entries[i]);
    }
    panel.appendChild(list);

    var nav = el("p", "oronath-nav");
    var back = el("a", "btn", "Back to MERLIN");
    back.href = "index.html";
    nav.appendChild(back);
    panel.appendChild(nav);
    app.appendChild(panel);
  }

  function renderTitle(errors) {
    clear(app);
    var panel = el("section", "panel oronath-panel");
    var isSample = active && active.id === "sample-wick";
    panel.appendChild(
      el(
        "p",
        "oronath-kicker",
        isSample ? "ORONATH ENGINE · SAMPLE" : "ORONATH"
      )
    );
    panel.appendChild(el("h1", "splash-title", active.title));
    panel.appendChild(el("p", "splash-pitch", pitchFor(active)));

    var cast = el("ul", "oronath-cast");
    var i;
    var chars = (active && active.characters) || [];
    for (i = 0; i < chars.length; i++) {
      var c = chars[i];
      var traits = [];
      var t;
      for (t = 0; t < c.traits.length; t++) traits.push(c.traits[t].label);
      cast.appendChild(el("li", null, c.name + " — " + traits.join(", ")));
    }
    panel.appendChild(cast);

    if (errors && errors.length) {
      var err = el("div", "oronath-error");
      err.appendChild(el("p", null, "This arc failed validation. Play is blocked."));
      var ul = el("ul", null);
      var e;
      for (e = 0; e < errors.length; e++) {
        ul.appendChild(el("li", null, errors[e].rule + ": " + errors[e].message));
      }
      err.appendChild(ul);
      panel.appendChild(err);
    } else {
      if (resumeNote) panel.appendChild(el("p", "muted", resumeNote));
      var warn = replaceWarning(active.id);
      if (warn) panel.appendChild(el("p", "muted oronath-story-warn", warn));
      var begin = el("button", "btn primary", "Begin");
      begin.type = "button";
      begin.addEventListener("click", startFresh);
      panel.appendChild(begin);
    }

    var nav = el("p", "oronath-nav");
    if (many()) {
      var all = el("button", "btn ghost", "All stories");
      all.type = "button";
      all.addEventListener("click", onStories);
      nav.appendChild(all);
    }
    var back = el("a", "btn", "Back to MERLIN");
    back.href = "index.html";
    nav.appendChild(back);
    panel.appendChild(nav);
    app.appendChild(panel);
  }

  function renderChoose(v) {
    clear(app);
    var panel = el("section", "panel oronath-panel");
    panel.appendChild(
      el(
        "p",
        "oronath-kicker",
        "Chapter " + v.chapter.number + " of " + v.chapterCount
      )
    );
    panel.appendChild(el("h2", "scene-title", v.chapter.title));
    panel.appendChild(el("p", "oronath-setting", v.chapter.setting));
    panel.appendChild(el("p", "oronath-objective", "Objective: " + v.chapter.objective));
    threadList(panel, v);

    var list = el("div", "oronath-choices");
    var i;
    for (i = 0; i < v.choices.length; i++) {
      (function (choice) {
        var btn = el("button", "btn oronath-choice", "");
        btn.type = "button";
        btn.appendChild(el("span", "oronath-choice-label", choice.label));
        btn.appendChild(
          el(
            "span",
            "oronath-choice-meta",
            choice.actorName + " · " + rollBlurb(choice.check, choice.roll)
          )
        );
        btn.addEventListener("click", function () {
          onChoose(choice.id);
        });
        list.appendChild(btn);
      })(v.choices[i]);
    }
    panel.appendChild(list);
    playFoot(panel);
    app.appendChild(panel);
  }

  function renderOutcome(v) {
    clear(app);
    var panel = el("section", "panel oronath-panel");
    if (v.chapter) {
      panel.appendChild(
        el(
          "p",
          "oronath-kicker",
          "Chapter " + v.chapter.number + " of " + v.chapterCount
        )
      );
      panel.appendChild(el("h2", "scene-title", v.chapter.title));
    }

    var dieHost = el("div", "oronath-die");
    panel.appendChild(dieHost);
    if (MerlinDice && v.outcome.merlinRoll) {
      MerlinDice.mount(dieHost, [v.outcome.merlinRoll], { size: "stage" });
    }

    panel.appendChild(el("p", "oronath-equation", v.outcome.equation));
    panel.appendChild(
      el("p", "oronath-branch oronath-branch--" + v.outcome.branch, v.outcome.branch)
    );
    panel.appendChild(el("p", "oronath-consequence", v.outcome.consequence.text));

    var cont = el("button", "btn primary", "Continue — " + nextLabel(v.outcome.next));
    cont.type = "button";
    cont.addEventListener("click", onContinue);
    panel.appendChild(cont);
    if (many()) playFoot(panel);
    app.appendChild(panel);
  }

  function renderResolved(v) {
    clear(app);
    var panel = el("section", "panel oronath-panel");
    panel.appendChild(el("p", "oronath-kicker", "RESOLUTION"));
    panel.appendChild(el("h2", "scene-title", v.ending.title));
    panel.appendChild(el("p", "oronath-setting", v.ending.text));
    threadList(panel, v);

    if (!v.ending.allClosed) {
      panel.appendChild(
        el("p", "oronath-error", "Open threads remain: " + v.openThreads.join(", "))
      );
    } else {
      panel.appendChild(el("p", "muted", "Every character thread is closed."));
    }

    var comps = 0;
    var bonuses = 0;
    var i;
    for (i = 0; i < v.diceLog.length; i++) {
      if (v.diceLog[i].complication) comps += 1;
      if (v.diceLog[i].bonus) bonuses += 1;
    }
    panel.appendChild(
      el(
        "p",
        "oronath-log",
        "Rolls: " + v.diceLog.length + " · Complications: " + comps + " · Bonuses: " + bonuses
      )
    );

    playFoot(panel, true);

    var nav = el("p", "oronath-nav");
    var back = el("a", "btn", "Back to MERLIN");
    back.href = "index.html";
    nav.appendChild(back);
    panel.appendChild(nav);
    app.appendChild(panel);
  }

  function render() {
    if (screen === "picker") {
      renderPicker();
      return;
    }
    if (!run) {
      var errors = null;
      if (active) {
        var checked = Arc.validateArc(active);
        if (!checked.ok) errors = checked.errors;
      }
      renderTitle(errors);
      return;
    }
    var v = Loop.view(run);
    if (v.phase === "choose") renderChoose(v);
    else if (v.phase === "outcome") renderOutcome(v);
    else if (v.phase === "resolved") renderResolved(v);
    else renderTitle(null);
  }

  function bootSingle(arc) {
    active = arc;
    var validated = Arc.validateArc(active);
    if (!validated.ok) {
      screen = "splash";
      run = null;
      renderTitle(validated.errors);
      return;
    }
    var loaded = Persist.load(active);
    if (loaded.ok && loaded.run) {
      run = loaded.run;
      resumeNote = "";
      screen = "play";
      render();
      return;
    }
    if (loaded.reason && loaded.reason !== "empty") {
      resumeNote = "Saved run could not be resumed.";
    } else {
      resumeNote = "";
    }
    run = null;
    screen = "splash";
    renderTitle(null);
  }

  function boot() {
    var list = registered();
    if (list.length === 0) {
      var fb = Stories
        ? Stories.fallback()
        : window.OronathArcBundle || window.OronathSample;
      bootSingle(fb);
      return;
    }
    if (list.length === 1) {
      bootSingle(list[0].arc);
      return;
    }
    var saved = Stories.savedArc();
    if (saved && saved.arc) {
      var validated = Arc.validateArc(saved.arc);
      if (validated.ok) {
        var loaded = Persist.load(saved.arc);
        if (loaded.ok && loaded.run) {
          active = saved.arc;
          run = loaded.run;
          resumeNote = "";
          screen = "play";
          render();
          return;
        }
      } else {
        screen = "picker";
        run = null;
        renderPicker();
        return;
      }
    }
    active = null;
    run = null;
    screen = "picker";
    renderPicker();
  }

  boot();
})();
