const boundMenus = new WeakMap();

export function initUtilityMenu({ document: page = globalThis.document } = {}) {
  const menu = page.getElementById("utility-menu");
  const toggle = page.getElementById("utility-menu-toggle");
  const panel = page.getElementById("utility-menu-panel");
  if (!menu || !toggle || !panel) return null;
  if (boundMenus.has(menu)) return boundMenus.get(menu);

  const isOpen = () => menu.classList.contains("open");
  const setOpen = open => {
    menu.classList.toggle("open", Boolean(open));
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(Boolean(open)));
  };
  const controller = { open: () => setOpen(true), close: () => setOpen(false), isOpen };
  boundMenus.set(menu, controller);
  setOpen(false);
  toggle.addEventListener("click", () => setOpen(!isOpen()));
  page.addEventListener("pointerdown", event => {
    if (isOpen() && !menu.contains(event.target)) setOpen(false);
  });
  page.addEventListener("keydown", event => {
    if (event.key !== "Escape" || !isOpen()) return;
    setOpen(false);
    toggle.focus();
    event.preventDefault();
    event.stopImmediatePropagation();
  }, { capture: true });
  return controller;
}
