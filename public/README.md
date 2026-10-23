# Carte RSF - Ukraine

Guide pas à pas commun aux cartes, avec procédure pour un niveau ADM02 : [GUIDE_ADMIN_CARTES.md](../GUIDE_ADMIN_CARTES.md). La couche des oblasts est le niveau administratif principal; les snapshots d'occupation restent datés et indépendants.

Carte de suivi des exactions commises contre les journalistes en Ukraine. Les réglages propres à cette carte sont rassemblés dans `JS/reglages.js`; `JS/main.js` importe les modules et relie ces paramètres aux données et à l'interface. Les traductions visibles sont dans `JS/i18n/i18n.js`.

## Structure de la carte

```text
carte_ukraine_2.0/
├── index.html                 # structure des panneaux et dépendances de la page
├── evenements.json            # événements en français
├── events.json                # événements en anglais
├── statut_oblasts.json        # états d'occupation par oblast
├── geojson/
│   ├── ukraine_oblasts.geojson # géométries administratives et choroplèthe
│   ├── static.geojson          # contour du pays
│   └── Leaflet_Ukraine_*.geojson # snapshots historiques de la couche d'occupation
├── icons/                     # icônes des catégories
├── assets/                    # vignettes de la modale RSF cartographie
├── css/style.css              # styles de la carte
└── JS/
    ├── reglages.js            # chemins, catégories, carte, contrôles et options
    ├── main.js                # initialisation et orchestration
    ├── i18n/i18n.js            # libellés FR/EN, tutoriel et crédits
    ├── charts/                # statistiques et chronologie
    ├── events/                # marqueurs et liste des cas
    ├── maps/                  # fonds OpenFreeMap, rendu GeoJSON et couche d'occupation
    ├── playback/              # lecture chronologique
    ├── tutorial/              # tutoriel interactif
    ├── ui/                    # filtres, légendes et couche de régions
    └── utils/                 # dates, chaînes, sécurité et calculs
```

## Réglages administrateur

Pour les modifications courantes, commencez par `JS/reglages.js` :

- `projet` : titre de la page, langues disponibles, langue initiale et indexation;
- `fichiers` : JSON par langue, GeoJSON, snapshots datés, icônes, assets et chemins de tous les modules importés;
- `champsDonnees` : alias de colonnes utilisés pour normaliser chaque événement;
- `carte` : centre, zooms, comportement du défilement, délai de chargement, attributions et fonds disponibles;
- `categories` : clés d'événement, noms d'icônes, couleurs et variantes FR/EN reconnues;
- `fonctionnalites` : activation de la liste, statistiques, chronologie, lecture, tutoriel, langues, contour, occupation et choroplèthe;
- `controles` : visibilité des filtres, boutons, ordre du menu, vitesse de lecture, vue statistique et nombre de lignes;
- `lecture` : bornes chronologiques et repères narratifs;
- `occupation` : types, styles et snapshot d'occupation par défaut;
- `choropleth` : couleurs et opacités du choroplèthe;
- `cartesLiees` : liens et images de la modale RSF cartographie.

Les paramètres de `reglages.js` sont consommés par `main.js`. Une nouvelle catégorie se configure dans `categories`, mais son icône doit aussi exister dans `icons/`. Les intitulés traduits, le tutoriel et le texte des cartes liées restent dans `JS/i18n/i18n.js`; complétez les langues disponibles à cet endroit également.

Les fonctionnalités occupation et choroplèthe sont prises en charge par le code. Activez-les via `fonctionnalites` et vérifiez que leurs fichiers et données associés sont renseignés. `actifParDefaut` détermine si le choroplèthe est affiché au chargement, indépendamment de son activation. Les statuts d'oblast sont réservés au panneau de statistiques et ne colorent aucune géométrie.

Réglages actuellement appliqués : langue anglaise au démarrage, fond clair par défaut, snapshots d'occupation activés avec celui du 26 janvier 2026 sélectionné. Le bouton choroplèthe est disponible dans le menu mais le mode démarre désactivé; les catégories et leurs icônes sont toutes activées dans la légende.

Les fonds utilisent la même configuration que la carte Liban : **Clair** (OpenFreeMap Positron), **Sombre** (OpenFreeMap Dark) et **Satellite** (Esri) sont proposés par le sélecteur en bas à droite. Les alternatives **Liberty** et **Bright** sont prêtes à être décommentées dans `carte.fonds`. Gardez une seule entrée avec `actifParDefaut: true`. Chaque entrée accepte `id`, `labels` FR/EN, `type` (`maplibre` ou `raster`), `url`, `options`, `theme` et une `attribution` facultative. Les fonds OpenFreeMap n'utilisent pas de clé CARTO.

Les réglages de navigation sont également dans `carte` : `zoomMinimum`, `zoomMaximum` (18), `zoomDelta`, `zoomSnap`, `wheelPxPerZoomLevel` et `scrollWheelZoom`. `delaiChargementMaximum` fixe le temps d'attente avant de proposer de réessayer si le fond ne charge pas. Le module `JS/maps/rendering.js` dessine les couches GeoJSON dans MapLibre sur les fonds vectoriels et dans Leaflet sur le fond satellite, tout en conservant les interactions.

Pour partager une langue, ajoutez `?lang=fr` ou `?lang=en` à l'URL de la carte. Le choix de langue dans le menu ou le tutoriel met ce paramètre à jour sans recharger la page, en conservant les autres paramètres et l'ancre. Sans paramètre, ou pour une langue non prise en charge, `projet.langueParDefaut` s'applique. Les variantes telles que `FR` et `en-GB` sont normalisées. Les liens d'articles restent ceux renseignés dans chaque JSON, sans réécriture automatique de leur langue.

## Mettre à jour les événements

1. Modifiez les deux tableaux JSON : `evenements.json` pour le français et `events.json` pour l'anglais. Gardez les identifiants d'événement et l'ordre des lignes cohérents entre les langues.
2. Chaque événement doit au minimum renseigner une date, un lieu, un journaliste, une catégorie, une description, un oblast et les coordonnées si elles sont connues. Les champs source attendus et leurs alias se trouvent dans `REGLAGES.champsDonnees`.
3. Les catégories doivent correspondre aux clés ou variantes de `REGLAGES.categories`. Les noms d'oblast doivent rester cohérents dans les JSON localisés. `Geojson` doit correspondre à `properties.shapeName` dans `ukraine_oblasts.geojson`.
4. Vérifiez les dates, les coordonnées numériques et les URL. Une description ou une traduction absente n'est pas générée automatiquement.

Exemple de cas :

```json
{
  "date": "2026-02-24",
  "lieu": "Kyiv",
  "journaliste": "Nom du journaliste",
  "type_violence": "Blessé",
  "description": "Description du cas.",
  "compteur_evenements": 1,
  "lat": 50.45,
  "lng": 30.52,
  "Oblast": "Kyiv",
  "Geojson": "Kyiv Oblast",
  "lien": "https://example.org"
}
```

## Mettre à jour les géométries

- Pour renommer ou remplacer une géométrie d'oblast, vérifiez `shapeName` et mettez à jour les champs `Geojson` des événements ainsi que `Geojson` dans `statut_oblasts.json`.
- Le contour de `static.geojson` est une couche distincte, activable dans `fonctionnalites.contour`.
- Pour ajouter une situation d'occupation, ajoutez le GeoJSON daté dans `geojson/`, puis ajoutez son couple `{ date, url }` à `fichiers.geojson.occupation`. Respectez l'ordre chronologique. Ajustez `occupation.indexParDefaut` si le snapshot affiché au départ doit changer.
- Les types GeoJSON de la couche d'occupation (`type01` à `type04`) sont stylés dans `occupation.types` et traduits dans `UI_STRINGS.*.occupationLegend`.
- `statut_oblasts.json` utilise `Geojson` pour associer un oblast, `Statut` pour le libellé français et `Statut_en` pour la traduction anglaise. Cette information apparaît uniquement dans l'infobulle de l'indicateur du panneau de statistiques.

## Vérifier et publier

Servez le dossier avec un serveur HTTP local; les imports ES modules et les GeoJSON ne fonctionnent pas correctement en ouvrant `index.html` directement. Testez au minimum les fonds Clair/Sombre/Satellite, les liens directs `?lang=fr` et `?lang=en`, le changement de langue dans le menu et le tutoriel, les catégories, filtres de zone et d'emplacement, statistiques (y compris le statut d'un oblast), liste de cas, chronologie, lecture et couche d'occupation. Vérifiez que chaque nom `Geojson` rejoint une feature. Lorsqu'un fichier JS ou CSS change, incrémentez son paramètre `v` dans `index.html` pour éviter le cache, puis publiez ensemble les données, GeoJSON, icônes et assets référencés.


## Rendu et réglages de la carte

- Les panneaux suivent le thème du fond choisi.
- `fonctionnalites.choropleth.enabled: true` conserve le bouton dans le menu. `actifParDefaut: false` démarre en mode marqueurs ; `true` démarre en choroplèthe. La réinitialisation respecte le même choix.
- `fonctionnalites.tutoriel.enabled: true` conserve le tutoriel dans le menu. `demarrageAutomatique: false` empêche son ouverture à l’arrivée ; `true` la réactive à la première visite.
- `stylesGeojson` centralise les contours et remplissages : `stroke`, `color`, `weight`, `opacity`, `fill`, `fillColor` et `fillOpacity`. `fillColor: null` reprend la couleur du contour.
- Le contour et la sélection sont dans `stylesGeojson.contour` et `selection`. Les styles d’occupation complètent `stylesGeojson.occupation` avec `occupation.types` ; les fichiers et dates restent configurables.
- Le choroplèthe réutilise sa géométrie et actualise les styles en mémoire. Les compteurs et les infobulles suivent les filtres et la langue. Le survol ne modifie aucun contour.
- Une seule initialisation et un seul loader attendent le rendu final des tuiles et des couches. Les niveaux administratifs et les modules optionnels déclarés dans les réglages sont conservés.


## Fonds de carte et thèmes

Les sept fonds sont disponibles dans `carte.fonds` : Clair, Sombre, Fiord, Liberty, Bright, Satellite et Relief. Une seule entrée doit avoir `actifParDefaut: true`. Le fond initial propre à cette carte est conservé.

Chaque fond déclare `theme: "light"` ou `"dark"`. Sombre, Fiord et Satellite utilisent des panneaux noirs avec texte clair ; les autres fonds utilisent des panneaux blancs avec texte sombre. Les noms du fournisseur ne sont pas des valeurs de thème. `css/themes.css` regroupe les palettes des panneaux, formulaires, légendes, menus et contrôles. La chronologie redessine aussi ses axes et son fond au changement de thème.

Les tuiles Relief sont disponibles jusqu’au zoom natif 13 et Satellite jusqu’au zoom natif 23 ; `options.maxNativeZoom` permet de les agrandir aux zooms supérieurs autorisés par la carte. Les données, filtres, contours et options propres à la carte sont conservés.

Le menu burger ferme au clic extérieur et avec Échap, sans réinitialiser les filtres. Son attribut `hidden`, son état ouvert et `aria-expanded` sont synchronisés.

## Navigation vers les événements proches

En mode marqueurs, à partir du zoom 11, un bouton fléché indique le groupe ou événement le plus proche hors écran ou caché par un panneau, lorsqu’il reste au plus une icône visible. Il reprend l’icône du cas ou le nombre d’événements du groupe et indique sa distance dans l’infobulle. Les cibles suivent les filtres et la période affichée ; le clic conserve le zoom final et place la cible dans une zone dégagée. La lecture est suspendue au clic.

Le bouton suit les thèmes clair et sombre. Il évite panneaux, titre, menu, zoom et légendes : marge de 56 px sur le pourtour en ordinateur ; placement au bas de la zone libre, au-dessus du titre, avec une marge de 20 px en mobile. Il se masque en choroplèthe, pendant les déplacements, sous les fenêtres et quand un panneau mobile ou l’encombrement ne laisse pas assez de place.

Dans `JS/reglages.js`, `fonctionnalites.navigationProche` regroupe `enabled`, `zoomMinimum`, `maximumVisibles`, `margeDesktop`, `margeMobile`, `espacementComposants`, `seuilMobile` et `dureeDeplacement` (secondes). `enabled: false` désactive la navigation. Les libellés suivent la langue de la carte.
