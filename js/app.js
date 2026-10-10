/* Interface — Ventilation ASHRAE 62.1 (prédimensionnement). Aucune dépendance externe. */
(function () {
  'use strict';

  var STORAGE_KEY = 'v621.projet.v1';
  var T = window.T621, C = window.VCalc, S = window.VSample;

  // ---------- Utilitaires ----------
  var nf = {};
  function fmt(v, d) {
    if (v === null || v === undefined || !isFinite(v)) return '—';
    d = d === undefined ? 1 : d;
    if (!nf[d]) nf[d] = new Intl.NumberFormat('fr-CA', { minimumFractionDigits: d, maximumFractionDigits: d });
    return nf[d].format(v);
  }
  function esc(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function uid(p) { return p + Math.random().toString(36).slice(2, 9); }
  function $(sel, el) { return (el || document).querySelector(sel); }
  function $$(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }
  function round(v, d) { var f = Math.pow(10, d); return Math.round(v * f) / f; }
  function ref(code, text) { return '<span class="ref" title="' + esc(text) + '">' + esc(code) + '</span>'; }
  function info(text) { return '<span class="info" title="' + esc(text) + '">ⓘ</span>'; }

  var TYPE_LABEL = { multizone: 'Multizone', monozone: 'Zone unique', oa100: '100 % air neuf' };

  // ---------- État ----------
  function newSystem(name) {
    return { id: uid('s'), name: name, type: 'multizone', ez: 1, evMethod: 'Simplifiée', fct: 1,
      event: { on: false, n: 0, catId: 'sport_spectator', height: 0, duration: 0 } };
  }
  function newLocal(sysId) {
    return { id: uid('l'), name: 'Nouveau local', sysId: sysId || '', ft2: 0, pz: 0, occ: true,
      catA: 'off_office', pctA: 1, catB: 'off_office', pctB: 0, combo: 'Max', vpz: 0 };
  }
  function defaultProject() {
    var scs = S.scenarios();
    return { params: clone(C.DEFAULT_PARAMS), scenarios: scs, active: scs[0].id, compareRef: scs[0].id, tab: 'dashboard' };
  }
  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) { var p = JSON.parse(raw); if (p && p.scenarios && p.scenarios.length) return p; }
    } catch (e) { /* stockage indisponible */ }
    return defaultProject();
  }
  function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignoré */ } }

  var state = load();
  var filterSys = '';

  function sc() {
    var s = state.scenarios.filter(function (x) { return x.id === state.active; })[0];
    if (!s) { s = state.scenarios[0]; state.active = s.id; }
    return s;
  }
  function compute(scen) { return C.scenario(scen || sc(), state.params, T.get); }
  function sysName(id) { var s = sc().systems.filter(function (x) { return x.id === id; })[0]; return s ? s.name : '—'; }
  function nextSysName(scen) {
    var n = 1, names = scen.systems.map(function (s) { return s.name; });
    while (names.indexOf('UCT-' + (n < 10 ? '0' : '') + n) >= 0) n++;
    return 'UCT-' + (n < 10 ? '0' : '') + n;
  }

  // ---------- Rendu général ----------
  function render() {
    var focusKey = document.activeElement && document.activeElement.getAttribute('data-k');
    $('#edition').textContent = 'Table : ' + T.EDITION + ' · procédure multizone et références § selon 62.1-2016 (comme le fichier Excel)';
    var sel = $('#scenarioSelect');
    sel.innerHTML = state.scenarios.map(function (s) {
      return '<option value="' + esc(s.id) + '"' + (s.id === state.active ? ' selected' : '') + '>' + esc(s.name) + '</option>';
    }).join('');
    $$('.tabs button').forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-tab') === state.tab ? 'true' : 'false'); });
    var view = $('#view');
    var fn = VIEWS[state.tab] || VIEWS.dashboard;
    view.innerHTML = fn();
    if (focusKey) {
      var el = view.querySelector('[data-k="' + focusKey.replace(/"/g, '') + '"]');
      if (el) { el.focus(); if (el.select && el.type !== 'checkbox') try { el.select(); } catch (e) {} }
    }
    save();
  }

  // ---------- Tableau de bord ----------
  function viewDashboard() {
    var scen = sc(), res = compute(scen), t = res.total;
    var h = '';
    if (scen.note) h += '<p class="note">' + esc(scen.note) + '</p><br>';
    h += '<div class="kpis">' +
      kpi('Air neuf total (Vot)', fmt(t.vot, 0), 'L/s', fmt(t.votCfm, 0) + ' pi³/min') +
      kpi('Refroidissement – air neuf', fmt(t.coolTons, 1), 't', fmt(t.coolTons * C.KW_PER_TON, 1) + ' kW', 'cool') +
      kpi('Chauffage – air neuf', fmt(t.heatKw, 1), 'kW', 'ΔT hiver ' + fmt(res.psy.dT, 1) + ' °C', 'heat') +
      kpi('Systèmes / locaux', res.systems.length + ' / ' + scen.locals.length, '', 'Δh été ' + fmt(res.psy.dh, 2) + ' kJ/kg') +
      '</div>';
    if (res.orphans) h += '<p class="warn" style="margin:0 0 1rem">' + res.orphans + ' local(aux) non assigné(s) à un système : exclu(s) des résultats.</p>';
    if (!res.systems.length) return h + '<div class="panel empty">Aucun système. Créez-en un dans l\'onglet « Systèmes ».</div>';
    h += '<div class="cards">' + res.systems.map(card).join('') + '</div>';
    return h;
  }
  function kpi(label, value, unit, sub, cls) {
    return '<div class="kpi ' + (cls || '') + '"><div class="label">' + esc(label) + '</div><div class="value">' + value +
      (unit ? '<span class="unit">' + unit + '</span>' : '') + '</div><div class="sub">' + sub + '</div></div>';
  }
  function localName(id) { var l = sc().locals.filter(function (x) { return x.id === id; })[0]; return l ? l.name : '—'; }

  function card(r) {
    var rows = [], steps = [];
    rows.push(['Locaux', r.nZones]);
    rows.push(['Ez ' + ref('Tab. 6.2.2.2', 'Efficacité de distribution de l\'air dans la zone'), fmt(r.ez, 2)]);
    if (r.type === 'multizone') {
      rows.push(['Σ Pz / Ps (pers.)', fmt(r.sumPz, 0) + ' / ' + fmt(r.ps, 0)]);
      rows.push(['Diversité D = Ps / ΣPz ' + ref('§6.2.5.3.1', '62.1-2016 §6.2.5.3.1'), fmt(r.D, 3)]);
      rows.push(['Vou (L/s)', fmt(r.vou, 1)]);
      rows.push(['Ev retenue (' + esc(r.evSource) + ') ' + ref('§6.2.5.3', '62.1-2016 §6.2.5.3 / Tab. 6.2.5.2'), fmt(r.ev, 2)]);
      rows.push(['Ev simplifiée / tableau', fmt(r.evSimple, 2) + ' / ' + (r.evTab === null ? 'Annexe A' : fmt(r.evTab, 2))]);
      rows.push(['Zp max — local critique', fmt(r.zpMax, 3) + ' — ' + esc(localName(r.critId))]);
      steps = [
        'Σ(Rp·Pz) = <code>' + fmt(r.sumOcc, 1) + '</code> L/s ; Σ(Ra·Az) = <code>' + fmt(r.sumSurf, 1) + '</code> L/s',
        'D = Ps / ΣPz = ' + fmt(r.ps, 0) + ' / ' + fmt(r.sumPz, 0) + ' = <code>' + fmt(r.D, 4) + '</code>',
        'Vou = D·Σ(Rp·Pz) + Σ(Ra·Az) = <code>' + fmt(r.vou, 1) + '</code> L/s',
        'Ev simplifiée = ' + (r.D < 0.6 ? '0,88·D + 0,22' : '0,75 (D ≥ 0,60)') + ' = <code>' + fmt(r.evSimple, 3) + '</code>',
        'Vot = Vou / Ev = ' + fmt(r.vou, 1) + ' / ' + fmt(r.ev, 2) + ' = <code>' + fmt(r.vot, 1) + '</code> L/s'
      ];
    } else if (r.type === 'monozone') {
      if (r.event) {
        var e = r.event;
        rows.push(['Vbz usage typique (L/s)', fmt(e.vbzTyp, 1)]);
        rows.push(['Vbz événement (L/s)', fmt(e.vbzEvt, 1)]);
        rows.push(['T = 3·v / Vbz évén. ' + ref('§6.2.6.2', '62.1-2016 §6.2.6.2 — conditions de courte durée'), fmt(e.T, 1) + ' min']);
        rows.push(['Vbz moyen sur T / conception', fmt(e.vbzMoy, 1) + ' / ' + fmt(e.vbzConc, 1)]);
        steps = [
          'Composante surface Σ(Ra·Az) = <code>' + fmt(r.sumSurf, 1) + '</code> L/s',
          'Vbz typique = Σ Vbz des locaux = <code>' + fmt(e.vbzTyp, 1) + '</code> L/s',
          'Vbz événement = N·Rp + Σ(Ra·Az) = <code>' + fmt(e.vbzEvt, 1) + '</code> L/s',
          'v = ΣAz × hauteur = <code>' + fmt(e.volume, 0) + '</code> m³ ; T = 3·v / Vbz = <code>' + fmt(e.T, 1) + '</code> min (durée ' + fmt(e.duration, 0) + ' min)',
          'Vbz moyen = ' + (e.duration >= e.T ? 'Vbz événement (durée ≥ T)' : '(Vbz évén.·durée + Vbz typ.·(T − durée)) / T') + ' = <code>' + fmt(e.vbzMoy, 1) + '</code>',
          'Vot = max(Vbz typ., Vbz moyen) / Ez = <code>' + fmt(r.vot, 1) + '</code> L/s'
        ];
      } else {
        rows.push(['Σ Vbz / Voz (L/s)', fmt(r.sumVbz, 1) + ' / ' + fmt(r.voz, 1)]);
        rows.push(['Facteur de courte durée ' + ref('§6.2.6.2', '62.1-2016 §6.2.6.2'), fmt(r.fct * 100, 0) + ' %']);
        steps = [
          'Voz = Vbz / Ez = <code>' + fmt(r.voz, 1) + '</code> L/s',
          'Vot = Voz × facteur = ' + fmt(r.voz, 1) + ' × ' + fmt(r.fct, 2) + ' = <code>' + fmt(r.vot, 1) + '</code> L/s'
        ];
      }
    } else {
      rows.push(['Σ Voz (L/s)', fmt(r.sumVoz, 1)]);
      steps = ['Système 100 % air neuf : Vot = Σ Voz = <code>' + fmt(r.vot, 1) + '</code> L/s ' + ref('§6.2.4', '62.1-2016 §6.2.4')];
    }
    steps.push('Refroidissement = ρ·(Vot/1000)·Δh / 3,517 = <code>' + fmt(r.coolTons, 2) + '</code> t');
    steps.push('Chauffage = ρ·1,006·(Vot/1000)·ΔT = <code>' + fmt(r.heatKw, 1) + '</code> kW');

    return '<article class="card"><div class="card-head"><h3>' + esc(r.name) + '</h3><span class="badge">' + TYPE_LABEL[r.type] + '</span></div>' +
      '<div class="card-main">' +
      '<div><div class="lbl">Air neuf à l\'unité Vot</div><div class="big">' + fmt(r.vot, 0) + ' <span class="unit small muted">L/s</span></div><div class="muted small">' + fmt(r.votCfm, 0) + ' pi³/min</div></div>' +
      '<div><div class="lbl">Refroid. air neuf</div><div class="val cool">' + fmt(r.coolTons, 1) + ' t</div><div class="muted small">' + fmt(r.coolKw, 1) + ' kW</div></div>' +
      '<div><div class="lbl">Chauff. air neuf</div><div class="val heat">' + fmt(r.heatKw, 1) + ' kW</div></div>' +
      '</div>' +
      '<table class="kv">' + rows.map(function (x) { return '<tr><td>' + x[0] + '</td><td class="n">' + x[1] + '</td></tr>'; }).join('') + '</table>' +
      r.warnings.map(function (w) { return '<p class="warn">⚠ ' + esc(w) + '</p>'; }).join('') +
      '<details class="calc"><summary>Détail du calcul</summary><ol>' + steps.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol></details>' +
      '</article>';
  }

  // ---------- Locaux ----------
  function viewLocaux() {
    var scen = sc(), res = compute(scen);
    var zmap = {}, critIds = {};
    res.systems.forEach(function (s) { s.zones.forEach(function (z) { zmap[z.id] = z; }); if (s.critId && s.type === 'multizone') critIds[s.critId] = 1; });
    var locs = scen.locals.filter(function (l) { return !filterSys || l.sysId === filterSys; });
    var sysOpts = function (cur) {
      return '<option value="">— non assigné —</option>' + scen.systems.map(function (s) {
        return '<option value="' + esc(s.id) + '"' + (s.id === cur ? ' selected' : '') + '>' + esc(s.name) + '</option>';
      }).join('');
    };
    var h = '<section class="panel"><div class="panel-head"><h2>Locaux — ' + esc(scen.name) + '</h2><div class="toolbar">' +
      '<label>Filtrer : <select id="filterSys"><option value="">Tous les systèmes</option>' +
      scen.systems.map(function (s) { return '<option value="' + esc(s.id) + '"' + (s.id === filterSys ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') +
      '</select></label><button type="button" class="primary" data-action="loc-add">+ Ajouter un local</button></div></div>' +
      '<p class="muted small">Champs jaunes = saisies. Az = pi² × ' + state.params.ft2m2 + '. Ra = max(Ra assis, Ra actif). ' +
      'Composante occupants : « Max » = max(Pz·%assis·Rp assis, Pz·%actif·Rp actif) ; « Somme » = addition des deux. Ligne surlignée = local critique (Zp max) du système multizone.</p>' +
      '<div class="scroll"><table class="grid sticky-first"><thead><tr>' +
      '<th>Local</th><th>Système</th><th class="n">Superficie (pi²)</th><th class="n calc">Az (m²)</th><th class="n">Pz ' + info('Population de conception (capacité), §6.2.2.1') + '</th>' +
      '<th>Pointe ' + info('Occupé à la pointe (diversité, §6.2.5.3.1)') + '</th>' +
      '<th>Catégorie – mode assis/usuel</th><th class="n">% assis</th><th>Catégorie – mode actif</th><th class="n">% actif</th><th>Comb.</th>' +
      '<th class="n">Vpz (L/s) ' + info('Débit d\'air primaire soufflé au local (sert à Zpz)') + '</th>' +
      '<th class="n calc">Rp a / b</th><th class="n calc">Ra</th><th class="n calc">Occ. (L/s)</th><th class="n calc">Surf. (L/s)</th>' +
      '<th class="n calc">Vbz (L/s)</th><th class="n calc">Voz (L/s)</th><th class="n calc">Zpz</th><th></th></tr></thead><tbody>';
    if (!locs.length) h += '<tr><td colspan="20" class="empty">Aucun local. Cliquez sur « + Ajouter un local ».</td></tr>';
    locs.forEach(function (l) {
      var z = zmap[l.id] || C.zone(l, T.get, 1, state.params);
      var k = function (f) { return 'data-id="' + esc(l.id) + '" data-f="' + f + '" data-k="' + esc(l.id) + '.' + f + '"'; };
      h += '<tr class="' + (critIds[l.id] ? 'crit' : '') + '">' +
        '<td><input class="in w-name" ' + k('name') + ' value="' + esc(l.name) + '"></td>' +
        '<td><select class="in" ' + k('sysId') + '>' + sysOpts(l.sysId) + '</select></td>' +
        '<td><input class="in w-num" type="number" step="any" min="0" ' + k('ft2') + ' value="' + round(l.ft2, 2) + '"></td>' +
        '<td class="n calc">' + fmt(z.az, 1) + '</td>' +
        '<td><input class="in w-pct" type="number" step="any" min="0" ' + k('pz') + ' value="' + l.pz + '"></td>' +
        '<td style="text-align:center"><input class="in" type="checkbox" ' + k('occ') + (l.occ ? ' checked' : '') + '></td>' +
        '<td>' + catBtn(l, 'catA') + '</td>' +
        '<td><input class="in w-pct" type="number" step="any" min="0" max="100" ' + k('pctA') + ' value="' + round(l.pctA * 100, 2) + '"></td>' +
        '<td>' + catBtn(l, 'catB') + '</td>' +
        '<td><input class="in w-pct" type="number" step="any" min="0" max="100" ' + k('pctB') + ' value="' + round(l.pctB * 100, 2) + '"></td>' +
        '<td><select class="in" ' + k('combo') + '><option' + (l.combo !== 'Somme' ? ' selected' : '') + '>Max</option><option' + (l.combo === 'Somme' ? ' selected' : '') + '>Somme</option></select></td>' +
        '<td><input class="in w-num" type="number" step="any" min="0" ' + k('vpz') + ' value="' + l.vpz + '"></td>' +
        '<td class="n calc">' + fmt(z.rpA, 1) + ' / ' + fmt(z.rpB, 1) + '</td>' +
        '<td class="n calc">' + fmt(z.ra, 2) + '</td>' +
        '<td class="n calc">' + fmt(z.occ, 1) + '</td>' +
        '<td class="n calc">' + fmt(z.surf, 1) + '</td>' +
        '<td class="n calc"><strong>' + fmt(z.vbz, 1) + '</strong></td>' +
        '<td class="n calc">' + fmt(z.voz, 1) + '</td>' +
        '<td class="n calc">' + (z.vpz > 0 ? fmt(z.zpz, 3) : '—') + '</td>' +
        '<td style="white-space:nowrap"><button type="button" class="icon" title="Dupliquer" data-action="loc-dup" data-id="' + esc(l.id) + '">⧉</button> ' +
        '<button type="button" class="icon danger" title="Supprimer" data-action="loc-del" data-id="' + esc(l.id) + '">✕</button></td></tr>';
    });
    var tot = locs.reduce(function (a, l) { var z = zmap[l.id] || C.zone(l, T.get, 1, state.params); a.az += z.az; a.pz += z.pz; a.occ += z.occ; a.surf += z.surf; a.vbz += z.vbz; a.voz += z.voz; return a; }, { az: 0, pz: 0, occ: 0, surf: 0, vbz: 0, voz: 0 });
    h += '</tbody><tfoot><tr><td colspan="3">Total (' + locs.length + ' locaux)</td><td class="n">' + fmt(tot.az, 1) + '</td><td class="n">' + fmt(tot.pz, 0) +
      '</td><td colspan="9"></td><td class="n">' + fmt(tot.occ, 1) + '</td><td class="n">' + fmt(tot.surf, 1) + '</td><td class="n">' + fmt(tot.vbz, 1) + '</td><td class="n">' + fmt(tot.voz, 1) + '</td><td colspan="2"></td></tr></tfoot></table></div></section>';
    return h;
  }
  function catBtn(l, f) {
    var c = T.get(l[f]);
    return '<button type="button" class="cat" data-action="pick-cat" data-id="' + esc(l.id) + '" data-f="' + f + '" data-k="' + esc(l.id) + '.' + f + '" title="' + esc(c ? c.fr + ' — ' + c.en + ' (Rp ' + c.rp + ', Ra ' + c.ra + ')' : 'Choisir') + '">' +
      (c ? esc(c.fr) : '<em>Choisir…</em>') + '</button>';
  }

  // ---------- Systèmes ----------
  function viewSystemes() {
    var scen = sc(), res = compute(scen);
    var h = '<section class="panel"><div class="panel-head"><h2>Systèmes — ' + esc(scen.name) + '</h2><div class="toolbar">' +
      '<button type="button" class="primary" data-action="sys-add">+ Ajouter un système</button></div></div>' +
      '<p class="muted small"><strong>Multizone</strong> : Vot = Vou / Ev avec diversité D ' + ref('§6.2.5', '62.1-2016 §6.2.5') + '. ' +
      '<strong>Zone unique</strong> : Vot = Voz × facteur de courte durée, ou analyse d\'événement (T = 3·v / Vbz) ' + ref('§6.2.6.2', '62.1-2016 §6.2.6.2') + '. ' +
      '<strong>100 % air neuf</strong> : Vot = Σ Voz ' + ref('§6.2.4', '62.1-2016 §6.2.4') + '.</p>' +
      '<div class="scroll"><table class="grid"><thead><tr><th>Nom</th><th>Type</th><th class="n">Ez ' + info('Tab. 6.2.2.2 : 1,0 en climatisation (soufflage au plafond) ; 0,8 si air chaud soufflé au plafond en chauffage') + '</th>' +
      '<th>Méthode Ev ' + info('« Simplifiée » : Ev = 0,88·D + 0,22 si D < 0,60, sinon 0,75. « Tableau » : selon Zp max (≤0,15→1,0 … ≤0,55→0,6 ; > 0,55 → annexe A)') + '</th>' +
      '<th class="n">Facteur courte durée (%)</th><th>Événement §6.2.6.2</th><th class="n calc">Locaux</th><th class="n calc">Vot (L/s)</th><th></th></tr></thead><tbody>';
    if (!scen.systems.length) h += '<tr><td colspan="9" class="empty">Aucun système.</td></tr>';
    scen.systems.forEach(function (s) {
      var r = res.systems.filter(function (x) { return x.id === s.id; })[0];
      var k = function (f) { return 'data-sid="' + esc(s.id) + '" data-f="' + f + '" data-k="' + esc(s.id) + '.' + f + '"'; };
      var mono = s.type === 'monozone', multi = s.type === 'multizone';
      h += '<tr><td><input class="in" style="min-width:110px" ' + k('name') + ' value="' + esc(s.name) + '"></td>' +
        '<td><select class="in" ' + k('type') + '>' + Object.keys(TYPE_LABEL).map(function (t) { return '<option value="' + t + '"' + (t === s.type ? ' selected' : '') + '>' + TYPE_LABEL[t] + '</option>'; }).join('') + '</select></td>' +
        '<td><input class="in w-pct" type="number" step="0.05" min="0.1" max="1.5" ' + k('ez') + ' value="' + s.ez + '"></td>' +
        '<td>' + (multi ? '<select class="in" ' + k('evMethod') + '><option' + (s.evMethod !== 'Tableau' ? ' selected' : '') + '>Simplifiée</option><option' + (s.evMethod === 'Tableau' ? ' selected' : '') + '>Tableau</option></select>' : '<span class="muted">—</span>') + '</td>' +
        '<td>' + (mono && !s.event.on ? '<input class="in w-pct" type="number" step="any" min="0" max="100" ' + k('fct') + ' value="' + round(s.fct * 100, 3) + '">' : '<span class="muted">—</span>') + '</td>' +
        '<td>' + (mono ? eventCell(s) : '<span class="muted">—</span>') + '</td>' +
        '<td class="n calc">' + (r ? r.nZones : 0) + '</td><td class="n calc"><strong>' + (r ? fmt(r.vot, 0) : '—') + '</strong></td>' +
        '<td><button type="button" class="icon danger" title="Supprimer" data-action="sys-del" data-sid="' + esc(s.id) + '">✕</button></td></tr>';
    });
    h += '</tbody></table></div></section>';
    return h;
  }
  function eventCell(s) {
    var e = s.event, k = function (f) { return 'data-sid="' + esc(s.id) + '" data-f="' + f + '" data-k="' + esc(s.id) + '.' + f + '"'; };
    var h = '<label><input type="checkbox" class="in" ' + k('event.on') + (e.on ? ' checked' : '') + '> Activer</label>';
    if (!e.on) return h;
    var c = T.get(e.catId);
    return h + '<div style="display:grid;grid-template-columns:auto auto;gap:.2rem .4rem;margin-top:.3rem;font-size:.82rem;align-items:center">' +
      '<span>Occupants événement</span><input class="in w-num" type="number" step="any" min="0" ' + k('event.n') + ' value="' + e.n + '">' +
      '<span>Catégorie (Rp)</span><button type="button" class="cat" data-action="pick-evcat" data-sid="' + esc(s.id) + '" data-k="' + esc(s.id) + '.evcat">' + (c ? esc(c.fr) + ' <small>(' + c.rp + ')</small>' : 'Choisir…') + '</button>' +
      '<span>Hauteur moyenne (m)</span><input class="in w-num" type="number" step="any" min="0" ' + k('event.height') + ' value="' + e.height + '">' +
      '<span>Durée événement (min)</span><input class="in w-num" type="number" step="any" min="0" ' + k('event.duration') + ' value="' + e.duration + '">' +
      '</div><div class="muted small" style="max-width:300px">Vbz évén. = N·Rp + Σ(Ra·Az) des locaux ; v = ΣAz × hauteur. Vot = max(Vbz typique, Vbz moyen sur T) / Ez.</div>';
  }

  // ---------- Paramètres ----------
  function viewParams() {
    var p = state.params, psy = C.psychro(p);
    var f = function (path, label, val, hint, step) {
      return '<div class="field"><label>' + label + '</label><input class="in" type="number" step="' + (step || 'any') + '" data-p="' + path + '" data-k="p.' + path + '" value="' + val + '">' +
        (hint ? '<div class="hint">' + hint + '</div>' : '') + '</div>';
    };
    return '<section class="panel"><div class="panel-head"><h2>Paramètres généraux</h2><div class="toolbar"><button type="button" data-action="params-reset">Rétablir les valeurs du fichier</button></div></div>' +
      '<p class="muted small">Ez, méthode Ev et facteur de courte durée se règlent par système (onglet « Systèmes »).</p>' +
      '<div class="form-grid"><div><h3>Été</h3>' +
      f('ete.text', 'Text (°C)', p.ete.text, 'BPA §6.2') + f('ete.hrExt', 'HR extérieure (%)', round(p.ete.hrExt * 100, 3)) +
      f('ete.tint', 'Tint (°C)', p.ete.tint, 'Hypothèse CP') + f('ete.hrInt', 'HR intérieure (%)', round(p.ete.hrInt * 100, 3)) +
      '</div><div><h3>Hiver</h3>' + f('hiver.text', 'Text (°C)', p.hiver.text, 'BPA §6.2') + f('hiver.tint', 'Tint (°C)', p.hiver.tint, 'Hypothèse CP') +
      '<h3 style="margin-top:1rem">Constantes</h3>' + f('rho', 'Masse volumique de l\'air ρ (kg/m³)', p.rho) + f('patm', 'Pression atmosphérique (kPa)', p.patm) +
      f('ft2m2', 'Conversion pi² → m²', p.ft2m2) + '</div>' +
      '<div><h3>Psychrométrie calculée</h3><table class="kv">' +
      '<tr><td>w ext. (kg/kg) — Magnus</td><td class="n">' + fmt(psy.wExt, 5) + '</td></tr>' +
      '<tr><td>w int. (kg/kg) — Magnus</td><td class="n">' + fmt(psy.wInt, 5) + '</td></tr>' +
      '<tr><td>h ext. (kJ/kg)</td><td class="n">' + fmt(psy.hExt, 2) + '</td></tr>' +
      '<tr><td>h int. (kJ/kg)</td><td class="n">' + fmt(psy.hInt, 2) + '</td></tr>' +
      '<tr><td><strong>Δh été (kJ/kg)</strong></td><td class="n"><strong>' + fmt(psy.dh, 2) + '</strong></td></tr>' +
      '<tr><td><strong>ΔT hiver (°C)</strong></td><td class="n"><strong>' + fmt(psy.dT, 1) + '</strong></td></tr></table>' +
      '<p class="muted small" style="margin-top:.6rem">pvs = 0,61094·exp(17,625·T / (T + 243,04)) kPa ; w = 0,622·HR·pvs / (P − HR·pvs) ; h = 1,006·T + w·(2501 + 1,86·T).<br>' +
      'Refroidissement (t) = ρ·Vot/1000·Δh / 3,517 ; chauffage (kW) = ρ·1,006·Vot/1000·ΔT.</p></div></div></section>';
  }

  // ---------- Table 62.1 ----------
  var tableQuery = '';
  function catRows(q, current, pickable) {
    var words = norm(q).split(/\s+/).filter(Boolean), h = '', lastG = null;
    T.CATEGORIES.forEach(function (c) {
      var hay = norm(c.fr + ' ' + c.en + ' ' + c.groupe);
      if (!words.every(function (w) { return hay.indexOf(w) >= 0; })) return;
      if (c.groupe !== lastG) { h += '<tr class="group"><td colspan="5">' + esc(c.groupe) + '</td></tr>'; lastG = c.groupe; }
      h += '<tr class="' + (pickable ? 'pick' : '') + (c.id === current ? ' current' : '') + '" data-cat="' + c.id + '"><td>' + esc(c.fr) + '</td><td class="muted">' + esc(c.en) +
        '</td><td class="n">' + fmt(c.rp, 1) + '</td><td class="n">' + fmt(c.ra, 1) + '</td><td class="n">' + (c.densite ? c.densite : '—') + '</td></tr>';
    });
    return h || '<tr><td colspan="5" class="empty">Aucune catégorie ne correspond.</td></tr>';
  }
  function catHead() { return '<thead><tr><th>Catégorie</th><th>Libellé 62.1</th><th class="n">Rp (L/s·pers.)</th><th class="n">Ra (L/s·m²)</th><th class="n">Densité (pers./100 m²)</th></tr></thead>'; }
  function norm(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function viewTable() {
    return '<section class="panel"><div class="panel-head"><h2>' + esc(T.EDITION) + '</h2><span class="muted small">' + T.CATEGORIES.length + ' catégories</span></div>' +
      '<p class="muted small">Minimum Ventilation Rates in Breathing Zone — zones non résidentielles. Vbz = Rp·Pz + Ra·Az. Les logements relèvent d\'ASHRAE 62.2. ' +
      'Valeurs à confirmer avec l\'exemplaire officiel de la norme et l\'édition exigée par le CNB 2015 modifié Québec.</p>' +
      '<input type="search" id="tableSearch" data-k="tableSearch" placeholder="Rechercher…" value="' + esc(tableQuery) + '" style="width:100%;max-width:420px;padding:.45rem .6rem;border:1px solid var(--border);border-radius:8px;background:var(--surface);margin:.4rem 0 .8rem">' +
      '<div class="scroll"><table class="grid" id="catTable">' + catHead() + '<tbody>' + catRows(tableQuery) + '</tbody></table></div></section>';
  }

  // ---------- Comparaison ----------
  function viewCompare() {
    var results = state.scenarios.map(function (s) { return { sc: s, res: compute(s) }; });
    var names = [];
    results.forEach(function (x) { x.res.systems.forEach(function (s) { if (names.indexOf(s.name) < 0) names.push(s.name); }); });
    var refId = state.compareRef && state.scenarios.some(function (s) { return s.id === state.compareRef; }) ? state.compareRef : state.scenarios[0].id;
    var refTot = results.filter(function (x) { return x.sc.id === refId; })[0].res.total.vot;
    var bySys = function (res, n, k) { var s = res.systems.filter(function (x) { return x.name === n; }); return s.length ? s.reduce(function (a, b) { return a + b[k]; }, 0) : null; };
    var h = '<section class="panel"><div class="panel-head"><h2>Comparaison des scénarios</h2><div class="toolbar"><label>Référence : <select id="compareRef">' +
      state.scenarios.map(function (s) { return '<option value="' + esc(s.id) + '"' + (s.id === refId ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') +
      '</select></label></div></div><p class="muted small">Systèmes regroupés par nom. Utilisez « Dupliquer » dans la barre du haut pour créer une variante d\'un scénario.</p>' +
      '<div class="scroll"><table class="grid"><thead><tr><th>Scénario</th>' + names.map(function (n) { return '<th class="n">Vot ' + esc(n) + ' (L/s)</th>'; }).join('') +
      '<th class="n">Total (L/s)</th><th class="n">Total (pi³/min)</th><th class="n">vs référence</th>' +
      names.map(function (n) { return '<th class="n">Refroid. ' + esc(n) + ' (t)</th>'; }).join('') +
      names.map(function (n) { return '<th class="n">Chauff. ' + esc(n) + ' (kW)</th>'; }).join('') + '</tr></thead><tbody>';
    results.forEach(function (x) {
      var t = x.res.total, d = refTot > 0 ? t.vot / refTot - 1 : 0;
      h += '<tr' + (x.sc.id === state.active ? ' style="font-weight:600"' : '') + '><td>' + esc(x.sc.name) + '</td>' +
        names.map(function (n) { return '<td class="n">' + fmt(bySys(x.res, n, 'vot'), 0) + '</td>'; }).join('') +
        '<td class="n"><strong>' + fmt(t.vot, 0) + '</strong></td><td class="n">' + fmt(t.votCfm, 0) + '</td>' +
        '<td class="n ' + (x.sc.id === refId ? '' : d > 0 ? 'bad' : 'ok') + '">' + (x.sc.id === refId ? 'réf.' : (d > 0 ? '+' : '') + fmt(d * 100, 1) + ' %') + '</td>' +
        names.map(function (n) { return '<td class="n">' + fmt(bySys(x.res, n, 'coolTons'), 1) + '</td>'; }).join('') +
        names.map(function (n) { return '<td class="n">' + fmt(bySys(x.res, n, 'heatKw'), 1) + '</td>'; }).join('') + '</tr>';
    });
    return h + '</tbody></table></div></section>';
  }

  // ---------- Validation Excel ----------
  var VAL_LABELS = { sumPz: 'Σ Pz', ps: 'Ps', D: 'D', sumOcc: 'Σ comp. occupants', sumSurf: 'Σ comp. surface', vou: 'Vou', evSimple: 'Ev simplifiée', zpMax: 'Zp max', vot: 'Vot (L/s)', coolTons: 'Refroid. (t)', heatKw: 'Chauff. (kW)',
    'event.vbzTyp': 'Vbz typique', 'event.vbzEvt': 'Vbz événement', 'event.volume': 'Volume (m³)', 'event.T': 'T (min)', 'event.vbzMoy': 'Vbz moyen sur T' };
  function viewValidation() {
    var refv = S.EXCEL_REF, p = C.DEFAULT_PARAMS, rows = [], nOk = 0;
    var add = function (scName, sys, cells, key, exp, got) {
      var diff = got - exp, ok = Math.abs(diff) <= 1e-6 * Math.max(1, Math.abs(exp));
      if (ok) nOk++;
      rows.push('<tr><td>' + esc(scName) + '</td><td>' + esc(sys) + '</td><td class="muted">' + esc(cells) + '</td><td>' + esc(VAL_LABELS[key] || key) + '</td><td class="n">' + fmt(exp, 4) + '</td><td class="n">' + fmt(got, 4) + '</td><td class="n ' + (ok ? 'ok' : 'bad') + '">' + (ok ? '✓' : fmt(diff, 6)) + '</td></tr>');
    };
    var psy = C.psychro(p);
    Object.keys(refv.psychro).forEach(function (k) { add('Paramètres', '—', 'P19:P24', k, refv.psychro[k], psy[k]); });
    S.scenarios().forEach(function (s) {
      var res = C.scenario(s, p, T.get);
      res.systems.forEach(function (r) {
        var exp = refv[s.id][r.id];
        Object.keys(exp).forEach(function (k) {
          if (k === 'label') return;
          if (k === 'event') Object.keys(exp.event).forEach(function (e) { add(s.name, r.name, exp.label, 'event.' + e, exp.event[e], r.event[e]); });
          else add(s.name, r.name, exp.label, k, exp[k], r[k]);
        });
      });
    });
    return '<section class="panel"><div class="panel-head"><h2>Validation croisée — onglet « Calcul Ville »</h2><span class="' + (nOk === rows.length ? 'ok' : 'bad') + '">' + nOk + ' / ' + rows.length + ' valeurs identiques</span></div>' +
      '<p class="muted small">Les jeux d\'exemple d\'origine (sections 3, 4 et 7 du fichier) sont recalculés par le moteur de l\'application, avec les paramètres par défaut, et comparés aux valeurs calculées par Excel. ' +
      'Section 7.3 : le gymnase est modélisé en deux locaux (aire de jeu 746,0 m² + estrades 50 m²) dans un système à zone unique avec analyse d\'événement.</p>' +
      '<div class="scroll"><table class="grid"><thead><tr><th>Scénario</th><th>Système</th><th>Cellules Excel</th><th>Grandeur</th><th class="n">Excel</th><th class="n">Application</th><th class="n">Écart</th></tr></thead><tbody>' +
      rows.join('') + '</tbody></table></div></section>' +
      '<section class="panel"><h2>Écarts et observations sur le fichier Excel</h2><ul>' +
      '<li><strong>Ez par système</strong> : le fichier attribue Ez avec <code>SI(système = "UCT-01"; P7; P8)</code> — tout système autre qu\'UCT-01 reçoit l\'Ez d\'UCT-02. L\'application utilise l\'Ez propre à chaque système.</li>' +
      '<li><strong>Méthode « Tableau » avec Zp max &gt; 0,55</strong> : le fichier revient silencieusement à l\'Ev simplifiée (<code>ESTNUM</code>). L\'application fait de même mais affiche un avertissement « annexe A requise ».</li>' +
      '<li><strong>Ra = max(Ra assis, Ra actif)</strong> appliqué à toute la superficie : simplification conservatrice du fichier (ex. gymnase section 3 : Ra 0,9 sur 796 m², alors que la section 7.3 répartit aire de jeu / estrades).</li>' +
      '<li><strong>Catégorie « Salle polyvalente / assemblée » (2,5 / 0,3)</strong> : correspond à la ligne « Multipurpose assembly » du groupe Hôtels/motels/dortoirs. Le groupe Enseignement prévoit « Multiuse assembly » à 3,8 / 0,3 — choix à confirmer selon l\'usage.</li>' +
      '<li><strong>Zp max</strong> de UCT-01 = 0,90 (salle informatique 104, Vpz = 141 L/s) dans les sections 3 et 7 : bien au-delà de 0,55, la méthode « Tableau » n\'est pas applicable ; un calcul selon l\'annexe A pourrait donner un Ev inférieur à 0,75.</li>' +
      '<li><strong>Éditions</strong> : la procédure multizone et la numérotation des § suivent 62.1-2016 (comme le fichier). Dans les éditions 2019 et 2022, la procédure multizone détaillée est à l\'annexe A.</li>' +
      '</ul></section>';
  }

  var VIEWS = { dashboard: viewDashboard, locaux: viewLocaux, systemes: viewSystemes, params: viewParams, table: viewTable, compare: viewCompare, validation: viewValidation };

  // ---------- Sélecteur de catégorie ----------
  var pickerCb = null;
  function openPicker(current, cb) {
    pickerCb = cb;
    var m = $('#picker'), s = $('#pickerSearch');
    s.value = '';
    $('#pickerList').innerHTML = '<table class="grid">' + catHead() + '<tbody>' + catRows('', current, true) + '</tbody></table>';
    m.hidden = false; s.focus();
    var cur = m.querySelector('tr.current'); if (cur) cur.scrollIntoView({ block: 'center' });
    m.setAttribute('data-current', current || '');
  }
  function closePicker() { $('#picker').hidden = true; pickerCb = null; }

  // ---------- Export ----------
  function csvNum(v, d) { return v === null || v === undefined || !isFinite(v) ? '' : String(round(v, d === undefined ? 4 : d)).replace('.', ','); }
  function csvTxt(s) { s = String(s === undefined || s === null ? '' : s); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function exportCsv() {
    var scen = sc(), res = compute(scen), p = state.params, L = [];
    var row = function (a) { L.push(a.join(';')); };
    row(['Scénario', csvTxt(scen.name)]);
    row(['Table', csvTxt(T.EDITION)]);
    row(['Été Text / HR ext / Tint / HR int', csvNum(p.ete.text), csvNum(p.ete.hrExt), csvNum(p.ete.tint), csvNum(p.ete.hrInt)]);
    row(['Hiver Text / Tint', csvNum(p.hiver.text), csvNum(p.hiver.tint)]);
    row(['Δh été (kJ/kg)', csvNum(res.psy.dh), 'ΔT hiver (°C)', csvNum(res.psy.dT)]);
    L.push('');
    row(['LOCAUX']);
    row(['Local', 'Système', 'Superficie (pi²)', 'Az (m²)', 'Pz', 'Occupé pointe', 'Catégorie assis', '% assis', 'Catégorie actif', '% actif', 'Combinaison', 'Vpz (L/s)', 'Rp assis', 'Rp actif', 'Ra', 'Comp. occupants (L/s)', 'Comp. surface (L/s)', 'Vbz (L/s)', 'Ez', 'Voz (L/s)', 'Zpz']);
    var zmap = {}; res.systems.forEach(function (s) { s.zones.forEach(function (z) { zmap[z.id] = z; }); });
    scen.locals.forEach(function (l) {
      var z = zmap[l.id] || C.zone(l, T.get, 1, p), a = T.get(l.catA), b = T.get(l.catB);
      row([csvTxt(l.name), csvTxt(sysName(l.sysId)), csvNum(l.ft2, 2), csvNum(z.az), csvNum(l.pz), l.occ ? 1 : 0, csvTxt(a ? a.fr : ''), csvNum(l.pctA), csvTxt(b ? b.fr : ''), csvNum(l.pctB), l.combo,
        csvNum(l.vpz), csvNum(z.rpA), csvNum(z.rpB), csvNum(z.ra), csvNum(z.occ), csvNum(z.surf), csvNum(z.vbz), csvNum(z.ez), csvNum(z.voz), csvNum(z.zpz)]);
    });
    L.push('');
    row(['RÉSULTATS PAR SYSTÈME']);
    row(['Système', 'Type', 'Ez', 'Σ Pz', 'Ps', 'D', 'Σ comp. occupants (L/s)', 'Σ comp. surface (L/s)', 'Vou (L/s)', 'Ev simplifiée', 'Zp max', 'Local critique', 'Ev tableau', 'Ev retenue', 'Vot (L/s)', 'Vot (pi³/min)', 'Refroidissement (t)', 'Refroidissement (kW)', 'Chauffage (kW)', 'Avertissements']);
    res.systems.forEach(function (r) {
      row([csvTxt(r.name), TYPE_LABEL[r.type], csvNum(r.ez), csvNum(r.sumPz), csvNum(r.ps), csvNum(r.D), csvNum(r.sumOcc), csvNum(r.sumSurf), csvNum(r.vou), csvNum(r.evSimple), csvNum(r.zpMax),
        csvTxt(r.critId ? localName(r.critId) : ''), r.type === 'multizone' ? (r.evTab === null ? 'Annexe A' : csvNum(r.evTab)) : '', csvNum(r.ev), csvNum(r.vot, 1), csvNum(r.votCfm, 0),
        csvNum(r.coolTons, 2), csvNum(r.coolKw, 1), csvNum(r.heatKw, 1), csvTxt(r.warnings.join(' | '))]);
    });
    row(['TOTAL', '', '', '', '', '', '', '', '', '', '', '', '', '', csvNum(res.total.vot, 1), csvNum(res.total.votCfm, 0), csvNum(res.total.coolTons, 2), '', csvNum(res.total.heatKw, 1)]);
    exportBox('CSV — ' + scen.name, L.join('\r\n'), slug(scen.name) + '.csv', 'text/csv;charset=utf-8', '\uFEFF');
  }
  function slug(s) { return norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'scenario'; }
  function download(text, name, type) {
    var blob = new Blob([text], { type: type }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  // ---------- Dialogues intégrés (remplacent confirm / prompt) ----------
  var dlgCb = null, dlgExport = null;
  function dialog(o, cb) {
    dlgCb = cb || null; dlgExport = null;
    $('#dlgTitle').textContent = o.title || '';
    $('#dlgBody').innerHTML = (o.message ? '<p>' + esc(o.message) + '</p>' : '') +
      (o.input !== undefined ? '<input type="text" class="dlg-input" id="dlgInput" value="' + esc(o.input) + '">' : '');
    $('#dlgActions').innerHTML = (o.cancel === false ? '' : '<button type="button" data-action="dlg-cancel">Annuler</button>') +
      '<button type="button" class="' + (o.danger ? 'danger-solid' : 'primary') + '" data-action="dlg-ok">' + esc(o.ok || 'OK') + '</button>';
    $('#dialog').hidden = false;
    var inp = $('#dlgInput'); if (inp) { inp.focus(); inp.select(); } else $('[data-action="dlg-ok"]').focus();
  }
  function exportBox(title, text, name, type, prefix) {
    dlgCb = null; dlgExport = { text: (prefix || '') + text, name: name, type: type };
    $('#dlgTitle').textContent = title;
    $('#dlgBody').innerHTML = '<p class="muted small">Copiez le contenu et collez-le dans Excel ou un fichier texte' + (name.slice(-4) === '.csv' ? ' (séparateur « ; », virgule décimale)' : '') + (window.V621_NO_DOWNLOAD ? '.' : ', ou téléchargez le fichier.') + '</p>' +
      '<textarea class="dlg-text" id="dlgText" wrap="off" readonly>' + esc(text) + '</textarea>';
    $('#dlgActions').innerHTML = (window.V621_NO_DOWNLOAD ? '' : '<button type="button" data-action="dlg-download">Télécharger ' + esc(name) + '</button>') +
      '<button type="button" data-action="dlg-cancel">Fermer</button><button type="button" class="primary" data-action="dlg-copy">Copier</button>';
    $('#dialog').hidden = false;
  }
  function copyExport(btn) {
    var ta = $('#dlgText'), done = function () { btn.textContent = 'Copié'; setTimeout(function () { btn.textContent = 'Copier'; }, 1500); };
    var fallback = function () { ta.focus(); ta.select(); try { if (document.execCommand('copy')) done(); } catch (e) { /* sélection laissée à l'utilisateur */ } };
    try { navigator.clipboard.writeText(ta.value).then(done, fallback); } catch (e) { fallback(); }
  }
  function closeDialog(ok) {
    var cb = dlgCb, inp = $('#dlgInput'), val = inp ? inp.value.trim() : true;
    $('#dialog').hidden = true; dlgCb = null; dlgExport = null;
    if (ok && cb) cb(val);
  }

  // ---------- Événements ----------
  function setPath(obj, path, val) {
    var parts = path.split('.'), o = obj;
    for (var i = 0; i < parts.length - 1; i++) o = o[parts[i]];
    o[parts[parts.length - 1]] = val;
  }
  var PCT_FIELDS = { pctA: 1, pctB: 1, fct: 1, 'ete.hrExt': 1, 'ete.hrInt': 1 };
  function readVal(el, f) {
    if (el.type === 'checkbox') return el.checked;
    if (el.type === 'number') { var n = parseFloat(el.value); n = isFinite(n) ? n : 0; return PCT_FIELDS[f] ? n / 100 : n; }
    return el.value;
  }

  // Rendu différé : laisse le focus passer au champ suivant (Tab) avant de reconstruire la vue.
  function renderSoon() { setTimeout(render, 0); }

  document.addEventListener('change', function (ev) {
    var el = ev.target;
    if (el.id === 'scenarioSelect') { state.active = el.value; filterSys = ''; return render(); }
    if (el.id === 'filterSys') { filterSys = el.value; return render(); }
    if (el.id === 'compareRef') { state.compareRef = el.value; return render(); }
    if (el.id === 'importJson') return importJson(el);
    var f = el.getAttribute('data-f');
    if (el.hasAttribute('data-id') && f) {
      var l = sc().locals.filter(function (x) { return x.id === el.getAttribute('data-id'); })[0];
      if (l) { l[f] = readVal(el, f); renderSoon(); }
    } else if (el.hasAttribute('data-sid') && f) {
      var s = sc().systems.filter(function (x) { return x.id === el.getAttribute('data-sid'); })[0];
      if (s) { setPath(s, f, readVal(el, f)); if (f === 'ez' && !(s.ez > 0)) s.ez = 1; renderSoon(); }
    } else if (el.hasAttribute('data-p')) {
      var pth = el.getAttribute('data-p');
      setPath(state.params, pth, readVal(el, pth)); renderSoon();
    }
  });

  document.addEventListener('input', function (ev) {
    var el = ev.target;
    if (el.id === 'tableSearch') { tableQuery = el.value; $('#catTable tbody').innerHTML = catRows(tableQuery); }
    if (el.id === 'pickerSearch') {
      $('#pickerList tbody').innerHTML = catRows(el.value, $('#picker').getAttribute('data-current'), true);
    }
  });

  document.addEventListener('keydown', function (ev) {
    if (!$('#dialog').hidden) {
      if (ev.key === 'Escape') closeDialog(false);
      if (ev.key === 'Enter' && ev.target.id === 'dlgInput') closeDialog(true);
      return;
    }
    if ($('#picker').hidden) {
      if (ev.key === 'Enter' && ev.target.classList && ev.target.classList.contains('in') && ev.target.tagName === 'INPUT') ev.target.blur();
      return;
    }
    if (ev.key === 'Escape') closePicker();
    if (ev.key === 'Enter' && ev.target.id === 'pickerSearch') {
      var first = $('#pickerList tr.pick'); if (first && pickerCb) { pickerCb(first.getAttribute('data-cat')); closePicker(); render(); }
    }
  });

  document.addEventListener('click', function (ev) {
    var tab = ev.target.closest('[data-tab]');
    if (tab) { state.tab = tab.getAttribute('data-tab'); return render(); }
    var pick = ev.target.closest('#pickerList tr.pick');
    if (pick && pickerCb) { pickerCb(pick.getAttribute('data-cat')); closePicker(); return render(); }
    if (ev.target.id === 'picker') return closePicker();
    if (ev.target.id === 'dialog') return closeDialog(false);
    var b = ev.target.closest('[data-action]');
    if (!b) return;
    var a = b.getAttribute('data-action'), scen = sc(), id = b.getAttribute('data-id'), sid = b.getAttribute('data-sid');
    switch (a) {
      case 'picker-close': closePicker(); return;
      case 'pick-cat':
        var loc = scen.locals.filter(function (x) { return x.id === id; })[0], f = b.getAttribute('data-f');
        openPicker(loc[f], function (cat) { loc[f] = cat; });
        return;
      case 'pick-evcat':
        var sy = scen.systems.filter(function (x) { return x.id === sid; })[0];
        openPicker(sy.event.catId, function (cat) { sy.event.catId = cat; });
        return;
      case 'loc-add':
        var nl = newLocal(filterSys || (scen.systems[0] && scen.systems[0].id));
        scen.locals.push(nl); render();
        var inp = $('[data-k="' + nl.id + '.name"]'); if (inp) { inp.focus(); inp.select(); }
        return;
      case 'loc-dup':
        var src = scen.locals.filter(function (x) { return x.id === id; })[0], cp = clone(src);
        cp.id = uid('l'); cp.name = src.name + ' (copie)';
        scen.locals.splice(scen.locals.indexOf(src) + 1, 0, cp); break;
      case 'loc-del':
        var dl = scen.locals.filter(function (x) { return x.id === id; })[0];
        if (dl) dialog({ title: 'Supprimer le local', message: 'Supprimer « ' + dl.name + ' » ?', ok: 'Supprimer', danger: true },
          function () { scen.locals.splice(scen.locals.indexOf(dl), 1); render(); });
        return;
      case 'sys-add': scen.systems.push(newSystem(nextSysName(scen))); break;
      case 'sys-del':
        var ds = scen.systems.filter(function (x) { return x.id === sid; })[0];
        var n = scen.locals.filter(function (l) { return l.sysId === sid; }).length;
        if (ds) dialog({ title: 'Supprimer le système', message: 'Supprimer « ' + ds.name + ' » ?' + (n ? ' ' + n + ' local(aux) deviendront non assignés.' : ''), ok: 'Supprimer', danger: true }, function () {
          scen.systems.splice(scen.systems.indexOf(ds), 1);
          scen.locals.forEach(function (l) { if (l.sysId === sid) l.sysId = ''; });
          if (filterSys === sid) filterSys = '';
          render();
        });
        return;
      case 'sc-new':
        dialog({ title: 'Nouveau scénario', message: 'Nom du scénario :', input: 'Nouveau scénario', ok: 'Créer' }, function (nm) {
          if (!nm) return;
          var ns = { id: uid('sc'), name: nm, note: '', systems: [newSystem('UCT-01')], locals: [] };
          state.scenarios.push(ns); state.active = ns.id; filterSys = ''; render();
        });
        return;
      case 'sc-dup':
        var d = clone(scen); d.id = uid('sc'); d.name = scen.name + ' (variante)';
        state.scenarios.splice(state.scenarios.indexOf(scen) + 1, 0, d); state.active = d.id; break;
      case 'sc-rename':
        dialog({ title: 'Renommer le scénario', message: 'Nouveau nom :', input: scen.name, ok: 'Renommer' }, function (rn) { if (rn) { scen.name = rn; render(); } });
        return;
      case 'sc-del':
        if (state.scenarios.length < 2) { dialog({ title: 'Suppression impossible', message: 'Le projet doit contenir au moins un scénario.', cancel: false }); return; }
        dialog({ title: 'Supprimer le scénario', message: 'Supprimer « ' + scen.name + ' » et tous ses locaux ?', ok: 'Supprimer', danger: true }, function () {
          state.scenarios.splice(state.scenarios.indexOf(scen), 1); state.active = state.scenarios[0].id; filterSys = ''; render();
        });
        return;
      case 'params-reset': state.params = clone(C.DEFAULT_PARAMS); break;
      case 'load-sample':
        dialog({ title: 'Exemple Excel', message: 'Ajouter au projet les 3 scénarios de l\'onglet « Calcul Ville » ?', ok: 'Ajouter' }, function () {
          S.scenarios().forEach(function (s) { s.id = uid('sc'); state.scenarios.push(s); });
          state.active = state.scenarios[state.scenarios.length - 3].id; render();
        });
        return;
      case 'export-csv': exportCsv(); return;
      case 'export-json':
        exportBox('Projet (.json)', JSON.stringify(state, null, 2), 'projet-ventilation-62-1.json', 'application/json'); return;
      case 'dlg-ok': closeDialog(true); return;
      case 'dlg-cancel': closeDialog(false); return;
      case 'dlg-copy': copyExport(b); return;
      case 'dlg-download': download(dlgExport.text, dlgExport.name, dlgExport.type); return;
      default: return;
    }
    render();
  });

  function importJson(input) {
    var file = input.files && input.files[0]; if (!file) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var p = JSON.parse(r.result);
        if (!p.scenarios || !p.scenarios.length || !p.params) throw new Error('format');
        state = p; state.tab = state.tab || 'dashboard'; filterSys = ''; render();
      } catch (e) { dialog({ title: 'Fichier invalide', message: 'Ce fichier n\'est pas un projet enregistré par cette application (.json).', cancel: false }); }
      input.value = '';
    };
    r.readAsText(file);
  }

  render();
})();
