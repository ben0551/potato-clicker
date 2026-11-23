/* ==========================================================================
 * Potato Clicker — game engine.
 * Pure logic. No DOM access. Runs in the browser (window.PotatoGame) and in
 * Node (module.exports) so tools/balance.js can simulate the economy.
 * ========================================================================== */
(function (global) {
  'use strict';

  var SAVE_KEY = 'potato-clicker-save-v1';
  var SAVE_VERSION = 1;

  // All economy knobs live here so tools/balance.js can sweep them.
  // Tuned with `node tools/balance.js` (greedy bot, 2 clicks/s):
  //   first rebirth ~2h10m, fifth rebirth ~45h, Kawaii Potato ~46h.
  var CONFIG = {
    costGrowth: 1.16,        // cost multiplier per harvester owned
    capGrowth: 0.25,         // +25% harvester cap per rebirth
    baseTiers: 5,            // harvester tiers unlocked at the start
    tiersPerRebirth: 2,      // extra tiers unlocked per rebirth
    offlineCap: 1800,        // 30 minutes
    maxRebirths: 5,
    tierEnd: [2, 6, 11, 18, 27],
    rebirthPotatoes: [1.7e8, 5.1e10, 1.53e13, 4.59e15, 1.377e18],
    mutationCostBase: 25,
    mutationCostPerIndex: 6,
    tierBonus: [0.25, 0.5, 1, 2, 4, 8]
  };

  /* ------------------------------------------------------------------ *
   *  Harvesters
   * ------------------------------------------------------------------ */
  var HARVESTERS = [
    { name: 'Farmer', icon: '\u{1F9D1}\u200D\u{1F33E}', cost: 15, pps: 0.5, cap: 100,
      desc: 'A person who harvests potatoes.' },
    { name: 'Tractor', icon: '\u{1F69C}', cost: 90, pps: 3.5, cap: 75,
      desc: 'A tractor. It tractors.' },
    { name: 'Farm Crew', icon: '\u{1F477}', cost: 540, pps: 24.5, cap: 60,
      desc: 'A crew of people. They crew.' },
    { name: 'Harvester Combine', icon: '\u{1F33E}', cost: 3240, pps: 171.5, cap: 50,
      desc: 'Combines. Harvests. Mostly in that order.' },
    { name: 'Irrigation Network', icon: '\u{1F4A7}', cost: 19440, pps: 1200, cap: 40,
      desc: 'Water finds a way. Usually into potatoes.' },
    { name: 'Potato Processing Plant', icon: '\u{1F3ED}', cost: 116640, pps: 8400, cap: 35,
      desc: 'Turns potatoes into more potatoes. Do not ask how.' },
    { name: 'Potato Logistics Division', icon: '\u{1F69A}', cost: 699840, pps: 58800, cap: 30,
      desc: 'Every potato, everywhere, all at once.' },
    { name: 'Potato Corporation', icon: '\u{1F3E2}', cost: 4199040, pps: 411800, cap: 30,
      desc: 'The board meets every Tuesday. Catering is potatoes.' },
    { name: 'Potato Research Lab', icon: '\u{1F52C}', cost: 25194240, pps: 2880000, cap: 25,
      desc: 'Scientists are beginning to ask difficult potato questions.' },
    { name: 'Potato Cloning Facility', icon: '\u{1F9EC}', cost: 151165440, pps: 20200000, cap: 20,
      desc: 'Several potatoes are now legally identical.' },
    { name: 'Automated Potato AI', icon: '\u{1F916}', cost: 906992640, pps: 141000000, cap: 20,
      desc: 'It only grows potatoes. So far.' },
    { name: 'Deep Earth Potato Extractor', icon: '\u{26CF}\uFE0F', cost: 5441955840, pps: 989000000, cap: 15,
      desc: 'The potatoes were here first. We just found them.' },
    { name: 'Interdimensional Potato Portal', icon: '\u{1F300}', cost: 32651735040, pps: 6920000000, cap: 15,
      desc: 'The potatoes from the other side seem nervous.' },
    { name: 'Potato Reality Distorter', icon: '\u{1F30C}', cost: 195910410240, pps: 48400000000, cap: 10,
      desc: 'The potatoes exist before being planted.' },
    { name: 'UFO Potato Collector', icon: '\u{1F6F8}', cost: 1175462461440, pps: 339000000000, cap: 5,
      desc: 'The UFO refuses to explain where the potatoes come from. HR has stopped asking.' }
  ];

  /* ------------------------------------------------------------------ *
   *  Mutations
   * ------------------------------------------------------------------ */
  // [name, art, tier, k, description]
  var MUT_RAW = [
    ['Ordinary Potato', 'plain', 0, 0, 'A potato. It is ordinary. It knows what it is.'],
    ['Frozen Potato', 'frost', 0, 1, 'Ice-covered. Still a potato. Colder, though.'],
    ['Magma Potato', 'magma', 0, 2, 'Lava cracks. Do not drop. Do not lick.'],
    ['Golden Potato', 'gold', 1, 0, 'Solid gold. Worth more than your house.'],
    ['Diamond Potato', 'diamond', 1, 1, 'Crystal facets. Absurdly hard to mash.'],
    ['Crystal Potato', 'crystal', 1, 2, 'Strangely glowing. The glow is fine. Probably.'],
    ['Rainbow Potato', 'rainbow', 1, 3, 'Absurdly colourful. Tastes like all the colours.'],
    ['Mythic Potato', 'mythic', 2, 0, 'Legends say it was grown by the old gods.'],
    ['Storm Potato', 'storm', 2, 1, 'Crackling with weather. Forecast: potato.'],
    ['Void Potato', 'void', 2, 2, 'It is not a potato. It is the space where a potato is not.'],
    ['Celestial Potato', 'celestial', 2, 3, 'Blessed by the sky. The sky has questions.'],
    ['Quantum Potato', 'quantum', 2, 4, 'It is and is not a potato until you check.'],
    ['Ancient Potato', 'ancient', 3, 0, 'Older than the farm. Older than farming.'],
    ['Arcane Potato', 'arcane', 3, 1, 'Covered in runes nobody agrees on.'],
    ['Galaxy Potato', 'galaxy', 3, 2, 'Contains a small spiral galaxy. Do not shake.'],
    ['Time Potato', 'time', 3, 3, 'Harvested yesterday. Planted tomorrow.'],
    ['Chaos Potato', 'chaos', 3, 4, 'It changes shape when you are not looking.'],
    ['Potato Prime', 'prime', 3, 5, 'The first potato. All other potatoes are copies.'],
    ['Transcendent Potato', 'transcendent', 3, 6, 'It has seen the other side. It is fine with it.'],
    ['Reality Potato', 'reality', 4, 0, 'Reality is a suggestion. It suggests potato.'],
    ['Singularity Potato', 'singularity', 4, 1, 'Infinite density. Infinite flavour.'],
    ['Multiverse Potato', 'multiverse', 4, 2, 'Every possible potato, stacked.'],
    ['Divine Potato', 'divine', 4, 3, 'Worshipped in 4,000 dimensions.'],
    ['Potato.exe', 'exe', 4, 4, 'Has stopped responding. Keep clicking.'],
    ['Supreme Potato', 'supreme', 4, 5, 'Ruler of all potatoes, unopposed.'],
    ['The Potato', 'the', 4, 6, 'Not a potato. The Potato.'],
    ['Beyond Potato', 'beyond', 4, 7, 'Past the concept of potato.'],
    ['Absolute Potato', 'absolute', 4, 8, 'The final truth. It is a potato.'],
    ['Ultra Potato', 'ultra', 5, 0, 'Beyond absolute. Sorry.'],
    ['Omega Potato', 'omega', 5, 1, 'The last letter. The last potato.'],
    ['Hyper Potato', 'hyper', 5, 2, 'Faster than light. Crunchier than sound.'],
    ['Cosmic Spud', 'cosmic', 5, 3, 'A spud on a cosmic scale.'],
    ['Universal Potato', 'universal', 5, 4, 'One potato for the whole universe.'],
    ['Potato Deity', 'deity', 5, 5, 'It answers prayers. With potatoes.'],
    ['Infinite Potato', 'infinite', 5, 6, 'Counting it would take forever.'],
    ['Final Potato', 'final', 5, 7, 'There is nothing after this. Officially.'],
    ['Almost Kawaii Potato', 'almost', 5, 8, 'So close. Not quite. Keep going.'],
    ['Kawaii Potato', 'kawaii', 5, 9, '(◕‿◕) You made it.']
  ];

  var TIER_BASE_PPC = [1, 25, 1500, 230000, 2.2e8, 1.4e12];
  var TIER_RATIO = 2.5;

  function roundSig(x, sig) {
    if (!isFinite(x)) return x;
    if (x < 1000) return Math.round(x);
    var d = Math.pow(10, Math.floor(Math.log10(x)) - (sig - 1));
    return Math.round(x / d) * d;
  }

  var MUTATIONS = MUT_RAW.map(function (r, i) {
    var name = r[0], art = r[1], tier = r[2], k = r[3], desc = r[4];
    var ppc = (tier === 0) ? [1, 2, 5][k]
                          : roundSig(TIER_BASE_PPC[tier] * Math.pow(TIER_RATIO, k), 3);
    return { name: name, art: art, tier: tier, k: k, ppc: ppc, desc: desc };
  });

  /* ------------------------------------------------------------------ *
   *  Number formatting
   * ------------------------------------------------------------------ */
  var SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No',
                'Dc', 'UD', 'DD', 'TD', 'QaD', 'QiD', 'SxD', 'SpD', 'OcD',
                'NoD', 'Vg'];

  // The headline counter shows full grouped digits (as in the spec's
  // "🥔 15,482,219" example) and only abbreviates once the number gets absurd.
  function fmtFull(n) {
    if (n === null || n === undefined || isNaN(n)) return '0';
    if (n < 0) return '-' + fmtFull(-n);
    if (n < 1e12) {
      if (Number.isInteger(n)) return n.toLocaleString('en-US');
      if (n < 1000) return n < 10 ? n.toFixed(2) : n.toFixed(1);
      return Math.floor(n).toLocaleString('en-US');
    }
    return fmt(n);
  }

  function fmt(n) {
    if (n === null || n === undefined || isNaN(n)) return '0';
    if (n < 0) return '-' + fmt(-n);
    if (n < 1000) {
      if (Number.isInteger(n)) return String(n);
      return n < 10 ? n.toFixed(2) : n.toFixed(1);
    }
    var tier = Math.floor(Math.log10(n) / 3);
    if (tier >= SUFFIX.length) return n.toExponential(2);
    var scaled = n / Math.pow(10, tier * 3);
    var s = scaled >= 100 ? scaled.toFixed(0) : scaled >= 10 ? scaled.toFixed(1) : scaled.toFixed(2);
    return s + SUFFIX[tier];
  }

  /* ------------------------------------------------------------------ *
   *  Achievements
   * ------------------------------------------------------------------ */
  function buildAchievements() {
    var out = [];
    function add(id, name, desc, hidden, check) {
      out.push({ id: id, name: name, desc: desc, hidden: !!hidden, check: check });
    }

    // --- Clicking ---
    var clicks = [
      [1, 'First Click', 'Click the potato.'],
      [10, 'Ten Clicks', 'Ten whole clicks.'],
      [100, 'Hundred Clicks', 'A hundred clicks. Your finger is warming up.'],
      [1000, 'Thousand Clicks', 'One thousand clicks.'],
      [5000, 'Click Trainee', 'Five thousand clicks.'],
      [10000, 'Click Apprentice', 'Ten thousand clicks.'],
      [25000, 'Click Adept', 'Twenty-five thousand clicks.'],
      [50000, 'Click Master', 'Fifty thousand clicks.'],
      [100000, 'Hundred Thousand', 'One hundred thousand clicks.'],
      [250000, 'Quarter Million', 'A quarter of a million clicks.'],
      [500000, 'Half a Million', 'Five hundred thousand clicks.'],
      [1000000, 'One Million Clicks', 'A million clicks. Incredible.'],
      [5000000, 'Five Million Clicks', 'Five million clicks.'],
      [10000000, 'Ten Million Clicks', 'Ten million clicks. Seek help.']
    ];
    clicks.forEach(function (c) {
      add('click_' + c[0], c[1], c[2], false, function (g) { return g.state.clicks >= c[0]; });
    });

    // --- Potatoes earned (lifetime) ---
    var earnNames = ['Tiny Tater', 'Small Spud', 'Potato Pile', 'Tater Tot', 'Potato Heap',
      'Spud Stash', 'Growing Spud', 'Potato Baron', 'Potato Mogul', 'Spud Tycoon',
      'Potato Millionaire', 'Spudillionaire', 'Potato Magnate', 'Tater Titan',
      'Potato Billionaire', 'Spud Sovereign', 'Potato Overlord', 'Starch Royalty',
      'Potato Prince', 'Spud Duke', 'Potato King', 'Tater Emperor', 'Potato God',
      'Spud Deity', 'Potato Cosmic', 'Starch Eternal', 'Potato Infinite', 'Spud Absolute',
      'Potato Beyond', 'Tater Omega', 'Potato Universal', 'Spud Singular', 'Potato Reality',
      'Starch Prime', 'Potato Final', 'Spud Kawaii', 'Potato Ascended'];
    var earnThresholds = [];
    for (var e = 2; e <= 20; e++) {
      earnThresholds.push(Math.pow(10, e));
      if (e < 20) earnThresholds.push(3 * Math.pow(10, e));
    }
    earnThresholds.forEach(function (n, i) {
      var nm = earnNames[i] || ('Earned ' + fmt(n));
      add('earn_' + i, nm, 'Earn ' + fmt(n) + ' potatoes.', false,
        function (g) { return g.state.totalEarned >= n; });
    });

    // --- Potatoes per click ---
    var ppcNames = ['Single Spud', 'High Five', 'Quarter Ton', 'Century Click', 'Kilo Click',
      'Ten Kilos', 'Clickstorm', 'Mega Click', 'Click Tycoon', 'Click Mogul', 'Giga Click',
      'Click Deity', 'Cosmic Click', 'Universal Click', 'Infinite Click', 'Final Click',
      'Kawaii Click'];
    var ppcThresholds = [1, 5, 25, 100, 1000, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10,
                         1e11, 1e12, 1e13, 1e14, 1e15];
    ppcThresholds.forEach(function (n, i) {
      add('ppc_' + i, ppcNames[i], 'Reach ' + fmt(n) + ' potatoes per click.', false,
        function (g) { return g.ppc() >= n; });
    });

    // --- Potatoes per second ---
    var ppsNames = ['Passive Start', 'Ten Per Second', 'Hundred Per Second',
      'Kilo Per Second', '10K Per Second', '100K Per Second', 'Mega Per Second',
      '10M Per Second', '100M Per Second', 'Giga Per Second', '10B Per Second',
      '100B Per Second', 'Tera Per Second', '10T Per Second'];
    var ppsThresholds = [1, 10, 100, 1000, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11,
                         1e12, 1e13];
    ppsThresholds.forEach(function (n, i) {
      add('pps_' + i, ppsNames[i], 'Reach ' + fmt(n) + ' potatoes per second.', false,
        function (g) { return g.pps() >= n; });
    });

    // --- Harvesters ---
    HARVESTERS.forEach(function (h, i) {
      add('harv_first_' + i, 'First ' + h.name, 'Hire your first ' + h.name + '.', false,
        function (g) { return g.state.harvesters[i] >= 1; });
      add('harv_25_' + i, h.name + ' Squad', 'Own 25 ' + h.name + 's.', false,
        function (g) { return g.state.harvesters[i] >= 25; });
      add('harv_max_' + i, 'Max ' + h.name, 'Reach the cap on ' + h.name + 's.', false,
        function (g) { return g.harvesterUnlocked(i) && g.state.harvesters[i] >= g.harvesterCap(i); });
    });
    var totalNames = [[10, 'Hired Help'], [50, 'Farm Force'], [100, 'Harvester Army'],
      [250, 'Tater Taskforce'], [500, 'Spud Syndicate'], [1000, 'The Whole Crew']];
    totalNames.forEach(function (t) {
      add('harv_total_' + t[0], t[1], 'Own ' + t[0] + ' harvesters in total.', false,
        function (g) { return g.totalHarvesters() >= t[0]; });
    });

    // --- Mutations ---
    MUTATIONS.forEach(function (m, i) {
      add('mut_' + i, 'Mutated: ' + m.name, 'Unlock the ' + m.name + '.', false,
        function (g) { return g.state.mutations[i]; });
    });

    // --- Rebirth ---
    var rebirthNames = ['First Rebirth', 'Second Rebirth', 'Third Rebirth',
      'Fourth Rebirth', 'Fifth Rebirth'];
    rebirthNames.forEach(function (n, i) {
      add('rebirth_' + i, n, 'Rebirth for the ' + (i + 1) + ' time.', false,
        function (g) { return g.state.rebirths >= i + 1; });
    });
    add('rebirth_ready', 'Rebirth Ready', 'Meet every rebirth requirement without rebirthing.', false,
      function (g) { return g.canRebirth(); });
    add('kawaii', 'Kawaii Achieved', 'Unlock the Kawaii Potato.', false,
      function (g) { return g.state.mutations[MUTATIONS.length - 1]; });
    add('keep_playing', 'The Cycle Continues', 'Keep playing after the ending.', false,
      function (g) { return g.state.won && g.state.playTimeAfterWin > 60; });

    // --- Time ---
    var timeNames = [[60, 'Warming Up'], [600, 'Ten Minutes'], [3600, 'Hour of the Potato'],
      [21600, 'Potato Afternoon'], [43200, 'Half a Day'], [86400, 'One Full Day'],
      [172800, 'Two Days'], [360000, 'Potato Lifetime']];
    timeNames.forEach(function (t) {
      add('time_' + t[0], t[1], 'Play for ' + fmt(t[0]) + ' seconds.', false,
        function (g) { return g.state.stats.playTime >= t[0]; });
    });

    // --- Misc (visible) ---
    add('buy10', 'Bulk Buyer', 'Use Buy 10.', false,
      function (g) { return g.state.stats.buy10 > 0; });
    add('buymax', 'Maxed Out', 'Use Buy Max.', false,
      function (g) { return g.state.stats.buyMax > 0; });
    add('bigspend', 'Big Spender', 'Spend 1T potatoes in total.', false,
      function (g) { return g.state.stats.totalSpent >= 1e12; });
    add('saver', 'Saver', 'Use Save Now.', false,
      function (g) { return g.state.stats.saves > 0; });
    add('exported', 'Exported', 'Export your save.', false,
      function (g) { return g.state.stats.exports > 0; });
    add('imported', 'Imported', 'Import a save.', false,
      function (g) { return g.state.stats.imports > 0; });
    add('tinkerer', 'Settings Tinkerer', 'Open settings 10 times.', false,
      function (g) { return g.state.stats.settingsOpens >= 10; });
    add('theme', 'Theme Swapper', 'Change the colour theme.', false,
      function (g) { return g.state.stats.themeChanges > 0; });
    add('rebuilder', 'Rebuilder', 'Buy a harvester after a rebirth.', false,
      function (g) { return g.state.stats.rebuilds > 0; });

    // --- Hidden ---
    add('h_danger', 'Living Dangerously', 'Disable auto save.', true,
      function (g) { return !g.state.settings.autoSave; });
    add('h_silent', 'Silent Farming', 'Mute every sound.', true,
      function (g) {
        var s = g.state.settings;
        return g.state.stats.soundChanges > 0 && !s.music && !s.click &&
               !s.purchase && !s.achievement && !s.rebirth;
      });
    add('h_introvert', 'Introvert Potato', 'Do nothing for 5 minutes.', true,
      function (g) { return g.state.stats.idleTime >= 300; });
    add('h_paranoid', 'Paranoid', 'Open settings 100 times.', true,
      function (g) { return g.state.stats.settingsOpens >= 100; });
    add('h_export', 'Export Enthusiast', 'Export your save 10 times.', true,
      function (g) { return g.state.stats.exports >= 10; });
    add('h_import', 'Trust Issues', 'Import a save 10 times.', true,
      function (g) { return g.state.stats.imports >= 10; });
    add('h_appreciator', 'Potato Appreciator', 'Stare at the potato for 10 minutes.', true,
      function (g) { return g.state.stats.idleTime >= 600; });
    add('h_why', 'Why?', 'Click the potato exactly 12,345 times.', true,
      function (g) { return g.state.clicks === 12345; });
    add('h_auditor', 'The Auditor', 'Export your save, then immediately hard reset.', true,
      function (g) { return g.state.stats.auditor > 0; });
    add('h_ufo', 'UFO Whistleblower', 'Reach the UFO Potato Collector.', true,
      function (g) { return g.state.harvesters[14] >= 1; });
    add('h_speed', 'Speedrunner', 'Reach your first rebirth in under 30 minutes.', true,
      function (g) { return g.state.rebirths >= 1 && g.state.stats.playTime < 1800; });
    add('h_ascetic', 'Ascetic', 'Rebirth without ever using Buy Max.', true,
      function (g) { return g.state.rebirths >= 1 && g.state.stats.buyMax === 0; });

    return out;
  }

  var ACHIEVEMENTS = buildAchievements();

  /* ------------------------------------------------------------------ *
   *  Game
   * ------------------------------------------------------------------ */
  function Game() {
    this.state = this.freshState();
    this.onAchievement = null;   // UI hook
    this.onRebirth = null;
    this.onWin = null;
    this._achTimer = 0;
  }

  Game.prototype.freshState = function () {
    return {
      v: SAVE_VERSION,
      potatoes: 0,
      totalEarned: 0,
      clicks: 0,
      harvesters: HARVESTERS.map(function () { return 0; }),
      // The Ordinary Potato is the starting form.
      mutations: MUTATIONS.map(function (_, i) { return i === 0; }),
      rebirths: 0,
      won: false,
      justWon: false,
      playTimeAfterWin: 0,
      achievements: {},
      stats: {
        playTime: 0, idleTime: 0, settingsOpens: 0, exports: 0, imports: 0,
        saves: 0, resets: 0, buyMax: 0, buy10: 0, buy1: 0, totalSpent: 0,
        lastAction: 0, exportAt: 0, soundChanges: 0, themeChanges: 0,
        rebuilds: 0, auditor: 0, continueAfterWin: 0
      },
      settings: {
        music: false, click: false, purchase: false, achievement: false,
        rebirth: false, theme: 'dark', autoSave: true
      },
      lastSeen: 0,
      createdAt: 0
    };
  };

  /* ---------------- derived values ---------------- */

  Game.prototype.mutationIndex = function () {
    var idx = -1;
    for (var i = 0; i < this.state.mutations.length; i++) {
      if (this.state.mutations[i]) idx = i;
    }
    return idx;
  };

  Game.prototype.ownedMutationCount = function () {
    var n = 0;
    for (var i = 0; i < this.state.mutations.length; i++) {
      if (this.state.mutations[i]) n++;
    }
    return n;
  };

  Game.prototype.nextMutation = function () {
    for (var i = 0; i < this.state.mutations.length; i++) {
      if (!this.state.mutations[i]) return i;
    }
    return -1;
  };

  Game.prototype.ppc = function () {
    var i = this.mutationIndex();
    return i < 0 ? 1 : MUTATIONS[i].ppc;
  };

  Game.prototype.globalMult = function () {
    var mult = 1;
    for (var i = 0; i < this.state.mutations.length; i++) {
      if (this.state.mutations[i]) mult += CONFIG.tierBonus[MUTATIONS[i].tier];
    }
    return mult;
  };

  Game.prototype.pps = function () {
    var sum = 0;
    for (var i = 0; i < HARVESTERS.length; i++) {
      sum += HARVESTERS[i].pps * this.state.harvesters[i];
    }
    return sum * this.globalMult();
  };

  Game.prototype.totalHarvesters = function () {
    return this.state.harvesters.reduce(function (a, b) { return a + b; }, 0);
  };

  Game.prototype.harvesterCap = function (i) {
    return Math.floor(HARVESTERS[i].cap * (1 + CONFIG.capGrowth * this.state.rebirths));
  };

  Game.prototype.harvesterUnlocked = function (i) {
    return i < CONFIG.baseTiers + CONFIG.tiersPerRebirth * this.state.rebirths;
  };

  Game.prototype.unlockedHarvesterCount = function () {
    return Math.min(HARVESTERS.length,
      CONFIG.baseTiers + CONFIG.tiersPerRebirth * this.state.rebirths);
  };

  Game.prototype.harvesterCost = function (i, n) {
    var owned = this.state.harvesters[i];
    var c = HARVESTERS[i].cost;
    var r = CONFIG.costGrowth;
    return c * Math.pow(r, owned) * (Math.pow(r, n) - 1) / (r - 1);
  };

  Game.prototype.maxAffordable = function (i) {
    var owned = this.state.harvesters[i];
    var c = HARVESTERS[i].cost * Math.pow(CONFIG.costGrowth, owned);
    if (this.state.potatoes < c) return 0;
    var r = CONFIG.costGrowth;
    var n = Math.floor(
      Math.log(this.state.potatoes * (r - 1) / c + 1) / Math.log(r)
    );
    return Math.max(0, n);
  };

  Game.prototype.mutationUnlocked = function (i) {
    var tier = MUTATIONS[i].tier;
    // Tier 0 always available; tier t unlocked by rebirth t.
    return tier <= this.state.rebirths;
  };

  /* ---------------- actions ---------------- */

  Game.prototype.addPotatoes = function (n) {
    this.state.potatoes += n;
    this.state.totalEarned += n;
  };

  Game.prototype.click = function () {
    var gain = this.ppc();
    this.addPotatoes(gain);
    this.state.clicks++;
    this.touch();
    this.checkAchievements();
    return gain;
  };

  Game.prototype.touch = function () {
    this.state.stats.lastAction = this.state.stats.playTime;
  };

  Game.prototype.buyHarvester = function (i, mode) {
    if (!this.harvesterUnlocked(i)) return false;
    var cap = this.harvesterCap(i);
    var room = cap - this.state.harvesters[i];
    if (room <= 0) return false;
    var n;
    if (mode === 'max') {
      n = Math.min(room, this.maxAffordable(i));
    } else if (mode === '10') {
      n = Math.min(room, 10, this.maxAffordable(i));
    } else {
      n = Math.min(room, 1);
    }
    if (n <= 0) return false;
    var cost = this.harvesterCost(i, n);
    if (cost > this.state.potatoes) return false;
    this.state.potatoes -= cost;
    this.state.harvesters[i] += n;
    this.state.stats.totalSpent += cost;
    if (mode === 'max') this.state.stats.buyMax++;
    else if (mode === '10') this.state.stats.buy10++;
    else this.state.stats.buy1++;
    if (this.state.rebirths > 0) this.state.stats.rebuilds++;
    this.touch();
    this.checkAchievements();
    return true;
  };

  Game.prototype.buyMutation = function (i) {
    if (i !== this.nextMutation()) return false;
    if (!this.mutationUnlocked(i)) return false;
    var cost = this.mutationCost(i);
    if (this.state.potatoes < cost) return false;
    this.state.potatoes -= cost;
    this.state.mutations[i] = true;
    this.state.stats.totalSpent += cost;
    this.touch();
    this.checkAchievements();
    if (i === MUTATIONS.length - 1 && this.state.rebirths >= CONFIG.maxRebirths) {
      this.triggerWin();
    }
    return true;
  };

  Game.prototype.mutationCost = function (i) {
    if (i === 0) return 0;
    return roundSig(MUTATIONS[i].ppc *
      (CONFIG.mutationCostBase + CONFIG.mutationCostPerIndex * i), 3);
  };

  Game.prototype.rebirthProgress = function () {
    var r = this.state.rebirths;
    if (r >= CONFIG.maxRebirths) return null;
    var needMut = CONFIG.tierEnd[r];
    var needPotatoes = CONFIG.rebirthPotatoes[r];
    var unlocked = this.unlockedHarvesterCount();
    var maxed = 0;
    for (var i = 0; i < unlocked; i++) {
      if (this.state.harvesters[i] >= this.harvesterCap(i)) maxed++;
    }
    return {
      rebirth: r + 1,
      needMutation: needMut,
      mutationName: MUTATIONS[needMut].name,
      mutationOwned: !!this.state.mutations[needMut],
      needPotatoes: needPotatoes,
      potatoes: this.state.potatoes,
      unlocked: unlocked,
      maxed: maxed,
      maxedAll: maxed >= unlocked
    };
  };

  Game.prototype.canRebirth = function () {
    var p = this.rebirthProgress();
    if (!p) return false;
    return p.mutationOwned && p.maxedAll && this.state.potatoes >= p.needPotatoes;
  };

  Game.prototype.rebirth = function () {
    if (!this.canRebirth()) return false;
    var keepStats = this.state.stats;
    var keep = {
      rebirths: this.state.rebirths + 1,
      totalEarned: this.state.totalEarned,
      clicks: this.state.clicks,
      achievements: this.state.achievements,
      stats: keepStats,
      settings: this.state.settings,
      won: this.state.won,
      playTimeAfterWin: this.state.playTimeAfterWin,
      createdAt: this.state.createdAt
    };
    var fresh = this.freshState();
    fresh.rebirths = keep.rebirths;
    fresh.totalEarned = keep.totalEarned;
    fresh.clicks = keep.clicks;
    fresh.achievements = keep.achievements;
    fresh.stats = keep.stats;
    fresh.settings = keep.settings;
    fresh.won = keep.won;
    fresh.playTimeAfterWin = keep.playTimeAfterWin;
    fresh.createdAt = keep.createdAt;
    fresh.stats.lastAction = fresh.stats.playTime;
    this.state = fresh;
    this.checkAchievements();
    if (this.onRebirth) this.onRebirth();
    return true;
  };

  Game.prototype.triggerWin = function () {
    if (this.state.won) { this.state.justWon = false; return; }
    this.state.won = true;
    this.state.justWon = true;
    if (this.onWin) this.onWin();
  };

  Game.prototype.continueAfterWin = function () {
    this.state.justWon = false;
    this.state.playTimeAfterWin = 0;
    this.state.stats.continueAfterWin++;
    this.checkAchievements();
  };

  /* ---------------- tick ---------------- */

  Game.prototype.tick = function (dt) {
    this.state.stats.playTime += dt;
    if (this.state.won) this.state.playTimeAfterWin += dt;
    var gain = this.pps() * dt;
    if (gain > 0) this.addPotatoes(gain);

    // Idle tracking (no clicks or purchases).
    var idle = this.state.stats.playTime - this.state.stats.lastAction;
    if (idle > this.state.stats.idleTime) this.state.stats.idleTime = idle;

    this._achTimer += dt;
    if (this._achTimer >= 1) {
      this._achTimer = 0;
      this.checkAchievements();
    }
  };

  /* ---------------- achievements ---------------- */

  Game.prototype.checkAchievements = function () {
    var got = [];
    for (var i = 0; i < ACHIEVEMENTS.length; i++) {
      var a = ACHIEVEMENTS[i];
      if (this.state.achievements[a.id]) continue;
      var ok = false;
      try { ok = a.check(this); } catch (e) { ok = false; }
      if (ok) {
        this.state.achievements[a.id] = true;
        got.push(a);
      }
    }
    if (got.length && this.onAchievement) {
      for (var j = 0; j < got.length; j++) this.onAchievement(got[j]);
    }
    return got;
  };

  Game.prototype.achievementCount = function () {
    return Object.keys(this.state.achievements).length;
  };

  /* ---------------- persistence ---------------- */

  Game.prototype.save = function () {
    this.state.lastSeen = Date.now();
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
      }
    } catch (e) { /* storage unavailable */ }
    this.state.stats.saves++;
  };

  Game.prototype.load = function () {
    try {
      if (typeof localStorage === 'undefined') return false;
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      var data = JSON.parse(raw);
      if (!data || data.v !== SAVE_VERSION) return false;
      var fresh = this.freshState();
      // Merge defensively so new fields do not break old saves.
      for (var k in data) {
        if (k === 'settings' || k === 'stats') continue;
        fresh[k] = data[k];
      }
      if (data.settings) {
        for (var s in fresh.settings) {
          if (data.settings[s] !== undefined) fresh.settings[s] = data.settings[s];
        }
      }
      if (data.stats) {
        for (var t in fresh.stats) {
          if (data.stats[t] !== undefined) fresh.stats[t] = data.stats[t];
        }
      }
      if (!Array.isArray(fresh.harvesters) || fresh.harvesters.length !== HARVESTERS.length) {
        fresh.harvesters = HARVESTERS.map(function () { return 0; });
      }
      if (!Array.isArray(fresh.mutations) || fresh.mutations.length !== MUTATIONS.length) {
        fresh.mutations = MUTATIONS.map(function () { return false; });
      }
      // An old or imported save always starts from the Ordinary Potato.
      fresh.mutations[0] = true;
      this.state = fresh;
      return true;
    } catch (e) {
      return false;
    }
  };

  Game.prototype.exportSave = function () {
    var json = JSON.stringify(this.state);
    var b64 = btoa(unescape(encodeURIComponent(json)));
    this.state.stats.exports++;
    this.state.stats.exportAt = this.state.stats.playTime;
    this.checkAchievements();
    return b64;
  };

  Game.prototype.importSave = function (b64) {
    try {
      var json = decodeURIComponent(escape(atob(b64.replace(/\s+/g, ''))));
      var data = JSON.parse(json);
      if (!data || data.v !== SAVE_VERSION) return false;
      this.state = data;
      this.state.stats.imports++;
      this.checkAchievements();
      return true;
    } catch (e) {
      return false;
    }
  };

  Game.prototype.hardReset = function () {
    if (this.state.stats.exportAt > 0 &&
        this.state.stats.playTime - this.state.stats.exportAt < 30) {
      this.state.stats.auditor = 1;
    }
    this.state = this.freshState();
    this.state.createdAt = Date.now();
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(SAVE_KEY);
    } catch (e) { /* ignore */ }
    this.state.stats.resets++;
  };

  Game.prototype.offlineProgress = function () {
    if (!this.state.lastSeen) return null;
    var now = Date.now();
    var elapsed = Math.floor((now - this.state.lastSeen) / 1000);
    if (elapsed < 10) return null;
    var capped = Math.min(elapsed, CONFIG.offlineCap);
    var gain = this.pps() * capped;
    if (gain <= 0) return null;
    this.addPotatoes(gain);
    return { seconds: capped, actual: elapsed, gain: gain };
  };

  /* ---------------- settings ---------------- */

  Game.prototype.setSetting = function (key, value) {
    this.state.settings[key] = value;
    if (key === 'music' || key === 'click' || key === 'purchase' ||
        key === 'achievement' || key === 'rebirth') {
      this.state.stats.soundChanges++;
    }
    if (key === 'theme') this.state.stats.themeChanges++;
    this.checkAchievements();
  };

  /* ---------------- node export ---------------- */

  var api = {
    Game: Game,
    HARVESTERS: HARVESTERS,
    MUTATIONS: MUTATIONS,
    ACHIEVEMENTS: ACHIEVEMENTS,
    CONFIG: CONFIG,
    fmt: fmt,
    fmtFull: fmtFull,
    roundSig: roundSig,
    SAVE_KEY: SAVE_KEY
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.PotatoGame = api;
})(typeof window !== 'undefined' ? window : globalThis);
