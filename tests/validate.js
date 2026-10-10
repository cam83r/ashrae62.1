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

console.log(checks + ' vérifications, ' + fails + ' échec(s).');
process.exit(fails ? 1 : 0);
