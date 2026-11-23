/* ==========================================================================
 * Potato Clicker — procedural potato art.
 * Every mutation is drawn from primitives (no image assets), so each form can
 * be recoloured and decorated independently.
 * ========================================================================== */
(function (global) {
  'use strict';

  var uid = 0;

  var BODY_PATH = 'M100 22 C132 18 162 38 170 72 C178 106 168 146 138 166 ' +
                  'C108 186 66 180 46 150 C26 120 30 76 54 48 C68 32 82 24 100 22 Z';

  var SPOTS = [
    [72, 62, 7, 4.5], [126, 52, 6, 4], [58, 108, 8, 5], [138, 104, 7, 4.5],
    [92, 142, 9, 5.5], [118, 148, 5, 3.5], [70, 150, 5, 3.5], [150, 78, 4, 3]
  ];

  var PALETTES = {
    plain:       { hi: '#dcb985', mid: '#b08a56', low: '#7a5a34', spot: 'rgba(96,70,38,0.55)' },
    frost:       { hi: '#f2fbff', mid: '#bfe0ef', low: '#7fa8bd', spot: 'rgba(110,150,175,0.5)' },
    magma:       { hi: '#5a2c20', mid: '#2c1611', low: '#140906', spot: 'rgba(255,110,30,0.5)' },
    gold:        { hi: '#fff6cc', mid: '#f0c541', low: '#a87d14', spot: 'rgba(160,120,30,0.45)' },
    diamond:     { hi: '#ffffff', mid: '#cfe9ff', low: '#8fb6d8', spot: 'rgba(255,255,255,0.7)' },
    crystal:     { hi: '#f4eaff', mid: '#c9a8f0', low: '#8a63c4', spot: 'rgba(190,150,240,0.5)' },
    rainbow:     { hi: '#ffffff', mid: '#ffd0e0', low: '#b0d0ff', spot: 'rgba(255,255,255,0.6)', rainbow: true },
    mythic:      { hi: '#f2dcff', mid: '#b07fe0', low: '#6a3a9a', spot: 'rgba(200,150,240,0.5)' },
    storm:       { hi: '#d3dcea', mid: '#7f8ca3', low: '#3f4a5e', spot: 'rgba(255,233,90,0.6)' },
    void:        { hi: '#432e56', mid: '#1c1226', low: '#08050c', spot: 'rgba(154,108,255,0.5)' },
    celestial:   { hi: '#fffbe0', mid: '#f0d98a', low: '#b08a3a', spot: 'rgba(255,240,180,0.6)' },
    quantum:     { hi: '#dcffe8', mid: '#6fe0b0', low: '#2a8a63', spot: 'rgba(120,255,190,0.5)' },
    ancient:     { hi: '#cdbd95', mid: '#8a7a55', low: '#4f442c', spot: 'rgba(90,80,50,0.55)' },
    arcane:      { hi: '#dccdff', mid: '#8a7fd0', low: '#453a80', spot: 'rgba(180,160,255,0.5)' },
    galaxy:      { hi: '#463480', mid: '#1c1440', low: '#0a0618', spot: 'rgba(255,255,255,0.75)' },
    time:        { hi: '#ffeccd', mid: '#d0a878', low: '#8a6038', spot: 'rgba(180,130,70,0.5)' },
    chaos:       { hi: '#ffd0f0', mid: '#80c0ff', low: '#4060c0', spot: 'rgba(255,255,255,0.5)' },
    prime:       { hi: '#ffe48f', mid: '#f0a83a', low: '#a86018', spot: 'rgba(255,200,90,0.55)' },
    transcendent:{ hi: '#ffffff', mid: '#e0f0ff', low: '#9ab8d0', spot: 'rgba(255,255,255,0.8)' },
    reality:     { hi: '#ffd8f0', mid: '#c89fe0', low: '#7a5aa8', spot: 'rgba(255,200,240,0.5)' },
    singularity: { hi: '#3a2a4a', mid: '#120a1c', low: '#05030a', spot: 'rgba(255,180,80,0.7)' },
    multiverse:  { hi: '#d8e8ff', mid: '#8fb0d8', low: '#4a6890', spot: 'rgba(255,255,255,0.6)' },
    divine:      { hi: '#fffbe8', mid: '#f0dfa0', low: '#c0a050', spot: 'rgba(255,250,210,0.7)' },
    exe:         { hi: '#0e3a0e', mid: '#041804', low: '#020c02', spot: 'rgba(80,255,120,0.5)' },
    supreme:     { hi: '#fff2cc', mid: '#e0b050', low: '#9a6a1a', spot: 'rgba(255,220,130,0.6)' },
    the:         { hi: '#ffffff', mid: '#d8d8e0', low: '#9090a0', spot: 'rgba(220,220,230,0.7)' },
    beyond:      { hi: '#d0ffe8', mid: '#80d0b0', low: '#3a8068', spot: 'rgba(190,255,220,0.6)' },
    absolute:    { hi: '#ffffff', mid: '#f0e8c8', low: '#c0a860', spot: 'rgba(255,255,255,0.8)' },
    ultra:       { hi: '#ffe8f8', mid: '#e0a0c8', low: '#9a5080', spot: 'rgba(255,190,220,0.6)' },
    omega:       { hi: '#f0e8ff', mid: '#b090e0', low: '#6848a0', spot: 'rgba(220,190,255,0.6)' },
    hyper:       { hi: '#fff0d0', mid: '#f0b070', low: '#a86030', spot: 'rgba(255,200,150,0.6)' },
    cosmic:      { hi: '#3a2a6a', mid: '#160f2c', low: '#080514', spot: 'rgba(255,255,255,0.8)' },
    universal:   { hi: '#d8f0ff', mid: '#80b8e0', low: '#3a6898', spot: 'rgba(220,240,255,0.6)' },
    deity:       { hi: '#fff8e0', mid: '#f0d890', low: '#b09030', spot: 'rgba(255,250,200,0.7)' },
    infinite:    { hi: '#e8e8ff', mid: '#a0a0e0', low: '#5050a0', spot: 'rgba(230,230,255,0.7)' },
    final:       { hi: '#ffffff', mid: '#f0e0c0', low: '#c09050', spot: 'rgba(255,255,255,0.8)' },
    almost:      { hi: '#ffe8f0', mid: '#f0b0c0', low: '#b06078', spot: 'rgba(255,210,225,0.6)' },
    kawaii:      { hi: '#f6c98a', mid: '#e0a866', low: '#a87638', spot: 'rgba(150,100,50,0.4)' }
  };

  function defs(id, pal) {
    var g = '';
    g += '<radialGradient id="body' + id + '" cx="38%" cy="30%" r="78%">' +
         '<stop offset="0%" stop-color="' + pal.hi + '"/>' +
         '<stop offset="55%" stop-color="' + pal.mid + '"/>' +
         '<stop offset="100%" stop-color="' + pal.low + '"/></radialGradient>';
    if (pal.rainbow) {
      g += '<linearGradient id="rainbow' + id + '" x1="0" y1="0" x2="1" y2="1">' +
           '<stop offset="0%" stop-color="#ff8ab0"/><stop offset="25%" stop-color="#ffd08a"/>' +
           '<stop offset="50%" stop-color="#a8f0a0"/><stop offset="75%" stop-color="#8ac8ff"/>' +
           '<stop offset="100%" stop-color="#c89aff"/></linearGradient>';
    }
    g += '<radialGradient id="glow' + id + '" cx="50%" cy="50%" r="50%">' +
         '<stop offset="0%" stop-color="' + pal.hi + '" stop-opacity="0.85"/>' +
         '<stop offset="100%" stop-color="' + pal.hi + '" stop-opacity="0"/></radialGradient>';
    g += '<filter id="rough' + id + '" x="-20%" y="-20%" width="140%" height="140%">' +
         '<feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="7" result="n"/>' +
         '<feDisplacementMap in="SourceGraphic" in2="n" scale="9"/></filter>';
    g += '<filter id="grain' + id + '" x="0" y="0" width="100%" height="100%">' +
         '<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3"/>' +
         '<feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.6 0.6 0.6 0 0"/>' +
         '</filter>';
    g += '<clipPath id="clip' + id + '"><path d="' + BODY_PATH + '"/></clipPath>';
    return g;
  }

  function body(id, pal) {
    var fill = pal.rainbow ? 'url(#rainbow' + id + ')' : 'url(#body' + id + ')';
    var s = '';
    s += '<circle cx="100" cy="100" r="96" fill="url(#glow' + id + ')" opacity="0.5"/>';
    s += '<g filter="url(#rough' + id + ')">';
    s += '<path d="' + BODY_PATH + '" fill="' + fill + '"/>';
    s += '<rect x="0" y="0" width="200" height="200" filter="url(#grain' + id + ')" ' +
         'clip-path="url(#clip' + id + ')" opacity="0.22"/>';
    SPOTS.forEach(function (sp) {
      s += '<ellipse cx="' + sp[0] + '" cy="' + sp[1] + '" rx="' + sp[2] + '" ry="' + sp[3] +
           '" fill="' + pal.spot + '"/>';
    });
    s += '</g>';
    return s;
  }

  function sparkles(id, n, color, seed) {
    var s = '';
    var rnd = seed;
    function rand() { rnd = (rnd * 1103515245 + 12345) & 0x7fffffff; return rnd / 0x7fffffff; }
    for (var i = 0; i < n; i++) {
      var x = 20 + rand() * 160, y = 20 + rand() * 160;
      var r = 1.5 + rand() * 2.5;
      s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r.toFixed(1) +
           '" fill="' + color + '" opacity="' + (0.4 + rand() * 0.5).toFixed(2) + '"/>';
    }
    return s;
  }

  function star(x, y, r, color, op) {
    return '<path d="M' + x + ' ' + (y - r) + ' L' + (x + r * 0.3) + ' ' + (y - r * 0.3) +
           ' L' + (x + r) + ' ' + y + ' L' + (x + r * 0.3) + ' ' + (y + r * 0.3) +
           ' L' + x + ' ' + (y + r) + ' L' + (x - r * 0.3) + ' ' + (y + r * 0.3) +
           ' L' + (x - r) + ' ' + y + ' L' + (x - r * 0.3) + ' ' + (y - r * 0.3) +
           ' Z" fill="' + color + '" opacity="' + (op || 0.9) + '"/>';
  }

  /* ------------------------- special decorations ------------------------- */

  var DECOR = {
    frost: function (id) {
      var s = '';
      for (var i = 0; i < 6; i++) {
        var x = 45 + i * 22, y = 40 + (i % 3) * 40;
        s += star(x, y, 9, '#eafaff', 0.9);
      }
      s += '<path d="M40 30 L60 70 L48 66 L66 96 L44 70 L56 72 Z" fill="#dff4ff" opacity="0.75"/>';
      return s;
    },
    magma: function () {
      return '<path d="M60 40 L86 78 L74 84 L98 120 M96 34 L112 66 L100 74 L128 108 ' +
             'M48 96 L70 118 L58 128 L82 158" fill="none" stroke="#ff7a1a" ' +
             'stroke-width="4" stroke-linecap="round" opacity="0.95"/>' +
             '<path d="M60 40 L86 78 L74 84 L98 120 M96 34 L112 66 L100 74 L128 108" ' +
             'fill="none" stroke="#ffd27a" stroke-width="1.5" stroke-linecap="round" opacity="0.9"/>';
    },
    gold: function () {
      return '<path d="M38 44 L86 24 L70 70 Z" fill="#fffbe0" opacity="0.55"/>' +
             '<path d="M120 30 L152 22 L138 58 Z" fill="#fffbe0" opacity="0.35"/>';
    },
    diamond: function () {
      var s = '';
      var facets = [[100, 24, 62, 62], [62, 62, 100, 100], [138, 62, 100, 100],
                    [100, 100, 62, 140], [100, 100, 138, 140]];
      facets.forEach(function (f, i) {
        s += '<path d="M' + f[0] + ' ' + f[1] + ' L' + f[2] + ' ' + f[3] +
             '" stroke="#ffffff" stroke-width="1.2" opacity="' + (0.35 + i * 0.08) + '"/>';
      });
      s += star(70, 60, 7, '#ffffff', 0.95) + star(132, 84, 5, '#ffffff', 0.85);
      return s;
    },
    crystal: function () {
      return '<path d="M84 30 L100 20 L116 30 L108 92 L78 92 Z" fill="#e8d8ff" opacity="0.55"/>' +
             '<path d="M62 96 L76 84 L88 96 L78 158 L58 158 Z" fill="#d8c0ff" opacity="0.45"/>' +
             '<path d="M126 92 L140 82 L150 94 L140 156 L120 156 Z" fill="#d8c0ff" opacity="0.45"/>';
    },
    rainbow: function (id) {
      return sparkles(id, 14, '#ffffff', 11) +
             star(60, 50, 8, '#ffffff', 0.9) + star(140, 70, 6, '#ffffff', 0.8);
    },
    mythic: function (id) {
      return sparkles(id, 16, '#f0d8ff', 23) + star(58, 58, 8, '#ffffff', 0.95);
    },
    storm: function () {
      return '<path d="M84 26 L64 84 L82 84 L58 150 L108 72 L88 72 L110 26 Z" ' +
             'fill="#ffe95a" opacity="0.95"/>' +
             '<path d="M130 40 L118 78 L132 78 L116 122" fill="none" stroke="#ffe95a" ' +
             'stroke-width="4" stroke-linecap="round" opacity="0.85"/>';
    },
    void: function (id) {
      return '<path d="' + BODY_PATH + '" fill="none" stroke="#9a6cff" stroke-width="3" ' +
             'opacity="0.8"/>' + sparkles(id, 18, '#c8a8ff', 31);
    },
    celestial: function (id) {
      return '<circle cx="100" cy="92" r="52" fill="none" stroke="#fff8c8" ' +
             'stroke-width="3" opacity="0.7"/>' + sparkles(id, 12, '#fff8c8', 41);
    },
    quantum: function (id) {
      return '<g opacity="0.85"><rect x="30" y="60" width="140" height="4" fill="#a8ffd0"/>' +
             '<rect x="30" y="98" width="140" height="3" fill="#a8ffd0" opacity="0.7"/>' +
             '<rect x="30" y="134" width="140" height="2" fill="#a8ffd0" opacity="0.5"/></g>' +
             sparkles(id, 8, '#d0ffe8', 51);
    },
    ancient: function () {
      return '<path d="M40 150 C70 132 130 132 162 148" fill="none" stroke="#6f8a4a" ' +
             'stroke-width="6" stroke-linecap="round" opacity="0.7"/>' +
             '<path d="M52 156 C80 142 122 142 150 154" fill="none" stroke="#87a05c" ' +
             'stroke-width="3" stroke-linecap="round" opacity="0.6"/>';
    },
    arcane: function (id) {
      var s = '<circle cx="100" cy="100" r="62" fill="none" stroke="#d8ccff" ' +
              'stroke-width="2" stroke-dasharray="6 8" opacity="0.8"/>';
      for (var i = 0; i < 6; i++) {
        var a = i * Math.PI / 3;
        s += star(100 + Math.cos(a) * 62, 100 + Math.sin(a) * 62, 5, '#e8e0ff', 0.9);
      }
      return s;
    },
    galaxy: function (id) {
      var s = '<path d="M100 100 m0 -34 a34 34 0 1 1 -0.1 0 M100 100 m0 -20 a20 20 0 1 0 0.1 0" ' +
              'fill="none" stroke="#c8b8ff" stroke-width="2" opacity="0.7"/>';
      s += sparkles(id, 22, '#ffffff', 61);
      return s + star(100, 100, 7, '#ffffff', 0.95);
    },
    time: function () {
      return '<circle cx="100" cy="100" r="58" fill="none" stroke="#8a6038" ' +
             'stroke-width="4" opacity="0.85"/>' +
             '<path d="M100 100 L100 58 M100 100 L128 112" stroke="#5a3c1c" ' +
             'stroke-width="5" stroke-linecap="round"/>' +
             '<circle cx="100" cy="100" r="6" fill="#5a3c1c"/>';
    },
    chaos: function (id) {
      return '<path d="M40 80 C70 40 120 150 162 70 C150 120 90 120 60 100 Z" ' +
             'fill="#ff9ad0" opacity="0.45"/>' +
             '<path d="M60 130 C90 90 140 160 150 110 C120 150 80 150 60 130 Z" ' +
             'fill="#8ad0ff" opacity="0.45"/>' +
             sparkles(id, 10, '#ffffff', 71);
    },
    prime: function (id) {
      return star(100, 100, 26, '#fff0b0', 0.5) +
             '<circle cx="100" cy="100" r="60" fill="none" stroke="#ffe08a" ' +
             'stroke-width="3" opacity="0.8"/>';
    },
    transcendent: function (id) {
      var s = '';
      for (var i = 0; i < 12; i++) {
        var a = i * Math.PI / 6;
        s += '<path d="M' + (100 + Math.cos(a) * 46) + ' ' + (100 + Math.sin(a) * 46) +
             ' L' + (100 + Math.cos(a) * 78) + ' ' + (100 + Math.sin(a) * 78) +
             '" stroke="#ffffff" stroke-width="2" opacity="0.6"/>';
      }
      return s + sparkles(id, 14, '#ffffff', 81);
    },
    reality: function (id) {
      return sparkles(id, 20, '#ffd8f0', 91) +
             '<path d="M30 100 C70 60 130 140 170 100" fill="none" stroke="#ffffff" ' +
             'stroke-width="2" opacity="0.6"/>';
    },
    singularity: function () {
      return '<circle cx="100" cy="100" r="34" fill="#000000"/>' +
             '<ellipse cx="100" cy="100" rx="70" ry="20" fill="none" stroke="#ffb050" ' +
             'stroke-width="5" opacity="0.85" transform="rotate(-18 100 100)"/>' +
             '<ellipse cx="100" cy="100" rx="70" ry="20" fill="none" stroke="#ffe0a0" ' +
             'stroke-width="2" opacity="0.7" transform="rotate(-18 100 100)"/>';
    },
    multiverse: function (id, pal) {
      var s = '<g opacity="0.45" transform="translate(-26 -14) scale(0.86)">' +
              '<path d="' + BODY_PATH + '" fill="' + pal.mid + '"/></g>' +
              '<g opacity="0.45" transform="translate(26 14) scale(0.86)">' +
              '<path d="' + BODY_PATH + '" fill="' + pal.hi + '"/></g>';
      return s;
    },
    divine: function (id) {
      return '<ellipse cx="100" cy="34" rx="34" ry="10" fill="none" stroke="#fff8c8" ' +
             'stroke-width="5" opacity="0.9"/>' +
             '<path d="M100 18 L100 6 M70 26 L64 16 M130 26 L136 16" stroke="#fff8c8" ' +
             'stroke-width="3" opacity="0.8"/>' + sparkles(id, 12, '#fff8c8', 101);
    },
    exe: function () {
      var s = '<rect x="24" y="24" width="152" height="152" fill="none" stroke="#3aff7a" ' +
              'stroke-width="2" opacity="0.6"/>';
      for (var y = 30; y < 170; y += 8) {
        s += '<rect x="24" y="' + y + '" width="152" height="1" fill="#3aff7a" opacity="0.18"/>';
      }
      s += '<text x="100" y="112" font-family="monospace" font-size="22" fill="#7affa8" ' +
           'text-anchor="middle" opacity="0.9">&gt;_</text>';
      return s;
    },
    supreme: function () {
      return '<path d="M64 44 L76 22 L92 40 L100 18 L108 40 L124 22 L136 44 Z" ' +
             'fill="#ffe08a" stroke="#c09030" stroke-width="2"/>';
    },
    the: function (id) {
      return '<circle cx="100" cy="100" r="86" fill="none" stroke="#ffffff" ' +
             'stroke-width="2" stroke-dasharray="3 10" opacity="0.8"/>' +
             sparkles(id, 24, '#ffffff', 111);
    },
    beyond: function (id) {
      var s = '';
      for (var i = 0; i < 5; i++) {
        var r = 22 + i * 12;
        s += '<circle cx="100" cy="100" r="' + r + '" fill="none" stroke="#d0ffe8" ' +
             'stroke-width="1.5" opacity="' + (0.7 - i * 0.12) + '"/>';
      }
      return s + sparkles(id, 10, '#d0ffe8', 121);
    },
    absolute: function (id) {
      return star(100, 100, 30, '#fffbe0', 0.55) + sparkles(id, 16, '#fffbe0', 131);
    },
    ultra: function (id) {
      return sparkles(id, 18, '#ffd0e8', 141) + star(72, 66, 8, '#ffffff', 0.9);
    },
    omega: function () {
      return '<path d="M64 128 A44 44 0 1 1 136 128" fill="none" stroke="#e0d0ff" ' +
             'stroke-width="7" stroke-linecap="round"/>' +
             '<path d="M64 128 L50 150 M136 128 L150 150" stroke="#e0d0ff" ' +
             'stroke-width="7" stroke-linecap="round"/>';
    },
    hyper: function (id) {
      return '<path d="M30 60 L70 100 L30 140 M90 60 L130 100 L90 140" fill="none" ' +
             'stroke="#ffd0a0" stroke-width="6" stroke-linecap="round" opacity="0.85"/>';
    },
    cosmic: function (id) {
      return sparkles(id, 30, '#ffffff', 151) + star(70, 70, 7, '#ffe0f0', 0.9);
    },
    universal: function (id) {
      return '<circle cx="100" cy="100" r="66" fill="none" stroke="#d8f0ff" ' +
             'stroke-width="3" opacity="0.7"/>' +
             '<ellipse cx="100" cy="100" rx="66" ry="22" fill="none" stroke="#d8f0ff" ' +
             'stroke-width="2" opacity="0.6"/>' + sparkles(id, 12, '#d8f0ff', 161);
    },
    deity: function (id) {
      return '<ellipse cx="100" cy="30" rx="30" ry="9" fill="none" stroke="#fff8c8" ' +
             'stroke-width="5" opacity="0.9"/>' + sparkles(id, 18, '#fff8c8', 171);
    },
    infinite: function () {
      return '<path d="M60 100 C60 78 90 78 100 100 C110 122 140 122 140 100 ' +
             'C140 78 110 78 100 100 C90 122 60 122 60 100 Z" fill="none" ' +
             'stroke="#e8e8ff" stroke-width="4" opacity="0.85"/>';
    },
    final: function (id) {
      return star(100, 100, 34, '#fffbe0', 0.5) +
             '<circle cx="100" cy="100" r="72" fill="none" stroke="#fffbe0" ' +
             'stroke-width="2" opacity="0.7"/>';
    },
    almost: function (id) {
      return sparkles(id, 12, '#ffd0e0', 181) +
             '<circle cx="82" cy="96" r="5" fill="#5a3c1c" opacity="0.5"/>' +
             '<circle cx="118" cy="96" r="5" fill="#5a3c1c" opacity="0.5"/>' +
             '<path d="M88 128 Q100 120 112 128" fill="none" stroke="#5a3c1c" ' +
             'stroke-width="3" stroke-linecap="round" opacity="0.6"/>';
    }
  };

  function kawaii(id) {
    var s = '';
    s += '<circle cx="100" cy="100" r="96" fill="url(#glow' + id + ')" opacity="0.55"/>';
    s += '<g filter="url(#rough' + id + ')">';
    s += '<path d="M100 24 C136 20 166 44 172 80 C178 116 158 158 122 172 ' +
         'C86 186 48 172 36 134 C24 96 40 50 66 36 C78 29 88 25 100 24 Z" ' +
         'fill="url(#body' + id + ')"/>';
    s += '<rect x="0" y="0" width="200" height="200" filter="url(#grain' + id + ')" ' +
         'clip-path="url(#clip' + id + ')" opacity="0.18"/>';
    s += '</g>';
    // eyes
    s += '<ellipse cx="76" cy="94" rx="17" ry="21" fill="#ffffff"/>';
    s += '<ellipse cx="124" cy="94" rx="17" ry="21" fill="#ffffff"/>';
    s += '<ellipse cx="78" cy="98" rx="10" ry="14" fill="#3a2416"/>';
    s += '<ellipse cx="122" cy="98" rx="10" ry="14" fill="#3a2416"/>';
    s += '<circle cx="74" cy="90" r="4" fill="#ffffff"/>';
    s += '<circle cx="118" cy="90" r="4" fill="#ffffff"/>';
    s += '<circle cx="82" cy="104" r="2" fill="#ffffff" opacity="0.8"/>';
    s += '<circle cx="126" cy="104" r="2" fill="#ffffff" opacity="0.8"/>';
    // cheeks
    s += '<ellipse cx="58" cy="122" rx="13" ry="8" fill="#ff9ab0" opacity="0.75"/>';
    s += '<ellipse cx="142" cy="122" rx="13" ry="8" fill="#ff9ab0" opacity="0.75"/>';
    // smile
    s += '<path d="M86 126 Q100 142 114 126 Q100 134 86 126 Z" fill="#7a4a2a"/>';
    // sprout
    s += '<path d="M100 26 C100 14 92 10 84 12 C92 16 94 22 96 26 Z" fill="#6fae5a"/>';
    s += '<path d="M100 26 C100 12 108 8 116 12 C108 16 106 22 104 26 Z" fill="#87c46e"/>';
    return s;
  }

  function svg(index, artKey) {
    uid++;
    var id = uid;
    var pal = PALETTES[artKey] || PALETTES.plain;
    var s = '<svg viewBox="0 0 200 200" width="100%" height="100%" ' +
            'xmlns="http://www.w3.org/2000/svg" aria-hidden="true">';
    s += '<defs>' + defs(id, pal) + '</defs>';
    if (artKey === 'kawaii') {
      s += kawaii(id);
    } else {
      s += body(id, pal);
      var fn = DECOR[artKey];
      if (fn) {
        try { s += fn(id, pal); } catch (e) { /* decoration is cosmetic */ }
      }
      if (!fn) s += sparkles(id, 8, pal.hi, 7 + index);
    }
    s += '</svg>';
    return s;
  }

  global.PotatoArt = { svg: svg, BODY_PATH: BODY_PATH, PALETTES: PALETTES };
})(typeof window !== 'undefined' ? window : globalThis);
