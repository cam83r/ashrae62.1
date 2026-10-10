/*
 * ASHRAE 62.1-2019 — Tableau 6.2.2.1 « Minimum Ventilation Rates in Breathing Zone » (unités SI).
 * Colonnes : Rp (L/s·pers.), Ra (L/s·m²), densité par défaut (pers./100 m²).
 * Les libellés français des 10 catégories utilisées dans l'onglet « Calcul Ville »
 * reprennent exactement ceux du fichier Excel (validation croisée, export CSV).
 * Valeurs à confirmer avec l'exemplaire officiel de la norme avant usage contractuel.
 */
(function (root) {
  'use strict';

  var EDITION = 'ASHRAE 62.1-2019 — Tableau 6.2.2.1 (SI)';

  // [id, groupe, libellé FR, libellé EN, Rp, Ra, densité]
  var ROWS = [
    // Établissements correctionnels
    ['corr_cell', 'Établissements correctionnels', 'Cellule', 'Cell', 2.5, 0.6, 25],
    ['corr_dayroom', 'Établissements correctionnels', 'Salle commune', 'Dayroom', 2.5, 0.3, 30],
    ['corr_guard', 'Établissements correctionnels', 'Poste de garde', 'Guard stations', 2.5, 0.3, 15],
    ['corr_booking', 'Établissements correctionnels', 'Admission / attente', 'Booking/waiting', 3.8, 0.3, 50],

    // Établissements d'enseignement
    ['edu_daycare', "Établissements d'enseignement", "Garderie (jusqu'à 4 ans)", 'Daycare (through age 4)', 5, 0.9, 25],
    ['edu_daycare_sick', "Établissements d'enseignement", 'Garderie – infirmerie', 'Daycare sickroom', 5, 0.9, 20],
    ['edu_class_5_8', "Établissements d'enseignement", 'Salle de classe (5 à 8 ans)', 'Classrooms (ages 5–8)', 5, 0.6, 25],
    ['edu_class_9', "Établissements d'enseignement", 'Salle de classe (9 ans et plus)', 'Classrooms (age 9 plus)', 5, 0.6, 35],
    ['edu_lecture_class', "Établissements d'enseignement", 'Classe magistrale', 'Lecture classroom', 3.8, 0.3, 65],
    ['edu_lecture_hall', "Établissements d'enseignement", 'Amphithéâtre (sièges fixes)', 'Lecture hall (fixed seats)', 3.8, 0.3, 150],
    ['edu_art', "Établissements d'enseignement", "Classe d'arts plastiques", 'Art classroom', 5, 0.9, 20],
    ['edu_science', "Établissements d'enseignement", 'Laboratoire de sciences', 'Science laboratories', 5, 0.9, 25],
    ['edu_univ_lab', "Établissements d'enseignement", 'Laboratoire universitaire / collégial', 'University/college laboratories', 5, 0.9, 25],
    ['edu_shop', "Établissements d'enseignement", 'Atelier bois / métal', 'Wood/metal shop', 5, 0.9, 20],
    ['edu_computer', "Établissements d'enseignement", 'Laboratoire informatique (Computer lab)', 'Computer lab', 5, 0.6, 25],
    ['edu_media', "Établissements d'enseignement", 'Médiathèque', 'Media center', 5, 0.6, 25],
    ['edu_music', "Établissements d'enseignement", 'Musique / théâtre / danse', 'Music/theater/dance', 5, 0.3, 35],
    ['edu_multiuse', "Établissements d'enseignement", 'Salle polyvalente (enseignement)', 'Multiuse assembly', 3.8, 0.3, 100],

    // Services alimentaires
    ['food_restaurant', 'Services alimentaires', 'Salle à manger de restaurant', 'Restaurant dining rooms', 3.8, 0.9, 70],
    ['food_cafeteria', 'Services alimentaires', 'Cafétéria (Cafeteria/fast-food dining)', 'Cafeteria/fast-food dining', 3.8, 0.9, 100],
    ['food_bar', 'Services alimentaires', 'Bar, bar-salon', 'Bars, cocktail lounges', 3.8, 0.9, 100],
    ['food_kitchen', 'Services alimentaires', 'Cuisine avec cuisson (Kitchen – cooking)', 'Kitchen (cooking)', 3.8, 0.6, 20],

    // Général
    ['gen_break', 'Général', 'Salle de pause', 'Break rooms', 2.5, 0.3, 25],
    ['gen_coffee', 'Général', 'Coin café', 'Coffee stations', 2.5, 0.3, 20],
    ['gen_conference', 'Général', 'Salle de conférence / réunion', 'Conference/meeting', 2.5, 0.3, 50],
    ['gen_corridor', 'Général', 'Corridors', 'Corridors', 0, 0.3, 0],
    ['gen_storage_liquid', 'Général', 'Entreposage occupable – liquides ou gels', 'Occupiable storage rooms for liquids or gels', 2.5, 0.6, 2],

    // Hôtels, motels, centres de villégiature, dortoirs
    ['hotel_bedroom', 'Hôtels, motels, dortoirs', 'Chambre / séjour', 'Bedroom/living room', 2.5, 0.3, 10],
    ['hotel_barracks', 'Hôtels, motels, dortoirs', 'Dortoir de caserne', 'Barracks sleeping areas', 2.5, 0.3, 20],
    ['hotel_laundry_central', 'Hôtels, motels, dortoirs', 'Buanderie centrale', 'Laundry rooms, central', 2.5, 0.6, 10],
    ['hotel_laundry_unit', 'Hôtels, motels, dortoirs', 'Buanderie dans un logement', 'Laundry rooms within dwelling units', 2.5, 0.6, 10],
    ['hotel_lobby', 'Hôtels, motels, dortoirs', 'Hall / avant-salle', 'Lobbies/prefunction', 3.8, 0.3, 30],
    ['hotel_multipurpose', 'Hôtels, motels, dortoirs', 'Salle polyvalente / assemblée (Multipurpose assembly)', 'Multipurpose assembly', 2.5, 0.3, 120],

    // Immeubles de bureaux
    ['off_break', 'Immeubles de bureaux', 'Salle de pause (bureaux)', 'Breakrooms', 2.5, 0.6, 50],
    ['off_main_lobby', 'Immeubles de bureaux', "Hall d'entrée principal", 'Main entry lobbies', 2.5, 0.3, 10],
    ['off_storage_dry', 'Immeubles de bureaux', 'Entreposage occupable – matières sèches', 'Occupiable storage rooms for dry materials', 2.5, 0.3, 2],
    ['off_office', 'Immeubles de bureaux', 'Bureau (Office space)', 'Office space', 2.5, 0.3, 5],
    ['off_reception', 'Immeubles de bureaux', 'Réception (Reception areas)', 'Reception areas', 2.5, 0.3, 30],
    ['off_telephone', 'Immeubles de bureaux', 'Téléphonie / saisie de données', 'Telephone/data entry', 2.5, 0.3, 60],

    // Espaces divers
    ['misc_vault', 'Espaces divers', 'Chambre forte / coffrets de sûreté', 'Bank vaults/safe deposit', 2.5, 0.3, 5],
    ['misc_bank', 'Espaces divers', 'Banque / hall de banque', 'Banks or bank lobbies', 3.8, 0.3, 15],
    ['misc_computer', 'Espaces divers', 'Salle informatique (sans impression)', 'Computer (not printing)', 2.5, 0.3, 4],
    ['misc_freezer', 'Espaces divers', 'Chambre froide / congélateur (< 10 °C)', 'Freezer and refrigerated spaces (<50°F)', 5, 0, 0],
    ['misc_manufacturing', 'Espaces divers', 'Fabrication générale (sauf industrie lourde / procédés chimiques)', 'General manufacturing', 5, 0.9, 7],
    ['misc_pharmacy', 'Espaces divers', 'Pharmacie (aire de préparation)', 'Pharmacy (prep. area)', 2.5, 0.9, 10],
    ['misc_photo', 'Espaces divers', 'Studio de photographie', 'Photo studios', 2.5, 0.6, 10],
    ['misc_shipping', 'Espaces divers', 'Expédition / réception', 'Shipping/receiving', 5, 0.6, 2],
    ['misc_sorting', 'Espaces divers', 'Tri, emballage, assemblage léger', 'Sorting, packing, light assembly', 3.8, 0.6, 7],
    ['misc_tel_closet', 'Espaces divers', 'Local téléphonique', 'Telephone closets', 0, 0, 0],
    ['misc_transport', 'Espaces divers', 'Salle d\'attente (transport)', 'Transportation waiting', 3.8, 0.3, 100],
    ['misc_warehouse', 'Espaces divers', 'Entrepôt', 'Warehouses', 5, 0.3, 0],

    // Lieux de rassemblement public
    ['pub_auditorium', 'Lieux de rassemblement public', 'Auditorium (aire des sièges)', 'Auditorium seating area', 2.5, 0.3, 150],
    ['pub_worship', 'Lieux de rassemblement public', 'Lieu de culte', 'Places of religious worship', 2.5, 0.3, 120],
    ['pub_courtroom', 'Lieux de rassemblement public', "Salle d'audience", 'Courtrooms', 2.5, 0.3, 70],
    ['pub_legislative', 'Lieux de rassemblement public', 'Chambre législative', 'Legislative chambers', 2.5, 0.3, 50],
    ['pub_library', 'Lieux de rassemblement public', 'Bibliothèque', 'Libraries', 2.5, 0.6, 10],
    ['pub_lobby', 'Lieux de rassemblement public', 'Hall', 'Lobbies', 2.5, 0.3, 150],
    ['pub_museum_child', 'Lieux de rassemblement public', 'Musée pour enfants', "Museums (children's)", 3.8, 0.6, 40],
    ['pub_museum', 'Lieux de rassemblement public', 'Musée / galerie', 'Museums/galleries', 3.8, 0.3, 40],

    // Résidentiel
    ['res_corridor', 'Résidentiel', 'Corridors communs', 'Common corridors', 0, 0.3, 0],

    // Commerce de détail
    ['ret_sales', 'Commerce de détail', 'Aire de vente (sauf ci-dessous)', 'Sales (except as below)', 3.8, 0.6, 15],
    ['ret_mall', 'Commerce de détail', 'Aires communes de centre commercial', 'Mall common areas', 3.8, 0.3, 40],
    ['ret_barber', 'Commerce de détail', 'Salon de barbier', 'Barbershop', 3.8, 0.3, 25],
    ['ret_beauty', 'Commerce de détail', 'Salon de beauté / manucure', 'Beauty and nail salons', 10, 0.6, 25],
    ['ret_pet', 'Commerce de détail', 'Animalerie (aires des animaux)', 'Pet shops (animal areas)', 3.8, 0.9, 10],
    ['ret_supermarket', 'Commerce de détail', 'Supermarché', 'Supermarket', 3.8, 0.3, 8],
    ['ret_laundromat', 'Commerce de détail', 'Buanderie libre-service', 'Coin-operated laundries', 3.8, 0.3, 20],

    // Sports et divertissement
    ['sport_gym', 'Sports et divertissement', 'Gym (Gym play area)', 'Gym, sports arena (play area)', 10, 0.9, 7],
    ['sport_spectator', 'Sports et divertissement', 'Spectateurs (Spectator areas)', 'Spectator areas', 3.8, 0.3, 150],
    ['sport_pool', 'Sports et divertissement', 'Piscine (bassin et plage)', 'Swimming (pool & deck)', 0, 2.4, 0],
    ['sport_disco', 'Sports et divertissement', 'Discothèque / piste de danse', 'Disco/dance floors', 10, 0.3, 100],
    ['sport_aerobics', 'Sports et divertissement', 'Conditionnement physique / aérobie (Health club/aerobics)', 'Health club/aerobics room', 10, 0.3, 40],
    ['sport_weights', 'Sports et divertissement', 'Conditionnement physique – musculation', 'Health club/weight rooms', 10, 0.3, 10],
    ['sport_bowling', 'Sports et divertissement', 'Salle de quilles (aire des sièges)', 'Bowling alley (seating)', 5, 0.6, 40],
    ['sport_casino', 'Sports et divertissement', 'Casino', 'Gambling casinos', 3.8, 0.9, 120],
    ['sport_arcade', 'Sports et divertissement', "Salle de jeux d'arcade", 'Game arcades', 3.8, 0.9, 20],
    ['sport_stage', 'Sports et divertissement', 'Scène, studio', 'Stages, studios', 5, 0.3, 70]
  ];

  var CATEGORIES = ROWS.map(function (r) {
    return { id: r[0], groupe: r[1], fr: r[2], en: r[3], rp: r[4], ra: r[5], densite: r[6] };
  });
  var BY_ID = {};
  CATEGORIES.forEach(function (c) { BY_ID[c.id] = c; });

  var api = {
    EDITION: EDITION,
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
