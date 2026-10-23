// maps/occupationLayer.js

export function createOccupationLayerController({
    map,
    createGeojsonLayer = (data, options) => L.geoJSON(data, options),
    files,        // [{ date: "YYYY-MM-DD", url: "..." }, ...]
    typesConfig,  // { type01: {label, style}, ... }
    defaultStyle = {},
    defaultIndex = 2
}) {
    let layer = null;
    let reqId = 0;
    const cache = new Map(); // url -> promesse GeoJSON
    const layers = new Map(); // Une seule conversion de géométrie par snapshot.
    let currentKey = null;
    let currentPicked = null; // { date, url }

    function coordsToLatLng(coords) {
        return L.latLng(coords[1], coords[0]);
    }

    function style(feature) {
        const t = feature?.properties?.type;
        const conf = typesConfig?.[t];

        const base = { ...defaultStyle, ...(conf?.style || {}) };
        const color = conf?.color;

        if (color) {
            return {
                ...base,
                color,
                fillColor: color
            };
        }

        return base;
    }

    function parseISODateToUTCms(iso) {
        const [y, m, d] = iso.split("-").map(Number);
        return Date.UTC(y, (m - 1), d);
    }

    function pickForTime(tsUtcMs) {
        const sorted = [...files].sort((a, b) => a.date.localeCompare(b.date));
        if (!sorted.length) return null;

        if (tsUtcMs == null) return sorted[defaultIndex] ?? sorted[0];

        let picked = sorted[0];
        for (const it of sorted) {
            const itMs = parseISODateToUTCms(it.date);
            if (itMs <= tsUtcMs) picked = it;
            else break;
        }
        return picked;
    }

    async function setForTime(tsUtcMs) {
        const myId = ++reqId;
        if (!map) return;

        const picked = pickForTime(tsUtcMs);
        if (!picked) return;

        // évite re-render si on a déjà exactement cette date
        if (currentKey === picked.date) return;

        if (!cache.has(picked.url)) {
            cache.set(picked.url, (async () => {
                const response = await fetch(picked.url);
                if (!response.ok) throw new Error("Occupation GeoJSON: HTTP " + response.status);
                return response.json();
            })().catch(error => { cache.delete(picked.url); throw error; }));
        }
        const geojson = await cache.get(picked.url);

        // ✅ si une autre requête setForTime a été lancée pendant le fetch, on ignore
        if (myId !== reqId) return;

        // ✅ seulement ici on “commit” l’état courant
        currentKey = picked.date;
        currentPicked = picked;

        if (layer) map.removeLayer(layer);

        if (!layers.has(picked.url)) {
            layers.set(picked.url, createGeojsonLayer(geojson, {
                pane: "pane-occupation", coordsToLatLng, style,
                interactive: false, className: "occupation-layer"
            }));
        }
        layer = layers.get(picked.url).addTo(map);
    }


    function clear() {
        reqId++;
        if (layer) map.removeLayer(layer);
        layer = null;
        currentKey = null;
        currentPicked = null;
    }

    function isEnabled() {
        return !!layer;
    }

    return { setForTime, clear, isEnabled, getCurrent: () => currentPicked };
}
