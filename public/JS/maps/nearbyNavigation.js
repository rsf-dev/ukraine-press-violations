const DEFAULTS = {
  enabled: true, zoomMinimum: 11, maximumVisibles: 1,
  margeDesktop: 56, margeMobile: 20, espacementComposants: 12,
  seuilMobile: 768, dureeDeplacement: 0.65
};

const COMPONENTS = "#floating-controls, #app-topbar, #map-title-panel, #utility-menu-toggle, #utility-menu-panel, #event-panel, #country-panel, #bottom-chart-panel, .leaflet-control-zoom, .leaflet-control-layers, .leaflet-control-attribution, .occ-legend-control, .leaflet-popup";
const OVERLAYS = "#loading-overlay, #tutorial-overlay, #rsf-cartography-modal, #credits-modal";
const GROUP_EVENTS = "animationend spiderfied unspiderfied";
const FALLBACK_TEXT = {
  fr: { evenement: "Rejoindre l’événement le plus proche", groupe: "Rejoindre le groupe le plus proche ({count} événements)" },
  es: { evenement: "Ir al evento más cercano", groupe: "Ir al grupo más cercano ({count} eventos)" },
  en: { evenement: "Go to the nearest event", groupe: "Go to the nearest group ({count} events)" }
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const inside = (point, rect) => point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
const around = (point, width, height = width) => ({ left: point.x - width / 2, right: point.x + width / 2, top: point.y - height / 2, bottom: point.y + height / 2 });
const expand = (rect, gap) => ({ left: rect.left - gap, right: rect.right + gap, top: rect.top - gap, bottom: rect.bottom + gap });

// Le parent public peut être null hors écran : retrouver alors le groupe du zoom courant.
// Adaptateur isolé pour Leaflet.markercluster 1.5.3 (MarkerClusterGroup.addLayer / getVisibleParent).
export function collectNavigationTargets(group, zoom, getClusterIconRadius = count => Math.round(Math.min(20 + count, 60) * 1.35) / 2) {
  if (!group) return [];
  const representatives = new Set();
  for (const marker of group.getLayers()) {
    if (!marker?.getLatLng) continue;
    let representative = group.getVisibleParent(marker);
    if (!representative) {
      representative = marker;
      const visited = new Set([marker]);
      while (representative.__parent && representative.__parent._zoom >= Math.round(zoom)) {
        const parent = representative.__parent;
        if (visited.has(parent)) break;
        visited.add(parent);
        representative = parent;
      }
    }
    representatives.add(representative);
  }
  return [...representatives].map(layer => {
    const count = layer.getChildCount?.() || 1;
    const metadata = layer.options?.rsfNavigation || {};
    const size = layer.options?.icon?.options?.iconSize;
    const markerRadius = Math.max(size?.[0] || size?.x || 36, size?.[1] || size?.y || 36) / 2;
    return {
      layer, latlng: layer.getLatLng(), count,
      radius: count > 1 ? getClusterIconRadius(count) : markerRadius,
      iconUrl: count === 1 ? metadata.iconUrl : null,
      label: count === 1 ? metadata.label : ""
    };
  }).filter(target => Number.isFinite(target.latlng.lat) && Number.isFinite(target.latlng.lng));
}

export function targetIsVisible(target, viewport, obstacles) {
  const { x, y } = target.point;
  const radius = target.radius || 0;
  return [{ x, y }, { x: x - radius, y }, { x: x + radius, y }, { x, y: y - radius }, { x, y: y + radius }]
    .some(point => inside(point, viewport) && !obstacles.some(rect => inside(point, rect)));
}

export function chooseNavigationTarget({ targets, viewport, obstacles = [], zoom, zoomMinimum = 11, maximumVisibles = 1 }) {
  if (zoom < zoomMinimum) return null;
  let visibleCount = 0;
  let nearest = null;
  for (const target of targets) {
    if (targetIsVisible(target, viewport, obstacles)) visibleCount++;
    else if (Number.isFinite(target.distance) && (!nearest || target.distance < nearest.distance)) nearest = target;
  }
  return nearest && visibleCount <= maximumVisibles ? { target: nearest, visibleCount } : null;
}

function freeIntervals(min, max, blocked) {
  let intervals = [[min, max]];
  for (const [start, end] of blocked) {
    intervals = intervals.flatMap(([a, b]) => {
      if (end <= a || start >= b) return [[a, b]];
      return [...(start > a ? [[a, start]] : []), ...(end < b ? [[end, b]] : [])];
    });
  }
  return intervals;
}

export function placeEdgeNavigator({ viewport, target, obstacles = [], width, height, margin, gap = 12, mobile = false }) {
  const bounds = { left: viewport.left + margin + width / 2, right: viewport.right - margin - width / 2,
    top: viewport.top + margin + height / 2, bottom: viewport.bottom - margin - height / 2 };
  if (bounds.right < bounds.left || bounds.bottom < bounds.top) return null;
  const center = { x: (bounds.left + bounds.right) / 2, y: (bounds.top + bounds.bottom) / 2 };
  const dx = target.x - center.x, dy = target.y - center.y;
  const scale = Math.min(dx ? (bounds.right - bounds.left) / 2 / Math.abs(dx) : Infinity,
    dy ? (bounds.bottom - bounds.top) / 2 / Math.abs(dy) : Infinity);
  const ideal = Number.isFinite(scale) ? { x: center.x + dx * scale, y: center.y + dy * scale } : { x: center.x, y: bounds.bottom };
  const exclusions = obstacles.map(rect => expand(rect, gap));
  const candidates = [];
  const addEdge = (edge, horizontal, coordinate) => {
    const min = horizontal ? bounds.left : bounds.top, max = horizontal ? bounds.right : bounds.bottom;
    const blocked = exclusions.filter(rect => horizontal
      ? coordinate + height / 2 > rect.top && coordinate - height / 2 < rect.bottom
      : coordinate + width / 2 > rect.left && coordinate - width / 2 < rect.right)
      .map(rect => horizontal ? [rect.left - width / 2, rect.right + width / 2] : [rect.top - height / 2, rect.bottom + height / 2]);
    for (const [a, b] of freeIntervals(min, max, blocked)) {
      const along = clamp(horizontal ? ideal.x : ideal.y, a, b);
      candidates.push(horizontal ? { x: along, y: coordinate, edge } : { x: coordinate, y: along, edge });
    }
  };
  addEdge("bottom", true, bounds.bottom);
  if (!mobile) {
    addEdge("top", true, bounds.top);
    addEdge("left", false, bounds.left);
    addEdge("right", false, bounds.right);
  }
  candidates.sort((a, b) => Math.hypot(a.x - ideal.x, a.y - ideal.y) - Math.hypot(b.x - ideal.x, b.y - ideal.y));
  const point = candidates[0];
  return point ? { ...point, angle: Math.atan2(target.y - point.y, target.x - point.x) * 180 / Math.PI } : null;
}

export function findLandingPoint({ viewport, obstacles = [], radius = 24, gap = 12 }) {
  const minX = viewport.left + radius + gap, maxX = viewport.right - radius - gap;
  const minY = viewport.top + radius + gap, maxY = viewport.bottom - radius - gap;
  if (maxX < minX || maxY < minY) return null;
  const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  const rects = obstacles.map(rect => expand(rect, gap));
  const xs = [center.x, minX, maxX, ...rects.flatMap(rect => [rect.left - radius, rect.right + radius])].map(x => clamp(x, minX, maxX));
  const ys = [center.y, minY, maxY, ...rects.flatMap(rect => [rect.top - radius, rect.bottom + radius])].map(y => clamp(y, minY, maxY));
  const points = xs.flatMap(x => ys.map(y => ({ x, y }))).filter(point => !rects.some(rect => overlaps(around(point, radius * 2), rect)));
  points.sort((a, b) => Math.hypot(a.x - center.x, a.y - center.y) - Math.hypot(b.x - center.x, b.y - center.y));
  return points[0] || null;
}

export function createNearbyNavigator({ L, map, getClusterGroup, isEnabled = () => true, getLang = () => "fr",
  getStrings = () => ({}), getClusterIconRadius, onNavigate = () => {}, settings = {}, document: page = globalThis.document,
  window: browser = globalThis.window }) {
  const options = { ...DEFAULTS, ...settings };
  const container = map.getContainer();
  const button = page.createElement("button");
  button.type = "button";
  button.id = "nearby-event-navigation";
  button.className = "nearby-event-navigation";
  button.hidden = true;
  const preview = page.createElement("span");
  preview.className = "nearby-event-preview";
  preview.setAttribute("aria-hidden", "true");
  const arrow = page.createElementNS("http://www.w3.org/2000/svg", "svg");
  arrow.setAttribute("viewBox", "0 0 24 24");
  arrow.setAttribute("aria-hidden", "true");
  arrow.classList.add("nearby-event-arrow");
  const path = page.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M4 12h16m-7-7 7 7-7 7");
  arrow.appendChild(path);
  button.append(preview, arrow);
  container.appendChild(button);
  L.DomEvent.disableClickPropagation(button);
  L.DomEvent.disableScrollPropagation(button);

  let frame = null, moving = false, destroyed = false, group = null, previewKey = null;
  const requestFrame = browser.requestAnimationFrame.bind(browser);
  const cancelFrame = browser.cancelAnimationFrame.bind(browser);
  const observed = new Set();
  const hide = () => { button.hidden = true; };

  function readRect(element) {
    const style = browser.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return null;
    const rect = element.getBoundingClientRect(), root = container.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return { left: rect.left - root.left, top: rect.top - root.top, right: rect.right - root.left, bottom: rect.bottom - root.top };
  }

  function layout() {
    const { x: width, y: height } = map.getSize();
    const viewport = { left: 0, top: 0, right: width, bottom: height };
    const mobile = width <= options.seuilMobile;
    button.classList.toggle("is-mobile", mobile);
    for (const element of page.querySelectorAll(OVERLAYS)) {
      const rect = readRect(element);
      if (rect && overlaps(rect, viewport)) return null;
    }
    const obstacles = [];
    const free = { ...viewport };
    for (const element of page.querySelectorAll(COMPONENTS)) {
      let rect = readRect(element);
      if (!rect) continue;
      const sidePanel = ["event-panel", "country-panel"].includes(element.id);
      if (sidePanel && element.classList.contains("expanded")) {
        const panelWidth = rect.right - rect.left;
        rect = { left: width - panelWidth, right: width, top: 0, bottom: height };
        if (panelWidth > width * 0.6) return null;
        free.right = Math.min(free.right, rect.left);
      }
      if (!overlaps(rect, viewport)) continue;
      obstacles.push(rect);
      if (element.id === "bottom-chart-panel" && rect.top <= 1 && rect.bottom < height / 2) free.top = Math.max(free.top, rect.bottom);
      if (mobile && ["floating-controls", "app-topbar", "map-title-panel"].includes(element.id) && rect.bottom >= height - 2 && rect.right - rect.left > width / 2) free.bottom = Math.min(free.bottom, rect.top);
    }
    const style = browser.getComputedStyle(button);
    const safe = edge => parseFloat(style.getPropertyValue("--nearby-safe-" + edge)) || 0;
    free.left += safe("left"); free.right -= safe("right"); free.top += safe("top"); free.bottom -= safe("bottom");
    return { viewport, free, obstacles, mobile, width: parseFloat(style.width) || (mobile ? 64 : 76), height: parseFloat(style.height) || (mobile ? 44 : 48) };
  }

  function state() {
    if (destroyed || moving || !options.enabled || !isEnabled() || map.getZoom() < options.zoomMinimum) return null;
    const currentGroup = getClusterGroup();
    if (currentGroup !== group) {
      group?.off(GROUP_EVENTS, refresh);
      group = currentGroup;
      group?.on(GROUP_EVENTS, refresh);
    }
    if (!group || !map.hasLayer(group)) return null;
    const geometry = layout();
    if (!geometry) return null;
    const center = map.getCenter();
    const targets = collectNavigationTargets(group, map.getZoom(), getClusterIconRadius).map(target => ({ ...target,
      point: map.latLngToContainerPoint(target.latlng), distance: map.distance(center, target.latlng) }));
    const choice = chooseNavigationTarget({ targets, viewport: geometry.viewport, obstacles: geometry.obstacles,
      zoom: map.getZoom(), zoomMinimum: options.zoomMinimum, maximumVisibles: options.maximumVisibles });
    if (!choice) return null;
    const placement = placeEdgeNavigator({ viewport: geometry.free, target: choice.target.point, obstacles: geometry.obstacles,
      width: geometry.width, height: geometry.height, mobile: geometry.mobile,
      margin: geometry.mobile ? options.margeMobile : options.margeDesktop, gap: options.espacementComposants });
    return placement ? { ...choice, geometry, placement } : null;
  }

  function update() {
    frame = null;
    const current = state();
    if (!current) { hide(); return; }
    const { target, geometry, placement, visibleCount } = current;
    const lang = getLang(), strings = { ...(FALLBACK_TEXT[lang] || FALLBACK_TEXT.fr), ...getStrings() };
    const format = new Intl.NumberFormat(lang, { maximumFractionDigits: target.distance < 1000 ? 0 : 1 });
    const distance = target.distance < 1000 ? format.format(target.distance) + " m" : format.format(target.distance / 1000) + " km";
    const label = (target.count > 1 ? strings.groupe.replace("{count}", String(target.count)) : strings.evenement) +
      (target.label ? " — " + target.label : "") + " · " + distance;
    button.setAttribute("aria-label", label);
    button.title = label;
    button.dataset.targetKind = target.count > 1 ? "cluster" : "event";
    button.dataset.visibleCount = String(visibleCount);
    button.dataset.edge = placement.edge;
    const key = target.count > 1 ? "cluster:" + target.count : "event:" + (target.iconUrl || "");
    if (key !== previewKey) {
      previewKey = key;
      preview.replaceChildren();
      if (target.count > 1 || !target.iconUrl) preview.textContent = target.count > 1 ? String(target.count) : "•";
      else {
        const image = page.createElement("img");
        image.src = target.iconUrl;
        image.alt = "";
        preview.appendChild(image);
      }
    }
    preview.classList.toggle("is-cluster", target.count > 1);
    button.style.left = placement.x - geometry.width / 2 + "px";
    button.style.top = placement.y - geometry.height / 2 + "px";
    arrow.style.transform = "rotate(" + placement.angle + "deg)";
    button.hidden = false;
  }

  function refresh() {
    if (!destroyed && frame === null) frame = requestFrame(update);
  }
  function startMoving() { moving = true; hide(); }
  function endMoving() { moving = false; refresh(); }

  button.addEventListener("click", event => {
    event.stopPropagation();
    const current = state();
    if (!current) { hide(); return; }
    const landing = findLandingPoint({ viewport: current.geometry.free, obstacles: current.geometry.obstacles,
      radius: current.target.radius, gap: options.espacementComposants });
    if (!landing) { hide(); return; }
    onNavigate();
    const zoom = map.getZoom(), size = map.getSize(), world = map.project(current.target.latlng, zoom);
    const center = map.unproject(L.point(world.x + size.x / 2 - landing.x, world.y + size.y / 2 - landing.y), zoom);
    const reducedMotion = browser.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    map.flyTo(center, zoom, { animate: !reducedMotion, duration: options.dureeDeplacement });
  });

  const resizeObserver = browser.ResizeObserver ? new browser.ResizeObserver(refresh) : null;
  const mutationObserver = browser.MutationObserver ? new browser.MutationObserver(refresh) : null;
  for (const element of [container, ...page.querySelectorAll("#floating-controls, #app-topbar, #map-title-panel, #utility-menu, #event-panel, #country-panel, #bottom-chart-panel, .leaflet-control-container, " + OVERLAYS)]) {
    if (observed.has(element)) continue;
    observed.add(element);
    resizeObserver?.observe(element);
    // Ne pas observer les styles des marqueurs ni ceux de notre bouton.
    if (element !== container) mutationObserver?.observe(element, { attributes: true, childList: true, subtree: true,
      attributeFilter: ["class", "hidden", "aria-expanded"] });
  }
  mutationObserver?.observe(page.body, { attributes: true, attributeFilter: ["class"] });
  const onTransitionEnd = event => { if (event.target.closest?.(COMPONENTS + ", " + OVERLAYS)) refresh(); };
  page.addEventListener("transitionend", onTransitionEnd);
  map.on("movestart zoomstart", startMoving);
  map.on("moveend zoomend", endMoving);
  map.on("resize layeradd layerremove", refresh);
  map.on("unload", destroy);
  refresh();

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    if (frame !== null) cancelFrame(frame);
    resizeObserver?.disconnect(); mutationObserver?.disconnect();
    group?.off(GROUP_EVENTS, refresh);
    map.off("movestart zoomstart", startMoving);
    map.off("moveend zoomend", endMoving);
    map.off("resize layeradd layerremove", refresh);
    map.off("unload", destroy);
    page.removeEventListener("transitionend", onTransitionEnd);
    button.remove();
  }
  return { refresh, destroy };
}
