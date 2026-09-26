/* MERLIN / Oronath — built-in sample arc (proof of the loop). Not the real Oronath story. */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.OronathSample = api;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";

  function castApi() {
    if (root && root.OronathCast) return root.OronathCast;
    if (typeof require === "function") return require("./characters.js");
    throw new Error("OronathCast not loaded");
  }

  var Cast = castApi();

  var SAMPLE = {
    id: "sample-wick",
    version: 1,
    title: "The Last Wick",
    characters: [Cast.pregen("john"), Cast.pregen("joel"), Cast.pregen("rafe")],
    threads: [
      { id: "john-memory", characterId: "john", label: "memory/identity" },
      { id: "joel-legacy", characterId: "joel", label: "legacy" },
      { id: "rafe-return", characterId: "rafe", label: "return-home" }
    ],
    chapters: [
      {
        id: "candle-stair",
        title: "The Candle Stair",
        setting:
          "A narrow stair lit by one candle. Wax pools on the stone. Below, a door waits.",
        objective: "Reach the landing before the candle dies.",
        choices: [
          {
            id: "dark-stair",
            label: "Take the dark steps",
            actor: "john",
            roll: {
              die: "d20",
              tier: "medium",
              tags: ["night-vision", "stealth"]
            },
            consequences: {
              success: {
                text: "John takes the dark steps. The candle holds.",
                next: "whisper-gallery",
                resolves: []
              },
              failure: {
                text: "They reach the gallery late, and the candle is a stub.",
                next: "whisper-gallery",
                resolves: []
              },
              complication: {
                text: "The stair gives way. They fall through into the last room.",
                next: "last-wick",
                resolves: []
              },
              bonus: {
                text: "The flame shows John's own name scored in the wax.",
                next: "whisper-gallery",
                resolves: ["john-memory"]
              }
            }
          },
          {
            id: "break-rail",
            label: "Break the rotten rail",
            actor: "joel",
            roll: { die: "2d6", dc: 7, tags: ["strength"] },
            consequences: {
              success: {
                text: "The carved axe splits the rotten rail and the stair holds.",
                next: "whisper-gallery",
                resolves: []
              },
              failure: {
                text: "The rail splinters. They climb the gap anyway.",
                next: "whisper-gallery",
                resolves: []
              },
              complication: {
                text: "Snake eyes. The axe bites Joel's handhold and the floor opens.",
                next: "last-wick",
                resolves: []
              },
              bonus: {
                text: "The carving on the axe answers the candle, a clean cut.",
                next: "whisper-gallery",
                resolves: []
              }
            }
          }
        ]
      },
      {
        id: "whisper-gallery",
        title: "The Whisper Gallery",
        setting:
          "A long room of portraits whose mouths move. The whisper learns names.",
        objective: "Cross before the whisper learns a name.",
        choices: [
          {
            id: "read-wall",
            label: "Read the wall through",
            actor: "john",
            roll: { die: "d20", tier: "hard", tags: ["endurance"] },
            consequences: {
              success: {
                text: "John reads the wall through to the last door.",
                next: "last-wick",
                resolves: []
              },
              failure: {
                text: "The whisper keeps one name. The door still opens.",
                next: "last-wick",
                resolves: []
              },
              complication: {
                text: "A one. The gallery seals behind them and the candle goes out.",
                next: "end-snuffed",
                resolves: []
              },
              bonus: {
                text: "A twenty. John remembers who cut the name, and the whisper loses it.",
                next: "last-wick",
                resolves: ["john-memory"]
              }
            }
          },
          {
            id: "outpace-echo",
            label: "Outpace the echo",
            actor: "rafe",
            roll: { die: "d10", dc: 6, tags: ["speed"] },
            consequences: {
              success: {
                text: "Rafe outruns the echo and kicks the far door.",
                next: "last-wick",
                resolves: []
              },
              failure: {
                text: "The echo arrives with them. The door still yields.",
                next: "last-wick",
                resolves: []
              },
              complication: {
                text: "A one on the d10. The echo takes the way home out of the room.",
                next: "end-snuffed",
                resolves: []
              },
              bonus: {
                text: "Double zero. Rafe hears the road home in the echo and keeps it.",
                next: "last-wick",
                resolves: ["rafe-return"]
              }
            }
          }
        ]
      },
      {
        id: "last-wick",
        title: "The Last Wick",
        setting:
          "A round chamber. One wick. The axe's carving glows in the wax light.",
        objective: "Keep the wick, or spend the axe on it.",
        choices: [
          {
            id: "shield-flame",
            label: "Cup the flame",
            actor: "john",
            roll: { die: "d20", tier: "veryHard", tags: ["endurance"] },
            consequences: {
              success: {
                text: "John cups the flame and it steadies.",
                next: "end-kept",
                resolves: []
              },
              failure: {
                text: "The flame ducks his hands and dies.",
                next: "end-snuffed",
                resolves: []
              },
              complication: {
                text: "A one. His sleeve takes the wick with it.",
                next: "end-snuffed",
                resolves: []
              },
              bonus: {
                text: "A twenty. The flame climbs and shows the way they came from.",
                next: "end-kept",
                resolves: ["john-memory"]
              }
            }
          },
          {
            id: "loose-the-axe",
            label: "Set the axe under the wick",
            actor: "joel",
            roll: {
              die: "2d6",
              dc: 9,
              tags: ["strength", "carved-axe"]
            },
            consequences: {
              success: {
                text: "Joel sets the axe under the wick. The carving holds the fire.",
                next: "end-kept",
                resolves: []
              },
              failure: {
                text: "The axe misses the stand. The wick drowns in wax.",
                next: "end-snuffed",
                resolves: []
              },
              complication: {
                text: "The axe turns in his hands and cuts the wick in half.",
                next: "end-snuffed",
                resolves: []
              },
              bonus: {
                text: "Boxcars. The unknown carving locks the flame upright.",
                next: "end-kept",
                resolves: ["joel-legacy"]
              }
            }
          }
        ]
      }
    ],
    endings: [
      {
        id: "end-kept",
        title: "The Wick Holds",
        text: "The wick stays lit. John knows his name, Joel's carving has an heir, and Rafe can point toward home.",
        resolves: ["john-memory", "joel-legacy", "rafe-return"]
      },
      {
        id: "end-snuffed",
        title: "The Wick Goes Out",
        text: "The wick dies. The three still leave with the name, the carving, and the direction — the night is over either way.",
        resolves: ["john-memory", "joel-legacy", "rafe-return"]
      }
    ]
  };

  return SAMPLE;
});
