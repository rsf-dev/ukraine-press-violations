// JS/ui/oblastFilters.js

export const OblastFilters = (() => {
  let deps = null;

  function setInputValue(v) {
    const input = document.getElementById("lieu-filter");
    if (input) input.value = v || "";
  }

  function hideDropdown() {
    const dd = document.getElementById("lieu-dropdown");
    if (dd) dd.classList.add("hidden");
  }

  function clearDropdown() {
    const dd = document.getElementById("lieu-dropdown");
    if (dd) {
      dd.innerHTML = "";
      dd.classList.add("hidden");
    }
  }

  function clearVilleSelect() {
    const select = document.getElementById("ville-select");
    if (select) {
      select.innerHTML = "";
      select.classList.add("hidden");
    }
  }

  function renderOblastSuggestions(text) {
    const { getState, setSelectedOblast, setSelectedVille, setVillesDisponibles } = deps;
    const { oblastsDisponibles, allEvents } = getState();

    const dd = document.getElementById("lieu-dropdown");
    if (!dd) return;

    dd.innerHTML = "";

    const filtered = (oblastsDisponibles || []).filter(o =>
      String(o).toLowerCase().includes(String(text).toLowerCase())
    );

    if (!filtered.length) {
      dd.classList.add("hidden");
      return;
    }

    filtered.forEach(oblast => {
      const btn = document.createElement("button");
      btn.className = "lieu-option";
      btn.textContent = oblast;

      btn.addEventListener("mousedown", e => {
        e.preventDefault();

        deps.pausePlayback?.();

        setSelectedOblast(oblast);
        setSelectedVille(null);
        setInputValue(oblast);
        dd.classList.add("hidden");

        deps.updateOblastPanel?.(oblast);
        deps.setRightPanelExpanded?.(true);

        // villes dispos
        const villes = Array.from(
          new Set(
            allEvents
              .filter(ev => deps.getEventOblast(ev) === oblast)
              .map(ev => ev.lieu)
          )
        )
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));

        setVillesDisponibles(villes);

        // highlight oblast + rerender
        const ev0 = allEvents.find(ev => deps.getEventOblast(ev) === oblast);
        if (ev0) deps.highlightOblastForEvent?.(ev0);
        deps.zoomToOblast?.(oblast);
        deps.afficherEvenements?.();
        initVilleDropdown(); // refresh select
      });

      dd.appendChild(btn);
    });

    dd.classList.remove("hidden");
  }

  function initVilleDropdown() {
    const { getState, setSelectedVille } = deps;
    const { villesDisponibles, currentLang, selectedOblast, allEvents } = getState();

    const select = document.getElementById("ville-select");
    if (!select) return;

    select.innerHTML = "";
    select.classList.remove("hidden");

    const optAll = document.createElement("option");
    optAll.value = "";
    optAll.textContent = (currentLang === "en") ? "All cities" : "Toutes les villes";
    select.appendChild(optAll);

    (villesDisponibles || []).forEach(ville => {
      const opt = document.createElement("option");
      opt.value = ville;
      opt.textContent = ville;
      select.appendChild(opt);
    });

    select.onchange = () => {
      deps.pausePlayback?.();
      const v = select.value || null;
      setSelectedVille(v);
      deps.afficherEvenements?.();

      if (v) {
        const ev0 = allEvents.find(ev =>
          ev.lieu === v && deps.getEventOblast(ev) === selectedOblast
        );
        if (ev0 && Number.isFinite(ev0.lat) && Number.isFinite(ev0.lng) && deps.map) {
          deps.map.setView([ev0.lat, ev0.lng], 7);
        }
      }
    };
  }

  function clearFiltersPreservePlayback({ resetZoom = false } = {}) {
    const {
      setSelectedOblast,
      setSelectedVille,
      setVillesDisponibles,
      map,
      INITIAL_CENTER,
      INITIAL_ZOOM
    } = deps;

    setSelectedOblast(null);
    setSelectedVille(null);
    setVillesDisponibles([]);

    setInputValue("");
    clearDropdown();
    clearVilleSelect();

    deps.clearOblastHighlight?.();
    deps.resetLastHighlightedOblast?.();
    deps.updateOblastPanel?.(null);

    if (resetZoom && map) {
      map.flyTo(INITIAL_CENTER, INITIAL_ZOOM, { animate: true, duration: 0.8 });
    }

    deps.afficherEvenements?.();
  }

  function buildOblastListFromEvents(allEvents) {
    const s = new Set();
    (allEvents || []).forEach(ev => {
      const o = deps.getEventOblast(ev);
      if (o) s.add(o);
    });

    return Array.from(s).sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
  }

  function init(initDeps) {
    deps = initDeps;

    const input = document.getElementById("lieu-filter");
    const resetBtn = document.getElementById("lieu-reset");

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        deps.pausePlayback?.();
        clearFiltersPreservePlayback({ resetZoom: false });
      });
    }

    if (input) {
      input.addEventListener("input", () => {
        const val = input.value.trim();
        if (val.length < 1) {
          deps.pausePlayback?.();
          clearFiltersPreservePlayback({ resetZoom: false });
          return;
        }
        renderOblastSuggestions(val);
      });
    }
  }

  function setOblastsList(oblasts) {
    deps.setOblastsDisponibles?.(oblasts || []);
  }

  return {
    init,
    setOblastsList,
    buildOblastListFromEvents,
    initVilleDropdown,
    clearFiltersPreservePlayback
  };
})();
