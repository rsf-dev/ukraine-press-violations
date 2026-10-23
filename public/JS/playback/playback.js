// JS/playback/playback.js
export function createPlayback({
  getState,
  setState,
  PLAYBACK_START_TIME,
  PLAYBACK_START_DATE_STR,
  getEventTime,
  startOfDay,
  endOfDay,
  formatDateFR,
  getWindowStartTime = null,
  buildEventId,
  render,

  contextCues = [],
  onContextCue = null,
  parseDateFlexible = null,
  PLAYBACK_END_TIME = null,
  PLAYBACK_END_DATE_STR = null,
  EXTRA_MAX_TIMES = [],
}) {
  function getEventDay(ev) {
    const t = getEventTime(ev);
    if (!t) return null;
    return startOfDay(t);
  }

  const cues = (contextCues || [])
    .map(c => {
      let ts = c.at;
      if (typeof ts === "string") {
        ts = parseDateFlexible ? (parseDateFlexible(ts)?.getTime() ?? null) : null;
      }
      return { ...c, ts };
    })
    .filter(c => Number.isFinite(c.ts))
    .sort((a, b) => a.ts - b.ts);

  const firedOnce = new Set();

  function maybeFireContextCues(prevCutoff, nextCutoff) {
    if (!onContextCue || !cues.length) return;
    if (nextCutoff == null) return;

    const a = (prevCutoff == null) ? (PLAYBACK_START_TIME - 1) : prevCutoff;
    const b = nextCutoff;

    if (b <= a) return;

    for (const cue of cues) {
      if (cue.once && firedOnce.has(cue.key)) continue;
      if (cue.ts > a && cue.ts <= b) {
        onContextCue({
          key: cue.key,
          durationMs: cue.durationMs ?? 3800,
          ts: cue.ts
        });
        if (cue.once) firedOnce.add(cue.key);
      }
    }
  }
  function getMaxTime() {
    const s = getState();
    const seq = s.playbackSequence || [];

    const maxEventsT = seq.length
      ? getEventTime(seq[seq.length - 1])
      : null;

    const extraMaxT = (EXTRA_MAX_TIMES || [])
      .filter(Number.isFinite)
      .reduce((acc, v) => Math.max(acc, v), Number.NEGATIVE_INFINITY);

    const hasExtra = Number.isFinite(extraMaxT) && extraMaxT !== Number.NEGATIVE_INFINITY;

    let maxNatural = Number.isFinite(maxEventsT) ? maxEventsT : null;
    if (hasExtra) maxNatural = (maxNatural == null) ? extraMaxT : Math.max(maxNatural, extraMaxT);

    // cap (PLAYBACK_END_TIME), on le respecte
    if (Number.isFinite(PLAYBACK_END_TIME)) {
      if (maxNatural == null) return PLAYBACK_END_TIME;
      return Math.min(maxNatural, PLAYBACK_END_TIME);
    }

    return maxNatural;
  }



  function updatePlaybackDateUI() {
    const dateEl = document.getElementById("playback-date");
    if (!dateEl) return;

    const { playbackSequence, playbackCutoffTime } = getState();

    if (!playbackSequence.length) {
      dateEl.textContent = PLAYBACK_END_DATE_STR || PLAYBACK_START_DATE_STR;
      return;
    }


    const ts = (playbackCutoffTime == null)
      ? getEventTime(playbackSequence[playbackSequence.length - 1])
      : playbackCutoffTime;

    const startTs = typeof getWindowStartTime === "function" ? getWindowStartTime() : null;
    dateEl.textContent = Number.isFinite(startTs)
      ? `${formatDateFR(startTs)} - ${formatDateFR(ts)}`
      : formatDateFR(ts);
  }

  function pause() {
    const s = getState();
    if (!s.playbackActive) return;

    setState({ playbackActive: false });

    if (s.playbackTimer) {
      clearInterval(s.playbackTimer);
      setState({ playbackTimer: null });
    }

    const btn = document.getElementById("playback-toggle");
    if (btn) btn.textContent = "▶";
  }

  function buildPlaybackSequence() {
    const s = getState();
    const allEvents = s.allEvents;

    const playbackSequence = allEvents
      .map(ev => ({ ev, t: getEventTime(ev) }))
      .filter(x => x.t && x.t >= PLAYBACK_START_TIME)
      .sort((a, b) => a.t - b.t || buildEventId(a.ev).localeCompare(buildEventId(b.ev)))
      .map(x => x.ev);

    if (!playbackSequence.length) {
      setState({
        playbackSequence,
        playbackIndex: -1,
        playbackCutoffTime: null
      });
      updatePlaybackDateUI();
      return;
    }

    const playbackIndex = playbackSequence.length - 1;

    const lastEventT = getEventTime(playbackSequence[playbackIndex]);
    const playbackCutoffTime = Number.isFinite(lastEventT) ? lastEventT : getMaxTime();

    setState({ playbackSequence, playbackIndex, playbackCutoffTime });

    updatePlaybackDateUI();

  }

  function stop(resetToStart = false) {
    const s = getState();

    setState({ playbackActive: false });

    if (s.playbackTimer) {
      clearInterval(s.playbackTimer);
      setState({ playbackTimer: null });
    }

    const btn = document.getElementById("playback-toggle");
    if (btn) btn.textContent = "▶";

    if (resetToStart) {
      const prev = getState().playbackCutoffTime;
      const next = PLAYBACK_START_TIME - 1;

      setState({
        playbackIndex: -1,
        playbackCutoffTime: next
      });

      updatePlaybackDateUI();
      render();
    }
  }

  function isAtMax() {
    const s = getState();
    const { playbackSequence, playbackCutoffTime } = s;

    if (!playbackSequence.length) return false;
    if (playbackCutoffTime == null) return false;

    const maxT = getMaxTime();
    if (!Number.isFinite(maxT)) return false;

    return playbackCutoffTime >= maxT;
  }



  function stepNext() {
    const s = getState();
    const { playbackSequence, playbackIndex } = s;
    if (!playbackSequence.length) return;

    let i = playbackIndex + 1;
    if (i >= playbackSequence.length) return;

    const prevCutoff = s.playbackCutoffTime;

    const day = getEventDay(playbackSequence[i]);
    if (day == null) {
      const nextCutoff = getEventTime(playbackSequence[i]);
      setState({ playbackIndex: i, playbackCutoffTime: nextCutoff });

      maybeFireContextCues(prevCutoff, nextCutoff);
      updatePlaybackDateUI();
      render();
      return;
    }

    let j = i;
    while (j + 1 < playbackSequence.length && getEventDay(playbackSequence[j + 1]) === day) j++;

    const nextCutoff = endOfDay(day);
    setState({ playbackIndex: j, playbackCutoffTime: nextCutoff });

    maybeFireContextCues(prevCutoff, nextCutoff);
    updatePlaybackDateUI();
    render();
  }

  function stepPrev() {
    const s = getState();
    const { playbackSequence, playbackIndex } = s;
    if (!playbackSequence.length) return;
    if (playbackIndex < 0) return;

    const currentDay = getEventDay(playbackSequence[playbackIndex]);

    if (currentDay == null) {
      const nextIndex = Math.max(-1, playbackIndex - 1);
      const nextCutoff = nextIndex >= 0
        ? getEventTime(playbackSequence[nextIndex])
        : (PLAYBACK_START_TIME - 1);

      setState({ playbackIndex: nextIndex, playbackCutoffTime: nextCutoff });
      updatePlaybackDateUI();
      render();
      return;
    }

    let i = playbackIndex;
    while (i - 1 >= 0 && getEventDay(playbackSequence[i - 1]) === currentDay) i--;

    const prevIndex = i - 1;

    if (prevIndex < 0) {
      setState({
        playbackIndex: -1,
        playbackCutoffTime: PLAYBACK_START_TIME - 1
      });
    } else {
      const prevDay = getEventDay(playbackSequence[prevIndex]);
      let j = prevIndex;
      while (j + 1 < playbackSequence.length && getEventDay(playbackSequence[j + 1]) === prevDay) j++;

      setState({
        playbackIndex: j,
        playbackCutoffTime: endOfDay(prevDay)
      });
    }

    updatePlaybackDateUI();
    render();
  }

  function goToEnd() {
    const s = getState();
    if (!s.playbackSequence.length) buildPlaybackSequence();

    const s2 = getState();
    if (!s2.playbackSequence.length) return;

    const maxT = getMaxTime();
    if (!Number.isFinite(maxT)) return;

    pause();

    const prevCutoff = s2.playbackCutoffTime;

    let playbackIndex = s2.playbackSequence.length - 1;
    while (playbackIndex >= 0 && getEventTime(s2.playbackSequence[playbackIndex]) > maxT) {
      playbackIndex--;
    }

    const nextCutoff = maxT;
    setState({ playbackIndex, playbackCutoffTime: nextCutoff });

    maybeFireContextCues(prevCutoff, nextCutoff);
    updatePlaybackDateUI();
    render();
  }

  function start() {
    const s = getState();
    if (!s.playbackSequence.length) buildPlaybackSequence();

    const s2 = getState();
    if (!s2.playbackSequence.length) return;

    if (isAtMax() || s2.playbackIndex >= s2.playbackSequence.length - 1) {
      setState({
        playbackIndex: -1,
        playbackCutoffTime: PLAYBACK_START_TIME - 1
      });
      updatePlaybackDateUI();
      render();
    }

    setState({ playbackActive: true });
    stepNext();

    const btn = document.getElementById("playback-toggle");
    if (btn) btn.textContent = "⏸";

    const s3 = getState();
    if (s3.playbackTimer) clearInterval(s3.playbackTimer);

    const interval = Math.max(200, Math.round(1000 / Math.max(0.1, s3.playbackSpeed)));
    const timer = setInterval(() => {
      const sNow = getState();
      if (sNow.playbackIndex >= sNow.playbackSequence.length - 1) {
        pause();
        return;
      }
      stepNext();
    }, interval);

    setState({ playbackTimer: timer });
  }

  function toggle() {
    const s = getState();
    if (s.playbackActive) pause();
    else start();
  }

  return {
    buildPlaybackSequence,
    updatePlaybackDateUI,
    pause,
    stop,
    start,
    toggle,
    stepNext,
    stepPrev,
    goToEnd
  };
}
