// Configuration administrateur de la carte Ukraine.
export const REGLAGES = {
  projet: {
    titreHtml: "Ukraine : 4 ans de guerre contre les journalistes",
    langueParDefaut: "en",
    langues: ["en", "fr"],
    indexationMoteurs: true
  },

  fichiers: {
    donnees: { fr: "evenements.json", en: "events.json" },
    geojson: {
      regions: "geojson/ukraine_oblasts.geojson",
      contour: "geojson/static.geojson",
      niveauxAdministratifs: [],
      statuts: "statut_oblasts.json",
      occupation: [
        { date: "2016-09-10", url: "geojson/Leaflet_Ukraine_conflict_map_09-10-2016.geojson" },
        { date: "2022-02-24", url: "geojson/Leaflet_Ukraine_conflict_map_24-02-2022.geojson" },
        { date: "2022-04-10", url: "geojson/Leaflet_Ukraine_conflict_map_10-04-2022.geojson" },
        { date: "2022-09-11", url: "geojson/Leaflet_Ukraine_conflict_map_11-09-2022.geojson" },
        { date: "2024-08-18", url: "geojson/Leaflet_Ukraine_conflict_map_18-08-2024.geojson" },
        { date: "2026-01-26", url: "geojson/Leaflet_Ukraine_conflict_map_26-01-2026.geojson" },
        { date: "2026-04-19", url: "geojson/Leaflet_Ukraine_conflict_map_19-04-2026.geojson" }
      ]
    },
    assets: {
      feuilleDeStyle: "css/style.css",
      logo: "logo.svg",
      favicon: "logo.svg",
      dossierIcones: "icons/",
      iconeParDefaut: "autre.png"
    },
    modules: {
      dates: "./utils/dates.js",
      strings: "./utils/strings.js",
      security: "./utils/security.js",
      bottomChart: "./charts/bottomChart.js",
      eventsRenderer: "./events/eventsRenderer.js",
      panelScroll: "./ui/panelScroll.js",
      legend: "./ui/legend.js",
      oblastFilters: "./ui/oblastFilters.js",
      playback: "./playback/playback.js",
      i18n: "./i18n/i18n.js",
      tutorial: "./tutorial/tutorial.js",
      occupationLayer: "./maps/occupationLayer.js",
      occupationLegend: "./ui/occupationLegend.js",
      menu: "./ui/menu.js",
      nearbyNavigation: "./maps/nearbyNavigation.js",
      mapRendering: "./maps/rendering.js",
      geojsonLevels: "./maps/geojsonLevels.js"
    }
  },

  champsDonnees: {
    date: ["date", "date_evenement", "date_event", "date_iso"],
    emplacement: ["lieu", "ville", "city", "location"],
    personne: ["journaliste", "name", "nom"],
    categorie: ["type_violence", "type", "category"],
    description: ["description", "summary"],
    zone: ["Oblast", "oblast", "region", "region_name"],
    nomGeojson: ["Geojson", "geojson", "shapeName"],
    latitude: ["lat", "latitude"],
    longitude: ["lng", "lon", "longitude"],
    identifiant: ["compteur_evenements", "id"],
    lien: ["lien", "link"]
  },

  carte: {
    // Projections : "mercator" (EPSG:3857, compatible avec les fonds actuels) ; "naturalEarth2" (Proj4Leaflet et fonds compatibles requis).
    projection: "mercator",
    centreInitial: [48.5, 31.2],
    zoomInitial: 6,
    zoomMinimum: 4,
    zoomMaximum: 18,
    zoomDelta: 0.5,
    zoomSnap: 0.1,
    wheelPxPerZoomLevel: 60,
    scrollWheelZoom: true,
    // Attente maximale des tuiles et du rendu, en millisecondes.
    delaiChargementMaximum: 30000,
    zoomMaximumContour: 7,
    ajusterAuContour: true,
    attribution: '<a href="https://openfreemap.org/" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener noreferrer">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
    cleCarto: "",
    // "maplibre" : style vectoriel ; "raster" : tuiles image. Un seul actifParDefaut: true.
    // Pour changer le fond initial, mettre son actifParDefaut à true et les autres à false.
    // theme : "light" ou "dark" ; une seule entrée actifParDefaut: true.
    // maxNativeZoom évite de demander au fournisseur des tuiles inexistantes.
    fonds: [
      {
        id: "positron",
        labels: {
          fr: "Clair",
          en: "Light",
          es: "Claro"
        },
        type: "maplibre",
        url: "https://tiles.openfreemap.org/styles/positron",
        options: {
          attributionControl: false
        },
        theme: "light",
        actifParDefaut: false
      },
      {
        id: "dark",
        labels: {
          fr: "Sombre",
          en: "Dark",
          es: "Oscuro"
        },
        type: "maplibre",
        url: "https://tiles.openfreemap.org/styles/dark",
        options: {
          attributionControl: false
        },
        theme: "dark",
        actifParDefaut: false
      },
      {
        id: "fiord",
        labels: {
          fr: "Fiord",
          en: "Fiord",
          es: "Fiord"
        },
        type: "maplibre",
        url: "https://tiles.openfreemap.org/styles/fiord",
        options: {
          attributionControl: false
        },
        theme: "dark",
        actifParDefaut: false
      },
      {
        id: "liberty",
        labels: {
          fr: "Liberty",
          en: "Liberty",
          es: "Liberty"
        },
        type: "maplibre",
        url: "https://tiles.openfreemap.org/styles/liberty",
        options: {
          attributionControl: false
        },
        theme: "light",
        actifParDefaut: true
      },
      {
        id: "bright",
        labels: {
          fr: "Bright",
          en: "Bright",
          es: "Bright"
        },
        type: "maplibre",
        url: "https://tiles.openfreemap.org/styles/bright",
        options: {
          attributionControl: false
        },
        theme: "light",
        actifParDefaut: false
      },
      {
        id: "satellite",
        labels: {
          fr: "Satellite",
          en: "Satellite",
          es: "Satélite"
        },
        type: "raster",
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        options: {
          maxNativeZoom: 23
        },
        theme: "dark",
        attribution: "Tiles &copy; Esri",
        actifParDefaut: false
      },
      {
        id: "relief",
        labels: {
          fr: "Relief",
          en: "Relief",
          es: "Relieve"
        },
        type: "raster",
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}",
        options: {
          maxNativeZoom: 13
        },
        theme: "light",
        attribution: "Tiles &copy; Esri",
        actifParDefaut: false
      }
    ],
  },

  categories: [
    { cle: "Blessé", slug: "blesse", icone: "blesse.png", couleur: "#FF9800", labels: { fr: "Blessé", en: "Injured" }, valeursEntree: ["Blessé", "Injured"] },
    { cle: "Agressé", slug: "agresse", icone: "agression.png", couleur: "#607D8B", labels: { fr: "Agressé", en: "Assaulted" }, valeursEntree: ["Agressé", "Assaulted"] },
    { cle: "Tué", slug: "tue", icone: "assassinat.png", couleur: "#dc143c", labels: { fr: "Tué", en: "Killed" }, valeursEntree: ["Tué", "Killed"] },
    { cle: "Disparu", slug: "disparu", icone: "disparu.png", couleur: "#2196F3", labels: { fr: "Disparu", en: "Missing" }, valeursEntree: ["Disparu", "Missing"] },
    { cle: "Tentative d'homicide", slug: "tentative-homicide", icone: "tentative.png", couleur: "#9C27B0", labels: { fr: "Tentative d'homicide", en: "Attempted killing" }, valeursEntree: ["Tentative d'homicide", "Attempted killing"] },
    { cle: "Dommages matériels", slug: "dommages-materiels", icone: "materiel.png", couleur: "#4CAF50", labels: { fr: "Dommages matériels", en: "Property damages" }, valeursEntree: ["Dommages matériels", "Property damages"] },
    { cle: "Emprisonné", slug: "emprisonne", icone: "emprisonne.png", couleur: "#00FFFF", labels: { fr: "Emprisonné", en: "Imprisoned" }, valeursEntree: ["Emprisonné", "Imprisoned"] },
    { cle: "Emprisonné (libéré)", slug: "emprisonne-libere", icone: "emprisonne.png", couleur: "#F7D100", labels: { fr: "Libéré", en: "Released" }, valeursEntree: ["Emprisonné (libéré)", "Imprisonné libéré", "Imprisoned (released)", "Released"] }
  ],
  listeCas: { champsSupplementaires: [] },
  // Styles Leaflet/MapLibre : stroke, color, weight, opacity, fill, fillColor, fillOpacity.
  // fillColor: null reprend color. Chaque couche complète defaut.
  stylesGeojson: {
    defaut: {
      stroke: true,
      color: "#3388ff",
      weight: 3,
      opacity: 1,
      fill: true,
      fillColor: null,
      fillOpacity: 0.2
    },
    contour: {
      stroke: true,
      color: "#015CBB",
      weight: 1,
      opacity: 1,
      fill: true,
      fillColor: null,
      fillOpacity: 0.025
    },
    selection: {
      stroke: true,
      color: "#FED501",
      weight: 1,
      opacity: 1,
      fill: true,
      fillColor: "#FED501",
      fillOpacity: 0.15
    },
    niveauxAdministratifs: {
      stroke: true,
      color: "#64748b",
      weight: 1,
      opacity: 0.8,
      fill: true,
      fillColor: "#64748b",
      fillOpacity: 0
    },
    occupation: {
      stroke: true,
      color: "#3388ff",
      weight: 0.8,
      opacity: 1,
      fill: true,
      fillColor: null,
      fillOpacity: 0.2
    },
    fallbackColor: "#999"
  },
  choropleth: {
    couleurSansCas: "#7890a0",
    couleurMinimum: "#f7d457",
    couleurMaximum: "#76001f",
    contour: "rgba(255,255,255,0.82)",
    opaciteSansCas: 0.42,
    epaisseurContour: 0.6, // Constante au survol.
    opaciteAvecCas: 0.9
  },
  occupation: {
    indexParDefaut: 5,
    types: {
      type01: { i18nKey: "type01", color: "#C70900", style: { weight: 1, fillOpacity: 0.35 } },
      type02: { i18nKey: "type02", color: "#FF9800", style: { weight: 1, fillOpacity: 0.4 } },
      type03: { i18nKey: "type03", color: "#14c414ff", style: { weight: 1, fillOpacity: 0.4 } },
      type04: { i18nKey: "type04", color: "#607D8B", style: { weight: 1, fillOpacity: 0.45 } }
    }
  },

  fonctionnalites: {
    navigationProche: {
      enabled: true, // Navigation vers le groupe ou événement hors écran le plus proche.
      zoomMinimum: 11,
      maximumVisibles: 1, // Afficher le bouton avec 0 ou 1 groupe/événement visible.
      margeDesktop: 56, // Pixels ; le placement évite aussi les panneaux et commandes.
      margeMobile: 20,
      espacementComposants: 12,
      seuilMobile: 768,
      dureeDeplacement: 0.65 // Secondes ; le zoom final reste inchangé.
    },
    listeCas: { enabled: true },
    statistiques: { enabled: true },
    chronologie: { enabled: true },
    lecture: { enabled: true },
    tutoriel: {
      enabled: true, // Conserve le tutoriel dans le menu.
      demarrageAutomatique: false // true : ouverture automatique à la première visite.
    },
    langues: { enabled: true },
    rsfCartographie: { enabled: true },
    contour: { enabled: true },
    filtresAdditionnels: { enabled: false },
    occupationLayer: { enabled: true },
    choropleth: {
      enabled: true, // Conserve la commande dans le menu.
      actifParDefaut: false // false : marqueurs au démarrage ; true : choroplèthe.
    }
  },

  controles: {
    panneauTitre: { ouvertParDefaut: true, afficherZone: true, afficherEmplacement: true, afficherDates: true, afficherCategories: true, afficherEffacerFiltres: true },
    lecture: { vitesses: [0.5, 1, 2], vitesseParDefaut: 1, afficherPrecedent: true, afficherLecturePause: true, afficherSuivant: true, afficherFin: true },
    statistiques: { vues: ["oblasts", "villes"], vueParDefaut: "oblasts", lignesMaximumZones: 30, lignesMaximumEmplacements: 100 },
    menu: { ordre: ["langues", "tutoriel", "listeCas", "choropleth", "statistiques", "chronologie", "rsfCartographie"] }
  },

  lecture: {
    dateDebut: "09/11/2016",
    dateFin: "31/12/2026",
    reperes: [
      { at: "09/11/2016", key: "Crimea", durationMs: 5200 },
      { at: "24/02/2022", key: "Invasion", durationMs: 2000 },
      { at: Date.UTC(2022, 2, 1), key: "Victime", durationMs: 5200 },
      { at: "23/03/2022", key: "Oksana", durationMs: 5200 },
      { at: "26/04/2023", key: "Bohdan", durationMs: 5200 },
      { at: "19/09/2024", key: "Victoria", durationMs: 5200 },
      { at: Date.UTC(2025, 9, 3), key: "Lallican", durationMs: 5200 }
    ]
  },
  cartesLiees: [
    { href: "https://rsf-carte-journalistes-tues-disparus-otages-detenus-2025.rsf.org/", image: "assets/carte_bilan.png" },
    { href: "https://ukraine-mobilisation.rsf.org/", image: "assets/carte_ukraine.png" },
    { href: "https://grands-lacs.rsf.org/", image: "assets/grands-lacs.png" },
    { href: "https://routes-de-l-exil.data.rsf.org/", image: "assets/carte_exil.png" }
  ]
};

export function validerReglages(reglages = REGLAGES) {
  const erreurs = [];
  if (!reglages.projet?.langues?.includes(reglages.projet.langueParDefaut)) erreurs.push("langue par défaut absente de la liste des langues");
  if (!reglages.fichiers?.donnees?.[reglages.projet?.langueParDefaut]) erreurs.push("fichier de données par défaut manquant");
  if (!reglages.fichiers?.geojson?.regions) erreurs.push("GeoJSON des régions manquant");
  if (!reglages.categories?.length) erreurs.push("aucune catégorie configurée");
  const fonds = reglages.carte?.fonds;
  if (!Array.isArray(fonds) || !fonds.length) erreurs.push("aucun fond de carte configuré");
  else {
    if (fonds.filter(fond => fond.actifParDefaut).length !== 1) erreurs.push("un seul fond doit être actif par défaut");
    if (new Set(fonds.map(fond => fond.id)).size !== fonds.length) erreurs.push("identifiants de fonds dupliqués");
    if (fonds.some(fond => !fond.id || !fond.url || !["maplibre", "raster"].includes(fond.type))) erreurs.push("chaque fond doit avoir un id, une URL et un type maplibre ou raster");
  }
  if (erreurs.length) throw new Error(`[reglages.js] ${erreurs.join(" ; ")}`);
  return true;
}
