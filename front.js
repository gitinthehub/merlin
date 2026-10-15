/* MERLIN — front door story picker. Read-only save peek; no storage writes. */
(function () {
  "use strict";

  var Stories = window.OronathStories;
  var host = document.getElementById("door");

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function render() {
    if (!host || !Stories || typeof Stories.door !== "function") return;
    clear(host);

    var panel = el("section", "panel door-panel");
    panel.appendChild(el("p", "door-kicker", "MERLIN"));
    panel.appendChild(el("h1", "splash-title", "Stories"));

    var status = Stories.saveStatus();
    if (status === "foreign") {
      panel.appendChild(
        el("p", "muted", "A saved run for another story is still stored.")
      );
    } else if (status === "unusable") {
      panel.appendChild(el("p", "muted", "Saved run could not be resumed."));
    }

    var saved = Stories.savedArc();
    var rows = Stories.door();
    var list = el("div", "oronath-stories");
    var i;

    for (i = 0; i < rows.length; i++) {
      var row = rows[i];
      var card = el("article", "oronath-story-card");

      if (row.awaiting) {
        card.appendChild(el("h2", "scene-title", row.title));
        card.appendChild(el("p", "door-awaiting-note", row.note));
        list.appendChild(card);
        continue;
      }

      card.appendChild(el("h2", "scene-title", row.title || row.id || "Story"));
      if (row.blurb) card.appendChild(el("p", "oronath-story-blurb", row.blurb));

      if (row.playable) {
        var meta =
          row.chapterCount +
          (row.chapterCount === 1 ? " chapter" : " chapters");
        if (row.cast && row.cast.length) meta += " · " + row.cast.join(", ");
        card.appendChild(el("p", "oronath-story-meta", meta));
      }

      if (row.missing) {
        card.appendChild(
          el("p", "muted", "This story is not bundled on this page.")
        );
      }

      if (row.playable && row.id) {
        var warn = "";
        if (saved && saved.phase !== "resolved") {
          if (saved.arcId === row.id) {
            var n = saved.chapterNumber != null ? saved.chapterNumber : "";
            var place = saved.chapterTitle || "";
            warn =
              "This story has a run in progress at Chapter " +
              n +
              " — " +
              place +
              ". Beginning again replaces it.";
          } else {
            warn =
              "Your run in " +
              (saved.arc.title || saved.arcId) +
              " is saved — beginning this story will replace it.";
          }
        }
        if (warn) card.appendChild(el("p", "muted oronath-story-warn", warn));

        if (saved && saved.arcId === row.id && saved.phase === "resolved") {
          card.appendChild(
            el("p", "muted", "Ended: " + (saved.chapterTitle || ""))
          );
        }

        var actions = el("div", "oronath-story-actions");
        var begin = el("a", "btn primary", "Begin");
        begin.href = "oronath.html#" + row.id + "/begin";
        actions.appendChild(begin);

        if (saved && saved.arcId === row.id && saved.phase !== "resolved") {
          var resume = el("a", "btn", "Resume");
          if (saved.chapterNumber != null) {
            resume.textContent = "Resume — Chapter " + saved.chapterNumber;
          }
          resume.href = "oronath.html#" + row.id;
          actions.appendChild(resume);
        }
        card.appendChild(actions);
      }

      list.appendChild(card);
    }

    panel.appendChild(list);

    if (
      saved &&
      saved.arcId === "last-signal" &&
      saved.phase !== "resolved"
    ) {
      var n = saved.chapterNumber != null ? saved.chapterNumber : "";
      var place = saved.chapterTitle || "";
      var aside = el(
        "p",
        "door-aside muted",
        "The Last Signal of Oronath has a run in progress at Chapter " +
          n +
          " — " +
          place +
          "."
      );
      var link = el("a", null, "Resume The Last Signal");
      link.href = "oronath.html#last-signal";
      aside.appendChild(document.createTextNode(" "));
      aside.appendChild(link);
      panel.appendChild(aside);
    }

    var links = el("div", "door-links");
    var castle = el("a", "btn ghost", "The castle night");
    castle.href = "castle.html";
    links.appendChild(castle);
    var earlier = el("a", "btn ghost", "Earlier stories");
    earlier.href = "oronath.html";
    links.appendChild(earlier);
    panel.appendChild(links);

    host.appendChild(panel);
  }

  render();
})();
