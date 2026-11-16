// Le repli reste indépendant des filtres appliqués et de celui du panneau titre.
export function initTitleFilters({ getActiveCount, getStrings }) {
  const panel = document.getElementById("floating-controls");
  const toggle = document.getElementById("title-filters-toggle");
  const body = document.getElementById("title-filters-body");
  const content = document.getElementById("title-filters-content");
  if (!panel || !toggle || !body || !content) return null;

  const label = document.getElementById("title-filters-label");
  const badge = document.getElementById("title-filters-active");
  const overflowLabel = document.getElementById("title-filters-overflow");
  const chevron = document.getElementById("title-filters-chevron");
  let expanded = toggle.getAttribute("aria-expanded") !== "false";
  let frame = 0;

  function update() {
    frame = 0;
    const strings = getStrings();
    const count = getActiveCount();
    const countLabel = count === 1 ? strings.active : strings.activePlural;
    if (label.textContent !== strings.label) label.textContent = strings.label;
    const badgeText = `${count} ${countLabel}`;
    if (badge.textContent !== badgeText) badge.textContent = badgeText;
    badge.hidden = count === 0;
    if (overflowLabel.textContent !== strings.scroll) overflowLabel.textContent = strings.scroll;
    toggle.setAttribute("aria-expanded", String(expanded));
    body.hidden = !expanded;
    chevron.textContent = expanded ? "▾" : "▸";

    const visible = expanded && !panel.classList.contains("collapsed") && body.clientHeight > 0;
    const overflowing = visible && body.scrollHeight > body.clientHeight + 1;
    overflowLabel.hidden = !overflowing;
    if (overflowing) body.setAttribute("tabindex", "0");
    else body.removeAttribute("tabindex");
  }

  function scheduleUpdate() {
    if (!frame) frame = requestAnimationFrame(update);
  }

  function setExpanded(value) {
    expanded = Boolean(value);
    if (!expanded && body.contains(document.activeElement)) toggle.focus({ preventScroll: true });
    update();
    scheduleUpdate();
  }

  toggle.addEventListener("click", () => setExpanded(!expanded));
  const resizeObserver = new ResizeObserver(scheduleUpdate);
  [panel, body, content].forEach(element => resizeObserver.observe(element));
  const mutationObserver = new MutationObserver(scheduleUpdate);
  mutationObserver.observe(content, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["hidden", "style"] });
  mutationObserver.observe(panel, { attributes: true, attributeFilter: ["class"] });
  window.addEventListener("resize", scheduleUpdate, { passive: true });
  window.visualViewport?.addEventListener("resize", scheduleUpdate, { passive: true });
  document.addEventListener("visibilitychange", scheduleUpdate);
  document.fonts?.ready.then(scheduleUpdate);
  update();

  return { update: scheduleUpdate, setExpanded, isExpanded: () => expanded };
}
