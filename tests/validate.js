// Validation croisée du moteur de calcul contre les valeurs de l'onglet « Calcul Ville ».
// Usage : node tests/validate.js
'use strict';
var path = require('path');
var T621 = require(path.join(__dirname, '..', 'js', 'table621.js'));
var VCalc = require(path.join(__dirname, '..', 'js', 'calc.js'));
var VSample = require(path.join(__dirname, '..', 'js', 'sample.js'));

var TOL = 1e-9, fails = 0, checks = 0;
function cmp(label, got, exp) {
  checks++;
  var ok = Math.abs(got - exp) <= TOL * Math.max(1, Math.abs(exp));
  if (!ok) { fails++; console.log('ÉCHEC  ' + label + ' : obtenu ' + got + ', attendu ' + exp); }
}

var p = VCalc.DEFAULT_PARAMS, ref = VSample.EXCEL_REF;
var psy = VCalc.psychro(p);
Object.keys(ref.psychro).forEach(function (k) { cmp('psychro.' + k, psy[k], ref.psychro[k]); });

// Valeurs Rp/Ra des 10 catégories du fichier (tableau 1, A6:C15)
[['hotel_multipurpose', 2.5, 0.3], ['sport_spectator', 3.8, 0.3], ['sport_aerobics', 10, 0.3], ['sport_gym', 10, 0.9],
 ['off_reception', 2.5, 0.3], ['off_office', 2.5, 0.3], ['edu_computer', 5, 0.6], ['food_cafeteria', 3.8, 0.9],
 ['food_kitchen', 3.8, 0.6], ['gen_corridor', 0, 0.3]].forEach(function (r) {
  var c = T621.get(r[0]); cmp(r[0] + '.rp', c.rp, r[1]); cmp(r[0] + '.ra', c.ra, r[2]);
});

VSample.scenarios().forEach(function (sc) {
  var res = VCalc.scenario(sc, p, T621.get);
  res.systems.forEach(function (s) {
    var exp = ref[sc.id][s.id];
    Object.keys(exp).forEach(function (k) {
      if (k === 'label') return;
      if (k === 'event') {
        Object.keys(exp.event).forEach(function (e) { cmp(sc.id + '.' + s.name + '.event.' + e, s.event[e], exp.event[e]); });
      } else cmp(sc.id + '.' + s.name + '.' + k, s[k], exp[k]);
    });
  });
});

// Tableau 6.2.5.2 de 62.1-2016 (paliers et interpolation) et annexe A de 62.1-2022
cmp('evTable(0.30)', VCalc.evTable(0.30), 0.8);
cmp('evTableInterp(0.30)', VCalc.evTableInterp(0.30), 0.85);
cmp('evTableInterp(0.15)', VCalc.evTableInterp(0.15), 1.0);
cmp('evTableInterp(0.55)', VCalc.evTableInterp(0.55), 0.6);
cmp('evZone simple', VCalc.evZone({ vdz: 0, vpz: 100, zpz: 0.5, ez: 1 }, 0.3).evz, 0.8);
// Recirculation secondaire : Ep = 0,5 ; Fa = 0,875 ; Fb = 0,5 ; Fc = 1 ; Evz = (0,875 + 0,15 − 0,25) / 0,875
cmp('evZone recirc', VCalc.evZone({ vdz: 200, vpz: 100, zpz: 0.5, ez: 1, er: 0.75 }, 0.3).evz, 0.775 / 0.875);
// Ez = 0,8, Er = 0 : Fc = 1 − 0,2·1·0,5 = 0,9 ; Fa = 0,5 ; Evz = (0,5 + 0,15 − 0,5·0,5·0,9) / 0,5
cmp('evZone recirc Ez 0.8', VCalc.evZone({ vdz: 200, vpz: 100, zpz: 0.5, ez: 0.8, er: 0 }, 0.3).evz, (0.5 + 0.15 - 0.225) / 0.5);
(function () {
  var sc = VSample.scenarios()[0]; sc.systems[0].evMethod = 'Annexe A';
  var r = VCalc.scenario(sc, p, T621.get).systems[0];
  var vou = ref.sc3.s1.vou, xs = vou / 2305, ev = 1 + xs - 0.9010269966241135;
  cmp('annexe A sc3 Vps', r.vps, 2305); cmp('annexe A sc3 Xs', r.xs, xs); cmp('annexe A sc3 Ev', r.ev, ev); cmp('annexe A sc3 Vot', r.vot, vou / ev);
})();
// Table 6-1 (2022) : quelques valeurs vérifiées
cmp('nombre de catégories', T621.CATEGORIES.length, 90);
cmp('daycare sickroom densité', T621.get('edu_daycare_sick').densite, 25);
cmp('animal exam Ra', T621.get('anim_exam').ra, 0.6);
cmp('animal imaging Ra', T621.get('anim_imaging').ra, 0.9);
cmp('libraries (enseignement) Rp', T621.get('edu_library').rp, 2.5);
cmp('fabrication dangereuse classe', T621.get('misc_manufacturing_haz').classe, 3);
cmp('office combiné', T621.get('off_office').combine, 8.5);
cmp('spectateurs OS', T621.get('sport_spectator').os ? 1 : 0, 1);
cmp('gym OS', T621.get('sport_gym').os ? 1 : 0, 0);
// Table 6-4 (2022)
cmp('Ez plafond chaud < 8 °C, jet lent', T621.EZ[3].ez, 0.8);
cmp('Ez stratifié retour > 5,5 m', T621.EZ[11].ez, 1.5);
// Éq. 6-9 : Vpz-min = 1,5·Voz ; salle 104 (Voz 127,04, Vpz 141) non conforme en procédure simplifiée
(function () {
  var r = VCalc.scenario(VSample.scenarios()[0], p, T621.get).systems[0];
  cmp('Vpz-min 104', r.zones[4].vpzMin, 1.5 * 127.044806524);
  cmp('locaux Vpz < Vpz-min', r.vpzMinShort.length, 1);
})();

console.log(checks + ' vérifications, ' + fails + ' échec(s).');
process.exit(fails ? 1 : 0);
