# 🥔 Potato Clicker

A cosy, increasingly unhinged idle/clicker game for the browser. Start with one
potato. Click it. Buy farmers. Mutate your potato through 38 forms, rebirth five
times, and achieve the ultimate lifeform: **Kawaii Potato**.

No build step, no dependencies, no image or audio assets — plain HTML/CSS/JS with
procedurally drawn SVG potatoes and WebAudio-synthesised sound.

**[Play it on GitHub Pages](https://ben0551.github.io/potato-clicker/)**

---

## How to play

| Action | Where |
|---|---|
| Click the potato | Left side — earns potatoes per click |
| Buy harvesters | **Harvesters** tab — passive potatoes per second |
| Evolve mutations | **Potato Upgrades** tab — raises PPC and passive multiplier |
| Rebirth | **Rebirth** tab — prestige, up to 5 times |
| Achievements | 🏆 button, top right (208 of them, bragging rights only) |
| Settings | ⚙️ button, top right (audio, theme, saving) |

There is only one currency: **potatoes**. There are no prestige tokens, no
secondary currencies, no combos, no click frenzy.

### Rebirth

Each rebirth requires all three of:

1. the final mutation of the current tier,
2. every currently unlocked harvester at its cap,
3. holding the required potato count.

You lose potatoes, harvesters, mutations and production. You keep your rebirth
count, your harvester caps grow by 25%, and the next mutation tier unlocks.

### Offline progress

Capped at **30 minutes** of production, shown in a "Welcome back!" modal.

---

## Design decisions

The spec fixed the mutation names, harvester names, caps and humour, but left a
few mechanics undefined. What I chose:

- **Harvester unlocks.** The spec says rebirth needs "the maximum amount of all
  unlocked harvesters" but never defines what unlocks a harvester. If all 15 were
  available from the start, rebirth 1 would require maxing the UFO — impossible in
  2–3 hours. So harvesters unlock with rebirths: **5 at the start, +2 per
  rebirth** (15 after the fifth). Locked tiers are shown greyed out with the
  rebirth that unlocks them.
- **Mutation numbers.** Only `Frozen = 2 PPC` and `Magma = 5 PPC` were specified.
  The rest follow `25 × 2.5^k` per tier with tier bases
  `1 / 25 / 1.5K / 230K / 220M / 1.4T`. Costs are `ppc × (25 + 6 × index)`.
- **Passive multiplier.** Each owned mutation adds a per-tier bonus to passive
  production (additive: `+0.25 / +0.5 / +1 / +2 / +4 / +8`), reaching ×138.75
  with all 38 mutations. Additive rather than multiplicative so 38 mutations do
  not produce a 10^7 multiplier.
- **Rebirth potato requirements.** Tuned with the headless harness (below) to
  `1.7e8 / 5.1e10 / 1.53e13 / 4.59e15 / 1.377e18` — roughly ×300 per rebirth,
  which is what makes later rebirths take longer instead of shorter.
- **Achievements** are generated from families (click counts, lifetime earnings,
  PPC, PPS, per-harvester first/25/max, per-mutation, rebirths, play time) plus
  the 12 hidden ones from the spec. 208 total.

## Balance

Measured with `node tools/balance.js` — a greedy bot that clicks 2×/s, buys the
most efficient affordable harvester every tick, evolves every affordable
mutation, and rebirths the moment it can. All times are simulated play:

| Milestone | Time |
|---|---|
| Rebirth 1 | 2h 11m |
| Rebirth 2 | 4h 23m |
| Rebirth 3 | 8h 37m |
| Rebirth 4 | 18h 47m |
| Rebirth 5 | 44h 58m |
| **Kawaii Potato** | **46h 03m** |
| Final passive income | 702T potatoes/s |
| Achievements unlocked by then | 180 / 208 |

That is the *optimal* bot; a human who sleeps and idles will take longer, which
is what the spec's "approximately 2+ days" target assumes.

Retune with:

```bash
node tools/balance.js                 # default report
node tools/balance.js 5 120           # 5 clicks/s, simulate 120 h
node tools/balance.js --sweep         # sweep cost growth × rebirth scale
node tools/balance.js 2 96 '{"costGrowth":1.18}'   # override any CONFIG knob
```

## Project layout

```
index.html            entry point
css/style.css         all styling (dark + light themes)
js/game.js            engine — pure logic, no DOM, also runs in Node
js/art.js             procedural SVG potato art for all 38 mutations
js/ui.js              DOM controller, audio, modals, render loop
tools/balance.js      headless pacing harness
tools/art-preview.html  visual grid of every mutation (dev only)
```

The engine and UI are separated so the whole economy can be simulated headlessly:
`game.js` touches no DOM and `ui.js` never mutates state directly.

## Audio

All sound is synthesised with WebAudio — a lo-fi chord pad for music, and short
enveloped oscillators for clicks, purchases, achievements and rebirth. **Sound is
off by default** and opt-in per channel in Settings; nothing starts playing until
you turn it on.

## Saving

Saves to `localStorage` every 10 s (if auto save is on) and on page hide/unload.
Export produces a base64 string; import accepts one. Hard reset wipes everything.
