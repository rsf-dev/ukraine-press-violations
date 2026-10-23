// js/utils/dates.js

export function parseDateFlexible(raw) {
  if (!raw) return null;
  if (raw instanceof Date && !isNaN(raw.getTime())) return raw;

  const s = String(raw).trim();
  if (!s) return null;

  const d1 = new Date(s);
  if (!isNaN(d1.getTime())) return d1;

  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const dd = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    const yy = parseInt(m[3], 10);
    const d = new Date(Date.UTC(yy, mm - 1, dd, 0, 0, 0));
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

export function getEventTime(ev) {
  const raw = ev.date || ev.date_evenement || ev.date_event || ev.date_iso || null;
  const d = parseDateFlexible(raw);
  return d ? d.getTime() : 0;
}

export function formatDateFR(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yy = d.getUTCFullYear();
  return `${dd}/${mm}/${yy}`;
}

export function startOfDayUTC(ts) {
  const d = new Date(ts);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function startOfDay(ts) {
  const d = new Date(ts);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0);
}

export function endOfDay(ts) {
  const d = new Date(ts);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999);
}
