/*
 * ANSI/ASHRAE 62.1-2016 — Tableau 6.2.2.1 « Minimum Ventilation Rates in Breathing Zone » (unités SI),
 * vérifié contre l'exemplaire de la norme. Tableaux 6.2.2.2 (Ez) et 6.2.5.2 (Ev) inclus.
 * Colonnes : Rp (L/s·pers.), Ra (L/s·m²), densité par défaut (pers./100 m², null = « — »),
 * notes particulières (A à H), classe d'air.
 * Les libellés français des 10 catégories utilisées dans l'onglet « Calcul Ville »
 * reprennent exactement ceux du fichier Excel (validation croisée, export CSV).
 */
(function (root) {
  'use strict';

  var EDITION = 'ANSI/ASHRAE 62.1-2016 — Tableau 6.2.2.1 (SI)';

  // [id, groupe, libellé FR, libellé EN, Rp, Ra, densité, notes, classe d'air]
  var ROWS = [
    // Établissements correctionnels
    ['corr_cell', 'Établissements correctionnels', 'Cellule', 'Cell', 2.5, 0.6, 25, '', 2],
    ['corr_dayroom', 'Établissements correctionnels', 'Salle commune', 'Dayroom', 2.5, 0.3, 30, '', 1],
    ['corr_guard', 'Établissements correctionnels', 'Poste de garde', 'Guard stations', 2.5, 0.3, 15, '', 1],
    ['corr_booking', 'Établissements correctionnels', 'Admission / attente', 'Booking/waiting', 3.8, 0.3, 50, '', 2],

    // Établissements d'enseignement
    ['edu_daycare', "Établissements d'enseignement", "Garderie (jusqu'à 4 ans)", 'Daycare (through age 4)', 5, 0.9, 25, '', 2],
    ['edu_daycare_sick', "Établissements d'enseignement", 'Garderie – infirmerie', 'Daycare sickroom', 5, 0.9, 25, '', 3],
    ['edu_class_5_8', "Établissements d'enseignement", 'Salle de classe (5 à 8 ans)', 'Classrooms (ages 5–8)', 5, 0.6, 25, '', 1],
    ['edu_class_9', "Établissements d'enseignement", 'Salle de classe (9 ans et plus)', 'Classrooms (age 9 plus)', 5, 0.6, 35, '', 1],
    ['edu_lecture_class', "Établissements d'enseignement", 'Classe magistrale', 'Lecture classroom', 3.8, 0.3, 65, 'H', 1],
    ['edu_lecture_hall', "Établissements d'enseignement", 'Amphithéâtre (sièges fixes)', 'Lecture hall (fixed seats)', 3.8, 0.3, 150, 'H', 1],
    ['edu_art', "Établissements d'enseignement", "Classe d'arts plastiques", 'Art classroom', 5, 0.9, 20, '', 2],
    ['edu_science', "Établissements d'enseignement", 'Laboratoire de sciences', 'Science laboratories', 5, 0.9, 25, '', 2],
    ['edu_univ_lab', "Établissements d'enseignement", 'Laboratoire universitaire / collégial', 'University/college laboratories', 5, 0.9, 25, '', 2],
    ['edu_shop', "Établissements d'enseignement", 'Atelier bois / métal', 'Wood/metal shop', 5, 0.9, 20, '', 2],
    ['edu_computer', "Établissements d'enseignement", 'Laboratoire informatique (Computer lab)', 'Computer lab', 5, 0.6, 25, '', 1],
    ['edu_media', "Établissements d'enseignement", 'Médiathèque', 'Media center', 5, 0.6, 25, 'A', 1],
    ['edu_music', "Établissements d'enseignement", 'Musique / théâtre / danse', 'Music/theater/dance', 5, 0.3, 35, 'H', 1],
    ['edu_multiuse', "Établissements d'enseignement", 'Salle polyvalente (enseignement)', 'Multiuse assembly', 3.8, 0.3, 100, 'H', 1],

    // Services alimentaires
    ['food_restaurant', 'Services alimentaires', 'Salle à manger de restaurant', 'Restaurant dining rooms', 3.8, 0.9, 70, '', 2],
    ['food_cafeteria', 'Services alimentaires', 'Cafétéria (Cafeteria/fast-food dining)', 'Cafeteria/fast-food dining', 3.8, 0.9, 100, '', 2],
    ['food_bar', 'Services alimentaires', 'Bar, bar-salon', 'Bars, cocktail lounges', 3.8, 0.9, 100, '', 2],
    ['food_kitchen', 'Services alimentaires', 'Cuisine avec cuisson (Kitchen – cooking)', 'Kitchen (cooking)', 3.8, 0.6, 20, '', 2],

    // Général
    ['gen_break', 'Général', 'Salle de pause', 'Break rooms', 2.5, 0.3, 25, 'H', 1],
    ['gen_coffee', 'Général', 'Coin café', 'Coffee stations', 2.5, 0.3, 20, 'H', 1],
    ['gen_conference', 'Général', 'Salle de conférence / réunion', 'Conference/meeting', 2.5, 0.3, 50, 'H', 1],
    ['gen_corridor', 'Général', 'Corridors', 'Corridors', 0, 0.3, null, 'H', 1],
    ['gen_storage_liquid', 'Général', 'Entreposage occupable – liquides ou gels', 'Occupiable storage rooms for liquids or gels', 2.5, 0.6, 2, 'B', 2],

    // Hôtels, motels, centres de villégiature, dortoirs
    ['hotel_bedroom', 'Hôtels, motels, dortoirs', 'Chambre / séjour', 'Bedroom/living room', 2.5, 0.3, 10, 'H', 1],
    ['hotel_barracks', 'Hôtels, motels, dortoirs', 'Dortoir de caserne', 'Barracks sleeping areas', 2.5, 0.3, 20, 'H', 1],
    ['hotel_laundry_central', 'Hôtels, motels, dortoirs', 'Buanderie centrale', 'Laundry rooms, central', 2.5, 0.6, 10, '', 2],
    ['hotel_laundry_unit', 'Hôtels, motels, dortoirs', 'Buanderie dans un logement', 'Laundry rooms within dwelling units', 2.5, 0.6, 10, '', 1],
    ['hotel_lobby', 'Hôtels, motels, dortoirs', 'Hall / avant-salle', 'Lobbies/prefunction', 3.8, 0.3, 30, 'H', 1],
    ['hotel_multipurpose', 'Hôtels, motels, dortoirs', 'Salle polyvalente / assemblée (Multipurpose assembly)', 'Multipurpose assembly', 2.5, 0.3, 120, 'H', 1],

    // Immeubles de bureaux
    ['off_break', 'Immeubles de bureaux', 'Salle de pause (bureaux)', 'Breakrooms', 2.5, 0.6, 50, '', 1],
    ['off_main_lobby', 'Immeubles de bureaux', "Hall d'entrée principal", 'Main entry lobbies', 2.5, 0.3, 10, 'H', 1],
    ['off_storage_dry', 'Immeubles de bureaux', 'Entreposage occupable – matières sèches', 'Occupiable storage rooms for dry materials', 2.5, 0.3, 2, '', 1],
    ['off_office', 'Immeubles de bureaux', 'Bureau (Office space)', 'Office space', 2.5, 0.3, 5, 'H', 1],
    ['off_reception', 'Immeubles de bureaux', 'Réception (Reception areas)', 'Reception areas', 2.5, 0.3, 30, 'H', 1],
    ['off_telephone', 'Immeubles de bureaux', 'Téléphonie / saisie de données', 'Telephone/data entry', 2.5, 0.3, 60, 'H', 1],

    // Espaces divers
    ['misc_vault', 'Espaces divers', 'Chambre forte / coffrets de sûreté', 'Bank vaults/safe deposit', 2.5, 0.3, 5, 'H', 2],
    ['misc_bank', 'Espaces divers', 'Banque / hall de banque', 'Banks or bank lobbies', 3.8, 0.3, 15, 'H', 1],
    ['misc_computer', 'Espaces divers', 'Salle informatique (sans impression)', 'Computer (not printing)', 2.5, 0.3, 4, 'H', 1],
    ['misc_freezer', 'Espaces divers', 'Chambre froide / congélateur (< 10 °C)', 'Freezer and refrigerated spaces (<50°F)', 5, 0, 0, 'E', 2],
    ['misc_manufacturing', 'Espaces divers', 'Fabrication générale (sauf industrie lourde / procédés chimiques)', 'General manufacturing', 5, 0.9, 7, '', 3],
    ['misc_pharmacy', 'Espaces divers', 'Pharmacie (aire de préparation)', 'Pharmacy (prep. area)', 2.5, 0.9, 10, '', 2],
    ['misc_photo', 'Espaces divers', 'Studio de photographie', 'Photo studios', 2.5, 0.6, 10, '', 1],
    ['misc_shipping', 'Espaces divers', 'Expédition / réception', 'Shipping/receiving', 5, 0.6, 2, 'B', 2],
    ['misc_sorting', 'Espaces divers', 'Tri, emballage, assemblage léger', 'Sorting, packing, light assembly', 3.8, 0.6, 7, '', 2],
    ['misc_tel_closet', 'Espaces divers', 'Local téléphonique', 'Telephone closets', 0, 0, null, '', 1],
    ['misc_transport', 'Espaces divers', 'Salle d\'attente (transport)', 'Transportation waiting', 3.8, 0.3, 100, 'H', 1],
    ['misc_warehouse', 'Espaces divers', 'Entrepôt', 'Warehouses', 5, 0.3, null, 'B', 2],

    // Lieux de rassemblement public
    ['pub_auditorium', 'Lieux de rassemblement public', 'Auditorium (aire des sièges)', 'Auditorium seating area', 2.5, 0.3, 150, 'H', 1],
    ['pub_worship', 'Lieux de rassemblement public', 'Lieu de culte', 'Places of religious worship', 2.5, 0.3, 120, 'H', 1],
    ['pub_courtroom', 'Lieux de rassemblement public', "Salle d'audience", 'Courtrooms', 2.5, 0.3, 70, 'H', 1],
    ['pub_legislative', 'Lieux de rassemblement public', 'Chambre législative', 'Legislative chambers', 2.5, 0.3, 50, 'H', 1],
    ['pub_library', 'Lieux de rassemblement public', 'Bibliothèque', 'Libraries', 2.5, 0.6, 10, '', 1],
    ['pub_lobby', 'Lieux de rassemblement public', 'Hall', 'Lobbies', 2.5, 0.3, 150, 'H', 1],
    ['pub_museum_child', 'Lieux de rassemblement public', 'Musée pour enfants', "Museums (children's)", 3.8, 0.6, 40, '', 1],
    ['pub_museum', 'Lieux de rassemblement public', 'Musée / galerie', 'Museums/galleries', 3.8, 0.3, 40, 'H', 1],

    // Résidentiel
    ['res_dwelling', 'Résidentiel', 'Logement (unité d\'habitation)', 'Dwelling unit', 2.5, 0.3, null, 'F,G,H', 1],
    ['res_corridor', 'Résidentiel', 'Corridors communs', 'Common corridors', 0, 0.3, null, 'H', 1],

    // Commerce de détail
    ['ret_sales', 'Commerce de détail', 'Aire de vente (sauf ci-dessous)', 'Sales (except as below)', 3.8, 0.6, 15, '', 2],
    ['ret_mall', 'Commerce de détail', 'Aires communes de centre commercial', 'Mall common areas', 3.8, 0.3, 40, 'H', 1],
    ['ret_barber', 'Commerce de détail', 'Salon de barbier', 'Barbershop', 3.8, 0.3, 25, 'H', 2],
    ['ret_beauty', 'Commerce de détail', 'Salon de beauté / manucure', 'Beauty and nail salons', 10, 0.6, 25, '', 2],
    ['ret_pet', 'Commerce de détail', 'Animalerie (aires des animaux)', 'Pet shops (animal areas)', 3.8, 0.9, 10, '', 2],
    ['ret_supermarket', 'Commerce de détail', 'Supermarché', 'Supermarket', 3.8, 0.3, 8, 'H', 1],
    ['ret_laundromat', 'Commerce de détail', 'Buanderie libre-service', 'Coin-operated laundries', 3.8, 0.3, 20, '', 2],

    // Sports et divertissement
    ['sport_gym', 'Sports et divertissement', 'Gym (Gym play area)', 'Gym, sports arena (play area)', 10, 0.9, 7, 'E', 2],
    ['sport_spectator', 'Sports et divertissement', 'Spectateurs (Spectator areas)', 'Spectator areas', 3.8, 0.3, 150, 'H', 1],
    ['sport_pool', 'Sports et divertissement', 'Piscine (bassin et plage)', 'Swimming (pool & deck)', 0, 2.4, null, 'C', 2],
    ['sport_disco', 'Sports et divertissement', 'Discothèque / piste de danse', 'Disco/dance floors', 10, 0.3, 100, 'H', 2],
    ['sport_aerobics', 'Sports et divertissement', 'Conditionnement physique / aérobie (Health club/aerobics)', 'Health club/aerobics room', 10, 0.3, 40, '', 2],
    ['sport_weights', 'Sports et divertissement', 'Conditionnement physique – musculation', 'Health club/weight rooms', 10, 0.3, 10, '', 2],
    ['sport_bowling', 'Sports et divertissement', 'Salle de quilles (aire des sièges)', 'Bowling alley (seating)', 5, 0.6, 40, '', 1],
    ['sport_casino', 'Sports et divertissement', 'Casino', 'Gambling casinos', 3.8, 0.9, 120, '', 1],
    ['sport_arcade', 'Sports et divertissement', "Salle de jeux d'arcade", 'Game arcades', 3.8, 0.9, 20, '', 1],
    ['sport_stage', 'Sports et divertissement', 'Scène, studio', 'Stages, studios', 5, 0.3, 70, 'D,H', 1]
  ];

  var CATEGORIES = ROWS.map(function (r) {
    var c = { id: r[0], groupe: r[1], fr: r[2], en: r[3], rp: r[4], ra: r[5], densite: r[6], notes: r[7], classe: r[8] };
    // Débit combiné par défaut (note 5) : Rp + Ra·100 / densité (L/s·pers.)
    c.combine = r[6] ? r[4] + r[5] * 100 / r[6] : null;
    return c;
  });
  var BY_ID = {};
  CATEGORIES.forEach(function (c) { BY_ID[c.id] = c; });

  // Notes générales et particulières du tableau 6.2.2.1 (résumé en français)
  var NOTES_GENERALES = [
    'Les débits supposent le respect de toutes les autres exigences de la norme.',
    'Tableau applicable aux zones sans fumée de tabac (FTE) ; voir §5.17.',
    'Débits basés sur de l\'air sec à 1,2 kg/m³ (101,3 kPa, 21 °C) ; ajustables selon la masse volumique réelle.',
    'Densité par défaut : à utiliser lorsque la densité réelle est inconnue.',
    'Débit combiné par défaut (par personne) : basé sur la densité par défaut.',
    'Usage non listé : utiliser la catégorie la plus semblable (densité, activités, construction).'
  ];
  var NOTES = {
    A: 'Bibliothèques d\'écoles secondaires et de collèges : utiliser les valeurs « Lieux de rassemblement public – Bibliothèques ».',
    B: 'Débit possiblement insuffisant si des matières dégageant des émissions nocives sont entreposées.',
    C: 'Ne tient pas compte du contrôle de l\'humidité. « Plage » = surface pouvant être mouillée pendant l\'usage ou l\'occupation de la piscine.',
    D: 'N\'inclut pas l\'évacuation spéciale des effets de scène (glace sèche, fumée).',
    E: 'Si des appareils à combustion sont utilisés sur l\'aire de jeu ou dans l\'espace, prévoir dilution, contrôle à la source, ou les deux.',
    F: 'Occupation par défaut des logements : 2 personnes pour studio et 1 chambre, +1 par chambre additionnelle.',
    G: 'L\'air d\'un logement ne doit pas être recirculé ni transféré vers un autre espace.',
    H: 'Débit pouvant être réduit à zéro en mode inoccupé-veille (occupied-standby, §6.2.7.1.2).'
  };

  // Tableau 6.2.2.2 — Efficacité de distribution de l'air dans la zone (Ez)
  var EZ = [
    ['Soufflage d\'air froid au plafond', 1.0],
    ['Soufflage d\'air chaud au plafond, retour au plancher', 1.0],
    ['Soufflage d\'air chaud au plafond ≥ 8 °C au-dessus de l\'ambiance, retour au plafond', 0.8],
    ['Soufflage d\'air chaud au plafond < 8 °C au-dessus de l\'ambiance, retour au plafond, jet de 0,8 m/s atteignant 1,4 m du plancher', 1.0],
    ['Soufflage d\'air froid au plancher, retour au plafond, jet > 0,25 m/s à 1,4 m ou plus du plancher', 1.0],
    ['Soufflage d\'air froid au plancher, retour au plafond, déplacement à basse vitesse ou sous-plancher (jet ≤ 0,25 m/s à 1,4 m)', 1.2],
    ['Soufflage d\'air chaud au plancher, retour au plancher', 1.0],
    ['Soufflage d\'air chaud au plancher, retour au plafond', 0.7],
    ['Air d\'appoint introduit du côté opposé à l\'évacuation / au retour', 0.8],
    ['Air d\'appoint introduit près de l\'évacuation / du retour', 0.5]
  ].map(function (r) { return { label: r[0], ez: r[1] }; });
  var EZ_NOTES = [
    'Air « froid » : plus froid que l\'ambiance ; air « chaud » : plus chaud que l\'ambiance.',
    '« Plafond » : tout point au-dessus de la zone de respiration ; « plancher » : tout point en dessous.',
    'Ez peut aussi être déterminé selon ASHRAE 129 (sauf écoulement unidirectionnel).',
    'Pour un soufflage à plus faible vitesse, Ez = 0,8.'
  ];

  // Tableau 6.2.5.2 — Efficacité de ventilation du système (Ev) selon Max(Zpz)
  var EV_TABLE = [[0.15, 1.0], [0.25, 0.9], [0.35, 0.8], [0.45, 0.7], [0.55, 0.6]];
  var EV_NOTES = [
    'Max(Zpz) = plus grande valeur de Zpz (éq. 6.2.5.1) parmi les zones desservies.',
    'Entre 0,15 et 0,55, Ev peut être obtenu par interpolation.',
    'Valeurs basées sur une fraction moyenne d\'air extérieur de 0,15 ; pour des fractions plus élevées, le tableau peut donner des Ev irréalistes et l\'annexe A est plus appropriée.'
  ];

  var api = {
    EDITION: EDITION, NOTES_GENERALES: NOTES_GENERALES, NOTES: NOTES, EZ: EZ, EZ_NOTES: EZ_NOTES, EV_TABLE: EV_TABLE, EV_NOTES: EV_NOTES,
    CATEGORIES: CATEGORIES,
    get: function (id) { return BY_ID[id] || null; },
    groups: function () {
      var seen = [];
      CATEGORIES.forEach(function (c) { if (seen.indexOf(c.groupe) < 0) seen.push(c.groupe); });
      return seen;
    }
  };

  root.T621 = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);
