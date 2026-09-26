/* MERLIN / Oronath — arc play surface. DOM only. Prefers OronathArcBundle, else sample. */
(function () {
  "use strict";

  var Loop = window.OronathLoop;
  var Persist = window.OronathPersist;
  var Arc = window.OronathArc;
  var Story = window.OronathArcBundle || window.OronathSample;
  var MerlinDice = window.MerlinDice;

  var app = document.getElementById("app");
  var run = null;
  var resumeNote = "";

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function threadList(host, v) {
    var wrap = el("ul", "oronath-threads");
    var threads = (Story.threads || []);
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
    var chapters = Story.chapters || [];
    var endings = Story.endings || [];
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

  function startFresh() {
    Persist.clear();
    resumeNote = "";
    run = Loop.createRun(Story);
    persist();
    render();
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

  function renderTitle(errors) {
    clear(app);
    var panel = el("section", "panel oronath-panel");
    var isSample = Story && Story.id === "sample-wick";
    panel.appendChild(
      el(
        "p",
        "oronath-kicker",
        isSample ? "ORONATH ENGINE · SAMPLE" : "ORONATH"
      )
    );
    panel.appendChild(el("h1", "splash-title", Story.title));
    panel.appendChild(
      el(
        "p",
        "splash-pitch",
        isSample
          ? "Three heroes. One candle. Every choice is a real roll — failure opens a new road, never a retry."
          : "Three travellers. A signal that should have died. Every choice is a real roll — failure opens a new road, never a retry."
      )
    );

    var cast = el("ul", "oronath-cast");
    var i;
    for (i = 0; i < Story.characters.length; i++) {
      var c = Story.characters[i];
      var traits = [];
      var t;
      for (t = 0; t < c.traits.length; t++) traits.push(c.traits[t].label);
      cast.appendChild(
        el("li", null, c.name + " — " + traits.join(", "))
      );
    }
    panel.appendChild(cast);

    if (errors && errors.length) {
      var err = el("div", "oronath-error");
      err.appendChild(el("p", null, "This arc failed validation. Play is blocked."));
      var ul = el("ul", null);
      var e;
      for (e = 0; e < errors.length; e++) {
        ul.appendChild(
          el(
            "li",
            null,
            errors[e].rule + ": " + errors[e].message
          )
        );
      }
      err.appendChild(ul);
      panel.appendChild(err);
    } else {
      if (resumeNote) {
        panel.appendChild(el("p", "muted", resumeNote));
      }
      var begin = el("button", "btn primary", "Begin");
      begin.type = "button";
      begin.addEventListener("click", startFresh);
      panel.appendChild(begin);
    }

    var nav = el("p", "oronath-nav");
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
    panel.appendChild(
      el("p", "oronath-objective", "Objective: " + v.chapter.objective)
    );
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
            choice.actorName +
              " · " +
              rollBlurb(choice.check, choice.roll)
          )
        );
        btn.addEventListener("click", function () {
          onChoose(choice.id);
        });
        list.appendChild(btn);
      })(v.choices[i]);
    }
    panel.appendChild(list);

    var foot = el("div", "oronath-foot");
    var anew = el("button", "btn ghost", "New Run");
    anew.type = "button";
    anew.addEventListener("click", function () {
      Persist.clear();
      run = null;
      resumeNote = "";
      render();
    });
    foot.appendChild(anew);
    panel.appendChild(foot);
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
      el(
        "p",
        "oronath-branch oronath-branch--" + v.outcome.branch,
        v.outcome.branch
      )
    );
    panel.appendChild(
      el("p", "oronath-consequence", v.outcome.consequence.text)
    );

    var cont = el(
      "button",
      "btn primary",
      "Continue — " + nextLabel(v.outcome.next)
    );
    cont.type = "button";
    cont.addEventListener("click", onContinue);
    panel.appendChild(cont);
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
        el(
          "p",
          "oronath-error",
          "Open threads remain: " + v.openThreads.join(", ")
        )
      );
    } else {
      panel.appendChild(
        el("p", "muted", "Every character thread is closed.")
      );
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
        "Rolls: " +
          v.diceLog.length +
          " · Complications: " +
          comps +
          " · Bonuses: " +
          bonuses
      )
    );

    var anew = el("button", "btn primary", "New Run");
    anew.type = "button";
    anew.addEventListener("click", function () {
      Persist.clear();
      run = null;
      resumeNote = "";
      render();
    });
    panel.appendChild(anew);

    var nav = el("p", "oronath-nav");
    var back = el("a", "btn", "Back to MERLIN");
    back.href = "index.html";
    nav.appendChild(back);
    panel.appendChild(nav);
    app.appendChild(panel);
  }

  function render() {
    if (!run) {
      renderTitle(null);
      return;
    }
    var v = Loop.view(run);
    if (v.phase === "choose") renderChoose(v);
    else if (v.phase === "outcome") renderOutcome(v);
    else if (v.phase === "resolved") renderResolved(v);
    else renderTitle(null);
  }

  function boot() {
    var validated = Arc.validateArc(Story);
    if (!validated.ok) {
      renderTitle(validated.errors);
      return;
    }
    var loaded = Persist.load(Story);
    if (loaded.ok && loaded.run) {
      run = loaded.run;
      resumeNote = "";
      render();
      return;
    }
    if (loaded.reason && loaded.reason !== "empty") {
      resumeNote = "Saved run could not be resumed.";
    }
    run = null;
    renderTitle(null);
  }

  boot();
})();
