// js/utils/dates.js

export function parseDateFlexible(raw) {
  if (!raw) return null;
  if (raw instanceof Date && !isNaN(raw.getTime())) return raw;

  const s = String(raw).trim();
  if (!s) return null;

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/);
  const local = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (iso || local) {
    const dd = Number(iso ? iso[3] : local[1]);
    const mm = Number(iso ? iso[2] : local[2]);
    const yy = Number(iso ? iso[1] : local[3]);
    const d = new Date(Date.UTC(yy, mm - 1, dd, 0, 0, 0));
    if (d.getUTCFullYear() !== yy || d.getUTCMonth() !== mm - 1 || d.getUTCDate() !== dd) return null;
    if (!iso?.[4]) return d;
    if (Number(iso[4]) > 23 || Number(iso[5]) > 59 || Number(iso[6]) > 59) return null;
    const timestamp = new Date(s);
    return Number.isFinite(timestamp.getTime()) ? timestamp : null;
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
