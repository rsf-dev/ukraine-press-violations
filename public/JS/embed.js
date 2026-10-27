// Charger AVANT iframe-resizer. Ces contrôles protègent le récepteur de messages
// de la carte ; les règles d'intégration de l'article restent gérées côté RSF.
(() => {
  const trustedOrigins = new Set(["https://rsf.org", "https://www.rsf.org"]);
  const prefix = "[iFrameSizer]";
  const commands = new Set(["reset", "resize", "moveToAnchor", "inPageLink", "pageInfo", "parentInfo", "message"]);
  let targetOrigin = "https://rsf.org";
  try {
    const origin = new URL(document.referrer).origin;
    if (trustedOrigins.has(origin)) targetOrigin = origin;
  } catch { /* Referrer absent : le premier message du parent précisera l'origine. */ }
  const options = { targetOrigin };
  window.iframeResizer = options;

  window.addEventListener("message", event => {
    if (typeof event.data !== "string" || !event.data.startsWith(prefix)) return;
    const reject = () => event.stopImmediatePropagation();
    if (window.parent === window || event.source !== window.parent || !trustedOrigins.has(event.origin) || event.data.length > 65536) {
      reject();
      return;
    }
    const body = event.data.slice(prefix.length);
    const parts = body.split(":");
    const isInit = parts.length >= 15 && parts.length <= 24 && parts[0].length > 0 && parts[0].length <= 128 &&
      (parts[2] === "true" || parts[2] === "false");
    if (!isInit && !commands.has(parts[0])) { reject(); return; }
    if (["message", "pageInfo", "parentInfo"].includes(parts[0])) {
      try {
        const data = JSON.parse(body.slice(body.indexOf(":") + 1));
        if (data === null || typeof data !== "object" || Array.isArray(data)) { reject(); return; }
      } catch { reject(); return; }
    }
    options.targetOrigin = event.origin;
  }, { capture: true });
})();
