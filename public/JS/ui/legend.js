// ui/legend.js
import { normalizeType } from "../utils/strings.js";
import { escapeAttribute, escapeHtml } from "../utils/security.js";

export const LegendUI = (() => {
  let _getState = null;
  let _getLegendIconUrl = null;
  let _getDisplayLabelForType = null;
  let _pausePlayback = null;
  let _render = null;

  function init({
    getState,
    getLegendIconUrl,
    getDisplayLabelForType,
    pausePlayback,
    render
  }) {
    _getState = getState;
    _getLegendIconUrl = getLegendIconUrl;
    _getDisplayLabelForType = getDisplayLabelForType;
    _pausePlayback = pausePlayback;
    _render = render;
  }

  function _getTypes() {
    const { allEvents } = _getState();
    return Array.from(new Set(allEvents.map(ev => ev.type_violence)));
  }

  function syncHeaderLegendSelection() {
    const { allEvents, selectedTypes } = _getState();
    const types = Array.from(new Set(allEvents.map(ev => ev.type_violence)));
    const allSelected = (selectedTypes.size === 0);

    types.forEach(type => {
      const item = document.querySelector(`.header-legend-${normalizeType(type)}`);
      if (!item) return;
      const isOn = allSelected || selectedTypes.has(type);
      item.classList.toggle("is-off", !isOn);
    });
  }

  function syncMenuLegendFromSelection() {
    const legendDiv = document.getElementById("legend");
    if (!legendDiv) return;

    const { selectedTypes } = _getState();
    const allSelected = (selectedTypes.size === 0);

    legendDiv.querySelectorAll("input[type=checkbox]").forEach(chk => {
      const type = chk.dataset.type;
      chk.checked = allSelected || selectedTypes.has(type);
    });
  }

  function initHeaderLegend() {
    const headerLegend = document.getElementById("header-legend");
    if (!headerLegend) return;

    headerLegend.innerHTML = "";

    const types = _getTypes();

    types.forEach(type => {
      const iconUrl = _getLegendIconUrl(type);
      const slug = normalizeType(type);
      const countId = `header-count-${slug}`;
      const label = _getDisplayLabelForType(type);

      const item = document.createElement("div");
      item.className = `header-legend-item header-legend-${slug}`;
      item.dataset.type = type;

      item.innerHTML = `
        <span class="header-legend-count" id="${escapeAttribute(countId)}">0</span>
        <img class="header-legend-icon" src="${escapeAttribute(iconUrl)}" alt="${escapeAttribute(label)}">
        <span class="header-legend-label">${escapeHtml(label)}</span>
      `;

      item.addEventListener("click", () => {
        _pausePlayback?.();

        const { allEvents, selectedTypes } = _getState();
        const clickedType = item.dataset.type;

        if (selectedTypes.size === 0) {
          const next = new Set(allEvents.map(ev => ev.type_violence));
          next.delete(clickedType);
          _getState().setSelectedTypes(next);
        } else {
          const next = new Set(selectedTypes);
          if (next.has(clickedType)) next.delete(clickedType);
          else next.add(clickedType);
          _getState().setSelectedTypes(next);
        }

        syncHeaderLegendSelection();
        syncMenuLegendFromSelection();
        _render?.();
      });

      headerLegend.appendChild(item);
    });

    syncHeaderLegendSelection();
  }

  function updateHeaderLegendCounts(visibleEvents) {
    const types = _getTypes();

    const counts = {};
    visibleEvents.forEach(ev => {
      const t = ev.type_violence;
      counts[t] = (counts[t] || 0) + 1;
    });

    types.forEach(type => {
      const span = document.getElementById("header-count-" + normalizeType(type));
      if (span) span.textContent = counts[type] || 0;
    });
  }

  function buildMenuLegend() {
    const legendDiv = document.getElementById("legend");
    if (!legendDiv) return;

    legendDiv.innerHTML = "";

    const types = _getTypes();

    types.forEach(type => {
      const id = "chk_" + normalizeType(type);
      const iconUrl = _getLegendIconUrl(type);
      const label = _getDisplayLabelForType(type);

      const div = document.createElement("div");
      div.innerHTML = `
        <label for="${escapeAttribute(id)}">
          <input type="checkbox" id="${escapeAttribute(id)}" checked data-type="${escapeAttribute(type)}">
          <img src="${escapeAttribute(iconUrl)}" alt="${escapeAttribute(label)}"> ${escapeHtml(label)}
        </label>`;
      legendDiv.appendChild(div);
    });

    legendDiv.querySelectorAll("input[type=checkbox]").forEach(chk => {
      chk.addEventListener("change", e => {
        _pausePlayback?.();

        const { selectedTypes } = _getState();
        const type = e.target.dataset.type;

        const next = new Set(selectedTypes);
        if (e.target.checked) next.add(type);
        else next.delete(type);

        _getState().setSelectedTypes(next);

        syncHeaderLegendSelection();
        _render?.();
      });
    });

    syncHeaderLegendSelection();
  }

  return {
    init,
    initHeaderLegend,
    buildMenuLegend,
    updateHeaderLegendCounts,
    syncHeaderLegendSelection,
    syncMenuLegendFromSelection
  };
})();
