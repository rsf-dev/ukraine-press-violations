// Shared helpers for safely rendering map data into HTML.

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function escapeAttribute(value) {
  return escapeHtml(value);
}

export function getSafeHttpUrl(value) {
  if (typeof value !== "string") return "";
  const raw = value.trim();
  // Les liens éditoriaux sont publics et HTTPS ; refuser aussi les URL trompeuses
  // avec identifiants et les caractères de contrôle que URL() normaliserait.
  if (!raw || raw.length > 4096 || /[\u0000-\u0020\u007f]/.test(raw) || !/^https:\/\//i.test(raw)) return "";

  try {
    const url = new URL(raw);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
  } catch {
    return "";
  }
}

// Le JSON peut contenir plusieurs articles séparés par des espaces ou retours ligne.
export function getSafeHttpUrls(value) {
  const values = Array.isArray(value) ? value : [value];
  const urls = values.slice(0, 20).flatMap(item => typeof item === "string" && item.length <= 20000 ? item.trim().split(/\s+/).slice(0, 20) : [])
    .map(getSafeHttpUrl)
    .filter(Boolean);
  return [...new Set(urls)].slice(0, 20);
}
