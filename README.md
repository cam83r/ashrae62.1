# Ventilation ASHRAE 62.1 — prédimensionnement de l'air neuf

Application web autonome (HTML/CSS/JS, aucune compilation ni dépendance) qui reproduit et
étend l'onglet **« Calcul Ville »** du fichier `D-449.1_Aide_decision_UCT_CRCL_v2.xlsx` :
débit d'air neuf selon ASHRAE 62.1 (procédure du taux de ventilation) et charges
thermiques d'air neuf par système (UCT-01, UCT-02, …).

## Utilisation

Ouvrir `index.html` dans un navigateur (double-clic, aucun serveur requis).
Le projet est enregistré automatiquement dans le navigateur (`localStorage`) ;
utiliser **Enregistrer projet (.json)** / **Ouvrir projet** pour le conserver ou le partager.

| Onglet | Contenu |
|---|---|
| Tableau de bord | Vot (L/s et pi³/min), refroidissement (t, kW), chauffage (kW), D, Ev, local critique, détail du calcul par système |
| Locaux | Ajout / édition / duplication / suppression, assignation à un système, sélecteur de catégorie 62.1 avec recherche |
| Systèmes | Création dynamique (UCT-0N), type (multizone, zone unique, 100 % air neuf), Ez, méthode Ev, facteur de courte durée, analyse d'événement §6.2.6.2 |
| Paramètres | Conditions été / hiver, constantes, psychrométrie calculée (Magnus) |
| Table 62.1 | Tableau 6.2.2.1 complet (Rp, Ra, densité par défaut), recherche FR/EN |
| Comparaison | Vot et charges de tous les scénarios, écart vs un scénario de référence |
| Validation Excel | Recalcul des 3 scénarios du fichier et comparaison cellule par cellule |

**Exporter CSV** produit les locaux et les résultats par système du scénario actif
(séparateur `;`, virgule décimale, UTF-8 avec BOM : s'ouvre directement dans Excel en français).

## Calculs (fidèles au fichier Excel)

- Local : `Az = pi² × 0,092903` ; `Ra = max(Ra assis, Ra actif)` ;
  occupants = `Pz·%assis·Rp_assis` et `Pz·%actif·Rp_actif` combinés par « Max » ou « Somme » ;
  `Vbz = occupants + Ra·Az` ; `Voz = Vbz / Ez` ; `Zpz = Voz / Vpz`.
- Multizone : `D = Ps / ΣPz` ; `Vou = D·Σ(Rp·Pz) + Σ(Ra·Az)` ;
  Ev simplifiée (`0,88·D + 0,22` si D < 0,60, sinon 0,75) ou selon le tableau (Zp max) ;
  `Vot = Vou / Ev`.
- Zone unique : `Vot = Voz × facteur de courte durée`, ou analyse d'événement
  (`T = 3·v / Vbz_évén.`, `Vbz_conception = max(Vbz_typique, Vbz_moyen sur T)`), comme la section 7.3.
- 100 % air neuf : `Vot = ΣVoz`.
- Charges : refroidissement `ρ·Vot/1000·Δh / 3,517` (t) ; chauffage `ρ·1,006·Vot/1000·ΔT` (kW).

## Validation

```
node tests/validate.js
```

Recalcule les sections 3, 4 et 7 de l'onglet « Calcul Ville » et compare 67 valeurs
(psychrométrie, Rp/Ra des 10 catégories du fichier, ΣPz, Ps, D, Vou, Zp max, Vot, charges,
analyse d'événement du gymnase) aux valeurs calculées par Excel : **aucun écart**.

## Référence normative

- Table : ASHRAE 62.1-2019, tableau 6.2.2.1 (unités SI), 77 catégories non résidentielles.
- Procédure multizone et numérotation des § : 62.1-2016, comme le fichier Excel
  (dans les éditions 2019 et 2022, la procédure multizone détaillée est à l'annexe A).
- Les valeurs Rp/Ra doivent être confirmées avec l'exemplaire officiel de la norme et
  l'édition exigée par le CNB 2015 modifié Québec.

Outil de prédimensionnement : ne remplace pas le calcul signé du professionnel.

## Structure

```
index.html          Interface
css/styles.css      Styles (thème clair / sombre)
js/table621.js      Tableau 6.2.2.1
js/calc.js          Moteur de calcul (navigateur et Node)
js/sample.js        Scénarios d'exemple du fichier Excel + valeurs de référence
js/app.js           Interface utilisateur
tests/validate.js   Validation croisée contre l'Excel
```
