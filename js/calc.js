/*
 * Moteur de calcul — reproduit l'onglet « Calcul Ville » de
 * D-449.1_Aide_decision_UCT_CRCL_v2.xlsx (sections 2, 3, 4, 5 et 7.3).
 * Aucune dépendance au DOM : utilisable dans le navigateur et sous Node (tests).
 */
(function (root) {
  'use strict';

  var LS_TO_CFM = 2.118880003;   // 1 L/s = 2,11888 pi³/min
  var KW_PER_TON = 3.517;        // 1 tonne de réfrigération = 3,517 kW (valeur du fichier)
  var CP_AIR = 1.006;            // kJ/kg·K (valeur du fichier)

  var DEFAULT_PARAMS = {
    ft2m2: 0.092903,
    ete: { text: 30.9, hrExt: 0.5, tint: 24, hrInt: 0.5 },
    hiver: { text: -28.9, tint: 21 },
    rho: 1.2,
    patm: 101.325
  };

  function num(v, d) {
    var n = typeof v === 'number' ? v : parseFloat(v);
    return isFinite(n) ? n : (d === undefined ? 0 : d);
  }

  // Formule de Magnus (pression de vapeur saturante en kPa), comme P19/P20 du fichier.
  function pvs(t) { return 0.61094 * Math.exp(17.625 * t / (t + 243.04)); }
  function humRatio(t, hr, patm) { var pv = hr * pvs(t); return 0.622 * pv / (patm - pv); }
  function enthalpy(t, w) { return 1.006 * t + w * (2501 + 1.86 * t); }

  function psychro(p) {
    var wExt = humRatio(p.ete.text, p.ete.hrExt, p.patm);
    var wInt = humRatio(p.ete.tint, p.ete.hrInt, p.patm);
    var hExt = enthalpy(p.ete.text, wExt);
    var hInt = enthalpy(p.ete.tint, wInt);
    return { wExt: wExt, wInt: wInt, hExt: hExt, hInt: hInt, dh: hExt - hInt, dT: p.hiver.tint - p.hiver.text };
  }

  // Charges d'air neuf (section 5 du fichier) : tonnes et kW.
  function loads(vot, p, psy) {
    var m = p.rho * vot / 1000; // kg/s
    return {
      coolTons: m * psy.dh / KW_PER_TON,
      coolKw: m * psy.dh,
      heatKw: m * CP_AIR * psy.dT
    };
  }

  // Calcul d'un local (colonnes D à U du fichier).
  function zone(loc, lookup, ez, p) {
    var catA = lookup(loc.catA), catB = lookup(loc.catB);
    var rpA = catA ? catA.rp : 0, rpB = catB ? catB.rp : 0;
    var ra = Math.max(catA ? catA.ra : 0, catB ? catB.ra : 0);
    var az = num(loc.ft2) * p.ft2m2;
    var pz = num(loc.pz);
    var a = pz * num(loc.pctA) * rpA, b = pz * num(loc.pctB) * rpB;
    var occ = loc.combo === 'Somme' ? a + b : Math.max(a, b);
    var surf = ra * az;
    var vbz = occ + surf;
    var e = num(ez, 1) > 0 ? num(ez, 1) : 1;
    var voz = vbz / e;
    var vpz = num(loc.vpz);
    var zpz = vpz > 0 ? voz / vpz : 0;
    // Densité par défaut (§6.2.2.1.1, exception 2) : catégorie du mode assis/usuel
    var pzDefault = catA && catA.densite ? catA.densite * az / 100 : null;
    return {
      id: loc.id, az: az, pz: pz, occupied: !!loc.occ, rpA: rpA, rpB: rpB, ra: ra,
      occ: occ, surf: surf, vbz: vbz, ez: e, voz: voz, vpz: vpz, zpz: zpz, pzDefault: pzDefault,
      vdz: num(loc.vdz), er: num(loc.er), missingCat: !catA || !catB
    };
  }

  // Tableau 6.2.5.2, note 2 : interpolation linéaire entre 0,15 et 0,55
  function evTableInterp(zp) {
    if (zp <= 0.15) return 1.0;
    if (zp > 0.55) return null;
    return 1.15 - zp; // droite passant par (0,15 ; 1,0) et (0,55 ; 0,6)
  }

  // Annexe A — efficacité de ventilation d'une zone (Evz)
  //  alimentation simple : Evz = 1 + Xs − Zpz (A1.2.1)
  //  recirculation secondaire : Evz = (Fa + Xs·Fb − Zpz·Ep·Fc) / Fa (A1.2.2-1)
  function evZone(z, xs) {
    if (z.vdz > 0) {
      var ep = Math.min(1, z.vpz / z.vdz);          // A1.2.2-5
      var er = z.er;
      var fa = ep + (1 - ep) * er;                   // A1.2.2-2
      var fb = ep;                                   // A1.2.2-3
      var fc = 1 - (1 - z.ez) * (1 - er) * (1 - ep); // A1.2.2-4
      return { evz: fa > 0 ? (fa + xs * fb - z.zpz * ep * fc) / fa : null, ep: ep, fa: fa, fb: fb, fc: fc, recirc: true };
    }
    return { evz: 1 + xs - z.zpz, ep: 1, recirc: false };
  }

  function evTable(zp) {
    if (zp <= 0.15) return 1.0;
    if (zp <= 0.25) return 0.9;
    if (zp <= 0.35) return 0.8;
    if (zp <= 0.45) return 0.7;
    if (zp <= 0.55) return 0.6;
    return null; // > 0,55 : annexe A requise
  }

  // Calcul d'un système. type : 'multizone' | 'monozone' | 'oa100'
  function system(sys, locals, lookup, p, psy) {
    var mine = locals.filter(function (l) { return l.sysId === sys.id; });
    var zones = mine.map(function (l) { return zone(l, lookup, sys.ez, p); });
    var sum = function (k) { return zones.reduce(function (s, z) { return s + z[k]; }, 0); };
    var r = {
      id: sys.id, name: sys.name, type: sys.type, ez: num(sys.ez, 1), zones: zones,
      nZones: zones.length, sumPz: sum('pz'), sumOcc: sum('occ'), sumSurf: sum('surf'),
      sumVbz: sum('vbz'), sumVoz: sum('voz'), warnings: []
    };
    r.ps = zones.reduce(function (s, z) { return s + (z.occupied ? z.pz : 0); }, 0);

    if (sys.type === 'monozone') {
      var fct = num(sys.fct, 1);
      r.fct = fct;
      if (sys.event && sys.event.on) {
        var ev = sys.event, cat = lookup(ev.catId);
        var rpE = cat ? cat.rp : 0;
        var vbzTyp = r.sumVbz;
        var vbzEvt = num(ev.n) * rpE + r.sumSurf;
        var vol = zones.reduce(function (s, z) { return s + z.az; }, 0) * num(ev.height);
        var T = vbzEvt > 0 ? 50 * vol / vbzEvt : 0;                      // éq. 6.2.6.2-2 (SI), minutes
        var dur = num(ev.duration);
        var vbzMoy = dur >= T ? vbzEvt : (vbzEvt * dur + vbzTyp * (T - dur)) / T;
        var vbzConc = Math.max(vbzTyp, vbzMoy);
        r.event = { rp: rpE, vbzTyp: vbzTyp, vbzEvt: vbzEvt, volume: vol, T: T, duration: dur, vbzMoy: vbzMoy, vbzConc: vbzConc };
        r.voz = vbzConc / (r.ez > 0 ? r.ez : 1);
        r.vot = r.voz;
        if (!cat) r.warnings.push("Catégorie d'événement non définie.");
      } else {
        r.voz = r.sumVoz;
        r.vot = r.voz * fct;
        if (fct < 1) r.warnings.push('Facteur de courte durée < 100 % : justifier T = 3·v/Vbz (§6.2.6.2).');
      }
      if (zones.length > 1 && !(sys.event && sys.event.on)) {
        r.warnings.push('Système à zone unique avec plusieurs locaux : Voz = Σ Voz des locaux.');
      }
    } else if (sys.type === 'oa100') {
      r.vot = r.sumVoz;
    } else {
      // Multizone (sections 3, 4, 7.2)
      r.D = r.sumPz > 0 ? r.ps / r.sumPz : 1;
      r.vou = r.D * r.sumOcc + r.sumSurf;
      r.evSimple = r.D < 0.6 ? 0.88 * r.D + 0.22 : 0.75;
      var crit = null;
      zones.forEach(function (z) { if (!crit || z.zpz > crit.zpz) crit = z; });
      r.zpMax = crit ? crit.zpz : 0;
      r.critId = crit ? crit.id : null;
      r.evTab = evTable(r.zpMax);
      r.evTabInterp = evTableInterp(r.zpMax);

      // Annexe A : Xs = Vou / Vps (A1.1) ; Ev = min(Evz) (A1.3)
      r.vpsSum = zones.reduce(function (s, z) { return s + z.vpz; }, 0);
      r.vpsAuto = !(num(sys.vps) > 0);
      r.vps = r.vpsAuto ? r.vpsSum : num(sys.vps);
      r.xs = r.vps > 0 ? r.vou / r.vps : null;
      r.evA = null; r.evACritId = null;
      if (r.xs !== null) {
        zones.forEach(function (z) {
          if (!(z.vpz > 0)) return;
          var e = evZone(z, r.xs);
          z.evz = e.evz; z.ep = e.ep; z.recirc = e.recirc;
          if (e.evz !== null && (r.evA === null || e.evz < r.evA)) { r.evA = e.evz; r.evACritId = z.id; }
        });
      }

      var m = sys.evMethod;
      r.evMethod = ['Tableau', 'Tableau interpolé', 'Annexe A'].indexOf(m) >= 0 ? m : 'Simplifiée';
      var chosen = null;
      if (r.evMethod === 'Tableau') chosen = r.evTab;
      else if (r.evMethod === 'Tableau interpolé') chosen = r.evTabInterp;
      else if (r.evMethod === 'Annexe A') chosen = r.evA !== null && r.evA > 0 ? r.evA : null;
      if (r.evMethod === 'Simplifiée') {
        r.ev = r.evSimple; r.evSource = 'Simplifiée';
      } else if (chosen !== null) {
        r.ev = chosen; r.evSource = r.evMethod;
      } else {
        r.ev = r.evSimple; r.evSource = 'Simplifiée (repli)';
        if (r.evMethod === 'Annexe A') {
          r.warnings.push(r.evA !== null ? 'Annexe A : Ev = ' + r.evA.toFixed(2) + ' ≤ 0 — augmenter Vpz du local critique ou Vps. Ev simplifiée retenue.' : 'Annexe A : aucun Vpz saisi. Ev simplifiée retenue.');
        } else {
          r.warnings.push('Zp max > 0,55 : tableau 6.2.5.2 non applicable (annexe A requise) — Ev simplifiée retenue, comme dans le fichier Excel.');
        }
      }
      r.vot = r.ev > 0 ? r.vou / r.ev : 0;
      if (r.zpMax > 0.55 && r.evMethod !== 'Annexe A') r.warnings.push('Zp max = ' + r.zpMax.toFixed(2) + ' > 0,55 : le tableau 6.2.5.2 renvoie à l\'annexe A (Ev annexe A = ' + (r.evA === null ? '—' : r.evA.toFixed(2)) + ').');
      if (zones.some(function (z) { return z.vpz <= 0; })) r.warnings.push('Un ou plusieurs locaux sans Vpz : Zpz = 0 (exclus du local critique).');
    }

    if (zones.some(function (z) { return z.missingCat; })) r.warnings.push('Catégorie 62.1 manquante pour au moins un local.');
    if (!zones.length) r.warnings.push('Aucun local assigné.');

    // Plancher DCV (§6.2.7.1.2) : la zone de respiration ne descend pas sous Ra·Az
    r.dcvMin = r.sumSurf;
    r.votCfm = r.vot * LS_TO_CFM;
    var ld = loads(r.vot, p, psy);
    r.coolTons = ld.coolTons; r.coolKw = ld.coolKw; r.heatKw = ld.heatKw;
    return r;
  }

  function scenario(sc, p, lookup) {
    var psy = psychro(p);
    var systems = sc.systems.map(function (s) { return system(s, sc.locals, lookup, p, psy); });
    var tot = { vot: 0, votCfm: 0, coolTons: 0, heatKw: 0 };
    systems.forEach(function (s) { tot.vot += s.vot; tot.votCfm += s.votCfm; tot.coolTons += s.coolTons; tot.heatKw += s.heatKw; });
    var orphan = sc.locals.filter(function (l) { return !sc.systems.some(function (s) { return s.id === l.sysId; }); });
    return { psy: psy, systems: systems, total: tot, orphans: orphan.length };
  }

  var api = {
    DEFAULT_PARAMS: DEFAULT_PARAMS, LS_TO_CFM: LS_TO_CFM, KW_PER_TON: KW_PER_TON, CP_AIR: CP_AIR,
    psychro: psychro, loads: loads, zone: zone, evTable: evTable, evTableInterp: evTableInterp, evZone: evZone, system: system, scenario: scenario
  };
  root.VCalc = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);
