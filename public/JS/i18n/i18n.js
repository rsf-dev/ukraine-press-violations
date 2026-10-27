// JS/i18n/i18n.js
export const UI_STRINGS = {
  fr: {
    occupationLegend: {
      title: "Ligne de front et territoires occupés",
      datePrefix: "Situation au",
      type01: "Territoire contrôlé par la Russie",
      type02: "Avancées russes",
      type03: "Contre-offensives ukrainiennes",
      type04: "Territoire revendiqué par la Russie",
      source: "Source : Institute for the Study of War and AEI’s Critical Threats Project",
    },
    tutorial: {
      step1: {
        title: "Bienvenue",
        body: "Cette carte recense les exactions commises par la Russie contre les journalistes en Ukraine depuis l’occupation de la Crimée et d’une partie du Donbass en 2014 concernant des journalistes toujours détenus et depuis l'invasion russe à grande échelle en février 2022. Si vous êtes sur téléphone mobile, mettez cette carte en format horizontal. Vous pouvez changer la langue (anglais, français), et voir comment la parcourir en cliquant sur \"Montrez-moi\".",
        subtitle: "Information importante",
        body2: "Cette carte et les données qui lui sont attachées sont issues d'un monitoring de RSF selon son mandat et sont mises à jour en temps réel. RSF collecte ces informations grâce à une veille et au partage d'informations de ses partenaires en Ukraine",
        nextLabel: "Montrez-moi"
      },
      step2: {
        title: "Filtres de la carte",
        body: "Le composant titre regroupe les filtres principaux : oblast, ville et catégories d’exactions. Le filtre ville reste grisé tant qu’aucun oblast n’est sélectionné.",
        subtitle: "Remise à zéro",
        body2: "Le bouton \"Supprimer les filtres\" rétablit la vue complète et remet les catégories dans leur état initial.",
        nextLabel: "Suivant"
      },
      step3: {
        title: "Menu de navigation",
        body: "Le menu burger rassemble le changement de langue, le tutoriel, la liste des cas, les statistiques et la chronologie. Le bouton actif passe au rouge lorsque son panneau est ouvert.",
        subtitle: "Fermer le panneau",
        body2: "Cliquez à nouveau sur le bouton du menu pour le fermer",
        nextLabel: "Suivant"
      },
      step4: {
        title: "Liste des cas",
        body: "La liste des cas permet de parcourir les événements documentés.",
        subtitle: "Depuis la liste",
        body2: "Cliquez sur un cas pour centrer la carte sur son emplacement. Le bouton \"Fermer\" en haut du panneau replie la liste.",
        nextLabel: "Suivant"
      },
      step5: {
        title: "Lecture et chronologie",
        body: "Le module lecture, situé dans le composant titre, rejoue les cas dans l’ordre chronologique.",
        subtitle: "Zoom de la chronologie",
        body2: "La chronologie en haut affiche des colonnes empilées par jour. Survolez une barre pour afficher le bouton +, cliquez pour zoomer sur une période précise, puis utilisez − et les flèches pour dézoomer ou vous déplacer.",
        nextLabel: "Suivant"
      },
      step6: {
        title: "Statistiques par oblast",
        body: "Le panneau statistiques affiche les compteurs, graphiques, légende repliable et notes pour l’oblast sélectionné. Sans sélection, il résume l’ensemble des cas disponibles.",
        subtitle: "Navigation",
        body2: "Les éléments des graphiques permettent de filtrer par oblast ou ville. Le bouton \"Fermer\" replie le panneau.",
        nextLabel: "Suivant"
      },
      step7: {
        title: "Mode Choropleth",
        body: "Le mode Choropleth permet de visualiser les données de manière par Oblast. Cliquez à nouveau sur le bouton pour le désactiver.",
        subtitle: "Données par oblast",
        body2: "Cliquez sur un oblast pour afficher les données correspondantes. Les filtres et la date mettent à jour l'affichage de la carte.",
        nextLabel: "Terminer"
      },
      skipLabel: "Passer"
    },
    ui: {
      selectOblast: "Cliquez sur un oblast ou une ville ci-dessous",
      eventPanelTitle: "Liste des cas",
      closeButton: "Fermer",
      clearFilters: "Supprimer les filtres",
      legendSection: "Légende",
      notesSection: "Notes",
      eventFooterNote: "<b>Note :</b> cette carte recense les cas documentés par RSF dans le cadre de son mandat. Les chiffres peuvent évoluer avec les mises à jour du monitoring.",
      floatingTitle: "Surveillance des exactions commises par l’armée russe contre les journalistes et médias en Ukraine",
      floatingSubtitle: "Au 15 octobre 2026, 63 journalistes ont été blessés, 16 tués.",
      panelWhenOblast: "Les statistiques apparaîtront ici dès qu’un oblast sera sélectionné.",
      chartNoEvents: "Cet oblast n’a pas d’événements sur les catégories disponibles.",
      chartNoEventsCategory: "Aucun événement pour cette catégorie.",
      chartSearchOblast: "Sélectionnez un événement (ou une ville) pour afficher les statistiques d’un oblast.",
      oblastTotalLabel: "Total d’événements :",
      oblastCitiesLabel: "Villes concernées :",
      tutoButton: "Tutoriel",
      tutorialLangButton: "Switch to English",
      menuLanguage: "Langue",
      menuEvents: "Liste des cas",
      menuRegions: "Carte Choropleth",
      menuStats: "Statistiques",
      menuTimeline: "Chronologie",
      menuOpen: "Ouvrir le menu",
      navigationProche: { evenement: "Rejoindre l’événement le plus proche", groupe: "Rejoindre le groupe le plus proche ({count} événements)" },
      rsfCartography: "RSF cartographie",
      searchPlaceholder: " ",
      bottomChartTitle: "Évolution par catégorie",
      oblastsBtn: "Oblasts",
      villesBtn: "Villes",
      footerCredits: `
        <b>Graphiques et carte :</b> <i>Vianney Loriquet / RSF.</i><br>
        <b>Source données conflit :</b> <i>Institute for the Study of War and AEI’s Critical Threats Project</i><br>
        <b>icones et illustrations :</b> <button class="credits-link" data-open-credits="flaticon">Flaticon (voir détails)</button>
      `,
      flaticonCredits: `<ul class="credits-list">
        <li><a href="https://www.flaticon.com/fr/icones-gratuites/antena" target="_blank" title="antena icônes">Icônes Antena créées par Handicon - Flaticon</a></li>
        <li><a href="https://www.flaticon.com/fr/icones-gratuites/mort" target="_blank" title="mort icônes">Icônes Mort créées par Dreamstale - Flaticon</a></li>
        <li><a href="https://www.flaticon.com/fr/icones-gratuites/hopital" target="_blank" title="hôpital icônes">Icônes Hôpital créées par Pixel Buddha - Flaticon</a></li>
        <li><a href="https://www.flaticon.com/fr/icones-gratuites/cible" target="_blank" title="cible icônes">Icônes Cible créées par Freepik - Flaticon</a></li>
        <li><a href="https://www.flaticon.com/fr/icones-gratuites/la-violence" target="_blank" title="la violence icônes">Icônes Violence créées par Mehwish - Flaticon</a></li>
        <li><a href="https://www.flaticon.com/fr/icones-gratuites/prison" target="_blank" title="prison icônes">Icônes Prison créées par Freepik - Flaticon</a></li>
        <li><a href="https://www.flaticon.com/fr/icones-gratuites/point-dinterrogation" target="_blank" title="point d'interrogation icônes">Icônes Point d'interrogation créées par Fathema Khanom - Flaticon</a></li>
      </ul>
      `
    },
    cartography: {
      title: "RSF cartographie",
      close: "Fermer",
      cards: [
        "Violences contre les journalistes dans le monde (édition 2025)",
        "Surveillance des violences contre les journalistes en Ukraine",
        "Surveillance des violences contre les journalistes dans la région des Grands Lacs africains",
        "Les journalistes sur les routes de l'exil (édition 2021 à 2025)"
      ]
    },
    playbackMessages: {
      Crimea_title: "Annexion de la crimée par la Russie",
      Crimea_body: "Avant l'invasion à grande échelle de 2022, la Russie a arrêté des journalistes ukrainiens dans les territoires occupés depuis 2014. Certains sont détenus depuis près de dix ans ",
      Invasion_title: "Début de l'invasion à grande échelle",
      Invasion_body: "Depuis le 24 février 2022, 176 journalistes ont été victimes d’exactions de l’armée russe.",
      Victime_title: "Yevhenii Sakoun, premier journaliste tué par l'armée Russe en Ukraine",
      Victime_body: "Le 1er mars 2022, le caméraman de la chaîne Kyiv Live TV Yevhenii Sakoun a été tué dans une frappe contre la tour TV de Kyiv. Il est le premier journaliste à mourir dans le cadre de l'invasion russe à grande échelle de l'Ukraine.",
      Oksana_title: "Oksana Baulina tuée à Kyiv",
      Oksana_body: "Tuée par une roquette lors d'un bombardement, lors d'un reportage pour The Insider sur les dommages causés par une précédente frappe dans le quartier de Podil sur un centre commercial.",
      Bohdan_title: "Bohdan Bitik abattu par un sniper russe",
      Bohdan_body: "Journaliste ukrainien travaillant avec le correspondant de La Repubblica abattu par un sniper russe",
      Victoria_title: "La journaliste ukrainienne indépendante Victoria Roshchyna décède en captivité en Russie",
      Victoria_body: "La journaliste ukrainienne indépendante Victoria Roshchyna est décédée en captivité en Russie le 19 septembre, selon une lettre du ministère russe de la Défense reçue par sa famille le 10 octobre.",
      Lallican_title: "Le journaliste français Antoni Lallican tué en Ukraine",
      Lallican_body: "Le photographe indépendant français Antoni Lallican est tué alors qu'il couvrait les événements près de la ville de Druzhkivka, dans l'oblast de Donetsk, à la suite d'une frappe de drone russe."
    }
  },
  en: {
    occupationLegend: {
      title: "Frontline and occupied territories",
      datePrefix: "Situation as of",
      type01: "Russian-controlled territory",
      type02: "Russian advances",
      type03: "Ukrainian counteroffensives",
      type04: "Claimed Russian-controlled territory",
      source: "Source : Institute for the Study of War and AEI’s Critical Threats Project",
    },
    tutorial: {
      step1: {
        title: "Welcome",
        body: "This map records the abuses committed by Russia against journalists in Ukraine since the full-scale invasion in February 2022. It also includes the journalists who have been detained by Russia in Crimea and part of the Donbass since the 2014 invasion of these regions. If you are on your mobile, rotate your screen to see the map in landscape mode. The map is available in English and French. You can change the language and see how to navigate it by clicking on \"Show me.\"",
        subtitle: "Important information",
        body2: "This map reflects RSF’s ongoing documentation of Russian attacks on journalists in Ukraine and only includes cases that fall within RSF’s mandate. Data may be updated in real time. RSF collects this information through constant monitoring and the communication with information from its partners and correspondents in Ukraine.",
        nextLabel: "Show me"
      },
      step2: {
        title: "Map filters",
        body: "The title component groups the main filters: oblast, city and abuse categories. The city filter stays disabled until an oblast is selected.",
        subtitle: "Reset",
        body2: "The \"Clear filters\" button restores the full map view and resets the categories to their initial state.",
        nextLabel: "Next"
      },
      step3: {
        title: "Navigation menu",
        body: "The burger menu gathers language, tutorial, case list, statistics and timeline controls. The active button turns red when its panel is open.",
        subtitle: "Close the panel",
        body2: "Click the menu button again to close it.",
        nextLabel: "Next"
      },
      step4: {
        title: "Case list",
        body: "The case list lets you browse documented events.",
        subtitle: "From the list",
        body2: "Click a case to center the map on its location. The \"Close\" button closes the panel.",
        nextLabel: "Next"
      },
      step5: {
        title: "Playback and timeline",
        body: "The playback module, located in the title component, replays cases chronologically.",
        subtitle: "Timeline zoom",
        body2: "The timeline at the top displays stacked daily columns. Hover over a bar to reveal the + button, click to zoom on a specific period, then use − and the arrows to zoom out or move.",
        nextLabel: "Next"
      },
      step6: {
        title: "Statistics by oblast",
        body: "The statistics panel displays counters, charts, a collapsible legend and notes for the selected oblast. Without a selection, it summarizes all available cases.",
        subtitle: "Navigation",
        body2: "Chart elements can filter by oblast or city. The \"Close\" button closes the panel.",
        nextLabel: "Next"
      },
      step7: {
        title: "Choropleth map",
        body: "The Choropleth map allows you to visualize the data by oblast. Click the button again to disable it.",
        subtitle: "Data by oblast",
        body2: "Click on an oblast to display the corresponding data. Filters and date update the map display.",
        nextLabel: "Finish"
      },
      skipLabel: "Skip"
    },
    ui: {
      selectOblast: "Click on an oblast or city below",
      eventPanelTitle: "Case list",
      closeButton: "Close",
      clearFilters: "Clear filters",
      legendSection: "Legend",
      notesSection: "Notes",
      eventFooterNote: "<b>Note:</b> this map lists cases documented by RSF within the scope of its mandate. Figures may change as monitoring is updated.",
      floatingTitle: "Tracking cases of Russian abuse against journalists and media outlets in Ukraine",
      floatingSubtitle: "As of October 15, 2026, 63 journalists have been injured, 16 killed.",
      panelWhenOblast: "Statistics will appear here as soon as an oblast is selected.",
      chartNoEvents: "This oblast has no events in the available categories.",
      chartNoEventsCategory: "No events for this category.",
      chartSearchOblast: "Select an event (or a city) to display oblast statistics.",
      oblastTotalLabel: "Total number of events:",
      oblastCitiesLabel: "Cities involved:",
      tutoButton: "Tutorial",
      tutorialLangButton: "Voir en Français",
      menuLanguage: "Language",
      menuEvents: "Case list",
      menuRegions: "Choropleth map",
      menuStats: "Statistics",
      menuTimeline: "Timeline",
      menuOpen: "Open menu",
      navigationProche: { evenement: "Go to the nearest event", groupe: "Go to the nearest group ({count} events)" },
      rsfCartography: "RSF cartography",
      searchPlaceholder: " ",
      bottomChartTitle: "Evolution by category",
      oblastsBtn: "Oblasts",
      villesBtn: "Cities",
      footerCredits: `
        <b>Charts and map:</b> <i>Vianney Loriquet / RSF.</i><br>
        <b>Conflict data source:</b> <i>Institute for the Study of War and AEI’s Critical Threats Project</i><br>
        <b>Icons and illustrations:</b> <button class="credits-link" data-open-credits="flaticon">Flaticon (details)</button>

      `,
      flaticonCredits: `<ul class="credits-list">
        <li><a href="https://www.flaticon.com/fr/icones-gratuites/antena" target="_blank" title="antena icônes">Antena icons created by Handicon - Flaticon</a></li>
        <li><a href="https://www.flaticon.com/fr/icones-gratuites/mort" target="_blank" title="mort icônes">Death icons created by Dreamstale - Flaticon</a></li>
        <li><a href="https://www.flaticon.com/fr/icones-gratuites/hopital" target="_blank" title="hôpital icônes">Hospital icons created by Pixel Buddha - Flaticon</a></li>
        <li><a href="https://www.flaticon.com/fr/icones-gratuites/cible" target="_blank" title="cible icônes">Target icons created by Freepik - Flaticon</a></li>
        <li><a href="https://www.flaticon.com/fr/icones-gratuites/la-violence" target="_blank" title="la violence icônes">Violence icons created by Mehwish - Flaticon</a></li>
        <li><a href="https://www.flaticon.com/fr/icones-gratuites/prison" target="_blank" title="prison icônes">Prison icons created by Freepik - Flaticon</a></li>
        <li><a href="https://www.flaticon.com/fr/icones-gratuites/point-dinterrogation" target="_blank" title="point d'interrogation icônes">Question mark icons created by Fathema Khanom - Flaticon</a></li>
      </ul>
        `
    },
    cartography: {
      title: "RSF cartography",
      close: "Close",
      cards: [
        "Violence against journalists worldwide (2025 edition)",
        "Monitoring violence against journalists in Ukraine",
        "Monitoring violence against journalists in Africa's Great Lakes region",
        "Journalists on the routes of exile (2021 to 2025 edition)"
      ]
    },
    playbackMessages: {
      Crimea_title: "Since the annexation of Crimea and part of the Donbass in 2014",
      Crimea_body: "Before Russia’s full-scale invasion of Ukraine in 2022, it had been arresting independent Ukrainian journalists in the occupied territories since 2014. Some have been behind bars for nearly ten years.",
      Invasion_title: "Start of the full-scale invasion",
      Invasion_body: "Since 24 February 2022, 176 journalists have been the subject of attacks by the Russian army.",
      Victime_title: "Yevhenii Sakoun, first journalist killed by the Russian army in Ukraine",
      Victime_body: "On March 1, 2022, Kyiv Live TV cameraman Yevhenii Sakoun was killed in a strike against the Kyiv TV tower. He was the first journalist to die during the Russian full-scale invasion of Ukraine.",
      Oksana_title: "Oksana Baulina killed in Kyiv",
      Oksana_body: "The journalist working for The Insider was killed by a rocket during a bombardment. She was reporting on the damage caused by a previous attack on a shopping centre in the Podil district",
      Bohdan_title: "Bohdan Bitik shot by a Russian sniper",
      Bohdan_body: "Ukrainian journalist working with the correspondent of La Repubblica shot by a Russian sniper.",
      Victoria_title: "Independent Ukrainian journalist Victoria Roshchyna died in captivity in Russia",
      Victoria_body: "Independent Ukrainian journalist Victoria Roshchyna died in captivity in Russia on September 19, according to a letter from the Russian Ministry of Defense received by her family on October 10.",
      Lallican_title: "French journalist Antoni Lallican killed in Ukraine",
      Lallican_body: "French freelance photographer Antoni Lallican is killed while reporting near the town of Druzhkivka, in the Donetsk Oblast, following a Russian drone strike."

    }
  }
};

export const TYPE_LABELS = {
  fr: {
    "Blessé": "Blessé",
    "Agressé": "Agressé",
    "Tué": "Tué",
    "Disparu": "Disparu",
    "Tentative d'homicide": "Tentative d'homicide",
    "Dommages matériels": "Dommages matériels",
    "Emprisonné": "Emprisonné",
    "Emprisonné (libéré)": "Libéré"
  },
  en: {
    "Blessé": "Injured",
    "Agressé": "Assaulted",
    "Tué": "Killed",
    "Disparu": "Missing",
    "Tentative d'homicide": "Attempted killing",
    "Dommages matériels": "Property damages",
    "Emprisonné": "Imprisoned",
    "Emprisonné (libéré)": "Released"
  }
};

export function getDisplayLabelForType(type, lang) {
  const dict = TYPE_LABELS[lang] || TYPE_LABELS.fr;
  return Object.prototype.hasOwnProperty.call(dict, type) ? dict[type] : type;
}

export function applyStaticTextsForLang(lang) {
  const ui = UI_STRINGS[lang]?.ui;
  const strings = UI_STRINGS[lang];

  document.documentElement.lang = lang;
  window.currentLang = lang;
  document.querySelectorAll(".lang-btn").forEach(button => {
    const active = button.dataset.lang === lang;
    button.classList.toggle("lang-active", active);
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });

  const titleEl = document.getElementById("floating-title");
  if (titleEl) titleEl.textContent = strings.ui.floatingTitle;

  const subtitleEl = document.getElementById("floating-subtitle");
  if (subtitleEl) subtitleEl.textContent = strings.ui.floatingSubtitle;

  const clearFilters = document.getElementById("title-clear-filters");
  if (clearFilters) clearFilters.textContent = strings.ui.clearFilters;

  const bottomTitle = document.querySelector(".bottom-chart-title");
  if (bottomTitle) bottomTitle.textContent = strings.ui.bottomChartTitle;

  const eventPanelTitle = document.querySelector(".panel-list-title");
  if (eventPanelTitle) eventPanelTitle.textContent = strings.ui.eventPanelTitle;

  document.querySelectorAll(".panel-close-button").forEach(btn => {
    btn.textContent = strings.ui.closeButton;
    btn.setAttribute("aria-label", strings.ui.closeButton);
  });

  const rightLegendTitle = document.getElementById("right-legend-section-title");
  if (rightLegendTitle) rightLegendTitle.textContent = strings.ui.legendSection;

  const bottomLegendTitle = document.getElementById("bottom-legend-section-title");
  if (bottomLegendTitle) bottomLegendTitle.textContent = strings.ui.legendSection;

  const notesTitle = document.getElementById("notes-section-title");
  if (notesTitle) notesTitle.textContent = strings.ui.notesSection;

  const eventFooterNote = document.getElementById("event-footer-note");
  if (eventFooterNote) eventFooterNote.innerHTML = strings.ui.eventFooterNote;


  const tutoBtn = document.getElementById("tutorial-replay-btn");
  if (tutoBtn) tutoBtn.textContent = strings.ui.tutoButton;

  const menuLanguageLabel = document.querySelector(".utility-menu-field > span");
  if (menuLanguageLabel) menuLanguageLabel.textContent = strings.ui.menuLanguage;

  const languageToggle = document.querySelector(".utility-menu .language-toggle");
  if (languageToggle) languageToggle.setAttribute("aria-label", strings.ui.menuLanguage);

  const utilityToggle = document.getElementById("utility-menu-toggle");
  if (utilityToggle) utilityToggle.setAttribute("aria-label", strings.ui.menuOpen);

  [
    ["utility-events-toggle", strings.ui.menuEvents],
    ["utility-regions-mode-toggle", strings.ui.menuRegions],
    ["utility-country-toggle", strings.ui.menuStats],
    ["utility-chart-toggle", strings.ui.menuTimeline],
    ["rsf-cartography-toggle", strings.ui.rsfCartography]
  ].forEach(([id, label]) => {
    const btn = document.getElementById(id);
    if (btn && label) btn.textContent = label;
  });

  const cartographyTitle = document.getElementById("rsf-cartography-title");
  if (cartographyTitle) cartographyTitle.textContent = strings.cartography?.title || strings.ui.rsfCartography;

  const cartographyClose = document.getElementById("rsf-cartography-close");
  if (cartographyClose) cartographyClose.setAttribute("aria-label", strings.cartography?.close || strings.ui.closeButton);

  document.querySelectorAll("#rsf-cartography-modal .rsf-cartography-link span").forEach((span, index) => {
    const label = strings.cartography?.cards?.[index];
    if (label) span.textContent = label;
  });

  const skipBtn = document.getElementById("tutorial-skip-btn");
  if (skipBtn) skipBtn.textContent = strings.tutorial.skipLabel;

  const tutLangBtn = document.getElementById("tutorial-lang-btn");
  if (tutLangBtn) tutLangBtn.textContent = strings.ui.tutorialLangButton;

  // Le texte anglais du chargement est défini une seule fois dans index.html.

  const lieuInput = document.getElementById("lieu-filter");
  if (lieuInput) lieuInput.placeholder = strings.ui.searchPlaceholder;

  //const chartContainer = document.getElementById("country-chart-container");
  //if (chartContainer) {
  //  chartContainer.innerHTML = `<p class="chart-placeholder">${strings.ui.chartSearchOblast}</p>`;
  //}

  const totalLabelEl = document.getElementById("country-rank-label");
  const citiesLabelEl = document.getElementById("country-score-label");
  if (totalLabelEl) totalLabelEl.textContent = strings.ui.oblastTotalLabel;
  if (citiesLabelEl) citiesLabelEl.textContent = strings.ui.oblastCitiesLabel;

  const nameEl = document.getElementById("country-name");
  if (nameEl) nameEl.textContent = strings.ui.selectOblast;

  window.currentlang = lang;

  bindCreditsModalOnce();

  const footer = document.getElementById("footer-credits");
  if (footer && ui.footerCredits) {
    footer.innerHTML = ui.footerCredits;
  }

}

function openCreditsModal({ title, html }) {
  const modal = document.getElementById("credits-modal");
  const t = document.getElementById("credits-title");
  const b = document.getElementById("credits-body");
  if (!modal || !t || !b) return;

  t.textContent = title || "";
  b.innerHTML = html || "";

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closeCreditsModal() {
  const modal = document.getElementById("credits-modal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

let creditsBound = false;
function bindCreditsModalOnce() {
  if (creditsBound) return;
  creditsBound = true;

  document.addEventListener("click", (e) => {
    const openBtn = e.target.closest?.("[data-open-credits]");
    const closeBtn = e.target.closest?.("[data-close-credits]");

    if (closeBtn) {
      closeCreditsModal();
      return;
    }

    if (openBtn) {
      const key = openBtn.getAttribute("data-open-credits");
      const lang = window.currentLang || "en"; // ou passe lang autrement
      const ui = UI_STRINGS[lang]?.ui;

      if (key === "flaticon") {
        openCreditsModal({
          title: lang === "en" ? "Icon credits (Flaticon)" : "Crédits des icônes (Flaticon)",
          html: ui?.flaticonCredits || ""
        });
      }
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeCreditsModal();
  });
}

