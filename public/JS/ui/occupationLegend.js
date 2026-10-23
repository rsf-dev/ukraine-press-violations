// ui/occupationLegend.js

export function createOccupationLegend({ getLang, getStrings, typesConfig }) {
    let control = null;
    let containerEl = null;
    let currentDate = null; // "YYYY-MM-DD"

    function buildHtml() {
        const lang = getLang?.() || "en";

        const strings = getStrings?.() || {};
        const dict =
            (strings[lang] && strings[lang].occupationLegend) ||
            (strings.en && strings.en.occupationLegend) ||
            {};

        const title = dict.title || "Occupied / controlled areas";

        const datePrefix = dict.datePrefix || "";
        const dateLine = currentDate
            ? `${datePrefix ? datePrefix + " " : ""}${currentDate}`
            : "";

        const sourceLine = dict.source ? `<div class="occ-legend-source">${dict.source}</div>` : "";

        const rows = Object.entries(typesConfig || {}).map(([typeId, cfg]) => {
            const key = cfg.i18nKey || typeId;
            const label = dict[key] || typeId;
            const color = cfg.color || "#999";



            return `
        <div class="occ-legend-row">
          <span class="occ-legend-swatch" style="background:${color}"></span>
          <span class="occ-legend-label">${label}</span>
        </div>
      `;
        }).join("");

        return `
      <div class="occ-legend">
        <div class="occ-legend-title">${title}</div>
        ${dateLine ? `<div class="occ-legend-date">${dateLine}</div>` : ""}
        ${rows}
        ${sourceLine}
      </div>
    `;
    }

    function onAdd() {
        const div = L.DomUtil.create("div", "leaflet-control occ-legend-control");
        div.innerHTML = buildHtml();

        L.DomEvent.disableClickPropagation(div);
        L.DomEvent.disableScrollPropagation(div);

        containerEl = div;
        return div;
    }

    function mount(map) {
        if (!map || typeof map.addControl !== "function") {
            console.error("OccupationLegend.mount: map invalide", map);
            return;
        }
        if (control) return;

        control = L.control({ position: "topright" });
        control.onAdd = onAdd;
        control.addTo(map);
    }

    function update() {
        if (!containerEl) return;
        containerEl.innerHTML = buildHtml();
    }

    function setDate(dateStr) {
        currentDate = dateStr;
        update();
    }

    function remove() {
        if (!control) return;
        control.remove();
        control = null;
        containerEl = null;
    }

    return { mount, update, setDate, remove };
}
