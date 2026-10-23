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
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  try {
    const url = new URL(raw);
    return (url.protocol === "https:" || url.protocol === "http:") ? url.href : "";
  } catch {
    return "";
  }
}
