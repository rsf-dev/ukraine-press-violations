const SCROLL_LABELS = {
  fr: { "event-list": "D\u00e9filement de la liste des cas", "country-content": "D\u00e9filement des statistiques" },
  en: { "event-list": "Scroll case list", "country-content": "Scroll statistics" },
  es: { "event-list": "Desplazamiento de la lista de casos", "country-content": "Desplazamiento de estad\u00edsticas" }
};

export function initPanelScrollProgress({ getLanguage = () => document.documentElement.lang } = {}) {
  ["event-list", "country-content"].forEach(id => {
    const scroller = document.getElementById(id);
    if (!scroller || scroller.dataset.scrollProgressBound) return;
    scroller.dataset.scrollProgressBound = "true";

    const region = document.createElement("div");
    region.className = "panel-scroll-region";
    scroller.before(region);
    region.appendChild(scroller);

    const rail = document.createElement("div");
    rail.className = "panel-scroll-progress";
    rail.tabIndex = 0;
    rail.hidden = true;
    rail.setAttribute("role", "scrollbar");
    rail.setAttribute("aria-controls", id);
    rail.setAttribute("aria-orientation", "vertical");
    rail.setAttribute("aria-valuemin", "0");
    rail.setAttribute("aria-valuemax", "100");
    rail.setAttribute("aria-valuenow", "0");
    region.appendChild(rail);

    const panel = region.parentElement;
    const maxScroll = () => Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    let frame = 0;

    const update = () => {
      frame = 0;
      const max = maxScroll();
      const progress = max ? Math.max(0, Math.min(1, scroller.scrollTop / max)) : 0;
      rail.hidden = max <= 1 || !panel.classList.contains("expanded");
      rail.style.setProperty("--scroll-progress", String(progress));
      rail.setAttribute("aria-valuenow", String(Math.round(progress * 100)));
      rail.setAttribute("aria-label", (SCROLL_LABELS[getLanguage()] || SCROLL_LABELS.fr)[id]);
    };
    const scheduleUpdate = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const scrollToPointer = event => {
      const rect = rail.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (event.clientY - rect.top) / Math.max(1, rect.height)));
      scroller.scrollTop = ratio * maxScroll();
      scheduleUpdate();
    };

    rail.addEventListener("pointerdown", event => {
      if (event.button !== 0) return;
      event.preventDefault();
      rail.focus({ preventScroll: true });
      rail.setPointerCapture(event.pointerId);
      scrollToPointer(event);
    });
    rail.addEventListener("pointermove", event => {
      if (rail.hasPointerCapture(event.pointerId)) scrollToPointer(event);
    });
    const releasePointer = event => {
      if (rail.hasPointerCapture(event.pointerId)) rail.releasePointerCapture(event.pointerId);
    };
    rail.addEventListener("pointerup", releasePointer);
    rail.addEventListener("pointercancel", releasePointer);
    rail.addEventListener("keydown", event => {
      const targets = {
        ArrowDown: scroller.scrollTop + 40,
        ArrowUp: scroller.scrollTop - 40,
        PageDown: scroller.scrollTop + scroller.clientHeight,
        PageUp: scroller.scrollTop - scroller.clientHeight,
        Home: 0,
        End: maxScroll()
      };
      if (!(event.key in targets)) return;
      event.preventDefault();
      scroller.scrollTop = targets[event.key];
      scheduleUpdate();
    });
    rail.addEventListener("wheel", event => {
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : (event.deltaMode === 2 ? scroller.clientHeight : 1);
      scroller.scrollTop += event.deltaY * unit;
      scheduleUpdate();
    }, { passive: false });
    scroller.addEventListener("scroll", scheduleUpdate, { passive: true });
    scroller.addEventListener("load", scheduleUpdate, true);

    const resizeObserver = new ResizeObserver(scheduleUpdate);
    resizeObserver.observe(scroller);
    if (id === "country-content") {
      Array.from(scroller.children).forEach(child => resizeObserver.observe(child));
    }
    const contentObserver = new MutationObserver(scheduleUpdate);
    contentObserver.observe(scroller, { childList: true, subtree: true, characterData: true });
    contentObserver.observe(panel, { attributes: true, attributeFilter: ["class"] });
    document.fonts?.ready.then(scheduleUpdate);
    scheduleUpdate();
  });
}
