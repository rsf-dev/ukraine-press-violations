const version = new URL(import.meta.url).searchParams.get("v");
const { parseDateFlexible } = await import(`./dates.js${version ? `?v=${encodeURIComponent(version)}` : ""}`);

// Les gros contours et snapshots Ukraine restent acceptés ; les allocations sont bornées.
export const DATA_LIMITS = Object.freeze({ events: 5000, fields: 100, text: 20000, eventsBytes: 5 * 1024 * 1024, geojsonBytes: 32 * 1024 * 1024, features: 10000, positions: 500000, geoFields: 300 });
const forbiddenKeys = new Set(["__proto__", "constructor", "prototype"]);

export function validateJsonTree(data) {
  let nodes = 0;
  const visit = (value, depth) => {
    if (++nodes > 2000000 || depth > 16) throw new Error("Structure JSON trop complexe.");
    if (typeof value === "string" && value.length > DATA_LIMITS.text) throw new Error("Texte JSON trop long.");
    if (typeof value === "number" && !Number.isFinite(value)) throw new Error("Nombre JSON invalide.");
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) { for (const item of value) visit(item, depth + 1); return; }
    const entries = Object.entries(value);
    if (entries.length > DATA_LIMITS.geoFields) throw new Error("Trop de propriétés JSON.");
    for (const [key, item] of entries) {
      if (forbiddenKeys.has(key) || key.length > 128) throw new Error("Propriété JSON interdite.");
      visit(item, depth + 1);
    }
  };
  visit(data, 0);
  return data;
}

export async function fetchJson(url, { maxBytes = DATA_LIMITS.eventsBytes, timeoutMs = 30000, fetchImpl = globalThis.fetch, ...options } = {}) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) throw new Error("Limite JSON invalide.");
  if (globalThis.location) {
    const target = new URL(url, globalThis.location.href);
    if (target.origin !== globalThis.location.origin || !["https:", "http:"].includes(target.protocol) || target.username || target.password) throw new Error("Les fichiers JSON doivent appartenir à la carte.");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let reader;
  try {
    const response = await fetchImpl(url, { ...options, signal: controller.signal, credentials: "omit", referrerPolicy: "no-referrer" });
    if (!response.ok) throw new Error(`Chargement JSON : HTTP ${response.status}`);
    if (Number(response.headers.get("content-length")) > maxBytes) throw new Error("Fichier JSON trop volumineux.");
    reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new Error("Fichier JSON trop volumineux.");
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return validateJsonTree(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)));
  } catch (error) {
    controller.abort();
    try { await reader?.cancel(); } catch { /* Flux déjà fermé. */ }
    throw error;
  } finally {
    clearTimeout(timer);
    reader?.releaseLock();
  }
}

// Interface minimale utilisée par les chargeurs historiques : les contrôles sont
// terminés avant de leur remettre le JSON, sans modifier window.fetch.
export async function fetchResponse(url, options = {}) {
  const path = new URL(url, globalThis.location?.href || "https://local.invalid/").pathname;
  const geographic = path.toLowerCase().endsWith(".geojson");
  const data = await fetchJson(url, { ...options, maxBytes: geographic ? DATA_LIMITS.geojsonBytes : DATA_LIMITS.eventsBytes });
  if (geographic) validateGeoJson(data);
  return Object.freeze({ ok: true, status: 200, json: async () => data });
}

function aliases(value) {
  if (Array.isArray(value)) return value.flatMap(aliases);
  if (value && typeof value === "object") return Object.values(value).flatMap(aliases);
  return typeof value === "string" ? [value] : [];
}

export function validateEvents(data, fields = {}) {
  if (!Array.isArray(data) || data.length > DATA_LIMITS.events) throw new Error("Tableau de cas invalide ou trop volumineux.");
  const links = new Set(aliases(fields.lien));
  const texts = new Set(["emplacement", "personne", "description", "descriptionFr", "descriptionEn", "descriptionGenerique", "descriptionPays", "zone", "pays", "nomGeojson", "categorie", "auteur", "media", "statut", "area"].flatMap(key => aliases(fields[key])).concat(["pays", "Pays", "country", "Country"]));
  return data.map((row, index) => {
    const invalid = () => new Error(`Structure invalide pour le cas ${index + 1}.`);
    if (!row || typeof row !== "object" || Array.isArray(row)) throw invalid();
    const entries = Object.entries(row);
    if (entries.length > DATA_LIMITS.fields) throw invalid();
    const event = Object.create(null);
    for (const [key, value] of entries) {
      if (key.length > 128 || forbiddenKeys.has(key)) throw invalid();
      if (Array.isArray(value) && links.has(key)) {
        if (value.length > 20 || value.some(url => typeof url !== "string" || url.length > 4096)) throw invalid();
        event[key] = value.slice();
      } else {
        if (value !== null && !["string", "number", "boolean"].includes(typeof value)) throw invalid();
        if (typeof value === "string" && value.length > DATA_LIMITS.text) throw invalid();
        if (typeof value === "number" && !Number.isFinite(value)) throw invalid();
        if ((texts.has(key) || /^(description|province)_/i.test(key)) && value !== null && typeof value !== "string") throw invalid();
        event[key] = value;
      }
    }
    for (const key of aliases(fields.date)) {
      if (event[key] == null || event[key] === "") continue;
      const date = parseDateFlexible(event[key]);
      if (!date || date.getUTCFullYear() < 1900 || date.getUTCFullYear() > 2100) throw invalid();
    }
    return event;
  });
}

export function parseCoordinate(value, maximum) {
  if (typeof value !== "number" && (typeof value !== "string" || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim()))) return null;
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= maximum ? number : null;
}

export function validateGeoJson(data) {
  validateJsonTree(data);
  if (!data || data.type !== "FeatureCollection" || !Array.isArray(data.features) || data.features.length > DATA_LIMITS.features) throw new Error("Collection GeoJSON invalide.");
  let positions = 0;
  const point = value => {
    if (++positions > DATA_LIMITS.positions || !Array.isArray(value) || value.length < 2 || value.length > 3 || !value.every(Number.isFinite) || Math.abs(value[0]) > 180 || Math.abs(value[1]) > 90) throw new Error("Coordonnées GeoJSON invalides ou trop nombreuses.");
  };
  const line = (value, minimum = 2) => {
    if (!Array.isArray(value) || value.length < minimum) throw new Error("Ligne GeoJSON invalide.");
    value.forEach(point);
  };
  const ring = value => {
    line(value, 4);
    const first = value[0], last = value[value.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) throw new Error("Anneau GeoJSON non fermé.");
  };
  const polygon = value => {
    if (!Array.isArray(value) || !value.length) throw new Error("Polygone GeoJSON invalide.");
    value.forEach(ring);
  };
  const geometry = (value, depth = 0) => {
    if (!value || depth > 8) throw new Error("Géométrie GeoJSON invalide.");
    const coordinates = value.coordinates;
    switch (value.type) {
      case "Point": point(coordinates); break;
      case "MultiPoint": if (!Array.isArray(coordinates)) throw new Error("Points GeoJSON invalides."); coordinates.forEach(point); break;
      case "LineString": line(coordinates); break;
      case "MultiLineString": if (!Array.isArray(coordinates)) throw new Error("Lignes GeoJSON invalides."); coordinates.forEach(value => line(value)); break;
      case "Polygon": polygon(coordinates); break;
      case "MultiPolygon": if (!Array.isArray(coordinates)) throw new Error("Polygones GeoJSON invalides."); coordinates.forEach(polygon); break;
      case "GeometryCollection": if (!Array.isArray(value.geometries)) throw new Error("Géométries GeoJSON invalides."); value.geometries.forEach(item => geometry(item, depth + 1)); break;
      default: throw new Error("Type GeoJSON non pris en charge.");
    }
  };
  for (const feature of data.features) {
    if (feature?.type !== "Feature" || !feature.properties || typeof feature.properties !== "object" || Array.isArray(feature.properties)) throw new Error("Entité GeoJSON invalide.");
    for (const value of Object.values(feature.properties)) if (value !== null && typeof value === "object") throw new Error("Propriétés GeoJSON non scalaires.");
    geometry(feature.geometry);
  }
  return data;
}
