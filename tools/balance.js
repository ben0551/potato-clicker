/* Headless balance harness for Potato Clicker.
 *
 *   node tools/balance.js [clickRatePerSec] [maxHours] [configJson]
 *   node tools/balance.js --sweep
 *
 * Plays the game with a greedy bot and reports pacing milestones so the
 * economy can be tuned against measured times instead of guesses.
 */
'use strict';
const P = require('../js/game.js');
const { Game, HARVESTERS, MUTATIONS, fmt } = P;

function hms(s) {
  if (s === null || s === undefined || !isFinite(s)) return '—';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m ${Math.floor(s % 60)}s`;
}

function run(clickRate, maxHours, verbose) {
  const g = new Game();
  const dt = 0.05;
  const maxT = maxHours * 3600;
  let t = 0, clickAcc = 0, lastLog = -1e9;
  const rebirthTimes = [];
  let winTime = null;
  const milestones = [];

  while (t < maxT) {
    g.tick(dt);
    t += dt;

    clickAcc += clickRate * dt;
    while (clickAcc >= 1) { g.click(); clickAcc -= 1; }

    const ni = g.nextMutation();
    if (ni >= 0 && g.mutationUnlocked(ni) &&
        g.state.potatoes >= g.mutationCost(ni)) {
      g.buyMutation(ni);
    }

    let best = -1, bestRatio = 0;
    const unlocked = g.unlockedHarvesterCount();
    for (let i = 0; i < unlocked; i++) {
      if (g.state.harvesters[i] >= g.harvesterCap(i)) continue;
      const nextCost = HARVESTERS[i].cost *
        Math.pow(P.CONFIG.costGrowth, g.state.harvesters[i]);
      const ratio = HARVESTERS[i].pps / nextCost;
      if (ratio > bestRatio) { bestRatio = ratio; best = i; }
    }
    if (best >= 0) {
      const nextCost = HARVESTERS[best].cost *
        Math.pow(P.CONFIG.costGrowth, g.state.harvesters[best]);
      if (g.state.potatoes >= nextCost) g.buyHarvester(best, '1');
    }

    if (g.canRebirth()) {
      rebirthTimes.push(t);
      g.rebirth();
    }
    if (g.state.won && winTime === null) winTime = t;

    if (verbose && t - lastLog >= 900) {
      lastLog = t;
      const mi = g.mutationIndex();
      milestones.push({
        t, potatoes: g.state.potatoes, total: g.state.totalEarned,
        pps: g.pps(), ppc: g.ppc(), mut: mi,
        mutName: mi >= 0 ? MUTATIONS[mi].name : '-',
        rebirths: g.state.rebirths, harv: g.totalHarvesters(),
        ach: g.achievementCount()
      });
    }
    if (winTime !== null) break;
  }
  return { g, t, rebirthTimes, winTime, milestones };
}

function report(clickRate, maxHours) {
  const r = run(clickRate, maxHours, true);
  const g = r.g;
  console.log('=== Potato Clicker balance sim ===');
  console.log(`click rate: ${clickRate}/s   simulated: ${hms(r.t)}   rebirths: ${g.state.rebirths}`);
  console.log('');
  console.log('milestones (every 15 sim-min):');
  console.log('time      potatoes      totalEarned  pps          ppc        mutation         reb  harv  ach');
  for (const m of r.milestones) {
    console.log(
      hms(m.t).padEnd(9),
      fmt(m.potatoes).padEnd(13),
      fmt(m.total).padEnd(12),
      fmt(m.pps).padEnd(12),
      fmt(m.ppc).padEnd(10),
      (m.mutName || '-').slice(0, 15).padEnd(15),
      String(m.rebirths).padEnd(4),
      String(m.harv).padEnd(5),
      m.ach
    );
  }
  console.log('');
  console.log('rebirth times:', r.rebirthTimes.map(hms).join(', ') || 'none');
  console.log('kawaii / win :', hms(r.winTime));
  console.log('final        : potatoes', fmt(g.state.potatoes), '| pps', fmt(g.pps()),
    '| ppc', fmt(g.ppc()), '| mutation', g.mutationIndex(),
    g.mutationIndex() >= 0 ? MUTATIONS[g.mutationIndex()].name : '-');
  console.log('achievements :', g.achievementCount(), '/', P.ACHIEVEMENTS.length);
}

function sweep() {
  const base = JSON.parse(JSON.stringify(P.CONFIG));
  const configs = [];
  const growths = [1.15, 1.18, 1.20, 1.22, 1.25];
  const scales = [1, 10, 100, 1000];
  for (const cg of growths) {
    for (const sc of scales) {
      const c = JSON.parse(JSON.stringify(base));
      c.costGrowth = cg;
      c.rebirthPotatoes = base.rebirthPotatoes.map(v => v * sc);
      configs.push({ label: `growth=${cg} reqScale=${sc}`, cfg: c });
    }
  }
  console.log('growth  reqScale | R1      R2      R3      R4      R5      kawaii  finalPPS');
  for (const { label, cfg } of configs) {
    Object.assign(P.CONFIG, cfg);
    const r = run(2, 96, false);
    const rt = r.rebirthTimes.map(hms).map(s => s.padEnd(7)).join(' ');
    while (r.rebirthTimes.length < 5) r.rebirthTimes.push(NaN);
    console.log(
      label.padEnd(16), '|',
      hms(r.rebirthTimes[0]).padEnd(7),
      hms(r.rebirthTimes[1]).padEnd(7),
      hms(r.rebirthTimes[2]).padEnd(7),
      hms(r.rebirthTimes[3]).padEnd(7),
      hms(r.rebirthTimes[4]).padEnd(7),
      hms(r.winTime).padEnd(7),
      fmt(r.g.pps())
    );
  }
  Object.assign(P.CONFIG, base);
}

if (process.argv[2] === '--sweep') {
  sweep();
} else {
  const clickRate = parseFloat(process.argv[2] || '2');
  const maxHours = parseFloat(process.argv[3] || '96');
  if (process.argv[4]) {
    const overrides = JSON.parse(process.argv[4]);
    Object.assign(P.CONFIG, overrides);
    console.log('config overrides:', JSON.stringify(overrides));
  }
  report(clickRate, maxHours);
  console.log('');
  console.log('cost to max each tier at rebirth 0 caps:');
  for (let i = 0; i < HARVESTERS.length; i++) {
    const cap = HARVESTERS[i].cap;
    const r = P.CONFIG.costGrowth;
    const total = HARVESTERS[i].cost * (Math.pow(r, cap) - 1) / (r - 1);
    console.log(`  ${(i + 1 + '. ' + HARVESTERS[i].name).padEnd(32)} ${fmt(total)}`);
  }
}
