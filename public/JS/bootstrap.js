import * as maplibregl from "../vendor/maplibre-6.15.0/maplibre-gl.mjs";

// Un worker local évite d'autoriser blob: ou un serveur tiers dans script-src.
globalThis.maplibregl = maplibregl;
maplibregl.setWorkerUrl(new URL("../vendor/maplibre-6.15.0/maplibre-gl-worker.mjs", import.meta.url).href);

try {
  await import("../vendor/maplibre-leaflet-0.1.4/leaflet-maplibre-gl.js");
  const version = new URL(import.meta.url).searchParams.get("v") || "dev";
  await import(`./main.js?v=${encodeURIComponent(version)}`);
} catch (error) {
  console.error("Impossible de démarrer la carte", error);
  const retry = document.getElementById("loading-retry");
  if (retry) {
    retry.hidden = false;
    retry.addEventListener("click", () => window.location.reload(), { once: true });
  }
  const text = document.querySelector(".loading-subtext");
  if (text) text.textContent = "Chargement impossible / Loading failed / Error de carga";
}
