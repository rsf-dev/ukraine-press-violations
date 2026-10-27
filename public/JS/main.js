// JS/main.js

console.log("main.js loaded", import.meta.url);
window.addEventListener("error", (e) => console.error("window.error", e.error || e.message));
window.addEventListener("unhandledrejection", (e) => console.error("unhandledrejection", e.reason));


const ASSET_VERSION = new URL(import.meta.url).searchParams.get("v") || "dev";
const V = `?v=${encodeURIComponent(ASSET_VERSION)}`;

// Ajoute ?v=... (ou &v=... si l'URL a déjà des params)
function withV(url) {
  return url.includes("?") ? `${url}&v=${encodeURIComponent(ASSET_VERSION)}` : `${url}${V}`;
}



async function importV(path) {
  const url = `${path}?v=${encodeURIComponent(ASSET_VERSION)}`;
  console.log("[import] start", url);
  const mod = await import(url);
  console.log("[import] done ", url);
  return mod;
}

const { fetchResponse: fetch, validateEvents, parseCoordinate } = await importV("./utils/data.js");
const { REGLAGES, validerReglages } = await importV("./reglages.js");
validerReglages();
const MODULES = REGLAGES.fichiers.modules;
const moduleKeys = Object.keys(MODULES);
const loadedModules = await Promise.all(moduleKeys.map(key => importV(MODULES[key])));
const modules = Object.fromEntries(moduleKeys.map((key, index) => [key, loadedModules[index]]));
const { initUtilityMenu } = modules.menu;
const { initPanelScrollProgress } = modules.panelScroll;

const { dates, strings, security, bottomChart, eventsRenderer, legend, oblastFilters, playback, i18n, tutorial, occupationLayer, occupationLegend, geojsonLevels, mapRendering, nearbyNavigation } = modules;


const {
  parseDateFlexible,
  getEventTime,
  formatDateFR,
  startOfDayUTC,
  startOfDay,
  endOfDay
} = dates;

const { normalizeType } = strings;
const { escapeHtml, getSafeHttpUrl } = security;

const { BottomChart } = bottomChart;
const { EventsRenderer } = eventsRenderer;
const { LegendUI } = legend;
const { OblastFilters } = oblastFilters;

const { createPlayback } = playback;
const { UI_STRINGS, applyStaticTextsForLang, getDisplayLabelForType: getI18nDisplayLabelForType } = i18n;

const { createTutorial } = tutorial;
const { createOccupationLayerController } = occupationLayer;
const { createOccupationLegend } = occupationLegend;
const { createGeojsonLevelsController } = geojsonLevels;
const { createNearbyNavigator } = nearbyNavigation;
const { createBasemapLayer, createGeojsonRenderer, waitForBasemapReady, applyBasemapTheme, createBasemapControl, validateBasemaps } = mapRendering;



// map.setView pour éviter le scroll en mode embed

/// === CONSTANTES ===

const FEATURES = REGLAGES.fonctionnalites;
const FILES = REGLAGES.fichiers;
const MAP_SETTINGS = REGLAGES.carte;
const MAP_CRS = { mercator: L.CRS.EPSG3857 }[MAP_SETTINGS.projection];
if (!MAP_CRS) throw new Error(`Projection non prise en charge : ${MAP_SETTINGS.projection}`);
const OBLAST_STATUS_URL = withV(FILES.geojson.statuts);
const ICON_BASE_URL = FILES.assets.dossierIcones;
const iconUrl = (file) => withV(`${ICON_BASE_URL}${file}`);
const DEFAULT_ICON_URL = iconUrl(FILES.assets.iconeParDefaut);



const INITIAL_CENTER = MAP_SETTINGS.centreInitial;
const INITIAL_ZOOM = MAP_SETTINGS.zoomInitial;
const MIN_ZOOM = MAP_SETTINGS.zoomMinimum;
const MAX_ZOOM = MAP_SETTINGS.zoomMaximum;

const OCCUPATION_FILES = FILES.geojson.occupation.map(file => ({ ...file, url: withV(file.url) }));


function isoToUTCms(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}
const OCCUPATION_MAX_TIMES = OCCUPATION_FILES.map(x => isoToUTCms(x.date));



const OCCUPATION_TYPES = REGLAGES.occupation.types;



const TYPE_COLORS = Object.assign(Object.create(null), Object.fromEntries(REGLAGES.categories.map(category => [category.cle, category.couleur])));
const TYPE_CONFIG = Object.assign(Object.create(null), Object.fromEntries(REGLAGES.categories.map(category => [category.cle, { slug: category.slug, file: category.icone }])));
const TYPE_MAP_EN_TO_FR = Object.assign(Object.create(null), Object.fromEntries(REGLAGES.categories.flatMap(category =>
  category.valeursEntree.filter(value => value !== category.cle).map(value => [value, category.cle])
)));

function getDisplayLabelForType(type, lang = currentLang) {
  const category = REGLAGES.categories.find(item => item.cle === type);
  return category?.labels?.[lang] || getI18nDisplayLabelForType(type, lang);
}


/// === ÉTAT GLOBAL ===

let map;
let nearbyNavigator = null;
let activeBasemap = null;
let geojsonRenderer = null;
let basemapControl = null;
let basemapEntries = [];
let geojsonLevelsController = null;
let allEvents = [];
let selectedTypes = new Set();
let OccupationCtrl = null;
let OccupationLegend = null;



let selectedOblast = null;
let selectedVille = null;
let oblastsDisponibles = [];
let villesDisponibles = [];
let statsSelectedOblast = null;
let statsSelectedVille = null;

let currentLang = getInitialLanguage();
let languageChangeSeq = 0;

let regionsModeActive = Boolean(FEATURES.choropleth?.enabled && FEATURES.choropleth?.actifParDefaut);
let regionsChoroplethLayer = null;
let regionsChoroplethSeq = 0;
let regionsChoroplethCounts = new Map();
let regionsChoroplethMaxCount = 1;

// GeoJSON / layers
let ukraineBorderLayer = null;
let ukraineOblastsData = null;
let regionsGeojsonPromise = null;
let borderGeojsonData = null;
let borderGeojsonPromise = null;
let borderRenderSeq = 0;
let currentOblastLayer = null;
let lastHighlightedOblast = null;

let oblastStatusData = null;

let rightPanelVisibleTypes = new Set();

// Graphs panel droit
let overviewMode = REGLAGES.controles.statistiques.vueParDefaut;
let rightChartRowsByName = new Map(); // name -> { rowEl, labelEl, barEl, valueEl, segElsByType }

// Cache datas par langue
const dataByLang = { fr: null, en: null };


/// === HELPERS ===

function setupCollapse({ btnId, bodyId, storageKey = null, defaultCollapsed = false }) {
  const btn = document.getElementById(btnId);
  const body = document.getElementById(bodyId);
  if (!btn || !body) return;

  const load = () => {
    if (!storageKey) return defaultCollapsed;
    try {
      const v = localStorage.getItem(storageKey);
      return v === null ? defaultCollapsed : v === "1";
    } catch { return defaultCollapsed; }
  };

  const save = (isCollapsed) => {
    if (!storageKey) return;
    try { localStorage.setItem(storageKey, isCollapsed ? "1" : "0"); } catch { /* Stockage désactivé dans certains contextes intégrés. */ }
  };

  const apply = (isCollapsed) => {
    body.classList.toggle("is-collapsed", isCollapsed);
    btn.textContent = isCollapsed ? "▸" : "▾";
    btn.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
    save(isCollapsed);
  };

  let collapsed = load();
  apply(collapsed);

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    collapsed = !collapsed;
    apply(collapsed);
  });
}



function getTypeSlugFromCategory(category) {
  const cfg = TYPE_CONFIG[category];
  return (cfg && cfg.slug) ? cfg.slug : normalizeType(category);
}

function buildEventId(ev) {
  const d = (ev.date || ev.date_evenement || ev.date_event || ev.date_iso || "").toString();
  return `event-${normalizeType(ev.lieu)}-${normalizeType(ev.journaliste)}-${normalizeType(d)}-${ev.compteur_evenements}`;
}

function getEventOblast(ev) {
  return ev.oblast || ev.Oblast || null;
}

function getEventGeojsonName(ev) {
  return ev.geojson || ev.Geojson || null;
}

function normalizeConfiguredEvent(event) {
  const pick = key => {
    for (const field of REGLAGES.champsDonnees[key] || []) {
      const value = event?.[field];
      if (value !== undefined && value !== null && value !== "") return value;
    }
    return undefined;
  };
  return {
    ...event,
    date: pick("date") ?? event.date,
    lieu: pick("emplacement") ?? event.lieu,
    journaliste: pick("personne") ?? event.journaliste,
    description: pick("description") ?? event.description,
    type_violence: pick("categorie") ?? event.type_violence,
    oblast: pick("zone") ?? event.oblast ?? event.Oblast,
    geojson: pick("nomGeojson") ?? event.geojson ?? event.Geojson,
    lat: parseCoordinate(pick("latitude") ?? event.lat, 90),
    lng: parseCoordinate(pick("longitude") ?? event.lng, 180),
    compteur_evenements: pick("identifiant") ?? event.compteur_evenements,
    lien: pick("lien") ?? event.lien
  };
}

function getShapeNameForSelectedOblast(oblastName) {
  if (!oblastName) return null;
  const ev0 = allEvents.find(ev => (getEventOblast(ev) || "") === oblastName);
  return ev0 ? getEventGeojsonName(ev0) : null;
}

function getFeatureShapeName(feature) {
  return feature?.properties?.shapeName ||
    feature?.properties?.name ||
    feature?.properties?.region ||
    feature?.properties?.shapeName_fr ||
    "";
}

function getOblastDisplayNameForShape(shapeName) {
  if (!shapeName) return null;
  const ev = (allEvents || []).find(item => getEventGeojsonName(item) === shapeName);
  return ev ? getEventOblast(ev) : REGLAGES.zones?.labels?.[shapeName]?.[currentLang] || shapeName;
}

function hexToRgb(hex) {
  const clean = String(hex).replace("#", "");
  const value = parseInt(clean, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
}

function mixHexColor(from, to, t) {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const x = Math.max(0, Math.min(1, t));
  const c = {
    r: Math.round(a.r + (b.r - a.r) * x),
    g: Math.round(a.g + (b.g - a.g) * x),
    b: Math.round(a.b + (b.b - a.b) * x)
  };
  return `rgb(${c.r}, ${c.g}, ${c.b})`;
}

function getRegionCountColor(count, maxCount) {
  if (!count) return REGLAGES.choropleth.couleurSansCas;
  const t = maxCount > 0 ? Math.log1p(count) / Math.log1p(maxCount) : 0;
  return mixHexColor(REGLAGES.choropleth.couleurMinimum, REGLAGES.choropleth.couleurMaximum, t);
}

function eventPassesRegionsChoroplethFilters(ev) {
  const typeOK = selectedTypes.size === 0 || selectedTypes.has(ev.type_violence);
  const playbackOK = eventPassesPlaybackWindow(ev);
  return typeOK && playbackOK;
}


/// === BOTTOM CHART ===

function isBottomChartOpenDOM() {
  const panel = document.getElementById("bottom-chart-panel");
  if (!panel) return false;
  if (panel.classList.contains("open")) return true;

  if (!panel.classList.contains("collapsed") && panel.getAttribute("aria-hidden") !== "true") {
    return true;
  }

  if (typeof BottomChart?.isOpen === "function") return BottomChart.isOpen();
  return false;
}

function formatDayLabelUTC(dayTs) {
  return formatDateFR(dayTs);
}

function formatDateInputValue(ts) {
  if (!Number.isFinite(ts)) return "";
  const d = new Date(ts);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateInputValue(value, { endOfDayValue = false } = {}) {
  const m = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const ts = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return endOfDayValue ? endOfDay(ts) : ts;
}

function getPlaybackTimelineMaxTime() {
  const eventTimes = (allEvents || [])
    .map(ev => getEventTime(ev))
    .filter(Number.isFinite);
  const candidates = [
    ...eventTimes,
    ...OCCUPATION_MAX_TIMES.filter(Number.isFinite)
  ];
  let maxTime = candidates.length ? Math.max(...candidates) : PLAYBACK_START_TIME;
  if (Number.isFinite(PLAYBACK_END_TIME)) maxTime = Math.min(maxTime, PLAYBACK_END_TIME);
  return endOfDay(maxTime);
}

function getPlaybackWindowStartTime() {
  return Number.isFinite(playbackWindowStartTime) ? playbackWindowStartTime : PLAYBACK_START_TIME;
}

function getPlaybackWindowEndTime() {
  return Number.isFinite(playbackCutoffTime) ? playbackCutoffTime : getPlaybackTimelineMaxTime();
}

function eventPassesPlaybackWindow(ev, { startTime = getPlaybackWindowStartTime(), cutoffTime = playbackCutoffTime } = {}) {
  const t = getEventTime(ev);
  if (!Number.isFinite(t)) return false;
  if (Number.isFinite(startTime) && t < startTime) return false;
  if (cutoffTime !== null && Number.isFinite(cutoffTime) && t > cutoffTime) return false;
  return true;
}

function updatePlaybackDateUI() {
  const el = document.querySelector(".playback-date");
  if (!el) return;

  if (playbackCutoffTime == null) {
    el.textContent = "";
    return;
  }

  const startTime = getPlaybackWindowStartTime();
  el.textContent = Number.isFinite(startTime)
    ? `${formatDateFR(startTime)} - ${formatDateFR(playbackCutoffTime)}`
    : formatDateFR(playbackCutoffTime);
}

function setPlaybackWindowStartFromTimeline(ts, { allowBeforeMin = false, allowBeyondMax = false, ignoreCurrentEnd = false } = {}) {
  Playback.pause?.();

  const dayStart = startOfDayUTC(ts);
  if (!Number.isFinite(dayStart)) return;

  const defaultMinStart = startOfDayUTC(PLAYBACK_START_TIME);
  const minStart = allowBeforeMin ? Math.min(defaultMinStart, dayStart) : defaultMinStart;
  const timelineMaxStart = startOfDayUTC(getPlaybackTimelineMaxTime());
  const maxStart = allowBeyondMax ? Math.max(timelineMaxStart, dayStart) : timelineMaxStart;
  const endDay = !ignoreCurrentEnd && Number.isFinite(playbackCutoffTime) ? startOfDayUTC(playbackCutoffTime) : null;
  const upperBound = Number.isFinite(endDay) ? Math.min(endDay, maxStart) : maxStart;
  const nextStart = Math.min(Math.max(dayStart, minStart), upperBound);

  playbackWindowStartTime = nextStart;
  updatePlaybackDateUI?.();
}

function setPlaybackCutoffFromTimeline(ts, { allowBeforeMin = false, allowBeyondMax = false } = {}) {
  Playback.pause?.();

  const startTime = getPlaybackWindowStartTime();
  const minEnd = Number.isFinite(startTime)
    ? startOfDayUTC(startTime) + (24 * 3600 * 1000) - 1
    : null;
  const maxEnd = allowBeyondMax ? Math.max(getPlaybackTimelineMaxTime(), endOfDay(ts)) : getPlaybackTimelineMaxTime();
  const defaultMinBound = PLAYBACK_START_TIME;
  const minBound = Number.isFinite(minEnd)
    ? minEnd
    : (allowBeforeMin ? Math.min(defaultMinBound, ts) : defaultMinBound);
  const nextCutoff = Math.min(Math.max(ts, minBound), maxEnd);

  let idx = -1;
  for (let i = 0; i < playbackSequence.length; i++) {
    const t = getEventTime(playbackSequence[i]);
    if (!Number.isFinite(t)) continue;
    if (t <= nextCutoff) idx = i;
    else break;
  }

  setPlaybackState({
    playbackCutoffTime: nextCutoff,
    playbackIndex: idx
  });

  updateOccupationLayer(nextCutoff).catch(showLoadingError);
  updatePlaybackDateUI?.();
}

function updateBottomChart(force = false) {
  BottomChart.update({
    force,

    getState: () => ({
      allEvents,
      selectedTypes,
      selectedOblast: statsSelectedOblast,
      selectedVille: statsSelectedVille,
      playbackActive,
      playbackWindowStartTime: getPlaybackWindowStartTime(),
      playbackCutoffTime,
      currentLang,
      getEventOblast
    }),

    pausePlayback: Playback.pause,
    render: afficherEvenements,

    setPlaybackWindowStartTime: setPlaybackWindowStartFromTimeline,
    setPlaybackCutoffTime: setPlaybackCutoffFromTimeline,

    getDisplayLabelForType: (type) => getDisplayLabelForType(type, currentLang),
    typeConfigKeys: Object.keys(TYPE_CONFIG),
    typeColors: TYPE_COLORS,
    formatDayLabelUTC,
    getEventTime,
    startOfDayUTC,
    playbackStartTime: PLAYBACK_START_TIME,
    playbackMaxTime: getPlaybackTimelineMaxTime()
  });
}

function getAppState() {
  return {
    allEvents,
    selectedTypes,
    setSelectedTypes: (next) => { selectedTypes = next; },
  };
}


/// === ICÔNES ===

function createMarkerIcon(type) {
  const cfg = TYPE_CONFIG[type];
  if (!cfg) return L.icon({ iconUrl: DEFAULT_ICON_URL, iconSize: [24, 24] });

  const element = document.createElement("div");
  element.className = "marker-icon marker-" + normalizeType(cfg.slug);
  element.style.backgroundImage = "url(" + JSON.stringify(iconUrl(cfg.file)) + ")";
  return L.divIcon({
    html: element,
    className: "",
    iconSize: [36, 36],
    popupAnchor: [0, -12]
  });
}

function createLegendIcon(type) {
  const cfg = TYPE_CONFIG[type];
  const url = cfg ? iconUrl(cfg.file) : DEFAULT_ICON_URL;
  return L.icon({ iconUrl: url, iconSize: [36, 36] });
}


function getLegendIconUrl(type) {
  return createLegendIcon(type).options.iconUrl;
}



/// === PANELS (gauche/droite) ===

function syncUtilityMenuState() {
  const eventPanelOpen = document.getElementById("event-panel")?.classList.contains("expanded");
  const countryPanelOpen = document.getElementById("country-panel")?.classList.contains("expanded");
  const chartOpen = document.getElementById("bottom-chart-panel")?.classList.contains("open");

  document.getElementById("utility-events-toggle")?.classList.toggle("active", !!eventPanelOpen);
  const regionsBtn = document.getElementById("utility-regions-mode-toggle");
  regionsBtn?.classList.toggle("active", regionsModeActive);
  regionsBtn?.setAttribute("aria-pressed", regionsModeActive ? "true" : "false");
  document.getElementById("utility-country-toggle")?.classList.toggle("active", !!countryPanelOpen);
  document.getElementById("utility-chart-toggle")?.classList.toggle("active", !!chartOpen);
}

function setPanelExpanded(expanded) {
  const panel = document.getElementById("event-panel");
  if (!panel) return;

  const shouldExpand = expanded === "toggle"
    ? !panel.classList.contains("expanded")
    : !!expanded;
  const countryPanel = document.getElementById("country-panel");

  panel.classList.toggle("expanded", shouldExpand);
  panel.classList.toggle("collapsed", !shouldExpand);

  if (shouldExpand) {
    countryPanel?.classList.remove("expanded");
    countryPanel?.classList.add("collapsed");
  }

  syncUtilityMenuState();
}

function setRightPanelExpanded(expanded) {
  const panel = document.getElementById("country-panel");
  if (!panel) return;

  const shouldExpand = expanded === "toggle"
    ? !panel.classList.contains("expanded")
    : !!expanded;
  const eventPanel = document.getElementById("event-panel");

  panel.classList.toggle("expanded", shouldExpand);
  panel.classList.toggle("collapsed", !shouldExpand);

  if (shouldExpand) {
    eventPanel?.classList.remove("expanded");
    eventPanel?.classList.add("collapsed");
  }

  syncUtilityMenuState();
}


/// === LISTE : focus event ===

function highlightEventInList(ev) {
  const targetId = buildEventId(ev);
  const target = document.getElementById(targetId);
  const list = document.getElementById("event-list");
  if (!target || !list) return;

  const EMBED_MODE = window.self !== window.top;

  setTimeout(() => {
    if (!EMBED_MODE) {
      target.scrollIntoView({ behavior: "auto", block: "start" });
    } else {
      const listRect = list.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();

      const top =
        list.scrollTop +
        (targetRect.top - listRect.top) -
        12; // petit padding visuel

      list.scrollTo({ top, behavior: "auto" });
    }

    target.classList.add("highlighted");
    setTimeout(() => target.classList.remove("highlighted"), 1500);
  }, 150);
}


function spiderfyIfClustered(clusterGroup, marker, { zoom = null } = {}) {
  if (!clusterGroup || !marker) return;

  if (Number.isFinite(zoom) && map.getZoom() < zoom) {
    map.setZoom(zoom, { animate: true });
  }

  clusterGroup.zoomToShowLayer(marker, () => {
    const parent = clusterGroup.getVisibleParent(marker);
    if (parent && parent !== marker && typeof parent.spiderfy === "function") parent.spiderfy();
    if (marker.getLatLng) map.panTo(marker.getLatLng(), { animate: true });
  });
}

function focusEvent(ev, marker = null) {
  setPanelExpanded(true);
  highlightEventInList(ev);
  const EMBED_MODE = window.self !== window.top;

  if (marker?.getLatLng) map.setView(marker.getLatLng(), map.getZoom(), { animate: true });
  else if (Number.isFinite(ev?.lat) && Number.isFinite(ev?.lng)) map.setView([ev.lat, ev.lng], map.getZoom(), { animate: true });

  spiderfyIfClustered(EventsRenderer.getClusterGroup(), marker, { zoom: null });
}


/// === STATUTS DES OBLASTS (panneau de statistiques) ===

let oblastStatusByShapeName = null;

async function loadOblastStatusJson() {
  if (oblastStatusData) return oblastStatusData;

  const resp = await fetch(OBLAST_STATUS_URL);
  if (!resp.ok) return null;

  oblastStatusData = await resp.json();

  oblastStatusByShapeName = new Map();
  for (const row of oblastStatusData) {
    if (row.Geojson) oblastStatusByShapeName.set(row.Geojson, row);
  }

  return oblastStatusData;
}

async function loadOblastsGeojson() {
  if (ukraineOblastsData) return ukraineOblastsData;
  if (!regionsGeojsonPromise) {
    regionsGeojsonPromise = (async () => {
      const response = await fetch(withV(FILES.geojson.regions));
      if (!response.ok) throw new Error("GeoJSON " + FILES.geojson.regions + ": HTTP " + response.status);
      ukraineOblastsData = await response.json();
      return ukraineOblastsData;
    })().catch(error => {
      regionsGeojsonPromise = null;
      throw error;
    });
  }
  return regionsGeojsonPromise;
}

async function loadBorderGeojson() {
  if (borderGeojsonData) return borderGeojsonData;
  if (!borderGeojsonPromise) {
    borderGeojsonPromise = (async () => {
      const response = await fetch(withV(FILES.geojson.contour));
      if (!response.ok) throw new Error("GeoJSON " + FILES.geojson.contour + ": HTTP " + response.status);
      borderGeojsonData = await response.json();
      return borderGeojsonData;
    })().catch(error => {
      borderGeojsonPromise = null;
      throw error;
    });
  }
  return borderGeojsonPromise;
}

/// === OBLAST HIGHLIGHT ===

function clearOblastHighlight() {
  if (currentOblastLayer && map) {
    map.removeLayer(currentOblastLayer);
    currentOblastLayer = null;
  }
}

async function highlightOblastByShapeName(shapeName) {
  if (!shapeName || !map) return;
  if (regionsModeActive) return;
  if (lastHighlightedOblast === shapeName) return;

  lastHighlightedOblast = shapeName;
  clearOblastHighlight();

  const data = await loadOblastsGeojson();
  if (!data || regionsModeActive || lastHighlightedOblast !== shapeName) return;

  const feature = (data.features || []).find(f => (f?.properties?.shapeName || "") === shapeName);
  if (!feature) return;

  currentOblastLayer = geojsonRenderer.createLayer(feature, {
    style: REGLAGES.stylesGeojson.selection,
    interactive: false,
    className: "oblast-highlight"
  }).addTo(map);
}

async function highlightOblastForEvent(ev) {
  const shapeName = getEventGeojsonName(ev);
  if (!shapeName) return;
  return highlightOblastByShapeName(shapeName);
}


/// === UKRAINE BORDER ===

async function loadUkraineBorder() {
  if (!map || !FEATURES.contour?.enabled || regionsModeActive) return;
  const seq = ++borderRenderSeq;
  const data = await loadBorderGeojson();
  if (seq !== borderRenderSeq || regionsModeActive || ukraineBorderLayer) return;
  ukraineBorderLayer = geojsonRenderer.createLayer(data, {
    style: REGLAGES.stylesGeojson.contour,
    interactive: false,
    className: "ukraine-border"
  }).addTo(map);
  const bounds = ukraineBorderLayer.getBounds();
  if (MAP_SETTINGS.ajusterAuContour && bounds.isValid()) map.fitBounds(bounds, { maxZoom: MAP_SETTINGS.zoomMaximumContour });
}

function removeUkraineBorderLayer() {
  borderRenderSeq++;
  if (ukraineBorderLayer && map) {
    map.removeLayer(ukraineBorderLayer);
  }
  ukraineBorderLayer = null;
}

function getRegionCountLabel(count) {
  if (currentLang === "en") return count === 1 ? "1 case" : `${count} cases`;
  return count === 1 ? "1 cas" : `${count} cas`;
}

function clearRegionsChoroplethLayer({ cancelPending = false } = {}) {
  if (cancelPending) regionsChoroplethSeq++;
  if (regionsChoroplethLayer && map) {
    map.removeLayer(regionsChoroplethLayer);
  }
  regionsChoroplethLayer = null;
}

function getRegionTooltipContent(shapeName) {
  const label = getOblastDisplayNameForShape(shapeName) || shapeName;
  const count = regionsChoroplethCounts.get(shapeName) || 0;
  return `${escapeHtml(label)} · ${escapeHtml(getRegionCountLabel(count))}`;
}

function getRegionChoroplethStyle(feature) {
  const shapeName = getFeatureShapeName(feature);
  const count = regionsChoroplethCounts.get(shapeName) || 0;
  const opacity = count ? REGLAGES.choropleth.opaciteAvecCas : REGLAGES.choropleth.opaciteSansCas;
  return {
    stroke: true,
    fill: true,
    color: REGLAGES.choropleth.contour,
    weight: REGLAGES.choropleth.epaisseurContour,
    opacity: 1,
    fillColor: getRegionCountColor(count, regionsChoroplethMaxCount),
    fillOpacity: opacity
  };
}

async function renderRegionsChoroplethLayer() {
  if (!map || !regionsModeActive) {
    clearRegionsChoroplethLayer({ cancelPending: true });
    return;
  }

  const seq = ++regionsChoroplethSeq;
  const data = await loadOblastsGeojson();
  if (!data || seq !== regionsChoroplethSeq || !regionsModeActive) return;

  const validShapes = new Set(data.features.map(feature => getFeatureShapeName(feature)).filter(Boolean));
  const countsByShape = new Map();
  for (const ev of (allEvents || []).filter(eventPassesRegionsChoroplethFilters)) {
    const shapeName = getEventGeojsonName(ev);
    if (!shapeName || !validShapes.has(shapeName)) continue;
    countsByShape.set(shapeName, (countsByShape.get(shapeName) || 0) + 1);
  }

  regionsChoroplethCounts = countsByShape;
  regionsChoroplethMaxCount = Math.max(1, ...countsByShape.values());

  // Les filtres changent les couleurs et les compteurs, pas les geometries.
  if (regionsChoroplethLayer) {
    regionsChoroplethLayer.setStyle(getRegionChoroplethStyle);
    regionsChoroplethLayer.eachLayer(layer => {
      layer.getTooltip()?.setContent(getRegionTooltipContent(getFeatureShapeName(layer.feature)));
    });
    return;
  }

  regionsChoroplethLayer = geojsonRenderer.createLayer(data, {
    pane: "overlayPane",
    className: "regions-choropleth-layer",
    style: getRegionChoroplethStyle,
    onEachFeature: (feature, layer) => {
      const shapeName = getFeatureShapeName(feature);
      layer.bindTooltip(getRegionTooltipContent(shapeName), {
        sticky: true,
        direction: "top",
        className: "regions-choropleth-tooltip"
      });

      layer.on({
        tooltipopen: event => {
          event.tooltip.setContent(getRegionTooltipContent(shapeName));
        },
        click: (e) => {
          L.DomEvent.stop(e);
          e?.originalEvent?.target?.blur?.();
          if (!regionsChoroplethCounts.get(shapeName)) return;
          const nextOblast = getOblastDisplayNameForShape(shapeName);
          if (nextOblast) applyTitleOblastFilter(nextOblast);
        }
      });
    }
  }).addTo(map);
}

function setRegionsMode(active) {
  const next = Boolean(active && FEATURES.choropleth?.enabled);
  if (regionsModeActive === next) return;

  regionsModeActive = next;
  lastHighlightedOblast = null;
  clearOblastHighlight();

  if (regionsModeActive) {
    removeUkraineBorderLayer();
    OccupationCtrl?.clear?.();
    OccupationLegend?.remove?.();
  } else {
    clearRegionsChoroplethLayer({ cancelPending: true });
    loadUkraineBorder().catch(showLoadingError);
    OccupationLegend?.mount?.(map);
  }

  afficherEvenements();
  syncUtilityMenuState();
}


/// === PANEL DROIT : filtre local par type (legend like bottom chart) ===

function initRightPanelVisibleTypes() {
  if (rightPanelVisibleTypes.size === 0) {
    Object.keys(TYPE_CONFIG).forEach(t => rightPanelVisibleTypes.add(t));
  }
}

function ensureRightPanelLegend({ onChange } = {}) {
  const legend = document.getElementById("right-panel-legend");
  if (!legend) return;

  initRightPanelVisibleTypes();

  legend.innerHTML = "";

  const typeKeys = Object.keys(TYPE_CONFIG);
  typeKeys.forEach(type => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "chart-tab-btn right-panel-legend-button";

    const isOn = rightPanelVisibleTypes.has(type);
    item.classList.toggle("active", isOn);
    item.setAttribute("aria-pressed", String(isOn));

    const sw = document.createElement("span");
    sw.className = "bottom-chart-swatch";
    sw.style.background = TYPE_COLORS[type] || REGLAGES.stylesGeojson?.fallbackColor || "#999";
    sw.setAttribute("aria-hidden", "true");

    const lab = document.createElement("span");
    lab.textContent = getDisplayLabelForType(type, currentLang);

    item.appendChild(sw);
    item.appendChild(lab);

    item.addEventListener("click", () => {
      if (rightPanelVisibleTypes.has(type)) rightPanelVisibleTypes.delete(type);
      else rightPanelVisibleTypes.add(type);

      const isOn = rightPanelVisibleTypes.has(type);
      item.classList.toggle("active", isOn);
      item.setAttribute("aria-pressed", String(isOn));
      onChange?.();
    });

    legend.appendChild(item);
  });
}


/// === PANEL DROIT (stats) ===

let oblastPanelSeq = 0;

function getStatusForShapeName(shapeName) {
  if (!shapeName) return null;
  return oblastStatusByShapeName?.get(shapeName) || null;
}

async function updateOblastPanel(oblastName) {
  const requestId = ++oblastPanelSeq;
  const nameEl = document.getElementById("country-name");
  const chartTabsEl = document.getElementById("country-chart-tabs");
  if (!nameEl) return;

  let statusEl = document.getElementById("country-status");
  if (!statusEl) {
    statusEl = document.createElement("div");
    statusEl.id = "country-status";
    statusEl.className = "country-status";
    nameEl.insertAdjacentElement("afterend", statusEl);
  }

  if (!oblastName) {
    nameEl.textContent = UI_STRINGS[currentLang].ui.selectOblast;
    statusEl.style.display = "none";

    ensureRightPanelLegend({ onChange: () => renderOverviewStackedChart(overviewMode) });
    renderOverviewStackedChart(overviewMode);
    return;
  }

  nameEl.innerHTML = `
    <span class="country-title-text">${escapeHtml(oblastName)}</span>
    <button id="country-clear-filter" class="country-clear-btn" title="Supprimer le filtre">✕</button>
  `;

  const clearBtn = document.getElementById("country-clear-filter");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      Playback.pause();
      OblastFilters.clearFiltersPreservePlayback({ resetZoom: false });
      setRightPanelExpanded(true);
    });
  }

  await loadOblastStatusJson();
  if (requestId !== oblastPanelSeq) return;
  const shapeName = getShapeNameForSelectedOblast(oblastName);
  const st = getStatusForShapeName(shapeName);

  if (!st) {
    statusEl.style.display = "none";
  } else {
    const statusLabel = (currentLang === "en") ? (st.Statut_en || st.Statut) : st.Statut;

    statusEl.style.display = "flex";
    statusEl.replaceChildren();

    const dot = document.createElement("span");
    dot.className = "country-status-dot";
    dot.title = statusLabel;
    dot.dataset.tooltip = statusLabel;
    dot.setAttribute("role", "img");
    dot.setAttribute("aria-label", statusLabel);
    dot.tabIndex = 0;
    statusEl.appendChild(dot);
  }

  if (chartTabsEl) chartTabsEl.innerHTML = "";

  ensureRightPanelLegend({ onChange: () => renderOverviewStackedChart(overviewMode) });
  renderOverviewStackedChart(overviewMode);
}


/// === PANEL DROIT : construction + rendu ===

function buildStackedCountsByGroup({ groupBy, onlyOblast = null, startTime = null, cutoffTime = null }) {
  initRightPanelVisibleTypes();

  const allCats = Object.keys(TYPE_CONFIG);
  const keyFn = (ev) => (groupBy === "villes" ? ev.lieu || null : getEventOblast(ev) || null);

  const counts = Object.create(null);
  for (const ev of allEvents) {
    if (onlyOblast && getEventOblast(ev) !== onlyOblast) continue;

    if (!eventPassesPlaybackWindow(ev, { startTime, cutoffTime })) continue;

    const g = keyFn(ev);
    if (!g) continue;

    const type = ev.type_violence;
    if (!TYPE_CONFIG[type]) continue;
    if (!rightPanelVisibleTypes.has(type)) continue;

    if (!counts[g]) {
      counts[g] = Object.create(null);
      for (const cat of allCats) counts[g][cat] = 0;
    }
    counts[g][type] += 1;
  }

  const rows = Object.entries(counts).map(([name, byType]) => {
    const total = allCats.reduce((acc, cat) => acc + (byType[cat] || 0), 0);
    return { name, byType, total };
  });

  rows.sort((a, b) => b.total - a.total);
  return { rows, allCats };
}

function getOrCreateRightChartWrapper(container) {
  let chartWrapper = container.querySelector(".chart-bars");
  if (!chartWrapper) {
    container.innerHTML = "";
    chartWrapper = document.createElement("div");
    chartWrapper.className = "chart-bars";
    container.appendChild(chartWrapper);
  }
  return chartWrapper;
}

function upsertRightChartRow({ chartWrapper, name, allCats }) {
  let entry = rightChartRowsByName.get(name);
  if (entry && entry.rowEl?.isConnected) return entry;

  const row = document.createElement("div");
  row.className = "chart-bar-row";
  row.style.willChange = "transform";

  const label = document.createElement("span");
  label.className = "chart-bar-label";
  label.textContent = name;

  const bar = document.createElement("div");
  bar.className = "chart-bar";

  const value = document.createElement("span");
  value.className = "chart-bar-value";
  value.textContent = "0";

  row.appendChild(label);
  row.appendChild(bar);
  row.appendChild(value);
  chartWrapper.appendChild(row);

  const segElsByType = new Map();
  for (const cat of allCats) {
    const seg = document.createElement("div");
    seg.className = `chart-bar-segment chart-bar-fill chart-bar-fill-${getTypeSlugFromCategory(cat)}`;
    seg.style.width = "0%";
    seg.style.transition = "width 220ms ease";
    bar.appendChild(seg);
    segElsByType.set(cat, seg);
  }

  entry = { rowEl: row, labelEl: label, barEl: bar, valueEl: value, segElsByType };
  rightChartRowsByName.set(name, entry);
  return entry;
}

function animateReorderFLIPWithFirst(items, firstTopByEl) {
  requestAnimationFrame(() => {
    for (const it of items) {
      const row = it.rowEl;
      const firstTop = firstTopByEl.get(row);
      if (firstTop == null) continue;

      const lastTop = row.getBoundingClientRect().top;
      const dy = firstTop - lastTop;
      if (!dy) continue;

      row.style.transition = "none";
      row.style.transform = `translateY(${dy}px)`;

      requestAnimationFrame(() => {
        row.style.transition = "transform 220ms ease";
        row.style.transform = "translateY(0)";
      });
    }
  });
}

function renderOverviewStackedChart(groupBy) {
  const container = document.getElementById("country-chart-container");
  const tabsEl = document.getElementById("country-chart-tabs");
  if (!container) return;

  const ui = UI_STRINGS[currentLang]?.ui;
  const availableViews = REGLAGES.controles.statistiques.vues;
  if (!availableViews.includes(groupBy)) groupBy = availableViews[0] || "oblasts";
  overviewMode = groupBy;

  // boutons toggle "Oblasts / Villes"
  if (tabsEl) {
    tabsEl.innerHTML = "";

    availableViews.forEach(view => {
      const button = document.createElement("button");
      button.className = "chart-tab-btn";
      button.type = "button";
      button.textContent = view === "villes" ? (ui?.villesBtn ?? "Villes") : (ui?.oblastsBtn ?? "Oblasts");
      button.setAttribute("aria-pressed", groupBy === view ? "true" : "false");
      if (groupBy === view) button.classList.add("active");
      button.addEventListener("click", () => renderOverviewStackedChart(view));
      tabsEl.appendChild(button);
    });
  }

  // cutoff à date + filtre villes si oblast filtré
  const startTime = getPlaybackWindowStartTime();
  const cutoffTime = playbackCutoffTime;
  const onlyOblast = (groupBy === "villes") ? statsSelectedOblast : null;


  const { rows, allCats } = buildStackedCountsByGroup({
    groupBy,
    onlyOblast,
    startTime,
    cutoffTime
  });

  if (!rows.length) {
    container.innerHTML = `<p class="chart-placeholder">${ui?.chartNoEvents ?? "Aucune donnée"}</p>`;
    return;
  }

  const MAX_ROWS = (groupBy === "villes")
    ? REGLAGES.controles.statistiques.lignesMaximumEmplacements
    : REGLAGES.controles.statistiques.lignesMaximumZones;
  const shown = rows.slice(0, MAX_ROWS);
  const maxTotal = shown[0]?.total || 1;
  const chartWrapper = getOrCreateRightChartWrapper(container);
  const usedNames = new Set();
  const rowEntries = [];
  const firstTopByEl = new Map();


  for (const { name } of shown) {
    const entry = upsertRightChartRow({ chartWrapper, name, allCats });
    entry.rowEl.style.display = ""; // visible
    usedNames.add(name);
    rowEntries.push(entry);
    firstTopByEl.set(entry.rowEl, entry.rowEl.getBoundingClientRect().top);
  }

  for (const [name, entry] of rightChartRowsByName.entries()) {
    if (!entry?.rowEl?.isConnected) continue;
    if (!usedNames.has(name)) {
      entry.rowEl.style.display = "none";
      entry.rowEl.style.order = "9999";
    }
  }

  shown.forEach(({ name, byType, total }, idx) => {
    const entry = rightChartRowsByName.get(name);
    if (!entry) return;

    entry.rowEl.style.order = String(idx);

    entry.rowEl.classList.toggle(
      "is-current-country",
      (groupBy === "oblasts" && statsSelectedOblast && name === statsSelectedOblast) ||
      (groupBy === "villes" && statsSelectedVille && name === statsSelectedVille)
    );

    entry.valueEl.textContent = String(total);

    entry.labelEl.style.cursor = "pointer";
    entry.labelEl.title = (currentLang === "en") ? "Filter" : "Filtrer";
    entry.labelEl.onclick = () => {
      Playback.pause?.();

      if (groupBy === "oblasts") {
        selectedOblast = name;
        selectedVille = null;
        statsSelectedOblast = name;
        statsSelectedVille = null;


        const input = document.getElementById("lieu-filter");
        if (input) input.value = name;

        villesDisponibles = Array.from(new Set(
          allEvents.filter(ev => getEventOblast(ev) === name).map(ev => ev.lieu)
        ))
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));

        OblastFilters.initVilleDropdown();
        updateOblastPanel(name);
        setRightPanelExpanded(true);

        const ev0 = allEvents.find(ev => getEventOblast(ev) === name);
        if (ev0) highlightOblastForEvent?.(ev0);

        zoomToOblast(name);
        setPanelExpanded(true);
        afficherEvenements();
      } else {
        const ville = name;

        const ev0 = allEvents.find(ev =>
          ev.lieu === ville && (!selectedOblast || getEventOblast(ev) === selectedOblast)
        );
        const ob = ev0 ? getEventOblast(ev0) : null;

        if (!ob) {
          selectedVille = ville;
          afficherEvenements();
          return;
        }

        selectedOblast = ob;
        selectedVille = ville;
        statsSelectedOblast = ob;
        statsSelectedVille = ville;


        const input = document.getElementById("lieu-filter");
        if (input) input.value = ob;

        villesDisponibles = Array.from(
          new Set(allEvents.filter(ev => getEventOblast(ev) === ob).map(ev => ev.lieu))
        )
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));

        OblastFilters.initVilleDropdown();
        const select = document.getElementById("ville-select");
        if (select) select.value = ville;

        setPanelExpanded(true);
        updateOblastPanel(ob);
        setRightPanelExpanded(true);

        if (ev0) highlightOblastForEvent?.(ev0);
        afficherEvenements();

        if (Number.isFinite(ev0?.lat) && Number.isFinite(ev0?.lng) && map) {
          map.setView([ev0.lat, ev0.lng], 7, { animate: true });
        }
      }
    };

    const totalWidthPct = (total / maxTotal) * 100;
    for (const cat of allCats) {
      const v = byType[cat] || 0;
      const seg = entry.segElsByType.get(cat);
      if (!seg) continue;

      const segPct = (total > 0) ? (v / total) * totalWidthPct : 0;
      seg.style.width = `${segPct}%`;
      seg.style.display = v > 0 ? "block" : "none";
    }
  });

  animateReorderFLIPWithFirst(rowEntries, firstTopByEl);
}

function setStatsSelection({ oblast = null, ville = null } = {}) {
  statsSelectedOblast = oblast;
  statsSelectedVille = ville;

  // panel droit : titre + graphs
  updateOblastPanel(oblast);

  // graphs (si ton updateOblastPanel appelle déjà renderOverviewStackedChart, tu peux enlever la ligne)
  renderOverviewStackedChart(overviewMode);

  // bottom chart : si ouvert, refresh immédiat
  if (BottomChart?.isOpen?.()) updateBottomChart(true);
}


/// === RENDU ÉVÉNEMENTS ===

function populateTitleOblastSelect() {
  const select = document.getElementById("title-oblast-select");
  if (!select) return;

  const previous = selectedOblast || "";
  select.innerHTML = "";

  const optAll = document.createElement("option");
  optAll.value = "";
  optAll.textContent = currentLang === "en" ? "All regions" : "Toutes les regions";
  select.appendChild(optAll);

  (oblastsDisponibles || []).forEach(oblast => {
    const opt = document.createElement("option");
    opt.value = oblast;
    opt.textContent = oblast;
    select.appendChild(opt);
  });

  select.value = (oblastsDisponibles || []).includes(previous) ? previous : "";
}

function getTitleCalendarLabel(key) {
  const labels = {
    calendarStart: currentLang === "en" ? "Start" : "Début",
    calendarEnd: currentLang === "en" ? "End" : "Fin"
  };
  return labels[key] || key;
}

function isPlaybackWindowDefault() {
  const startTime = getPlaybackWindowStartTime();
  const endTime = getPlaybackWindowEndTime();
  return Number.isFinite(startTime) &&
    Number.isFinite(endTime) &&
    startOfDayUTC(startTime) === startOfDayUTC(PLAYBACK_START_TIME) &&
    startOfDayUTC(endTime) >= startOfDayUTC(getPlaybackTimelineMaxTime());
}

function syncTitleCalendarControls() {
  const startInput = document.getElementById("title-calendar-start");
  const endInput = document.getElementById("title-calendar-end");
  const startControl = document.getElementById("title-calendar-start-button");
  const endControl = document.getElementById("title-calendar-end-button");
  const startLabel = document.getElementById("title-calendar-start-label");
  const endLabel = document.getElementById("title-calendar-end-label");
  if (!startInput && !endInput && !startControl && !endControl) return;

  const startTime = getPlaybackWindowStartTime();
  const endTime = getPlaybackWindowEndTime();
  const minValue = formatDateInputValue(PLAYBACK_START_TIME);
  const maxValue = formatDateInputValue(getPlaybackTimelineMaxTime());
  const startValue = formatDateInputValue(startTime);
  const endValue = formatDateInputValue(endTime);
  const startIsDefault = startOfDayUTC(startTime) === startOfDayUTC(PLAYBACK_START_TIME);
  const endIsDefault = startOfDayUTC(endTime) >= startOfDayUTC(getPlaybackTimelineMaxTime());

  if (startLabel) startLabel.textContent = getTitleCalendarLabel("calendarStart");
  if (endLabel) endLabel.textContent = getTitleCalendarLabel("calendarEnd");

  if (startInput) {
    startInput.min = minValue;
    startInput.max = endValue || maxValue;
    startInput.value = startValue;
    startInput.title = formatDateFR(startTime);
  }

  if (startControl) {
    startControl.title = formatDateFR(startTime);
    startControl.setAttribute("aria-label", `${getTitleCalendarLabel("calendarStart")} ${formatDateFR(startTime)}`);
  }

  if (endInput) {
    endInput.min = startValue || minValue;
    endInput.max = maxValue;
    endInput.value = endValue;
    endInput.title = formatDateFR(endTime);
  }

  if (endControl) {
    endControl.title = formatDateFR(endTime);
    endControl.setAttribute("aria-label", `${getTitleCalendarLabel("calendarEnd")} ${formatDateFR(endTime)}`);
  }

  startControl?.classList.toggle("active", !startIsDefault);
  endControl?.classList.toggle("active", !endIsDefault);
}

function openTitleDateInput(input) {
  if (!input) return;

  if (input.type !== "date") input.type = "date";
  input.focus({ preventScroll: true });

  if (typeof input.showPicker === "function") {
    try {
      input.showPicker();
      return;
    } catch (err) {
      // showPicker can fail for visually hidden inputs; click fallback below.
    }
  }

  input.click();
}

function applyTitleCalendarInputs() {
  const startInput = document.getElementById("title-calendar-start");
  const endInput = document.getElementById("title-calendar-end");

  const nextStart = parseDateInputValue(startInput?.value);
  const nextEnd = parseDateInputValue(endInput?.value, { endOfDayValue: true });

  if (Number.isFinite(nextStart)) setPlaybackWindowStartFromTimeline(nextStart);
  if (Number.isFinite(nextEnd)) setPlaybackCutoffFromTimeline(nextEnd);

  afficherEvenements();
  updateBottomChart(true);
  syncTitleFilterControls();
}

function resetPlaybackWindowToDefault() {
  playbackWindowStartTime = PLAYBACK_START_TIME;
  setPlaybackCutoffFromTimeline(getPlaybackTimelineMaxTime());
}

function syncTitleFilterControls() {
  const oblastSelect = document.getElementById("title-oblast-select");
  if (oblastSelect && oblastSelect.value !== (selectedOblast || "")) {
    oblastSelect.value = selectedOblast || "";
  }

  syncTitleCalendarControls();

  const villeSelect = document.getElementById("ville-select");
  syncTitleClearButton();
  if (!villeSelect) return;

  const hasOblast = Boolean(selectedOblast);
  if (!hasOblast && selectedVille) {
    selectedVille = null;
    statsSelectedVille = null;
  }

  const villes = hasOblast
    ? (villesDisponibles.length ? villesDisponibles : getVillesForOblast(selectedOblast))
    : getAllVilles();

  if (selectedVille && !villes.includes(selectedVille)) {
    selectedVille = null;
    statsSelectedVille = null;
  }

  populateTitleVilleSelect(villes);
  villeSelect.classList.remove("hidden");
  villeSelect.disabled = !hasOblast;
  villeSelect.classList.toggle("is-muted", !hasOblast);
  villeSelect.setAttribute("aria-disabled", hasOblast ? "false" : "true");
  villeSelect.title = hasOblast
    ? ""
    : (currentLang === "en" ? "Select a region first" : "Sélectionnez d'abord une région");
  syncTitleClearButton();
}

function populateTitleVilleSelect(villes) {
  const select = document.getElementById("ville-select");
  if (!select) return;

  const previous = selectedVille || "";
  select.innerHTML = "";

  const optAll = document.createElement("option");
  optAll.value = "";
  optAll.textContent = currentLang === "en" ? "All cities" : "Toutes les villes";
  select.appendChild(optAll);

  (villes || []).forEach(ville => {
    const opt = document.createElement("option");
    opt.value = ville;
    opt.textContent = ville;
    select.appendChild(opt);
  });

  select.value = (villes || []).includes(previous) ? previous : "";
  select.onchange = () => {
    Playback.pause?.();
    selectedVille = select.value || null;
    statsSelectedVille = selectedVille;

    afficherEvenements();

    if (!selectedVille || !map) return;
    const ev0 = allEvents.find(ev =>
      ev.lieu === selectedVille && (!selectedOblast || getEventOblast(ev) === selectedOblast)
    );
    if (ev0 && Number.isFinite(ev0.lat) && Number.isFinite(ev0.lng)) {
      map.setView([ev0.lat, ev0.lng], 7, { animate: true });
    }
  };
}

function getVillesForOblast(oblast) {
  return Array.from(
    new Set(
      allEvents
        .filter(ev => getEventOblast(ev) === oblast)
        .map(ev => ev.lieu)
    )
  )
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
}

function getAllVilles() {
  return Array.from(new Set((allEvents || []).map(ev => ev.lieu)))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
}

function getAllEventTypes() {
  return Array.from(new Set((allEvents || []).map(ev => ev.type_violence))).filter(Boolean);
}

function hasActiveTitleFilters() {
  const allTypeCount = getAllEventTypes().length;
  const allTypesSelected = allTypeCount === 0 || selectedTypes.size === 0 || selectedTypes.size === allTypeCount;
  return Boolean(selectedOblast || selectedVille || !isPlaybackWindowDefault()) || !allTypesSelected;
}

function syncTitleClearButton() {
  const clearBtn = document.getElementById("title-clear-filters");
  if (clearBtn) clearBtn.hidden = !hasActiveTitleFilters();
}

function applyTitleOblastFilter(oblast) {
  Playback.pause?.();

  selectedOblast = oblast || null;
  selectedVille = null;
  statsSelectedOblast = selectedOblast;
  statsSelectedVille = null;
  villesDisponibles = selectedOblast ? getVillesForOblast(selectedOblast) : [];

  if (selectedOblast) {
    updateOblastPanel(selectedOblast);
    setRightPanelExpanded(true);
    const ev0 = allEvents.find(ev => getEventOblast(ev) === selectedOblast);
    if (ev0) highlightOblastForEvent(ev0);
    zoomToOblast(selectedOblast);
  } else {
    OblastFilters.clearFiltersPreservePlayback({ resetZoom: false });
  }

  afficherEvenements();
  syncTitleFilterControls();
}

function clearTitleFilters({ resetZoom = false } = {}) {
  Playback.pause?.();

  selectedOblast = null;
  selectedVille = null;
  statsSelectedOblast = null;
  statsSelectedVille = null;
  villesDisponibles = [];
  selectedTypes = new Set(allEvents.map(ev => ev.type_violence));
  resetPlaybackWindowToDefault();
  BottomChart.resetZoom?.();

  OblastFilters.clearFiltersPreservePlayback({ resetZoom });
  clearOblastHighlight();
  lastHighlightedOblast = null;
  updateOblastPanel(null);
  LegendUI.syncHeaderLegendSelection?.();
  LegendUI.syncMenuLegendFromSelection?.();

  afficherEvenements();
  syncTitleFilterControls();
}

function initRsfCartographyModal() {
  const trigger = document.getElementById("rsf-cartography-toggle");
  const modal = document.getElementById("rsf-cartography-modal");
  const closeButton = document.getElementById("rsf-cartography-close");
  if (!trigger || !modal) return;

  const closeModal = () => {
    modal.hidden = true;
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
  };

  const openModal = () => {
    const utilityMenu = document.getElementById("utility-menu");
    const utilityPanel = document.getElementById("utility-menu-panel");
    const utilityToggle = document.getElementById("utility-menu-toggle");
    utilityMenu?.classList.remove("open");
    if (utilityPanel) utilityPanel.hidden = true;
    utilityToggle?.setAttribute("aria-expanded", "false");

    modal.hidden = false;
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    closeButton?.focus();
  };

  trigger.addEventListener("click", openModal);
  modal.querySelectorAll("[data-close-rsf-cartography]").forEach(button => {
    button.addEventListener("click", closeModal);
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !modal.hidden) closeModal();
  });
}

function applyConfiguredControls() {
  const visibleByFeature = {
    "utility-events-toggle": FEATURES.listeCas?.enabled,
    "utility-regions-mode-toggle": FEATURES.choropleth?.enabled,
    "utility-country-toggle": FEATURES.statistiques?.enabled,
    "utility-chart-toggle": FEATURES.chronologie?.enabled,
    "rsf-cartography-toggle": FEATURES.rsfCartographie?.enabled,
    "tutorial-replay-btn": FEATURES.tutoriel?.enabled,
    "title-calendar-start-button": FEATURES.lecture?.enabled,
    "title-calendar-end-button": FEATURES.lecture?.enabled,
    "playback-prev": FEATURES.lecture?.enabled && REGLAGES.controles.lecture.afficherPrecedent,
    "playback-toggle": FEATURES.lecture?.enabled && REGLAGES.controles.lecture.afficherLecturePause,
    "playback-next": FEATURES.lecture?.enabled && REGLAGES.controles.lecture.afficherSuivant,
    "playback-end": FEATURES.lecture?.enabled && REGLAGES.controles.lecture.afficherFin,
    "playback-speed": FEATURES.lecture?.enabled,
    "title-clear-filters": REGLAGES.controles.panneauTitre.afficherEffacerFiltres
  };
  for (const [id, visible] of Object.entries(visibleByFeature)) {
    const element = document.getElementById(id);
    if (element) {
      element.hidden = !visible;
      element.style.display = visible ? "" : "none";
    }
  }

  const titlePanel = document.getElementById("floating-controls");
  const titleToggle = document.getElementById("map-title-toggle");
  const isCollapsed = !REGLAGES.controles.panneauTitre.ouvertParDefaut;
  titlePanel?.classList.toggle("collapsed", isCollapsed);
  titleToggle?.setAttribute("aria-expanded", String(!isCollapsed));

  const titleFilters = [
    ["title-oblast-select", REGLAGES.controles.panneauTitre.afficherZone],
    ["ville-select", REGLAGES.controles.panneauTitre.afficherEmplacement],
    ["title-calendar-start-button", REGLAGES.controles.panneauTitre.afficherDates && FEATURES.lecture?.enabled],
    ["title-calendar-end-button", REGLAGES.controles.panneauTitre.afficherDates && FEATURES.lecture?.enabled],
    ["header-legend", REGLAGES.controles.panneauTitre.afficherCategories]
  ];
  titleFilters.forEach(([id, visible]) => {
    const element = document.getElementById(id);
    if (element) {
      element.hidden = !visible;
      element.style.display = visible ? "" : "none";
    }
  });

  const languages = document.querySelector(".language-toggle");
  if (languages) {
    languages.hidden = !FEATURES.langues?.enabled;
    languages.querySelectorAll("[data-lang]").forEach(button => {
      button.hidden = !REGLAGES.projet.langues.includes(button.dataset.lang);
    });
  }
  document.querySelectorAll("#playback-speed option").forEach(option => {
    option.hidden = !REGLAGES.controles.lecture.vitesses.map(String).includes(option.value);
  });
  const speed = document.getElementById("playback-speed");
  if (speed) speed.value = String(REGLAGES.controles.lecture.vitesseParDefaut);
  document.querySelectorAll(".lang-btn[data-lang]").forEach(button => {
    button.hidden = !FEATURES.langues?.enabled || !REGLAGES.projet.langues.includes(button.dataset.lang);
  });

  const menuIds = {
    langues: ".utility-menu-field",
    tutoriel: "#tutorial-replay-btn",
    listeCas: "#utility-events-toggle",
    choropleth: "#utility-regions-mode-toggle",
    statistiques: "#utility-country-toggle",
    chronologie: "#utility-chart-toggle",
    rsfCartographie: "#rsf-cartography-toggle"
  };
  const menu = document.getElementById("utility-menu-panel");
  REGLAGES.controles.menu.ordre.forEach(key => {
    const element = menu?.querySelector(menuIds[key]);
    if (element) menu.appendChild(element);
  });

  document.title = REGLAGES.projet.titreHtml;
  document.querySelector('meta[name="robots"]')?.setAttribute("content", REGLAGES.projet.indexationMoteurs ? "index, follow" : "noindex, nofollow");
  const logo = document.querySelector(".floating-logo img");
  if (logo) logo.src = withV(FILES.assets.logo);
  const favicon = document.querySelector('link[rel="icon"]');
  if (favicon) favicon.href = withV(FILES.assets.favicon);
  const stylesheet = document.getElementById("app-stylesheet");
  if (stylesheet) stylesheet.href = withV(FILES.assets.feuilleDeStyle);
  document.querySelectorAll(".rsf-cartography-link").forEach((link, index) => {
    const card = REGLAGES.cartesLiees[index];
    if (!card) return;
    const safeHref = getSafeHttpUrl(card.href);
    if (safeHref) link.href = safeHref;
    else { link.removeAttribute("href"); link.hidden = true; }
    const image = link.querySelector("img");
    if (image) image.src = withV(card.image);
  });
}

function initHarmonizedShell() {
  initPanelScrollProgress({ getLanguage: () => currentLang });
  applyConfiguredControls();
  const titlePanel = document.getElementById("floating-controls");
  const titleToggle = document.getElementById("map-title-toggle");
  const oblastSelect = document.getElementById("title-oblast-select");
  const calendarStartButton = document.getElementById("title-calendar-start-button");
  const calendarEndButton = document.getElementById("title-calendar-end-button");
  const calendarStart = document.getElementById("title-calendar-start");
  const calendarEnd = document.getElementById("title-calendar-end");
  const clearBtn = document.getElementById("title-clear-filters");

  const toggleTitle = () => {
    if (!titlePanel || !titleToggle) return;
    titlePanel.classList.toggle("collapsed");
    titleToggle.setAttribute("aria-expanded", titlePanel.classList.contains("collapsed") ? "false" : "true");
  };

  titleToggle?.addEventListener("click", toggleTitle);
  titleToggle?.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleTitle();
    }
  });

  oblastSelect?.addEventListener("change", () => applyTitleOblastFilter(oblastSelect.value));
  calendarStartButton?.addEventListener("click", (event) => {
    event.preventDefault();
    openTitleDateInput(calendarStart);
  });
  calendarEndButton?.addEventListener("click", (event) => {
    event.preventDefault();
    openTitleDateInput(calendarEnd);
  });
  calendarStartButton?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openTitleDateInput(calendarStart);
  });
  calendarEndButton?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openTitleDateInput(calendarEnd);
  });
  calendarStart?.addEventListener("change", applyTitleCalendarInputs);
  calendarEnd?.addEventListener("change", applyTitleCalendarInputs);
  clearBtn?.addEventListener("click", () => clearTitleFilters({ resetZoom: false }));


  document.getElementById("utility-events-toggle")?.addEventListener("click", () => setPanelExpanded("toggle"));
  document.getElementById("utility-regions-mode-toggle")?.addEventListener("click", () => setRegionsMode(!regionsModeActive));
  document.getElementById("utility-country-toggle")?.addEventListener("click", () => setRightPanelExpanded("toggle"));
  document.getElementById("utility-chart-toggle")?.addEventListener("click", () => {
    BottomChart.toggle(updateBottomChart);
    syncUtilityMenuState();
  });
  document.getElementById("close-event-panel")?.addEventListener("click", () => setPanelExpanded(false));
  document.getElementById("close-country-panel")?.addEventListener("click", () => setRightPanelExpanded(false));
  document.getElementById("close-bottom-chart")?.addEventListener("click", () => {
    BottomChart.hide();
    syncUtilityMenuState();
  });
  initRsfCartographyModal();
  syncUtilityMenuState();
}

function afficherEvenements({ renderGeography = true } = {}) {
  EventsRenderer.render({
    allEvents,
    selectedTypes,
    selectedOblast,
    selectedVille,
    playbackWindowStartTime: getPlaybackWindowStartTime(),
    playbackCutoffTime,
    currentLang,

    getEventTime,
    getEventOblast,
    startOfDayUTC,
    formatDateFR,
    buildEventId,
    normalizeType,

    getDisplayLabelForType: (type) => getDisplayLabelForType(type, currentLang),

    createMarkerIcon,
    getLegendIconUrl,

    pausePlayback: Playback.pause,
    focusEvent,
    setRightPanelExpanded,
    updateHeaderLegendCounts: LegendUI.updateHeaderLegendCounts,
    updateBottomChart,
    caseFields: REGLAGES.listeCas?.champsSupplementaires || [],
    attachToMap: !regionsModeActive || Boolean(selectedOblast)


  });

  if (renderGeography && regionsModeActive) renderRegionsChoroplethLayer().catch(showLoadingError);
  else if (renderGeography) clearRegionsChoroplethLayer();

  if (document.getElementById("country-chart-container")) {
    renderOverviewStackedChart(overviewMode);
  }

  updateOccupationLayer(playbackCutoffTime).catch(showLoadingError);

  syncTitleFilterControls();
  nearbyNavigator?.refresh();
}

async function updateOccupationLayer(time) {
  if (regionsModeActive) {
    OccupationCtrl?.clear();
    return;
  }
  await OccupationCtrl?.setForTime(time);
  if (regionsModeActive) return;
  const current = OccupationCtrl?.getCurrent();
  if (current?.date) OccupationLegend?.setDate(formatOccupationDate(current.date));
}

function formatOccupationDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));

  return currentLang === "fr"
    ? dt.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
    : dt.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}



/// === PLAYBACK (state + module) ===

const PLAYBACK_START_DATE_STR = REGLAGES.lecture.dateDebut;
const PLAYBACK_END_DATE_STR = REGLAGES.lecture.dateFin;
const PLAYBACK_END_TIME = PLAYBACK_END_DATE_STR
  ? endOfDay(parseDateFlexible(PLAYBACK_END_DATE_STR)?.getTime())
  : null;
const PLAYBACK_START_TIME =
  parseDateFlexible(PLAYBACK_START_DATE_STR)?.getTime() || Date.UTC(2016, 11, 9);

const PLAYBACK_CUES = REGLAGES.lecture.reperes;

let playbackActive = false;
let playbackSpeed = 1;
let playbackTimer = null;
let playbackSequence = [];
let playbackIndex = -1;
let playbackWindowStartTime = PLAYBACK_START_TIME;
let playbackCutoffTime = null;

function getPlaybackState() {
  return {
    allEvents,
    playbackActive,
    playbackSpeed,
    playbackTimer,
    playbackSequence,
    playbackIndex,
    playbackWindowStartTime,
    playbackCutoffTime
  };
}

function setPlaybackState(patch) {
  if ("playbackActive" in patch) playbackActive = patch.playbackActive;
  if ("playbackSpeed" in patch) playbackSpeed = patch.playbackSpeed;
  if ("playbackTimer" in patch) playbackTimer = patch.playbackTimer;
  if ("playbackSequence" in patch) playbackSequence = patch.playbackSequence;
  if ("playbackIndex" in patch) playbackIndex = patch.playbackIndex;
  if ("playbackWindowStartTime" in patch) playbackWindowStartTime = patch.playbackWindowStartTime;
  if ("playbackCutoffTime" in patch) playbackCutoffTime = patch.playbackCutoffTime;
}

function ensurePlaybackToast() {
  let el = document.getElementById("playback-toast");
  if (el) return el;

  el = document.createElement("div");
  el.id = "playback-toast";
  el.className = "playback-toast hidden";
  el.innerHTML = `
    <div class="playback-toast-inner">
      <div class="playback-toast-header">
        <div class="playback-toast-title"></div>
        <div class="playback-toast-date"></div>
      </div>
      <div class="playback-toast-body"></div>
    </div>
  `;
  document.body.appendChild(el);
  return el;
}

let toastTimer = null;

function showPlaybackMessage({ title, dateLabel, body, durationMs = 7600 }) {
  const toast = ensurePlaybackToast();
  if (!toast) return;

  const tEl = toast.querySelector(".playback-toast-title");
  const dEl = toast.querySelector(".playback-toast-date");
  const bEl = toast.querySelector(".playback-toast-body");

  if (tEl) tEl.textContent = title || "";
  if (dEl) dEl.textContent = dateLabel ? `— ${dateLabel}` : "";
  if (bEl) bEl.textContent = body || "";

  toast.classList.remove("hidden");
  toast.classList.add("show");

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.classList.add("hidden"), 250);
  }, durationMs);
}

const Playback = createPlayback({
  getState: getPlaybackState,
  setState: setPlaybackState,
  PLAYBACK_START_TIME,
  PLAYBACK_START_DATE_STR,
  PLAYBACK_END_TIME,
  PLAYBACK_END_DATE_STR,
  EXTRA_MAX_TIMES: OCCUPATION_MAX_TIMES,
  getEventTime,
  startOfDay,
  endOfDay,
  formatDateFR,
  getWindowStartTime: getPlaybackWindowStartTime,
  buildEventId,
  render: afficherEvenements,

  contextCues: PLAYBACK_CUES,
  parseDateFlexible,
  onContextCue: ({ key, durationMs, ts }) => {
    const dict = UI_STRINGS[currentLang]?.playbackMessages || {};
    const title = dict[`${key}_title`] || "";
    const body = dict[`${key}_body`] || "";
    if (!title && !body) return;

    const dateLabel = ts ? formatDateFR(ts) : "";
    showPlaybackMessage({ title, dateLabel, body, durationMs });
  }
});


/// === TUTORIEL (module) ===

const Tutorial = createTutorial({
  getState: () => ({ currentLang, allEvents }),
  setPanelExpanded,
  setRightPanelExpanded,
  updateOblastPanel,
  highlightOblastForEvent,
  clearOblastHighlight,
  render: afficherEvenements,
  UI_STRINGS,

  showBottomChart: () => BottomChart.show(updateBottomChart),
  hideBottomChart: () => BottomChart.hide(),
  updateBottomChart: () => updateBottomChart(true)
});


/// === DATA LOADERS ===

async function loadEventsForLang(lang) {
  if (dataByLang[lang]) return dataByLang[lang];

  const base = FILES.donnees[lang];
  if (!base) throw new Error(`Fichier de données manquant pour la langue : ${lang}`);
  const resp = await fetch(withV(base));
  if (!resp.ok) throw new Error(`Événements ${lang} : HTTP ${resp.status}`);
  const data = validateEvents(await resp.json(), REGLAGES.champsDonnees).map(normalizeConfiguredEvent);

  if (lang === "en") {
    data.forEach(ev => {
      if (TYPE_MAP_EN_TO_FR[ev.type_violence]) {
        ev.type_violence_original = ev.type_violence;
        ev.type_violence = TYPE_MAP_EN_TO_FR[ev.type_violence];
      }
    });
  }

  dataByLang[lang] = data;
  return data;
}


/// === LANGUE ===

function normalizeLanguage(lang) {
  const code = String(lang || "").trim().toLowerCase().split(/[-_]/)[0];
  return REGLAGES.projet.langues.includes(code) ? code : REGLAGES.projet.langueParDefaut;
}

function getInitialLanguage() {
  return normalizeLanguage(new URLSearchParams(window.location.search).get("lang"));
}

function writeLanguageToUrl(lang) {
  const url = new URL(window.location.href);
  url.searchParams.set("lang", lang);
  window.history.replaceState(window.history.state, "", url);
}

async function setLanguage(lang, { updateUrl = true } = {}) {
  const nextLang = normalizeLanguage(lang);
  const requestId = ++languageChangeSeq;
  if (nextLang === currentLang) {
    if (updateUrl) writeLanguageToUrl(currentLang);
    return;
  }

  let events;
  try {
    events = await loadEventsForLang(nextLang);
  } catch (error) {
    if (requestId === languageChangeSeq) console.error("Changement de langue impossible :", error);
    return;
  }
  if (requestId !== languageChangeSeq) return;

  Playback.stop(true);

  currentLang = nextLang;
  allEvents = events;
  applyStaticTextsForLang(currentLang);
  if (updateUrl) writeLanguageToUrl(currentLang);
  geojsonLevelsController?.setLanguage(currentLang);
  refreshBasemapControl();
  OccupationLegend?.update();

  selectedTypes = new Set(allEvents.map(ev => ev.type_violence));

  oblastsDisponibles = OblastFilters.buildOblastListFromEvents(allEvents);
  OblastFilters.setOblastsList(oblastsDisponibles);
  populateTitleOblastSelect();
  OblastFilters.clearFiltersPreservePlayback({ resetZoom: false });

  LegendUI.init({
    getState: getAppState,
    getLegendIconUrl,
    getDisplayLabelForType: (type) => getDisplayLabelForType(type, currentLang),
    pausePlayback: Playback.pause,
    render: afficherEvenements
  });
  LegendUI.buildMenuLegend();
  LegendUI.initHeaderLegend();
  ensureRightPanelLegend({ onChange: () => renderOverviewStackedChart(overviewMode) });

  Playback.buildPlaybackSequence();
  updatePlaybackDateUI();

  afficherEvenements();
  renderOverviewStackedChart(overviewMode);
}

/// === LOADING OVERLAY ===

let loadingProgress = 0;
let loadingOverlayDone = false;

function setLoadingProgress(pct) {
  const bar = document.getElementById("loading-bar-fill");
  if (!bar) return;
  loadingProgress = Math.max(loadingProgress, Math.min(100, pct));
  bar.style.width = loadingProgress + "%";
}

function hideLoadingOverlay() {
  if (loadingOverlayDone) return;
  loadingOverlayDone = true;
  const overlay = document.getElementById("loading-overlay");
  if (!overlay) return;
  // Laisse la barre atteindre 100 % avant le fondu de l'unique loader.
  setTimeout(() => {
    overlay.classList.add("is-complete");
    setTimeout(() => overlay.remove(), 400);
  }, 400);
}

function setTheme(fond) {
  applyBasemapTheme(fond);
  if (allEvents.length) updateBottomChart(true);
}

function refreshBasemapControl() {
  if (basemapControl) { map.removeControl(basemapControl); basemapControl = null; }
  if (!map || basemapEntries.length < 2) return;
  basemapControl = createBasemapControl({ L, map, entries: basemapEntries, lang: currentLang });
}

function showLoadingError(error) {
  console.error("Impossible de terminer le chargement de la carte", error);
  const subtext = document.querySelector(".loading-subtext");
  if (subtext) subtext.textContent = currentLang === "en"
    ? "The map could not be loaded. Please check your connection and try again."
    : "La carte n’a pas pu être chargée. Vérifiez votre connexion et réessayez.";
  const retry = document.getElementById("loading-retry");
  if (retry) {
    retry.textContent = currentLang === "en" ? "Try again" : "Réessayer";
    retry.hidden = false;
  }
}

async function zoomToOblast(oblastName) {
  if (!map || !oblastName) return;

  const data = await loadOblastsGeojson();
  if (!data) return;

  const shapeName = getShapeNameForSelectedOblast(oblastName);
  if (!shapeName) return;

  const feature = (data.features || []).find(f => (f?.properties?.shapeName || "") === shapeName);
  if (!feature) return;

  const bounds = L.geoJSON(feature).getBounds();
  if (!bounds?.isValid?.() || !bounds.isValid()) return;

  map.fitBounds(bounds, { padding: [30, 30], maxZoom: MAP_SETTINGS.zoomMaximumContour, animate: true });
}

/// === INIT MAP ===

async function initMap() {
  const initialBasemap = validateBasemaps(MAP_SETTINGS.fonds);
  setTheme(initialBasemap);
  setLoadingProgress(10);
  applyStaticTextsForLang(currentLang);

  map = L.map("map", {
    crs: MAP_CRS,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    zoomSnap: MAP_SETTINGS.zoomSnap,
    zoomDelta: MAP_SETTINGS.zoomDelta,
    wheelPxPerZoomLevel: MAP_SETTINGS.wheelPxPerZoomLevel,
    scrollWheelZoom: MAP_SETTINGS.scrollWheelZoom,
    zoomControl: false
  }).setView(INITIAL_CENTER, INITIAL_ZOOM);
  geojsonRenderer = createGeojsonRenderer({ L, getMaplibreMap: () => activeBasemap?.getMaplibreMap?.() || null, defaultStyle: REGLAGES.stylesGeojson.defaut });
  geojsonLevelsController = createGeojsonLevelsController({
    map, L, createGeojsonLayer: geojsonRenderer.createLayer, levels: FILES.geojson.niveauxAdministratifs, defaultStyle: REGLAGES.stylesGeojson?.niveauxAdministratifs, loadGeoJSON: async file => {
      const response = await fetch(withV(file));
      if (!response.ok) throw new Error(`GeoJSON ${file}: HTTP ${response.status}`);
      return response.json();
    }, lang: currentLang
  });
  L.control.zoom({ position: "topleft" }).addTo(map);

  // Panes Leaflet (ordre d'empilement)
  map.createPane("pane-occupation");
  map.getPane("pane-occupation").style.zIndex = 200;

  map.createPane("pane-events");
  map.getPane("pane-events").style.zIndex = 600;  // au-dessus de tout si tu veux


  if (FEATURES.occupationLayer?.enabled) {
    OccupationLegend = createOccupationLegend({
      getLang: () => currentLang,
      getStrings: () => UI_STRINGS,
      typesConfig: OCCUPATION_TYPES
    });
    if (!regionsModeActive) OccupationLegend.mount(map);
  }

  EventsRenderer.init({ leafletMap: map });
  if (FEATURES.navigationProche?.enabled !== false) {
    nearbyNavigator = createNearbyNavigator({
      L, map, settings: FEATURES.navigationProche,
      getClusterGroup: () => EventsRenderer.getClusterGroup(),
      isEnabled: () => !regionsModeActive,
      getLang: () => currentLang,
      getStrings: () => UI_STRINGS[currentLang]?.ui?.navigationProche || {},
      onNavigate: () => Playback.pause()
    });
  }

  OblastFilters.init({
    map,
    INITIAL_CENTER,
    INITIAL_ZOOM,
    getState: () => ({
      allEvents,
      oblastsDisponibles,
      villesDisponibles,
      currentLang,
      selectedOblast
    }),

    setSelectedOblast: (v) => { selectedOblast = v; statsSelectedOblast = v; },
    setSelectedVille: (v) => { selectedVille = v; statsSelectedVille = v; },
    setVillesDisponibles: (v) => { villesDisponibles = v; },
    setOblastsDisponibles: (v) => { oblastsDisponibles = v; },

    pausePlayback: Playback.pause,
    afficherEvenements,
    highlightOblastForEvent,
    clearOblastHighlight,
    resetLastHighlightedOblast: () => { lastHighlightedOblast = null; },
    updateOblastPanel,
    setRightPanelExpanded,
    zoomToOblast,
    getEventOblast
  });

  setLoadingProgress(20);

  window.initialMapCenter = INITIAL_CENTER;
  window.initialMapZoom = INITIAL_ZOOM;
  window.minMapZoom = MIN_ZOOM;
  window.maxMapZoom = MAX_ZOOM;

  window.resetMapView = function () {
    regionsModeActive = Boolean(FEATURES.choropleth?.enabled && FEATURES.choropleth?.actifParDefaut);
    clearRegionsChoroplethLayer({ cancelPending: true });
    if (regionsModeActive) {
      removeUkraineBorderLayer();
      OccupationCtrl?.clear?.();
      OccupationLegend?.remove?.();
    } else {
      loadUkraineBorder().catch(showLoadingError);
      OccupationLegend?.mount?.(map);
    }
    Playback.stop(true);
    resetPlaybackWindowToDefault();
    BottomChart.resetZoom?.();
    OblastFilters.clearFiltersPreservePlayback({ resetZoom: true });
    lastHighlightedOblast = null;
    updateOblastPanel(null);
    afficherEvenements();
    BottomChart.hide();
    syncUtilityMenuState();
  };

  basemapEntries = MAP_SETTINGS.fonds.map(config => {
    const layer = createBasemapLayer(config, { L, settings: MAP_SETTINGS });
    layer.on("add", () => {
      activeBasemap = layer;
      geojsonRenderer.refresh();
      setTheme(config);
    });
    layer.on("remove", () => {
      if (activeBasemap === layer) {
        activeBasemap = null;
        queueMicrotask(() => { if (!activeBasemap) geojsonRenderer.refresh(); });
      }
    });
    return { config, layer };
  });
  const fondParDefaut = MAP_SETTINGS.fonds.find(fond => fond.actifParDefaut) || MAP_SETTINGS.fonds[0];
  const defaultBasemap = basemapEntries.find(entry => entry.config.id === fondParDefaut.id).layer;
  defaultBasemap.addTo(map);
  refreshBasemapControl();

  setLoadingProgress(40);

  if (FEATURES.occupationLayer?.enabled) {
    OccupationCtrl = createOccupationLayerController({
      map,
      createGeojsonLayer: geojsonRenderer.createLayer,
      files: OCCUPATION_FILES,
      typesConfig: OCCUPATION_TYPES,
      defaultStyle: REGLAGES.stylesGeojson.occupation,
      defaultIndex: REGLAGES.occupation.indexParDefaut
    });

  }



  setLoadingProgress(50);

  [allEvents] = await Promise.all([
    loadEventsForLang(currentLang),
    regionsModeActive ? loadOblastsGeojson() : Promise.resolve(),
    !regionsModeActive && FEATURES.contour?.enabled ? loadBorderGeojson() : Promise.resolve(),
    updateOccupationLayer(playbackCutoffTime)
  ]);
  applyStaticTextsForLang(currentLang);
  if (new URLSearchParams(window.location.search).has("lang")) writeLanguageToUrl(currentLang);

  setLoadingProgress(65);

  selectedTypes = new Set(allEvents.map(ev => ev.type_violence));
  oblastsDisponibles = OblastFilters.buildOblastListFromEvents(allEvents);
  OblastFilters.setOblastsList(oblastsDisponibles);
  populateTitleOblastSelect();

  initRightPanelVisibleTypes();
  ensureRightPanelLegend({ onChange: () => renderOverviewStackedChart(overviewMode) });

  LegendUI.init({
    getState: getAppState,
    getLegendIconUrl,
    getDisplayLabelForType: (type) => getDisplayLabelForType(type, currentLang),
    pausePlayback: Playback.pause,
    render: afficherEvenements
  });

  LegendUI.buildMenuLegend();
  LegendUI.initHeaderLegend();

  updateOblastPanel(null);

  Playback.buildPlaybackSequence();
  const maxPlaybackT = Math.max(
    ...allEvents.map(ev => getEventTime(ev)).filter(Number.isFinite),
    ...OCCUPATION_MAX_TIMES.filter(Number.isFinite)
  );

  BottomChart.computeGlobalDays(
    allEvents,
    PLAYBACK_START_TIME,
    getEventTime,
    startOfDayUTC,
    maxPlaybackT
  );

  afficherEvenements({ renderGeography: false });

  if (regionsModeActive) await renderRegionsChoroplethLayer();
  else await Promise.all([loadUkraineBorder(), updateOccupationLayer(playbackCutoffTime)]);
  setLoadingProgress(90);
  await waitForBasemapReady(defaultBasemap, { timeoutMs: MAP_SETTINGS.delaiChargementMaximum });
  setLoadingProgress(100);
  hideLoadingOverlay();

  if (FEATURES.tutoriel?.enabled && FEATURES.tutoriel?.demarrageAutomatique && !Tutorial.hasSeen()) {
    setTimeout(() => Tutorial.start(), 900);
  }
}


/// === LANCEMENT GLOBAL ===

function onDomReady(fn) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn, { once: true });
  } else {
    fn();
  }
}

let appBooted = false;
onDomReady(() => {
  initUtilityMenu();
  if (appBooted) return;
  appBooted = true;
  initHarmonizedShell();

  // Tutorial UI
  const tutNext = document.getElementById("tutorial-next-btn");
  const tutSkip = document.getElementById("tutorial-skip-btn");
  const tutReplay = document.getElementById("tutorial-replay-btn");
  const tutLangBtn = document.getElementById("tutorial-lang-btn");

  if (tutNext) tutNext.addEventListener("click", () => Tutorial.next());
  if (tutSkip) tutSkip.addEventListener("click", () => Tutorial.skip());
  if (tutReplay) tutReplay.addEventListener("click", () => Tutorial.start());

  if (tutLangBtn) {
    tutLangBtn.addEventListener("click", async () => {
      const newLang = (currentLang === "en") ? "fr" : "en";
      await setLanguage(newLang);
      if (Tutorial.isActive() && Tutorial.getStep() > 0) Tutorial.goToStep(Tutorial.getStep());
    });
  }

  // Lang buttons
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const lang = btn.dataset.lang;
      await setLanguage(lang);
    });
  });

  // Playback controls
  const pbToggle = document.getElementById("playback-toggle");
  const pbPrev = document.getElementById("playback-prev");
  const pbNext = document.getElementById("playback-next");
  const pbSpeed = document.getElementById("playback-speed");
  const pbEnd = document.getElementById("playback-end");

  if (pbToggle) pbToggle.addEventListener("click", () => {
    Playback.toggle();
    if (!BottomChart.isOpen()) {
      BottomChart.show(updateBottomChart);
    }
    syncUtilityMenuState();
  });

  if (pbPrev) pbPrev.addEventListener("click", () => { Playback.pause(); Playback.stepPrev(); });
  if (pbNext) pbNext.addEventListener("click", () => { Playback.pause(); Playback.stepNext(); });
  if (pbEnd) pbEnd.addEventListener("click", () => Playback.goToEnd());

  if (pbSpeed) {
    pbSpeed.addEventListener("change", () => {
      const nextSpeed = parseFloat(pbSpeed.value) || 1;
      setPlaybackState({ playbackSpeed: nextSpeed });

      if (getPlaybackState().playbackActive) {
        Playback.stop(false);
        Playback.start();
      }
    });
  }

  // Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      Playback.pause();
      OblastFilters.clearFiltersPreservePlayback({ resetZoom: true });
      BottomChart.hide();
      syncUtilityMenuState();
    }
  });

  // Floating controls (Leaflet)
  const floating = document.getElementById("floating-controls");
  if (floating && window.L && L.DomEvent) {
    L.DomEvent.disableClickPropagation(floating);
    L.DomEvent.disableScrollPropagation(floating);
  }

  setupCollapse({
    btnId: "collapse-right-legend",
    bodyId: "right-panel-legend",
    storageKey: "collapse.rightLegend.v2",
    defaultCollapsed: true
  });

  setupCollapse({
    btnId: "collapse-bottom-legend",
    bodyId: "bottom-chart-legend",
    storageKey: "collapse.bottomLegend.v2",
    defaultCollapsed: true
  });

  setupCollapse({
    btnId: "collapse-notes",
    bodyId: "notes-body",
    storageKey: "collapse.notes.ukraine",
    defaultCollapsed: false
  });

  document.getElementById("loading-retry")?.addEventListener("click", () => window.location.reload());
  initMap().catch(showLoadingError);
});
