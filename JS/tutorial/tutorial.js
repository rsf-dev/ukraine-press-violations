// JS/tutorial/tutorial.js
export function createTutorial({
  getState,
  setPanelExpanded,
  setRightPanelExpanded,
  updateOblastPanel,
  highlightOblastForEvent,
  clearOblastHighlight,
  render,
  UI_STRINGS,
  showBottomChart,
  hideBottomChart,
  updateBottomChart
}) {
  const TOTAL_STEPS = 7;
  const SEEN_KEY = "rsf_tutorial_seen_ukraine_v2";
  let tutorialActive = false;
  let tutorialStep = 0;

  function markAsSeen() {
    try { localStorage.setItem(SEEN_KEY, "1"); } catch (e) {}
  }

  function hasSeen() {
    try { return localStorage.getItem(SEEN_KEY) === "1"; } catch (e) { return false; }
  }

  function getTutorialOverlay() {
    return document.getElementById("tutorial-overlay");
  }

  function ensureTutorialStepEl() {
    let stepEl = document.getElementById("tutorial-step");
    const card = document.querySelector("#tutorial-overlay .tutorial-card");
    if (!stepEl && card) {
      stepEl = document.createElement("p");
      stepEl.id = "tutorial-step";
      stepEl.className = "tutorial-step";
      card.insertBefore(stepEl, card.firstChild);
    }
    return stepEl;
  }

  function ensureTutorialFocusEl() {
    let focusEl = document.getElementById("tutorial-focus");
    const overlay = getTutorialOverlay();
    if (!focusEl && overlay) {
      focusEl = document.createElement("div");
      focusEl.id = "tutorial-focus";
      focusEl.className = "tutorial-focus";
      focusEl.setAttribute("aria-hidden", "true");
      overlay.insertBefore(focusEl, overlay.querySelector(".tutorial-card"));
    }
    return focusEl;
  }

  function setUtilityMenuOpen(open) {
    const menu = document.getElementById("utility-menu");
    const panel = document.getElementById("utility-menu-panel");
    const toggle = document.getElementById("utility-menu-toggle");
    menu?.classList.toggle("open", !!open);
    if (panel) panel.hidden = !open;
    toggle?.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function expandTitlePanel() {
    const panel = document.getElementById("floating-controls");
    const toggle = document.getElementById("map-title-toggle");
    panel?.classList.remove("collapsed");
    toggle?.setAttribute("aria-expanded", "true");
  }

  function clearTutorialHighlights() {
    document.querySelectorAll(".tutorial-highlight-left, .tutorial-highlight-right, .tutorial-highlight-bottom")
      .forEach((element) => {
        element.classList.remove("tutorial-highlight-left", "tutorial-highlight-right", "tutorial-highlight-bottom");
      });
  }

  function show() {
    const overlay = getTutorialOverlay();
    if (!overlay) return;
    overlay.classList.remove("tutorial-hidden");
    overlay.classList.add("tutorial-visible");
    requestAnimationFrame(positionTutorialFocus);
  }

  function hide() {
    const overlay = getTutorialOverlay();
    const focusEl = ensureTutorialFocusEl();
    if (overlay) {
      overlay.classList.remove("tutorial-visible", "card-top", "card-bottom", "card-left");
      overlay.classList.add("tutorial-hidden");
    }
    if (focusEl) focusEl.style.opacity = "0";
  }

  function getTextForStep(step) {
    const { currentLang } = getState();
    const lang = currentLang === "en" ? "en" : "fr";
    return UI_STRINGS[lang]?.tutorial?.[`step${step}`] || {};
  }

  function setContent(step, showSkip = step === 1) {
    const t = getTextForStep(step);
    const { currentLang } = getState();
    const lang = currentLang === "en" ? "en" : "fr";
    const titleEl = document.getElementById("tutorial-title");
    const bodyEl = document.getElementById("tutorial-body");
    const subtitleEl = document.getElementById("tutorial-subtitle");
    const bodyEl2 = document.getElementById("tutorial-body-2");
    const nextBtn = document.getElementById("tutorial-next-btn");
    const skipBtn = document.getElementById("tutorial-skip-btn");
    const stepEl = ensureTutorialStepEl();

    if (stepEl) stepEl.textContent = `${step} / ${TOTAL_STEPS}`;
    if (titleEl) titleEl.textContent = t.title || "";
    if (bodyEl) bodyEl.textContent = t.body || "";
    if (subtitleEl) {
      subtitleEl.textContent = t.subtitle || "";
      subtitleEl.hidden = !t.subtitle;
    }
    if (bodyEl2) {
      bodyEl2.textContent = t.body2 || "";
      bodyEl2.hidden = !t.body2;
    }
    if (nextBtn) nextBtn.textContent = t.nextLabel || (lang === "en" ? "Next" : "Suivant");
    if (skipBtn) skipBtn.style.display = showSkip ? "inline-block" : "none";
  }

  function getStepTarget(step) {
    if (step === 1 || step === 2) {
      return document.getElementById("floating-controls") || document.getElementById("map");
    }
    if (step === 3) {
      return document.getElementById("utility-menu") || document.getElementById("utility-menu-toggle");
    }
    if (step === 4) {
      return document.getElementById("event-panel");
    }
    if (step === 5) {
      return document.getElementById("bottom-chart-panel") || document.querySelector(".floating-content");
    }
    if (step === 6) {
      return document.getElementById("country-panel");
    }
    if (step === 7) {
      return document.getElementById("utility-regions-mode-toggle") ||
        document.getElementById("utility-menu") ||
        document.getElementById("utility-menu-toggle");
    }
    return document.getElementById("map");
  }

  function prepareStep(step) {
    const eventPanel = document.getElementById("event-panel");
    const rightPanel = document.getElementById("country-panel");
    const bottomPanel = document.getElementById("bottom-chart-panel");
    const { allEvents } = getState();

    clearTutorialHighlights();

    if (step === 1 || step === 2) {
      expandTitlePanel();
      setUtilityMenuOpen(false);
      setPanelExpanded(false);
      setRightPanelExpanded(false);
      hideBottomChart?.();
      bottomPanel?.classList.remove("open");
      bottomPanel?.setAttribute("aria-hidden", "true");
      clearOblastHighlight?.();
      updateOblastPanel?.(null);
    }

    if (step === 3) {
      setPanelExpanded(false);
      setRightPanelExpanded(false);
      hideBottomChart?.();
      bottomPanel?.classList.remove("open");
      bottomPanel?.setAttribute("aria-hidden", "true");
      setUtilityMenuOpen(true);
    }

    if (step === 4) {
      setUtilityMenuOpen(false);
      hideBottomChart?.();
      bottomPanel?.classList.remove("open");
      bottomPanel?.setAttribute("aria-hidden", "true");
      setRightPanelExpanded(false);
      setPanelExpanded(true);
      eventPanel?.classList.add("tutorial-highlight-right");
    }

    if (step === 5) {
      setUtilityMenuOpen(false);
      setPanelExpanded(false);
      setRightPanelExpanded(false);
      showBottomChart?.();
      requestAnimationFrame(() => updateBottomChart?.());
      bottomPanel?.classList.add("open", "tutorial-highlight-bottom");
      bottomPanel?.setAttribute("aria-hidden", "false");
    }

    if (step === 6) {
      setUtilityMenuOpen(false);
      setPanelExpanded(false);
      hideBottomChart?.();
      bottomPanel?.classList.remove("open", "tutorial-highlight-bottom");
      bottomPanel?.setAttribute("aria-hidden", "true");
      setRightPanelExpanded(true);
      rightPanel?.classList.add("tutorial-highlight-right");

      const ev0 = allEvents?.[0];
      if (ev0) {
        updateOblastPanel?.(ev0.oblast || ev0.Oblast || null);
        highlightOblastForEvent?.(ev0);
      }
    }

    if (step === 7) {
      setPanelExpanded(false);
      setRightPanelExpanded(false);
      hideBottomChart?.();
      bottomPanel?.classList.remove("open", "tutorial-highlight-bottom");
      bottomPanel?.setAttribute("aria-hidden", "true");
      clearOblastHighlight?.();
      updateOblastPanel?.(null);
      setUtilityMenuOpen(true);
    }
  }

  function getVisibleRect(element) {
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const left = Math.max(0, rect.left);
    const top = Math.max(0, rect.top);
    const right = Math.min(window.innerWidth, rect.right);
    const bottom = Math.min(window.innerHeight, rect.bottom);
    if (right <= left || bottom <= top) return null;
    return { left, top, right, bottom, width: right - left, height: bottom - top };
  }

  function positionTutorialFocus() {
    if (!tutorialActive) return;
    const overlay = getTutorialOverlay();
    const focusEl = ensureTutorialFocusEl();
    if (!overlay || !focusEl) return;

    const rect = getVisibleRect(getStepTarget(tutorialStep));
    if (!rect) {
      focusEl.style.opacity = "0";
      overlay.classList.remove("card-top", "card-bottom", "card-left");
      return;
    }

    const padding = tutorialStep === 5 ? 6 : 8;
    const left = Math.max(8, rect.left - padding);
    const top = Math.max(8, rect.top - padding);
    const right = Math.min(window.innerWidth - 8, rect.right + padding);
    const bottom = Math.min(window.innerHeight - 8, rect.bottom + padding);

    focusEl.style.opacity = "1";
    focusEl.style.left = `${left}px`;
    focusEl.style.top = `${top}px`;
    focusEl.style.width = `${Math.max(0, right - left)}px`;
    focusEl.style.height = `${Math.max(0, bottom - top)}px`;

    overlay.classList.toggle("card-left", window.innerWidth > 760 && rect.left > window.innerWidth * 0.5);
    overlay.classList.toggle("card-top", rect.bottom > window.innerHeight * 0.58);
    overlay.classList.toggle("card-bottom", rect.bottom <= window.innerHeight * 0.58);
  }

  function start() {
    tutorialActive = true;
    goToStep(1);
  }

  function end() {
    tutorialActive = false;
    tutorialStep = 0;
    hide();
    clearTutorialHighlights();
    setUtilityMenuOpen(false);
    markAsSeen();
    render?.();
    clearOblastHighlight?.();
    updateOblastPanel?.(null);
  }

  function goToStep(step) {
    tutorialActive = true;
    tutorialStep = Math.max(1, Math.min(TOTAL_STEPS, step));
    prepareStep(tutorialStep);
    setContent(tutorialStep, tutorialStep === 1);
    show();
  }

  function next() {
    if (!tutorialActive) return;
    if (tutorialStep >= TOTAL_STEPS) {
      end();
      return;
    }
    goToStep(tutorialStep + 1);
  }

  function skip() {
    end();
  }

  function isActive() {
    return tutorialActive;
  }

  function getStep() {
    return tutorialStep;
  }

  window.addEventListener("resize", positionTutorialFocus);
  document.addEventListener("scroll", positionTutorialFocus, true);

  return { start, end, next, skip, goToStep, hasSeen, isActive, getStep };
}
