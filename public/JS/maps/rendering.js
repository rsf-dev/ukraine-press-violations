export function validateBasemaps(fonds) {
  if (!Array.isArray(fonds) || !fonds.length) throw new Error("Aucun fond de carte configuré.");
  const ids = new Set();
  for (const fond of fonds) {
    if (!fond.id || ids.has(fond.id)) throw new Error("Identifiant de fond manquant ou dupliqué : " + fond.id);
    ids.add(fond.id);
    if (!["maplibre", "raster"].includes(fond.type) || !fond.url) throw new Error("Source de fond invalide : " + fond.id);
    if (!["light", "dark"].includes(fond.theme)) throw new Error("Le thème du fond " + fond.id + " doit être light ou dark.");
  }
  const defaults = fonds.filter(fond => fond.actifParDefaut);
  if (defaults.length !== 1) throw new Error("Un seul fond doit être actif par défaut.");
  for (const lang of ["fr", "en", "es"]) {
    const labels = fonds.map(fond => fond.labels?.[lang] || fond.labels?.fr || fond.id);
    if (new Set(labels).size !== labels.length) throw new Error("Libellés de fonds dupliqués pour " + lang);
  }
  return defaults[0];
}

export function applyBasemapTheme(fond, { document: page = globalThis.document } = {}) {
  const requested = typeof fond === "string" ? fond : fond?.theme;
  const theme = requested === "dark" ? "dark" : "light";
  page.body.classList.toggle("theme-dark", theme === "dark");
  page.body.classList.toggle("theme-light", theme === "light");
  page.body.classList.remove("dark-map-theme");
  page.body.dataset.mapTheme = theme;
  if (typeof fond === "object" && fond?.id) page.body.dataset.basemap = fond.id;
  return theme;
}

export function secureMapRequest(value, baseUrl = globalThis.location.href) {
  const base = new URL(baseUrl);
  const url = new URL(value, base);
  const allowedOrigins = new Set([base.origin, "https://tiles.openfreemap.org", "https://server.arcgisonline.com"]);
  if (!["https:", "http:"].includes(url.protocol) || !allowedOrigins.has(url.origin) || url.username || url.password) {
    throw new Error("Source cartographique non autorisée.");
  }
  // Les requêtes des workers ne reprennent pas toutes la politique du document.
  return { url: url.href, credentials: "omit", referrerPolicy: "no-referrer" };
}

export function createBasemapLayer(fond, { L, settings }) {
  const url = String(fond.url).replaceAll("{apiKey}", encodeURIComponent(settings.cleCarto || ""));
  const attribution = fond.attribution || settings.attribution;
  const options = { ...(fond.options || {}) };
  if (fond.type === "raster") {
    return L.tileLayer(url, { maxZoom: settings.zoomMaximum, attribution, ...options, crossOrigin: "anonymous", referrerPolicy: "no-referrer" });
  }
  if (typeof L.maplibreGL !== "function") throw new Error("Le plugin MapLibre GL Leaflet est requis pour OpenFreeMap.");
  const layer = L.maplibreGL({
    style: url, attribution, interactive: false, updateInterval: 16, fadeDuration: 0, ...options, attributionControl: false, transformRequest: value => secureMapRequest(value)
  });
  layer.getAttribution = () => attribution;
  return layer;
}

export function createBasemapControl({ L, map, entries, lang }) {
  const layers = Object.fromEntries(entries.map(({ config, layer }) => [
    config.labels?.[lang] || config.labels?.fr || config.id, layer
  ]));
  return L.control.layers(layers, null, { position: "bottomright" }).addTo(map);
}

export function waitForBasemapReady(layer, { timeoutMs = 30000 } = {}) {
  const gl = layer.getMaplibreMap?.();
  const target = gl || layer;
  const readyEvent = gl ? "idle" : "load";
  const errorEvent = gl ? "error" : "tileerror";
  const isReady = gl
    ? () => gl.loaded() && gl.areTilesLoaded() && !gl.isMoving()
    : () => !layer.isLoading();

  return new Promise((resolve, reject) => {
    const requestFrame = globalThis.requestAnimationFrame?.bind(globalThis) || (callback => setTimeout(callback, 0));
    const cancelFrame = globalThis.cancelAnimationFrame?.bind(globalThis) || clearTimeout;
    let frame = null;
    let settled = false;
    const finish = error => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (frame !== null) cancelFrame(frame);
      target.off(readyEvent, check);
      target.off(errorEvent, fail);
      if (error) reject(error);
      else resolve();
    };
    const check = () => {
      if (settled || frame !== null || !isReady()) return;
      // Deux images laissent le navigateur peindre les tuiles et les sources GeoJSON.
      frame = requestFrame(() => {
        frame = requestFrame(() => {
          frame = null;
          if (isReady()) finish();
        });
      });
    };
    const fail = event => finish(event.error || new Error("Impossible de charger le fond de carte."));
    const timer = setTimeout(() => finish(new Error("Délai de chargement du fond de carte dépassé.")), timeoutMs);
    target.on(readyEvent, check);
    target.on(errorEvent, fail);
    check();
  });
}

export function createGeojsonRenderer({ L, getMaplibreMap, defaultStyle }) {
  const activeLayers = new Set();
  let nextId = 0;

  function createLayer(data, options = {}) {
    let style = options.style || {};
    const featureStyle = feature => ({
      ...defaultStyle,
      ...(typeof style === "function" ? style(feature) : style)
    });
    const layer = L.geoJSON(data, { ...options, style: featureStyle });
    const sourceId = `rsf-geojson-${++nextId}`;
    const fillId = `${sourceId}-fill`;
    const lineId = `${sourceId}-line`;
    const setLeafletStyle = layer.setStyle.bind(layer);
    let gl = null;
    let nativeVisible = false;
    const states = new Map();
    // Une seule conversion, sans arrondir les coordonnées. Les filtres ne renvoient
    // jamais les géométries aux workers et ne relancent pas leur découpage en tuiles.
    const collection = layer.toGeoJSON(false);
    const sourceData = {
      ...collection,
      features: collection.features.map((feature, id) => ({ ...feature, id }))
    };

    function updateLeafletStyle(visible) {
      // Leaflet conserve les interactions. MapLibre dessine avec le fond vectoriel ;
      // le style Leaflet complet ne sert qu'aux fonds raster proposés en option.
      if (visible && nativeVisible) return;
      nativeVisible = visible;
      setLeafletStyle(feature => visible
        ? { stroke: false, fill: true, fillOpacity: 0, opacity: 0 }
        : featureStyle(feature));
    }

    function detach() {
      if (gl) {
        gl.off("style.load", draw);
        if (gl.getStyle()) {
          if (gl.getLayer(lineId)) gl.removeLayer(lineId);
          if (gl.getLayer(fillId)) gl.removeLayer(fillId);
          if (gl.getSource(sourceId)) gl.removeSource(sourceId);
        }
      }
      gl = null;
      nativeVisible = false;
      states.clear();
    }

    function draw() {
      if (!gl?.getStyle()) return;
      if (!gl.getSource(sourceId)) {
        states.clear();
        gl.addSource(sourceId, { type: "geojson", data: sourceData, tolerance: 0.375 });
        const beforeId = options.pane === "pane-occupation"
          ? gl.getStyle().layers.find(item => item.id.startsWith("rsf-geojson-"))?.id
          : undefined;
        gl.addLayer({
          id: fillId, type: "fill", source: sourceId,
          paint: {
            "fill-color": ["coalesce", ["feature-state", "fillColor"], defaultStyle.fillColor || defaultStyle.color],
            "fill-opacity": ["coalesce", ["feature-state", "fillOpacity"], 0],
            "fill-outline-color": "rgba(0,0,0,0)",
            "fill-opacity-transition": { duration: 0 }
          }
        }, beforeId);
        gl.addLayer({
          id: lineId, type: "line", source: sourceId,
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": ["coalesce", ["feature-state", "lineColor"], defaultStyle.color],
            "line-opacity": ["coalesce", ["feature-state", "lineOpacity"], 0],
            "line-width": ["coalesce", ["feature-state", "lineWidth"], 0]
          }
        }, beforeId);
      }
      sourceData.features.forEach(feature => {
        const appearance = featureStyle(feature);
        const state = {
          fillColor: appearance.fillColor || appearance.color,
          fillOpacity: appearance.fill === false ? 0 : appearance.fillOpacity,
          lineColor: appearance.color,
          lineOpacity: appearance.stroke === false ? 0 : appearance.opacity,
          lineWidth: appearance.weight
        };
        const previous = states.get(feature.id);
        if (!previous || Object.keys(state).some(key => previous[key] !== state[key])) {
          gl.setFeatureState({ source: sourceId, id: feature.id }, state);
          states.set(feature.id, state);
        }
      });
      updateLeafletStyle(true);
    }

    function refresh() {
      const nextMap = getMaplibreMap();
      if (nextMap !== gl) {
        detach();
        gl = nextMap;
        gl?.on("style.load", draw);
      }
      if (gl) draw();
      else updateLeafletStyle(false);
    }

    layer.setStyle = nextStyle => {
      style = nextStyle;
      if (gl) draw();
      else updateLeafletStyle(false);
      return layer;
    };
    layer.on("add", () => {
      activeLayers.add(refresh);
      refresh();
    });
    layer.on("remove", () => {
      activeLayers.delete(refresh);
      detach();
    });
    return layer;
  }

  return { createLayer, refresh: () => activeLayers.forEach(refresh => refresh()) };
}
