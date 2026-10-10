/*
 * Jeux de données d'exemple — onglet « Calcul Ville » de D-449.1_Aide_decision_UCT_CRCL_v2.xlsx.
 * EXCEL_REF : valeurs calculées par Excel (cellules citées) pour la validation croisée.
 */
(function (root) {
  'use strict';

  var POLY = 'hotel_multipurpose', AERO = 'sport_aerobics';

  // Locaux communs à UCT-01 : [nom, pi², Pz, occupé, catA, %A, catB, %B, combinaison, Vpz]
  function uct01(pctActif103, pctActif107) {
    return [
      ['Réception / 101', 113.04, 5, 1, 'off_reception', 1, 'off_reception', 0, 'Max', 106],
      ['Corridor / 100', 961.35, 0, 1, 'gen_corridor', 1, 'gen_corridor', 0, 'Max', 144],
      ['Salle polyvalente / 103A', 500.18, 30, 1, POLY, 1, AERO, pctActif103, 'Max', 323],
      ['Salle polyvalente / 103B', 500.18, 30, 1, POLY, 1, AERO, pctActif103, 'Max', 278],
      ['Salle informatique / 104', 485.18, 20, 1, 'edu_computer', 1, 'edu_computer', 0, 'Max', 141],
      ['Salle polyvalente / 107A', 746.27, 40, 1, POLY, 1, AERO, pctActif107, 'Max', 351],
      ['Salle polyvalente / 107B', 746.27, 40, 0, POLY, 1, AERO, pctActif107, 'Max', 351],
      ['Cuisine / 111', 887.32, 40, 1, 'food_kitchen', 1, 'food_kitchen', 0, 'Max', 390],
      ['Café / 111.1', 406.15, 20, 1, 'food_cafeteria', 1, 'food_cafeteria', 0, 'Max', 221]
    ];
  }

  function build(name, rows, systems, note) {
    var locals = rows.map(function (r, i) {
      return {
        id: 'l' + (i + 1), name: r[0], sysId: r[10] || 's1', ft2: r[1], pz: r[2], occ: !!r[3],
        catA: r[4], pctA: r[5], catB: r[6], pctB: r[7], combo: r[8], vpz: r[9]
      };
    });
    return { id: name.id, name: name.label, note: note, systems: systems, locals: locals };
  }

  function sys(id, name, type, extra) {
    var s = { id: id, name: name, type: type, ez: 1, evMethod: 'Simplifiée', fct: 1, event: { on: false, n: 0, catId: 'sport_spectator', height: 0, duration: 0 } };
    for (var k in extra) s[k] = extra[k];
    return s;
  }

  function scenarios() {
    // Section 3 — usage typique avec diversité
    var r3 = uct01(0.33, 0.33);
    r3.push(['Gymnase', 8568.11, 300, 1, 'sport_spectator', 5 / 6, 'sport_gym', 1 / 6, 'Somme', 2600, 's2']);
    var s3 = build({ id: 'sc3', label: 'Calcul Ville – avec diversité (section 3)' }, r3,
      [sys('s1', 'UCT-01', 'multizone'), sys('s2', 'UCT-02', 'monozone')],
      'Salles polyvalentes : pire cas entre 100 % assis et 33 % actifs ; 107B vide à la pointe. Gymnase : 250 assis + 50 actifs (« Somme »).');

    // Section 4 — BPA R00 reconstitué, sans diversité
    var r4 = uct01(1, 1);
    r4[6][3] = 1; // 107B occupée
    r4.push(['Gymnase', 8568.11, 300, 1, 'sport_spectator', 0, AERO, 1, 'Max', 2600, 's2']);
    var s4 = build({ id: 'sc4', label: 'BPA R00 reconstitué (section 4)' }, r4,
      [sys('s1', 'UCT-01', 'multizone'), sys('s2', 'UCT-02', 'monozone')],
      'Sans diversité : tous les locaux occupés, 100 % des usagers des polyvalentes et du gymnase actifs.');

    // Section 7 — optimisé « régisseurs » (20 participants par cours actif)
    var r7 = uct01(20 / 30, 20 / 40);
    // Gymnase scindé en aire de jeu (Gym) + estrades (Spectateurs) pour reproduire 7.3
    var azGym = 8568.11 * 0.092903, azEstrades = 50;
    r7.push(['Gymnase – aire de jeu', (azGym - azEstrades) / 0.092903, 60, 1, 'sport_gym', 1, 'sport_gym', 0, 'Max', 0, 's2']);
    r7.push(['Gymnase – estrades', azEstrades / 0.092903, 0, 1, 'sport_spectator', 1, 'sport_spectator', 0, 'Max', 0, 's2']);
    var s7 = build({ id: 'sc7', label: 'Optimisé régisseurs (section 7)' }, r7,
      [sys('s1', 'UCT-01', 'multizone'),
       sys('s2', 'UCT-02', 'monozone', { event: { on: true, n: 300, catId: 'sport_spectator', height: 7, duration: 120 } })],
      'Polyvalentes : 20 participants par cours actif. Gymnase : max(usage typique 60 actifs, événement 300 spectateurs moyenné sur T = 3·v/Vbz, §6.2.6.2).');

    return [s3, s4, s7];
  }

  var EXCEL_REF = {
    psychro: { wExt: 0.01399966448561221, wInt: 0.009277018930598006, hExt: 66.90317759516222, hInt: 47.75995047048751, dh: 19.14322712467471, dT: 49.9 },
    sc3: {
      s1: { label: 'B41:B51', sumPz: 225, ps: 185, D: 0.8222222222222222, sumOcc: 802.5, sumSurf: 209.88850146599998, vou: 869.7218347993332, evSimple: 0.75, zpMax: 0.9010269966241135, vot: 1159.6291130657776, coolTons: 7.574311114632905, heatKw: 69.85522283812104 },
      s2: { label: 'B52:B53', vot: 2166.4028109970004, coolTons: 14.150221571037582, heatKw: 130.50254552443536 }
    },
    sc4: {
      s1: { label: 'B71:B81', sumPz: 225, ps: 225, D: 1, sumOcc: 1740.5, vou: 1950.388501466, zpMax: 1.1988581667891738, vot: 2600.5180019546665, coolTons: 16.98571740229404, heatKw: 156.6533320647877 },
      s2: { label: 'B82:B83', vot: 3238.800936999, coolTons: 21.154768933266233, heatKw: 195.10303650814512 }
    },
    sc7: {
      s1: { label: 'B139:B149', sumPz: 225, ps: 185, D: 0.8222222222222222, sumOcc: 1140.5, vou: 1147.6329459104445, zpMax: 0.9010269966241135, vot: 1530.177261213926, heatKw: 92.17677648789882 },
      s2: { label: 'B153:B165', vot: 1711.206966673089, heatKw: 103.08187560337088,
            event: { vbzTyp: 1286.402810997, vbzEvt: 1826.402810997, volume: 5572.02186331, T: 152.54088062502308, vbzMoy: 1711.206966673089 } }
    }
  };

  var api = { scenarios: scenarios, EXCEL_REF: EXCEL_REF };
  root.VSample = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);
