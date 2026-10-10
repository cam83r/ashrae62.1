/*
 * ANSI/ASHRAE 62.1-2022 — Table 6-1 « Minimum Ventilation Rates in Breathing Zone » (unités SI),
 * vérifiée contre l'exemplaire de la norme. Table 6-4 (Ez) incluse ; le tableau Ev 6.2.5.2 de
 * l'édition 2016 (retiré depuis 2019) est conservé à titre de comparaison.
 * Colonnes : Rp (L/s·pers.), Ra (L/s·m²), densité par défaut (pers./100 m², null = « — »),
 * classe d'air (null = non indiquée), OS = réduction à zéro permise en veille occupée (§6.2.6.1.4).
 * Les libellés français des 10 catégories utilisées dans l'onglet « Calcul Ville »
 * reprennent exactement ceux du fichier Excel (validation croisée, export CSV).
 */
(function (root) {
  'use strict';

  var EDITION = 'ANSI/ASHRAE 62.1-2022';
  var OS = true, NO = false;

  // [id, groupe, libellé FR, libellé EN, Rp, Ra, densité, classe d'air, OS]
  var ROWS = [
    // Installations pour animaux (nouveau en 2022 ; exemption possible §6.2.1.1.6)
    ['anim_exam', 'Installations pour animaux', 'Salle d\'examen (clinique vétérinaire)', 'Animal exam room (veterinary office)', 5, 0.6, 20, 2, NO],
    ['anim_imaging', 'Installations pour animaux', 'Imagerie animale (IRM / TDM / TEP)', 'Animal imaging (MRI/CT/PET)', 5, 0.9, 20, 3, NO],
    ['anim_operating', 'Installations pour animaux', 'Salle d\'opération pour animaux', 'Animal operating rooms', 5, 0.9, 20, 3, NO],
    ['anim_recovery', 'Installations pour animaux', 'Salle de réveil postopératoire', 'Animal postoperative recovery room', 5, 0.9, 20, 3, NO],
    ['anim_prep', 'Installations pour animaux', 'Salle de préparation', 'Animal preparation rooms', 5, 0.9, 20, 3, NO],
    ['anim_procedure', 'Installations pour animaux', 'Salle d\'intervention', 'Animal procedure room', 5, 0.9, 20, 3, NO],
    ['anim_scrub', 'Installations pour animaux', 'Brossage chirurgical', 'Animal surgery scrub', 5, 0.9, 20, 3, NO],
    ['anim_large', 'Installations pour animaux', 'Salle de garde – grands animaux', 'Large-animal holding room', 5, 0.9, 20, 3, NO],
    ['anim_necropsy', 'Installations pour animaux', 'Nécropsie', 'Necropsy', 5, 0.9, 20, 3, NO],
    ['anim_cage_static', 'Installations pour animaux', 'Salle de cages – petits animaux (cages statiques)', 'Small-animal-cage room (static cages)', 5, 0.9, 20, 3, NO],
    ['anim_cage_vent', 'Installations pour animaux', 'Salle de cages – petits animaux (cages ventilées)', 'Small-animal-cage room (ventilated cages)', 5, 0.9, 20, 3, NO],

    // Établissements correctionnels
    ['corr_booking', 'Établissements correctionnels', 'Admission / attente', 'Booking/waiting', 3.8, 0.3, 50, 2, NO],
    ['corr_cell', 'Établissements correctionnels', 'Cellule', 'Cell', 2.5, 0.6, 25, 2, NO],
    ['corr_dayroom', 'Établissements correctionnels', 'Salle commune', 'Dayroom', 2.5, 0.3, 30, 1, NO],
    ['corr_guard', 'Établissements correctionnels', 'Poste de garde', 'Guard stations', 2.5, 0.3, 15, 1, NO],

    // Établissements d'enseignement
    ['edu_art', "Établissements d'enseignement", "Classe d'arts plastiques", 'Art classroom', 5, 0.9, 20, 2, NO],
    ['edu_class_5_8', "Établissements d'enseignement", 'Salle de classe (5 à 8 ans)', 'Classrooms (ages 5 to 8)', 5, 0.6, 25, 1, NO],
    ['edu_class_9', "Établissements d'enseignement", 'Salle de classe (9 ans et plus)', 'Classrooms (age 9 plus)', 5, 0.6, 35, 1, NO],
    ['edu_computer', "Établissements d'enseignement", 'Laboratoire informatique (Computer lab)', 'Computer lab', 5, 0.6, 25, 1, NO],
    ['edu_daycare_sick', "Établissements d'enseignement", 'Garderie – infirmerie', 'Daycare sickroom', 5, 0.9, 25, 3, NO],
    ['edu_daycare', "Établissements d'enseignement", "Garderie (jusqu'à 4 ans)", 'Daycare (through age 4)', 5, 0.9, 25, 2, NO],
    ['edu_lecture_class', "Établissements d'enseignement", 'Classe magistrale', 'Lecture classroom', 3.8, 0.3, 65, 1, OS],
    ['edu_lecture_hall', "Établissements d'enseignement", 'Amphithéâtre (sièges fixes)', 'Lecture hall (fixed seats)', 3.8, 0.3, 150, 1, OS],
    ['edu_library', "Établissements d'enseignement", 'Bibliothèque (enseignement)', 'Libraries', 2.5, 0.6, 10, null, NO],
    ['edu_media', "Établissements d'enseignement", 'Médiathèque', 'Media center', 5, 0.6, 25, 1, NO],
    ['edu_multiuse', "Établissements d'enseignement", 'Salle polyvalente (enseignement)', 'Multiuse assembly', 3.8, 0.3, 100, 1, OS],
    ['edu_music', "Établissements d'enseignement", 'Musique / théâtre / danse', 'Music/theater/dance', 5, 0.3, 35, 1, OS],
    ['edu_science', "Établissements d'enseignement", 'Laboratoire de sciences', 'Science laboratories', 5, 0.9, 25, 2, NO],
    ['edu_univ_lab', "Établissements d'enseignement", 'Laboratoire universitaire / collégial', 'University/college laboratories', 5, 0.9, 25, 2, NO],
    ['edu_shop', "Établissements d'enseignement", 'Atelier bois / métal', 'Wood/metal shop', 5, 0.9, 20, 2, NO],

    // Services alimentaires
    ['food_bar', 'Services alimentaires', 'Bar, bar-salon', 'Bars, cocktail lounges', 3.8, 0.9, 100, 2, NO],
    ['food_cafeteria', 'Services alimentaires', 'Cafétéria (Cafeteria/fast-food dining)', 'Cafeteria/fast-food dining', 3.8, 0.9, 100, 2, NO],
    ['food_kitchen', 'Services alimentaires', 'Cuisine avec cuisson (Kitchen – cooking)', 'Kitchen (cooking)', 3.8, 0.6, 20, 2, NO],
    ['food_restaurant', 'Services alimentaires', 'Salle à manger de restaurant', 'Restaurant dining rooms', 3.8, 0.9, 70, 2, NO],

    // Général
    ['gen_break', 'Général', 'Salle de pause', 'Break rooms', 2.5, 0.3, 25, 1, OS],
    ['gen_coffee', 'Général', 'Coin café', 'Coffee stations', 2.5, 0.3, 20, 1, OS],
    ['gen_conference', 'Général', 'Salle de conférence / réunion', 'Conference/meeting', 2.5, 0.3, 50, 1, OS],
    ['gen_corridor', 'Général', 'Corridors', 'Corridors', 0, 0.3, null, 1, OS],
    ['gen_storage_liquid', 'Général', 'Entreposage occupable – liquides ou gels', 'Occupiable storage rooms for liquids or gels', 2.5, 0.6, 2, 2, NO],

    // Hôtels, motels, centres de villégiature, dortoirs
    ['hotel_barracks', 'Hôtels, motels, dortoirs', 'Dortoir de caserne', 'Barracks sleeping areas', 2.5, 0.3, 20, 1, OS],
    ['hotel_bedroom', 'Hôtels, motels, dortoirs', 'Chambre / séjour', 'Bedroom/living room', 2.5, 0.3, 10, 1, OS],
    ['hotel_laundry_central', 'Hôtels, motels, dortoirs', 'Buanderie centrale', 'Laundry rooms, central', 2.5, 0.6, 10, 2, NO],
    ['hotel_laundry_unit', 'Hôtels, motels, dortoirs', 'Buanderie dans un logement', 'Laundry rooms within dwelling units', 2.5, 0.6, 10, 1, NO],
    ['hotel_lobby', 'Hôtels, motels, dortoirs', 'Hall / avant-salle', 'Lobbies/prefunction', 3.8, 0.3, 30, 1, OS],
    ['hotel_multipurpose', 'Hôtels, motels, dortoirs', 'Salle polyvalente / assemblée (Multipurpose assembly)', 'Multipurpose assembly', 2.5, 0.3, 120, 1, OS],

    // Espaces divers
    ['misc_bank', 'Espaces divers', 'Banque / hall de banque', 'Banks or bank lobbies', 3.8, 0.3, 15, 1, OS],
    ['misc_vault', 'Espaces divers', 'Chambre forte / coffrets de sûreté', 'Bank vaults/safe deposit', 2.5, 0.3, 5, 2, OS],
    ['misc_computer', 'Espaces divers', 'Salle informatique (sans impression)', 'Computer (not printing)', 2.5, 0.3, 4, 1, OS],
    ['misc_freezer', 'Espaces divers', 'Chambre froide / congélateur (< 10 °C)', 'Freezer and refrigerated spaces (<50°F [10°C])', 5, 0, 0, 2, NO],
    ['misc_manufacturing', 'Espaces divers', 'Fabrication sans matières dangereuses', 'Manufacturing where hazardous materials are not used', 5, 0.9, 7, 2, NO],
    ['misc_manufacturing_haz', 'Espaces divers', 'Fabrication avec matières dangereuses (sauf industrie lourde / procédés chimiques)', 'Manufacturing where hazardous materials are used', 5, 0.9, 7, 3, NO],
    ['misc_pharmacy', 'Espaces divers', 'Pharmacie (aire de préparation)', 'Pharmacy (prep. area)', 2.5, 0.9, 10, 2, NO],
    ['misc_photo', 'Espaces divers', 'Studio de photographie', 'Photo studios', 2.5, 0.6, 10, 1, NO],
    ['misc_shipping', 'Espaces divers', 'Expédition / réception', 'Shipping/receiving', 5, 0.6, 2, 2, NO],
    ['misc_sorting', 'Espaces divers', 'Tri, emballage, assemblage léger', 'Sorting, packing, light assembly', 3.8, 0.6, 7, 2, NO],
    ['misc_tel_closet', 'Espaces divers', 'Local téléphonique', 'Telephone closets', 0, 0, null, 1, NO],
    ['misc_transport', 'Espaces divers', 'Salle d\'attente (transport)', 'Transportation waiting', 3.8, 0.3, 100, 1, OS],
    ['misc_warehouse', 'Espaces divers', 'Entrepôt', 'Warehouses', 5, 0.3, null, 2, NO],

    // Immeubles de bureaux
    ['off_break', 'Immeubles de bureaux', 'Salle de pause (bureaux)', 'Breakrooms', 2.5, 0.6, 50, 1, NO],
    ['off_main_lobby', 'Immeubles de bureaux', "Hall d'entrée principal", 'Main entry lobbies', 2.5, 0.3, 10, 1, OS],
    ['off_storage_dry', 'Immeubles de bureaux', 'Entreposage occupable – matières sèches', 'Occupiable storage rooms for dry materials', 2.5, 0.3, 2, 1, NO],
    ['off_office', 'Immeubles de bureaux', 'Bureau (Office space)', 'Office space', 2.5, 0.3, 5, 1, OS],
    ['off_reception', 'Immeubles de bureaux', 'Réception (Reception areas)', 'Reception areas', 2.5, 0.3, 30, 1, OS],
    ['off_telephone', 'Immeubles de bureaux', 'Téléphonie / saisie de données', 'Telephone/data entry', 2.5, 0.3, 60, 1, OS],

    // Lieux de rassemblement public
    ['pub_auditorium', 'Lieux de rassemblement public', 'Auditorium (aire des sièges)', 'Auditorium seating area', 2.5, 0.3, 150, 1, OS],
    ['pub_courtroom', 'Lieux de rassemblement public', "Salle d'audience", 'Courtrooms', 2.5, 0.3, 70, 1, OS],
    ['pub_legislative', 'Lieux de rassemblement public', 'Chambre législative', 'Legislative chambers', 2.5, 0.3, 50, 1, OS],
    ['pub_library', 'Lieux de rassemblement public', 'Bibliothèque', 'Libraries', 2.5, 0.6, 10, 1, NO],
    ['pub_lobby', 'Lieux de rassemblement public', 'Hall', 'Lobbies', 2.5, 0.3, 150, 1, OS],
    ['pub_museum_child', 'Lieux de rassemblement public', 'Musée pour enfants', "Museums (children's)", 3.8, 0.6, 40, 1, NO],
    ['pub_museum', 'Lieux de rassemblement public', 'Musée / galerie', 'Museums/galleries', 3.8, 0.3, 40, 1, OS],
    ['pub_worship', 'Lieux de rassemblement public', 'Lieu de culte', 'Places of religious worship', 2.5, 0.3, 120, 1, OS],

    // Résidentiel (les logements relèvent d'ASHRAE 62.2)
    ['res_corridor', 'Résidentiel', 'Corridors communs', 'Common corridors', 0, 0.3, null, 1, OS],

    // Commerce de détail
    ['ret_sales', 'Commerce de détail', 'Aire de vente (sauf ci-dessous)', 'Sales (except as below)', 3.8, 0.6, 15, 2, NO],
    ['ret_barber', 'Commerce de détail', 'Salon de barbier', 'Barbershop', 3.8, 0.3, 25, 2, OS],
    ['ret_beauty', 'Commerce de détail', 'Salon de beauté / manucure', 'Beauty and nail salons', 10, 0.6, 25, 2, NO],
    ['ret_laundromat', 'Commerce de détail', 'Buanderie libre-service', 'Coin-operated laundries', 3.8, 0.6, 20, 2, NO],
    ['ret_mall', 'Commerce de détail', 'Aires communes de centre commercial', 'Mall common areas', 3.8, 0.3, 40, 1, OS],
    ['ret_pet', 'Commerce de détail', 'Animalerie (aires des animaux)', 'Pet shops (animal areas)', 3.8, 0.9, 10, 2, NO],
    ['ret_supermarket', 'Commerce de détail', 'Supermarché', 'Supermarket', 3.8, 0.3, 8, 1, OS],

    // Sports et divertissement
    ['sport_bowling', 'Sports et divertissement', 'Salle de quilles (aire des sièges)', 'Bowling alley (seating)', 5, 0.6, 40, 1, NO],
    ['sport_disco', 'Sports et divertissement', 'Discothèque / piste de danse', 'Disco/dance floors', 10, 0.3, 100, 2, OS],
    ['sport_casino', 'Sports et divertissement', 'Casino', 'Gambling casinos', 3.8, 0.9, 120, 1, NO],
    ['sport_arcade', 'Sports et divertissement', "Salle de jeux d'arcade", 'Game arcades', 3.8, 0.9, 20, 1, NO],
    ['sport_gym', 'Sports et divertissement', 'Gym (Gym play area)', 'Gym, sports arena (play area)', 10, 0.9, 7, 2, NO],
    ['sport_aerobics', 'Sports et divertissement', 'Conditionnement physique / aérobie (Health club/aerobics)', 'Health club/aerobics room', 10, 0.3, 40, 2, NO],
    ['sport_weights', 'Sports et divertissement', 'Conditionnement physique – musculation', 'Health club/weight rooms', 10, 0.3, 10, 2, NO],
    ['sport_spectator', 'Sports et divertissement', 'Spectateurs (Spectator areas)', 'Spectator areas', 3.8, 0.3, 150, 1, OS],
    ['sport_stage', 'Sports et divertissement', 'Scène, studio', 'Stages, studios', 5, 0.3, 70, 1, OS],
    ['sport_pool', 'Sports et divertissement', 'Piscine (bassin et plage)', 'Swimming (pool and deck)', 0, 2.4, null, 2, NO]
  ];

  var CATEGORIES = ROWS.map(function (r) {
    var c = { id: r[0], groupe: r[1], fr: r[2], en: r[3], rp: r[4], ra: r[5], densite: r[6], classe: r[7], os: r[8] };
    // Débit combiné par défaut, calculé : Rp + Ra·100 / densité (L/s·pers.)
    c.combine = r[6] ? r[4] + r[5] * 100 / r[6] : null;
    return c;
  });
  var BY_ID = {};
  CATEGORIES.forEach(function (c) { BY_ID[c.id] = c; });

  // Exigences générales liées à la Table 6-1 (§6.2.1, §6.2.1.1.x — résumé en français)
  var NOTES_GENERALES = [
    'Locaux couverts par ASHRAE/ASHE 170 (soins de santé) : utiliser les débits de la norme 170 (§6.2.1).',
    'Les débits supposent le respect de toutes les autres exigences de la norme ; sinon, ils ne s\'appliquent pas.',
    'Usage non listé : utiliser la catégorie la plus semblable (densité, activités, construction) — §6.2.1.1.1.',
    'Sources inhabituelles (matières dangereuses entreposées, glace sèche, fumée de scène) : ventilation additionnelle selon §6.3 ou le responsable SST — §6.2.1.1.2.',
    'Débits basés sur de l\'air sec à 1,2 kg/m³ (101,3 kPa, 21 °C) ; ajustement permis mais non requis — §6.2.1.1.3.',
    'L\'air d\'un logement à occupation transitoire ou d\'une unité de couchage ne doit pas être recirculé ni transféré — §6.2.1.1.4.',
    'Laboratoires conformes à ANSI/AIHA Z9.5 et installations pour animaux ayant fait l\'objet d\'une évaluation des risques : exemptés de la Table 6-1 — §6.2.1.1.5 et 6.2.1.1.6.',
    'Densité par défaut : à utiliser seulement si la population de conception ne peut être établie (Pz = densité × Az) — §6.2.1.1.7, exception 2.',
    'OS : en ventilation à la demande, le débit peut être réduit à zéro en mode veille occupée s\'il est rétabli dès qu\'une présence est détectée — §6.2.6.1.4.'
  ];

  // Table 6-4 — Efficacité de distribution de l'air dans la zone (Ez)
  var EZ = [
    ['Systèmes à air bien mélangé', 'Soufflage d\'air froid au plafond', 1.0],
    ['Systèmes à air bien mélangé', 'Soufflage d\'air chaud au plafond, retour au plancher', 1.0],
    ['Systèmes à air bien mélangé', 'Soufflage d\'air chaud au plafond ≥ 8 °C au-dessus de l\'ambiance, retour au plafond', 0.8],
    ['Systèmes à air bien mélangé', 'Soufflage d\'air chaud au plafond < 8 °C au-dessus de l\'ambiance, vitesse du jet < 0,8 m/s à 1,4 m du plancher, retour au plafond', 0.8],
    ['Systèmes à air bien mélangé', 'Soufflage d\'air chaud au plafond < 8 °C au-dessus de l\'ambiance, vitesse du jet ≥ 0,8 m/s à 1,4 m du plancher, retour au plafond', 1.0],
    ['Systèmes à air bien mélangé', 'Soufflage d\'air chaud au plancher, retour au plancher', 1.0],
    ['Systèmes à air bien mélangé', 'Soufflage d\'air chaud au plancher, retour au plafond', 0.7],
    ['Systèmes à air bien mélangé', 'Air d\'appoint introduit à plus de la moitié de la longueur du local de l\'évacuation / du retour', 0.8],
    ['Systèmes à air bien mélangé', 'Air d\'appoint introduit à moins de la moitié de la longueur du local de l\'évacuation / du retour', 0.5],
    ['Distribution stratifiée (§6.2.1.2.1)', 'Soufflage d\'air froid au plancher, jet vertical ≥ 0,25 m/s à 1,4 m, retour au plafond ≤ 5,5 m', 1.05],
    ['Distribution stratifiée (§6.2.1.2.1)', 'Soufflage d\'air froid au plancher, jet vertical < 0,25 m/s à 1,4 m, retour au plafond ≤ 5,5 m', 1.2],
    ['Distribution stratifiée (§6.2.1.2.1)', 'Soufflage d\'air froid au plancher, jet vertical < 0,25 m/s à 1,4 m, retour au plafond > 5,5 m', 1.5],
    ['Ventilation personnalisée (§6.2.1.2.2)', 'Air personnalisé à 1,4 m + soufflage d\'air froid au plafond, retour au plafond', 1.4],
    ['Ventilation personnalisée (§6.2.1.2.2)', 'Air personnalisé à 1,4 m + soufflage d\'air chaud au plafond, retour au plafond', 1.4],
    ['Ventilation personnalisée (§6.2.1.2.2)', 'Air personnalisé à 1,4 m + distribution stratifiée, diffuseurs de plancher non aspirants, retour au plafond', 1.2],
    ['Ventilation personnalisée (§6.2.1.2.2)', 'Air personnalisé à 1,4 m + distribution stratifiée, diffuseurs de plancher aspirants, retour au plafond', 1.5]
  ].map(function (r) { return { groupe: r[0], label: r[1], ez: r[2] }; });
  var EZ_NOTES = [
    'Ez selon la Table 6-4 ou l\'annexe normative C (§6.2.1.2) ; l\'annexe C peut donner des valeurs plus élevées.',
    'Distribution stratifiée : air froid au moins 2 °C sous l\'ambiance, retour à plus de 2,8 m du plancher, aucun appareil de brassage dans la zone.',
    'Ventilation personnalisée : vitesse ≤ 0,25 m/s au visage de l\'occupant, retour à plus de 2,8 m du plancher.'
  ];

  // Tableau 6.2.5.2 de 62.1-2016 (retiré en 2019 et 2022) — conservé pour comparaison
  var EV_TABLE = [[0.15, 1.0], [0.25, 0.9], [0.35, 0.8], [0.45, 0.7], [0.55, 0.6]];
  var EV_NOTES = [
    'Méthode de l\'édition 2016 seulement. En 2022, Ev se détermine par la procédure simplifiée (§6.2.4.3) ou l\'annexe A (§6.2.4.2).',
    '62.1-2016 permettait l\'interpolation entre 0,15 et 0,55 ; au-delà de 0,55, renvoi à l\'annexe A.'
  ];

  var api = {
    EDITION: EDITION, NOTES_GENERALES: NOTES_GENERALES, EZ: EZ, EZ_NOTES: EZ_NOTES, EV_TABLE: EV_TABLE, EV_NOTES: EV_NOTES,
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
