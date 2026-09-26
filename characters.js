/* MERLIN / Oronath — character traits and pregens. Pure logic. */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.OronathCast = api;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";

  function diceApi() {
    if (root && root.OronathDice) return root.OronathDice;
    if (typeof require === "function") return require("./dice.js");
    throw new Error("OronathDice not loaded");
  }

  var PREGENS = [
    {
      id: "john",
      name: "John",
      threadId: "john-memory",
      traits: [
        { id: "stealth", label: "Stealth", difficulty: -2, advantage: false },
        {
          id: "night-vision",
          label: "Night vision",
          difficulty: 0,
          advantage: true
        },
        {
          id: "endurance",
          label: "Endurance",
          difficulty: -1,
          advantage: false
        }
      ]
    },
    {
      id: "joel",
      name: "Joel",
      threadId: "joel-legacy",
      traits: [
        { id: "strength", label: "Strength", difficulty: -2, advantage: true },
        {
          id: "carved-axe",
          label: "An axe with unknown carvings",
          difficulty: 0,
          advantage: false
        }
      ]
    },
    {
      id: "rafe",
      name: "Rafe",
      threadId: "rafe-return",
      traits: [
        { id: "speed", label: "Speed", difficulty: -2, advantage: true },
        { id: "sniper", label: "Sniper", difficulty: -1, advantage: true },
        {
          id: "alien-origin",
          label: "Alien origin",
          difficulty: 0,
          advantage: true
        }
      ]
    }
  ];

  function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function pregen(id) {
    for (var i = 0; i < PREGENS.length; i++) {
      if (PREGENS[i].id === id) return deepCopy(PREGENS[i]);
    }
    throw new Error("unknown pregen: " + id);
  }

  function resolveCheck(character, rollSpec) {
    rollSpec = rollSpec || {};
    var tags = rollSpec.tags || [];
    var traits = (character && character.traits) || [];
    var matched = [];
    var modifier = 0;
    var advantage = !!rollSpec.advantage;
    var ti;
    var tagi;
    var trait;

    for (ti = 0; ti < traits.length; ti++) {
      trait = traits[ti];
      for (tagi = 0; tagi < tags.length; tagi++) {
        if (tags[tagi] === trait.id) {
          matched.push(trait.id);
          modifier += trait.difficulty || 0;
          if (trait.advantage) advantage = true;
          break;
        }
      }
    }

    var die = rollSpec.die;
    var tier = rollSpec.tier != null ? rollSpec.tier : null;
    var baseDc;
    if (die === "d20") {
      baseDc = diceApi().dcFor(tier);
    } else {
      baseDc = rollSpec.dc != null ? rollSpec.dc : null;
    }

    return {
      die: die,
      tier: tier,
      tags: tags.slice(),
      matchedTraits: matched,
      modifier: modifier,
      advantage: advantage,
      dc: baseDc
    };
  }

  return {
    PREGENS: PREGENS,
    pregen: pregen,
    resolveCheck: resolveCheck
  };
});
