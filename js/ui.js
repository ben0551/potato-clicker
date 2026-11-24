/* ==========================================================================
 * Potato Clicker — DOM controller.
 * The engine (game.js) owns all state; this file only renders and forwards
 * input.
 * ========================================================================== */
(function () {
  'use strict';

  var G = new PotatoGame.Game();
  var H = PotatoGame.HARVESTERS;
  var M = PotatoGame.MUTATIONS;
  var A = PotatoGame.ACHIEVEMENTS;
  var fmt = PotatoGame.fmt;
  var fmtFull = PotatoGame.fmtFull;
  var art = PotatoArt.svg;

  window.GAME = G;

  var $ = function (sel) { return document.querySelector(sel); };
  var el = {};

  var buyQty = '1';
  var activeTab = 'harvesters';
  var lastPotatoHtml = '';
  var saveTimer = 0;
  var renderTimer = 0;

  /* =============================== audio =============================== */

  var Audio = {
    ctx: null,
    master: null,

    ensure: function () {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return true;
      }
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
      } catch (e) { return false; }
      return true;
    },

    tone: function (freq, dur, type, gain, delay, glideTo) {
      if (!this.ctx) return;
      var t0 = this.ctx.currentTime + (delay || 0);
      var osc = this.ctx.createOscillator();
      var g = this.ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    },

    click: function () {
      if (!this.ensure() || !G.state.settings.click) return;
      this.tone(520 + Math.random() * 120, 0.07, 'triangle', 0.12, 0, 260);
    },
    purchase: function () {
      if (!this.ensure() || !G.state.settings.purchase) return;
      this.tone(523, 0.1, 'triangle', 0.1);
      this.tone(784, 0.16, 'triangle', 0.09, 0.06);
    },
    achievement: function () {
      if (!this.ensure() || !G.state.settings.achievement) return;
      this.tone(880, 0.12, 'sine', 0.1);
      this.tone(1320, 0.2, 'sine', 0.08, 0.08);
    },
    rebirth: function () {
      if (!this.ensure() || !G.state.settings.rebirth) return;
      var notes = [261.6, 329.6, 392.0, 523.3, 659.3];
      for (var i = 0; i < notes.length; i++) {
        this.tone(notes[i], 1.2, 'sine', 0.07, i * 0.12);
      }
    }
  };

  // Lo-fi music box: a slow chord pad, retriggered on a timer.
  var Music = {
    timer: null,
    step: 0,
    chords: [
      [261.63, 329.63, 392.00],
      [220.00, 261.63, 329.63],
      [174.61, 220.00, 261.63],
      [196.00, 246.94, 293.66]
    ],
    pad: function (freqs, dur) {
      if (!Audio.ctx) return;
      var t0 = Audio.ctx.currentTime;
      freqs.forEach(function (f, i) {
        var osc = Audio.ctx.createOscillator();
        var g = Audio.ctx.createGain();
        var flt = Audio.ctx.createBiquadFilter();
        flt.type = 'lowpass';
        flt.frequency.value = 900;
        osc.type = i === 0 ? 'triangle' : 'sine';
        osc.frequency.value = f;
        osc.detune.value = (i - 1) * 4;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(0.05, t0 + 0.5);
        g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(flt); flt.connect(g); g.connect(Audio.master);
        osc.start(t0); osc.stop(t0 + dur + 0.1);
      });
    },
    start: function () {
      if (this.timer) return;
      this.timer = setInterval(function () {
        if (!G.state.settings.music || !Audio.ctx) return;
        Music.pad(Music.chords[Music.step % Music.chords.length], 3.2);
        Music.step++;
      }, 3000);
    },
    stop: function () {
      if (this.timer) { clearInterval(this.timer); this.timer = null; }
    }
  };

  /* ============================== helpers ============================== */

  function toast(title, desc, cls) {
    var t = document.createElement('div');
    t.className = 'toast' + (cls ? ' ' + cls : '');
    var h = document.createElement('div');
    h.className = 't-title';
    h.textContent = title;
    var d = document.createElement('div');
    d.className = 't-desc';
    d.textContent = desc;
    t.appendChild(h); t.appendChild(d);
    el.toasts.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 4000);
  }

  function floatText(text) {
    var d = document.createElement('div');
    d.className = 'float-txt';
    d.textContent = text;
    d.style.left = (38 + Math.random() * 24) + '%';
    d.style.top = (30 + Math.random() * 20) + '%';
    el.floats.appendChild(d);
    setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 900);
  }

  function popPotato() {
    el.potato.classList.remove('pop');
    void el.potato.offsetWidth;
    el.potato.classList.add('pop');
  }

  /* ============================== rendering ============================ */

  function renderTopbar() {
    el.count.textContent = fmtFull(G.state.potatoes);
    el.ppc.textContent = fmt(G.ppc()) + ' per click';
    el.pps.textContent = fmt(G.pps()) + ' per second';
    el.achCount.textContent = G.achievementCount() + '/' + A.length;
    el.mutationName.textContent =
      G.mutationIndex() >= 0 ? M[G.mutationIndex()].name : 'No Potato';
  }

  function renderPips() {
    var html = '';
    for (var i = 0; i < PotatoGame.CONFIG.maxRebirths; i++) {
      html += '<span class="pip' + (i < G.state.rebirths ? ' on' : '') + '"></span>';
    }
    if (el.pips.innerHTML !== html) el.pips.innerHTML = html;
  }

  function renderPotato() {
    var idx = G.mutationIndex();
    if (idx < 0) return;
    if (el.potato.dataset.mut !== String(idx)) {
      el.potato.dataset.mut = String(idx);
      el.potato.innerHTML = art(idx, M[idx].art);
    }
  }

  /* ------------------------- harvesters ------------------------- */

  var harvRows = [];

  function buildHarvesters() {
    el.tabHarvesters.innerHTML = '';
    harvRows = [];
    H.forEach(function (h, i) {
      var row = document.createElement('div');
      row.className = 'row';
      row.innerHTML =
        '<div class="ico">' + h.icon + '</div>' +
        '<div class="body">' +
          '<div class="name"><span class="count">0</span> ' + h.name + '</div>' +
          '<div class="desc">' + h.desc + '</div>' +
          '<div class="meta"></div>' +
        '</div>' +
        '<div class="buy">' +
          '<button class="buy-btn" type="button">Buy</button>' +
          '<div class="cost"></div>' +
        '</div>';
      el.tabHarvesters.appendChild(row);
      var btn = row.querySelector('.buy-btn');
      harvRows.push({
        row: row,
        count: row.querySelector('.count'),
        meta: row.querySelector('.meta'),
        btn: btn,
        cost: row.querySelector('.cost'),
        index: i
      });
      btn.addEventListener('click', function () {
        if (G.buyHarvester(i, buyQty)) {
          Audio.purchase();
          renderHarvesters();
        }
      });
    });
    renderHarvesters();
  }

  function renderHarvesters() {
    harvRows.forEach(function (r) {
      var i = r.index;
      var unlocked = G.harvesterUnlocked(i);
      var cap = G.harvesterCap(i);
      var n = G.state.harvesters[i];
      var maxed = n >= cap;
      r.row.classList.toggle('locked', !unlocked);
      r.row.classList.toggle('maxed', unlocked && maxed);
      r.count.textContent = n;
      if (!unlocked) {
        var need = Math.floor(i / PotatoGame.CONFIG.tiersPerRebirth);
        r.meta.textContent = 'Unlocks at rebirth ' + need;
        r.cost.textContent = '';
        r.btn.disabled = true;
        r.btn.textContent = 'Locked';
        r.btn.className = 'buy-btn';
        return;
      }
      var showN = buyQty === 'max' ? Math.max(1, Math.min(cap - n, G.maxAffordable(i))) : buyQty;
      var cost = G.harvesterCost(i, Math.max(1, Math.min(showN, cap - n)));
      r.meta.textContent = fmt(H[i].pps) + ' each · cap ' + cap;
      r.cost.textContent = maxed ? '' : fmt(cost);
      if (maxed) {
        r.btn.disabled = true;
        r.btn.textContent = 'MAX';
        r.btn.className = 'buy-btn maxed';
      } else {
        var afford = G.state.potatoes >= G.harvesterCost(i, 1);
        r.btn.disabled = !afford;
        r.btn.textContent = 'Buy ' + (buyQty === 'max' ? 'Max' : buyQty);
        r.btn.className = 'buy-btn' + (afford ? ' afford' : '');
      }
    });
  }

  /* -------------------------- mutations -------------------------- */

  var mutRows = [];

  function buildMutations() {
    el.tabUpgrades.innerHTML = '';
    mutRows = [];
    M.forEach(function (m, i) {
      var row = document.createElement('div');
      row.className = 'mut-row';
      row.innerHTML =
        '<div class="thumb">' + art(i, m.art) + '</div>' +
        '<div class="body">' +
          '<div class="name">' + m.name + '</div>' +
          '<div class="desc">' + m.desc + '</div>' +
          '<div class="stat"></div>' +
        '</div>' +
        '<div class="buy">' +
          '<button class="buy-btn" type="button">Evolve</button>' +
          '<div class="cost"></div>' +
        '</div>';
      el.tabUpgrades.appendChild(row);
      var btn = row.querySelector('.buy-btn');
      mutRows.push({
        row: row,
        stat: row.querySelector('.stat'),
        btn: btn,
        cost: row.querySelector('.cost'),
        index: i
      });
      btn.addEventListener('click', function () {
        if (G.buyMutation(i)) {
          Audio.purchase();
          renderMutations();
          renderPotato();
        }
      });
    });
    renderMutations();
  }

  function renderMutations() {
    var next = G.nextMutation();
    mutRows.forEach(function (r) {
      var i = r.index;
      var owned = G.state.mutations[i];
      var unlocked = G.mutationUnlocked(i);
      var isNext = (i === next);
      r.row.classList.toggle('owned', owned);
      r.row.classList.toggle('locked', !unlocked || (!owned && !isNext));
      r.stat.textContent = ' PPC ' + fmt(M[i].ppc);
      if (owned) {
        r.btn.disabled = true;
        r.btn.textContent = 'Owned';
        r.btn.className = 'buy-btn maxed';
        r.cost.textContent = '';
      } else if (!unlocked) {
        r.btn.disabled = true;
        r.btn.textContent = 'Locked';
        r.btn.className = 'buy-btn';
        r.cost.textContent = 'Rebirth ' + M[i].tier;
      } else if (!isNext) {
        r.btn.disabled = true;
        r.btn.textContent = 'Evolve';
        r.btn.className = 'buy-btn';
        r.cost.textContent = fmt(G.mutationCost(i));
      } else {
        var afford = G.state.potatoes >= G.mutationCost(i);
        r.btn.disabled = !afford;
        r.btn.textContent = 'Evolve';
        r.btn.className = 'buy-btn' + (afford ? ' afford' : '');
        r.cost.textContent = fmt(G.mutationCost(i));
      }
    });
  }

  /* --------------------------- rebirth --------------------------- */

  // The panel is built ONCE and then updated in place. Rebuilding the innerHTML
  // every frame destroyed the <button> node ~10x/second, which killed :hover and
  // swallowed clicks (pointerdown and pointerup landed on different nodes).
  var rbRefs = null;

  function buildRebirthPanel(finished) {
    if (finished) {
      el.tabRebirth.innerHTML =
        '<div class="rebirth-box">' +
        '<h2>Five rebirths complete</h2>' +
        '<p>You have walked the whole path. The Kawaii Potato is yours, and the ' +
        'universe is exactly as it should be: potato.</p>' +
        '<p>Keep playing for as long as you like. There is nowhere left to go, ' +
        'and that is the point.</p></div>';
      rbRefs = null;
      return;
    }
    el.tabRebirth.innerHTML =
      '<div class="rebirth-box">' +
      '<h2 class="rb-title"></h2>' +
      '<p>Rebirth resets your potatoes, harvesters and mutations. You keep your ' +
      'rebirth count, your harvester caps grow by 25%, and a new tier of ' +
      'mutations becomes available.</p>' +
      '<div class="req req-mut"><span class="req-label"></span>' +
        '<span class="req-val"></span></div>' +
      '<div class="req req-harv"><span class="req-label"></span>' +
        '<span class="req-val"></span></div>' +
      '<div class="req req-pot"><span class="req-label"></span>' +
        '<span class="req-val"></span></div>' +
      '<button class="rebirth-btn" type="button">Rebirth</button>' +
      '<p class="rb-unlocks" style="margin-top:10px"></p>' +
      '</div>';
    rbRefs = {
      title: el.tabRebirth.querySelector('.rb-title'),
      mutLabel: el.tabRebirth.querySelector('.req-mut .req-label'),
      mutVal: el.tabRebirth.querySelector('.req-mut .req-val'),
      harvLabel: el.tabRebirth.querySelector('.req-harv .req-label'),
      harvVal: el.tabRebirth.querySelector('.req-harv .req-val'),
      potLabel: el.tabRebirth.querySelector('.req-pot .req-label'),
      potVal: el.tabRebirth.querySelector('.req-pot .req-val'),
      btn: el.tabRebirth.querySelector('.rebirth-btn'),
      unlocks: el.tabRebirth.querySelector('.rb-unlocks')
    };
    rbRefs.btn.addEventListener('click', doRebirth);
  }

  function setReq(refs, label, ok, value) {
    refs.label.textContent = label;
    refs.val.textContent = value;
    refs.val.className = 'req-val ' + (ok ? 'ok' : 'no');
  }

  function renderRebirth() {
    var p = G.rebirthProgress();
    if (!p) {
      if (rbRefs) buildRebirthPanel(true);
      return;
    }
    if (!rbRefs) buildRebirthPanel(false);

    var unlocked = G.unlockedHarvesterCount();
    rbRefs.title.textContent =
      'Rebirth ' + p.rebirth + ' of ' + PotatoGame.CONFIG.maxRebirths;

    setReq(
      { label: rbRefs.mutLabel, val: rbRefs.mutVal },
      'Final mutation: ' + p.mutationName, p.mutationOwned,
      p.mutationOwned ? '✓' : '✗'
    );
    setReq(
      { label: rbRefs.harvLabel, val: rbRefs.harvVal },
      'Max all unlocked harvesters (' + p.maxed + '/' + unlocked + ')',
      p.maxedAll, p.maxedAll ? '✓' : '✗'
    );
    setReq(
      { label: rbRefs.potLabel, val: rbRefs.potVal },
      'Hold ' + fmt(p.needPotatoes) + ' potatoes',
      G.state.potatoes >= p.needPotatoes,
      fmt(G.state.potatoes) + ' / ' + fmt(p.needPotatoes)
    );

    rbRefs.btn.disabled = !G.canRebirth();
    rbRefs.unlocks.textContent =
      'Unlocks: ' + M[PotatoGame.CONFIG.tierEnd[p.rebirth - 1] + 1].name +
      ' tier mutations, and ' +
      Math.min(2, H.length - G.unlockedHarvesterCount()) +
      ' more harvester types.';
  }

  function doRebirth() {
    if (!G.rebirth()) return;
    Audio.rebirth();
    toast('Rebirth ' + G.state.rebirths,
      'Your caps grew. New mutations await.', 'ach');
    buildAll();
  }

  /* ============================ modal system =========================== */

  function openModal(html) {
    el.modalRoot.innerHTML =
      '<div class="modal-backdrop"><div class="modal">' + html + '</div></div>';
    var backdrop = el.modalRoot.querySelector('.modal-backdrop');
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) closeModal();
    });
    var x = el.modalRoot.querySelector('.close-x');
    if (x) x.addEventListener('click', closeModal);
    return backdrop;
  }

  function closeModal() { el.modalRoot.innerHTML = ''; }

  function toggleSwitch(container, on) { container.classList.toggle('on', !!on); }

  function settingsModal() {
    G.state.stats.settingsOpens++;
    G.checkAchievements();
    var s = G.state.settings;
    var html =
      '<button class="close-x" type="button" aria-label="Close">×</button>' +
      '<h2>Settings</h2><div class="sub">Potato Clicker</div>' +

      '<section><h3>Audio</h3>' +
        settingRow('music', 'Music', s.music) +
        settingRow('click', 'Click sounds', s.click) +
        settingRow('purchase', 'Purchase sounds', s.purchase) +
        settingRow('achievement', 'Achievement sounds', s.achievement) +
        settingRow('rebirth', 'Rebirth sounds', s.rebirth) +
      '</section>' +

      '<section><h3>Visuals</h3>' +
        settingRow('theme', s.theme === 'light' ? 'Light mode' : 'Dark mode',
                   s.theme === 'light') +
      '</section>' +

      '<section><h3>Saving</h3>' +
        settingRow('autoSave', 'Auto save', s.autoSave) +
        '<div class="btn-row" style="margin-top:10px">' +
          '<button data-act="save" type="button">Save now</button>' +
          '<button data-act="export" type="button">Export save</button>' +
          '<button data-act="import" type="button">Import save</button>' +
          '<button data-act="reset" type="button" class="btn-danger">Hard reset</button>' +
        '</div>' +
      '</section>';

    var backdrop = openModal(html);
    backdrop.querySelectorAll('.setting-row').forEach(function (row) {
      var key = row.dataset.key;
      var sw = row.querySelector('.switch');
      sw.addEventListener('click', function () {
        var next = !G.state.settings[key];
        if (key === 'theme') {
          next = (G.state.settings.theme === 'dark');
          G.setSetting('theme', next ? 'light' : 'dark');
          applyTheme();
        } else {
          G.setSetting(key, next);
        }
        toggleSwitch(sw, next);
        G.checkAchievements();
      });
    });
    backdrop.querySelector('.modal').addEventListener('click', function (e) {
      var act = e.target.dataset && e.target.dataset.act;
      if (!act) return;
      if (act === 'save') {
        G.save();
        toast('Saved', 'Your potatoes are safe.');
        updateSaveStatus();
      } else if (act === 'export') {
        exportModal();
      } else if (act === 'import') {
        importModal();
      } else if (act === 'reset') {
        if (confirm('Hard reset wipes your entire save. Are you sure?')) {
          G.hardReset();
              buildAll();
          applyTheme();
          closeModal();
          toast('Reset', 'A fresh potato begins.');
        }
      }
    });
  }

  function settingRow(key, label, on) {
    return '<div class="setting-row" data-key="' + key + '">' +
      '<span>' + label + '</span>' +
      '<button class="switch' + (on ? ' on' : '') + '" type="button" aria-label="' + label + '"></button>' +
      '</div>';
  }

  function exportModal() {
    var b64 = G.exportSave();
    var html =
      '<button class="close-x" type="button" aria-label="Close">×</button>' +
      '<h2>Export save</h2><div class="sub">Copy this string, or download it.</div>' +
      '<textarea readonly style="width:100%;height:140px;font-family:monospace;' +
      'font-size:11px;border-radius:10px;border:1px solid var(--line);' +
      'background:var(--bg-1);color:var(--text);padding:8px">' + b64 + '</textarea>' +
      '<div class="btn-row" style="margin-top:10px">' +
        '<button data-act="copy" type="button">Copy</button>' +
        '<button data-act="dl" type="button">Download</button>' +
      '</div>';
    var backdrop = openModal(html);
    backdrop.querySelector('.modal').addEventListener('click', function (e) {
      var act = e.target.dataset && e.target.dataset.act;
      if (act === 'copy') {
        var ta = backdrop.querySelector('textarea');
        ta.select();
        try { navigator.clipboard.writeText(ta.value); toast('Copied', 'Save string copied.'); }
        catch (err) { document.execCommand('copy'); }
      } else if (act === 'dl') {
        var blob = new Blob([b64], { type: 'text/plain' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'potato-clicker-save.txt';
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      }
    });
  }

  function importModal() {
    var html =
      '<button class="close-x" type="button" aria-label="Close">×</button>' +
      '<h2>Import save</h2><div class="sub">Paste an exported save string.</div>' +
      '<textarea style="width:100%;height:140px;font-family:monospace;font-size:11px;' +
      'border-radius:10px;border:1px solid var(--line);background:var(--bg-1);' +
      'color:var(--text);padding:8px"></textarea>' +
      '<div class="btn-row" style="margin-top:10px">' +
        '<button data-act="do" type="button">Import</button>' +
      '</div>';
    var backdrop = openModal(html);
    backdrop.querySelector('.modal').addEventListener('click', function (e) {
      if (!(e.target.dataset && e.target.dataset.act === 'do')) return;
      var val = backdrop.querySelector('textarea').value.trim();
      if (G.importSave(val)) {
          buildAll();
        applyTheme();
        closeModal();
        toast('Imported', 'Save loaded.');
      } else {
        toast('Import failed', 'That save string is not valid.');
      }
    });
  }

  function achievementsModal() {
    var html =
      '<button class="close-x" type="button" aria-label="Close">×</button>' +
      '<h2>Achievements</h2><div class="sub">' + G.achievementCount() + ' of ' +
      A.length + ' unlocked. Achievements are bragging rights only — no bonuses.</div>' +
      '<div class="ach-grid">';
    A.forEach(function (a) {
      var got = G.state.achievements[a.id];
      var show = got || !a.hidden;
      html += '<div class="ach' + (got ? '' : ' locked') + '">' +
        '<div class="a-name">' + (show ? a.name : '???') + '</div>' +
        '<div class="a-desc">' + (show ? a.desc : 'Hidden achievement') + '</div>' +
        '</div>';
    });
    html += '</div>';
    openModal(html);
  }

  function offlineModal(info) {
    var html =
      '<div class="endgame">' +
      '<h2>Welcome back!</h2>' +
      '<p>Your harvesters produced:</p>' +
      '<p style="font-size:22px;font-weight:700;color:var(--accent-2)">🥔 ' +
        fmt(info.gain) + ' potatoes</p>' +
      '<p>while you were away for ' + Math.round(info.actual / 60) + ' minutes' +
      (info.actual > info.seconds ? ' (capped at 30 minutes)' : '') + '.</p>' +
      '<div class="btn-row" style="justify-content:center;margin-top:14px">' +
      '<button data-act="ok" type="button">Lovely</button></div>' +
      '</div>';
    var backdrop = openModal(html);
    backdrop.querySelector('.modal').addEventListener('click', function (e) {
      if (e.target.dataset && e.target.dataset.act === 'ok') closeModal();
    });
  }

  function endgameModal() {
    var html =
      '<div class="endgame">' +
      '<div class="big-potato">' + art(M.length - 1, 'kawaii') + '</div>' +
      '<div class="credits">After years of farming...<br>' +
      'After countless mutations...<br>After five rebirths...</div>' +
      '<h1>Humanity finally achieved perfection.</h1>' +
      '<p>Not wealth. Not knowledge. Not immortality.</p>' +
      '<p style="font-size:18px;font-weight:700;color:var(--text)">Potato.</p>' +
      '<p>Specifically... Kawaii Potato.</p>' +
      '<p style="font-size:34px;margin:14px 0">(◕‿◕)</p>' +
      '<p>There is nowhere left to go.<br>There are no better potatoes.<br>' +
      '<strong>You have won.</strong></p>' +
      '<div class="btn-row" style="justify-content:center;margin-top:16px">' +
        '<button data-act="continue" type="button">Continue playing</button>' +
        '<button data-act="reset" type="button" class="btn-danger">Reset everything</button>' +
      '</div></div>';
    var backdrop = openModal(html);
    backdrop.querySelector('.modal').addEventListener('click', function (e) {
      var act = e.target.dataset && e.target.dataset.act;
      if (act === 'continue') {
        G.continueAfterWin();
        closeModal();
        toast('Endless mode', 'The potato thanks you for staying.');
      } else if (act === 'reset') {
        if (confirm('Reset everything? This wipes your save completely.')) {
          G.hardReset();
              buildAll();
          applyTheme();
          closeModal();
        }
      }
    });
  }

  /* ============================== theme =============================== */

  function applyTheme() {
    document.documentElement.dataset.theme = G.state.settings.theme;
  }

  /* ============================ background ============================ */

  function buildBackground() {
    var bg = el.bg;
    bg.innerHTML = '';
    for (var i = 0; i < 9; i++) {
      var d = document.createElement('div');
      d.className = 'drift';
      var size = 30 + Math.random() * 70;
      d.style.width = size + 'px';
      d.style.height = size + 'px';
      d.style.top = (Math.random() * 92) + '%';
      d.style.animationDuration = (90 + Math.random() * 160) + 's';
      d.style.animationDelay = (-Math.random() * 200) + 's';
      d.innerHTML = art(0, 'plain');
      bg.appendChild(d);
    }
  }

  /* ============================== build all ============================ */

  function buildAll() {
    buildHarvesters();
    buildMutations();
    renderRebirth();
    renderPotato();
    renderPips();
  }

  function updateSaveStatus() {
    el.saveStatus.textContent = G.state.settings.autoSave
      ? 'Auto save on'
      : 'Auto save off — save manually';
  }

  /* ============================ event wiring ========================== */

  function onPotatoPress(ev) {
    ev.preventDefault();
    Audio.ensure();          // unlock audio on gesture, but never un-mute
    var gain = G.click();
    Audio.click();
    popPotato();
    floatText('+' + fmt(gain));
    renderTopbar();
  }

  function wire() {
    el = {
      count: $('#potato-count'),
      ppc: $('#ppc'),
      pps: $('#pps'),
      achCount: $('#ach-count'),
      mutationName: $('#mutation-name'),
      pips: $('#rebirth-pips'),
      potato: $('#potato'),
      floats: $('#floats'),
      toasts: $('#toasts'),
      modalRoot: $('#modal-root'),
      tabHarvesters: $('#tab-harvesters'),
      tabUpgrades: $('#tab-upgrades'),
      tabRebirth: $('#tab-rebirth'),
      saveStatus: $('#save-status'),
      bg: $('#bg')
    };

    el.potato.addEventListener('pointerdown', onPotatoPress);
    el.potato.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') onPotatoPress(e);
    });
    el.potato.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    $('#settings-btn').addEventListener('click', function () {
      Audio.ensure();
      settingsModal();
    });
    $('#achievements-btn').addEventListener('click', function () {
      Audio.ensure();
      achievementsModal();
    });

    document.querySelectorAll('.tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        activeTab = tab.dataset.tab;
        document.querySelectorAll('.tab').forEach(function (t) {
          t.classList.toggle('active', t === tab);
        });
        document.querySelectorAll('.tab-panel').forEach(function (p) {
          p.classList.toggle('active', p.id === 'tab-' + activeTab);
        });
      });
    });

    document.querySelectorAll('.qty').forEach(function (q) {
      q.addEventListener('click', function () {
        buyQty = q.dataset.qty;
        document.querySelectorAll('.qty').forEach(function (x) {
          x.classList.toggle('active', x === q);
        });
        renderHarvesters();
      });
    });

    window.addEventListener('beforeunload', function () {
      if (G.state.settings.autoSave) G.save();
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && G.state.settings.autoSave) G.save();
    });

    // Hooks from the engine.
    G.onAchievement = function (a) {
      toast('Achievement: ' + a.name, a.desc, 'ach');
      Audio.achievement();
      renderTopbar();
    };
    G.onRebirth = function () { renderPips(); };
    G.onWin = function () { endgameModal(); };
  }

  /* ============================== main loop =========================== */

  function loop(now) {
    if (!loop.last) loop.last = now;
    var dt = Math.min(0.06, (now - loop.last) / 1000);
    loop.last = now;

    G.tick(dt);

    renderTimer += dt;
    if (renderTimer >= 0.1) {
      renderTimer = 0;
      renderTopbar();
      renderHarvesters();
      renderMutations();
      if (activeTab === 'rebirth') renderRebirth();
    }

    saveTimer += dt;
    if (saveTimer >= 10) {
      saveTimer = 0;
      if (G.state.settings.autoSave) {
        G.save();
        updateSaveStatus();
      }
    }

    requestAnimationFrame(loop);
  }

  /* ================================ boot ============================== */

  function boot() {
    wire();
    var hadSave = G.load();
    applyTheme();
    buildBackground();
    buildAll();
    updateSaveStatus();
    renderTopbar();

    if (hadSave) {
      var info = G.offlineProgress();
      if (info) offlineModal(info);
    }

    requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
