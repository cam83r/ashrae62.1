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
| Norme 62.1 | Équations de 62.1-2016, tableaux 6.2.2.1 (Rp, Ra, notes A–H, densité, débit combiné, classe d'air), 6.2.2.2 (Ez) et 6.2.5.2 (Ev) |
| Comparaison | Vot et charges de tous les scénarios, écart vs un scénario de référence |
| Validation Excel | Recalcul des 3 scénarios du fichier et comparaison cellule par cellule |

**Exporter CSV** produit les locaux et les résultats par système du scénario actif
(séparateur `;`, virgule décimale, UTF-8 avec BOM : s'ouvre directement dans Excel en français).

## Calculs (fidèles au fichier Excel)

- Local : `Az = pi² × 0,092903` ; `Ra = max(Ra assis, Ra actif)` ;
  occupants = `Pz·%assis·Rp_assis` et `Pz·%actif·Rp_actif` combinés par « Max » ou « Somme » ;
  `Vbz = occupants + Ra·Az` ; `Voz = Vbz / Ez` ; `Zpz = Voz / Vpz`.
- Multizone : `D = Ps / ΣPz` ; `Vou = D·Σ(Rp·Pz) + Σ(Ra·Az)` ; `Vot = Vou / Ev`, avec Ev au choix :
  - **Tableau** 6.2.5.2 par paliers (comme l'Excel) ou **interpolé** (note 2) ;
  - **Annexe A** : `Xs = Vou / Vps`, `Evz = 1 + Xs − Zpz` (alimentation simple) ou
    `Evz = (Fa + Xs·Fb − Zpz·Ep·Fc) / Fa` (recirculation secondaire, avec Vdz et Er par local), `Ev = min(Evz)` ;
  - **Simplifiée** (`0,88·D + 0,22` si D < 0,60, sinon 0,75) : méthode du fichier Excel, absente de 62.1-2016.
- Ez choisi directement ou depuis le tableau 6.2.2.2 ; Pz par défaut = densité × Az (§6.2.2.1.1) ;
  plancher DCV Σ(Ra·Az) (§6.2.7.1.2).
- Zone unique : `Vot = Voz × facteur de courte durée`, ou analyse d'événement
  (`T = 50·v / Vbz_évén.`, éq. 6.2.6.2-2, `Vbz_conception = max(Vbz_typique, Vbz_moyen sur T)`), comme la section 7.3.
- 100 % air neuf : `Vot = ΣVoz`.
- Charges : refroidissement `ρ·Vot/1000·Δh / 3,517` (t) ; chauffage `ρ·1,006·Vot/1000·ΔT` (kW).

## Validation

```
node tests/validate.js
```

Recalcule les sections 3, 4 et 7 de l'onglet « Calcul Ville » et compare les valeurs
(psychrométrie, Rp/Ra des 10 catégories du fichier, ΣPz, Ps, D, Vou, Zp max, Vot, charges,
analyse d'événement du gymnase) aux valeurs calculées par Excel, puis vérifie le tableau 6.2.5.2
(interpolation) et l'annexe A sur des cas calculés à la main : 81 vérifications, **aucun écart**.

## Référence normative

- ANSI/ASHRAE 62.1-2016 : tableau 6.2.2.1 (78 catégories, unités SI), tableaux 6.2.2.2 et 6.2.5.2,
  annexe A, vérifiés contre l'exemplaire de la norme.
- L'édition exigée par le CNB 2015 modifié Québec reste à confirmer.

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
