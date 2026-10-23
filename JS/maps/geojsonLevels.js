export function createGeojsonLevelsController({ map, L, createGeojsonLayer = (data, options) => L.geoJSON(data, options), levels = [], loadGeoJSON, defaultStyle = {}, lang = "fr" }) {
  const configured = levels.filter(level => level?.enabled !== false && level?.file);
  if (!configured.length) return null;
  const layers = new Map();
  const control = L.control({ position: "bottomleft" });
  let activeLang = lang;
  control.onAdd = () => {
    const container = L.DomUtil.create("div", "geojson-levels-control");
    container.style.cssText = "background:#fff;padding:8px 10px;border-radius:4px;box-shadow:0 1px 5px #0005;font:12px/1.5 Arial,sans-serif;";
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);
    for (const level of configured) {
      const row = L.DomUtil.create("label", "geojson-level-row", container);
      row.style.cssText = "display:flex;align-items:center;gap:6px;cursor:pointer;";
      const checkbox = L.DomUtil.create("input", "", row);
      checkbox.type = "checkbox";
      checkbox.checked = Boolean(level.visibleByDefault);
      const label = L.DomUtil.create("span", "", row);
      label.textContent = level.labels?.[activeLang] || level.labels?.fr || level.id;
      checkbox.addEventListener("change", async () => {
        checkbox.disabled = true;
        try {
          let layer = layers.get(level.id);
          if (!layer) {
            const data = await loadGeoJSON(level.file);
            layer = createGeojsonLayer(data, { style: { ...defaultStyle, ...(level.style || {}) } });
            layers.set(level.id, layer);
          }
          if (checkbox.checked) layer.addTo(map);
          else map.removeLayer(layer);
        } catch (error) {
          console.error(`Impossible de charger le niveau GeoJSON ${level.id}`, error);
          checkbox.checked = false;
        } finally { checkbox.disabled = false; }
      });
      if (checkbox.checked) queueMicrotask(() => checkbox.dispatchEvent(new Event("change")));
    }
    return container;
  };
  control.addTo(map);
  return { setLanguage(nextLang) {
    activeLang = nextLang;
    control.getContainer()?.querySelectorAll(".geojson-level-row").forEach((row, index) => {
      const level = configured[index];
      const label = row.querySelector("span");
      if (label) label.textContent = level.labels?.[activeLang] || level.labels?.fr || level.id;
    });
  } };
}
