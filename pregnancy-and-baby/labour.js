/* labour.js - the contraction maths for Pregnancy and Baby. Plain functions, no page code, so they can be tested on their own.

   You press a button when a contraction starts and again when it stops. From that list this works out:

   1. Practice or labour? Braxton Hicks ("practice") tightenings are irregular, do not build up and often fade away.
      Labour contractions get longer, stronger and closer together (NHS). Four things are scored over the last hour:
      how regular, how often, how long, and whether they are getting closer. The score gives one of five verdicts.
   2. Established labour? UK maternity units describe it as regular contractions about every 5 minutes or more often, each
      lasting 45 to 60 seconds or more. When the last hour has looked like that for a few contractions in a row, the time it began is noted.
   3. When might the baby come? NICE tells women a first established labour lasts 8 hours on average and is unlikely to go over 18,
      and a later labour 5 hours on average and unlikely over 12. Pushing adds up to about 3 hours (first baby) or 2 (later babies).
      Those are added to the start of established labour for the middle and upper estimate. The lower estimate (1.5 h or 0.5 h) is
      this tool's own allowance for fast labours. While contractions are still getting closer, a straight-line trend of "minutes apart"
      is projected forward and averaged in.

   None of this replaces your midwife. Every labour is different: these numbers are a guide to when to phone, not a prediction to plan around. */
(() => {
  'use strict';
  const MIN = 60000, HOUR = 3600000;
  const mean = (v) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);
  const sd = (v) => { if (v.length < 2) return 0; const m = mean(v); return Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / v.length); };
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const secs = (c) => (c.end - c.start) / 1000;

  /** NICE hours from established labour to birth: [fast end, middle, upper]. */
  const durations = (first) => (first ? [1.5, 9, 21] : [0.5, 5.5, 14]);

  /** Least-squares straight line y = a + b x. Returns [a, b] or null. */
  function linreg(xs, ys) {
    if (xs.length < 3 || xs.length !== ys.length) return null;
    const mx = mean(xs), my = mean(ys); let num = 0, den = 0;
    xs.forEach((x, i) => { num += (x - mx) * (ys[i] - my); den += (x - mx) ** 2; });
    if (den <= 0) return null;
    const b = num / den; return [my - b * mx, b];
  }

  /** Mean gap (minutes), gap variation and mean length for the hour ending at contraction i (falls back to the last 6 when fewer than 4 in the hour). */
  function windowAt(cs, i) {
    const end = cs[i].start; let from = i;
    while (from > 0 && end - cs[from - 1].start <= HOUR) from--;
    if (i + 1 - from < 4) from = Math.max(0, i - 5);
    const w = cs.slice(from, i + 1); if (w.length < 3) return null;
    const gaps = w.slice(1).map((c, k) => (c.start - w[k].start) / MIN);
    const m = mean(gaps);
    return { n: w.length, interval: m, cv: m > 0 ? sd(gaps) / m : 0, secs: mean(w.map(secs)) };
  }
  const looksEstablished = (w) => w.n >= 4 && w.interval <= 5 && w.secs >= 45 && w.cv <= 0.35;

  const TEXT = {
    notEnough: { title: 'Keep timing', advice: 'Time at least 4 contractions, start to finish, so the pattern can be read.' },
    practice: { title: 'Probably practice tightenings (Braxton Hicks)', advice: 'Rest, drink some water and keep timing if they come back. Call your midwife or maternity unit if you are unsure, if they become regular, or if anything else worries you.' },
    early: { title: 'Looks like early (latent) labour', advice: 'Early labour can last hours or days. Stay comfortable at home if you have been told to, keep timing, and call your midwife or maternity unit for guidance if you think you are in labour.' },
    established: { title: 'Looks like established labour', advice: 'Call your midwife or maternity unit now: the NHS advises calling when contractions are regular and coming every 5 minutes or more often.' },
    tooFrequent: { title: 'Very frequent contractions: call now', advice: 'The NHS says to call your midwife or maternity unit urgently if you have 6 or more contractions in 10 minutes. Call 999 if you feel the baby is coming now.' },
  };

  /** Read the pattern. list = [{start, end}] in ms (any order). now = ms. Returns { verdict, title, advice, score, reasons, stats, since, estimate, trend }. */
  function analyse(list, now, first) {
    const cs = list.filter((c) => c.end - c.start >= 10000 && c.start <= now)        // taps under 10 seconds are treated as accidental.sort((a, b) => a.start - b.start);
    const none = (reason) => ({ verdict: 'notEnough', ...TEXT.notEnough, score: 0, reasons: [reason], stats: null, since: null, estimate: null, trend: null });
    if (cs.length < 4) return none('Time at least 4 contractions to see a pattern.');
    const last = cs.length - 1, win = windowAt(cs, last);
    if (!win) return none('Time a few more contractions.');
    const { n, interval, cv, secs: avgSecs } = win;

    // trend over the last 3 hours (at least 5 gaps)
    let from = last; while (from > 0 && cs[last].start - cs[from - 1].start <= 3 * HOUR) from--;
    from = Math.min(from, Math.max(0, last - 5));
    const t0 = cs[from].start, hrs = (t) => (t - t0) / HOUR;
    const gx = [], gy = [], sx = [], sy = [];
    for (let k = from; k <= last; k++) { if (k > from) { gx.push(hrs(cs[k].start)); gy.push((cs[k].start - cs[k - 1].start) / MIN); } sx.push(hrs(cs[k].start)); sy.push(secs(cs[k])); }
    const gfit = linreg(gx, gy), sfit = linreg(sx, sy);
    const intervalTrend = gfit ? gfit[1] : 0, secsTrend = sfit ? sfit[1] : 0;

    const gapMin = Math.max(0, now - cs[last].end) / MIN;
    const last10 = cs.filter((c) => c.start >= now - 10 * MIN).length;
    const fading = gapMin > Math.max(3 * interval, 20);

    // score: 0 = practice, 1 = labour
    const regular = clamp((0.6 - cv) / 0.4, 0, 1), frequent = clamp((15 - interval) / 10, 0, 1), long = clamp((avgSecs - 30) / 30, 0, 1);
    const building = clamp(clamp(-intervalTrend / 3, 0, 1) * 0.7 + clamp(secsTrend / 15, 0, 1) * 0.3, 0, 1);
    let score = 0.3 * regular + 0.3 * frequent + 0.25 * long + 0.15 * building;
    if (fading) score *= 0.4;

    // established since when?
    const q = cs.map((_, i) => { if (i < 3) return false; const w = windowAt(cs, i); return !!w && looksEstablished(w); });
    let rs = cs.length; while (rs > 0 && q[rs - 1]) rs--;
    const since = cs.length - rs >= 3 && !fading ? cs[rs].start : null;

    const tooFrequent = !fading && (last10 >= 6 || (n >= 6 && interval <= 10 / 6));
    const verdict = tooFrequent ? 'tooFrequent' : since !== null ? 'established' : score >= 0.45 ? 'early' : 'practice';

    const reasons = ['Coming every ' + interval.toFixed(1) + ' min on average over the last hour (' + n + ' contractions).', 'Lasting about ' + Math.round(avgSecs) + ' seconds each.',
      (cv <= 0.2 ? 'Regular' : cv <= 0.35 ? 'Fairly regular' : 'Irregular') + ' (gaps vary by about ' + Math.round(cv * 100) + ' %).'];
    reasons.push(intervalTrend < -0.3 ? 'Getting closer together by about ' + (-intervalTrend).toFixed(1) + ' min every hour.' : intervalTrend > 0.3 ? 'Spacing out by about ' + intervalTrend.toFixed(1) + ' min every hour.' : 'Not getting noticeably closer together.');
    if (secsTrend > 3) reasons.push('Getting longer by about ' + Math.round(secsTrend) + ' s every hour.');
    if (fading) reasons.push('No contraction for ' + Math.round(gapMin) + ' min: they may have stopped or paused.');
    if (since !== null) reasons.push('Established pattern for ' + Math.round((now - since) / MIN) + ' min.');

    const stats = { n, interval, cv, secs: avgSecs, intervalTrend, secsTrend, last10, gapMin };
    const trend = gfit ? { t0, a: gfit[0], b: gfit[1] } : null;
    return { verdict, ...TEXT[verdict], score, reasons, stats, since, estimate: estimate(stats, verdict, since, now, first, trend), trend };
  }

  /** The birth window: { low, mid, high, basis } as clock times in ms, or null. */
  function estimate(s, verdict, since, now, first, trend) {
    const [loH, midH, hiH] = durations(first), h = (x) => x * HOUR, who = first ? 'first' : 'later';
    const hoursTo = (target) => { if (!trend || trend.b >= -0.3 || s.interval <= target) return null; const x = (s.interval - target) / -trend.b; return x <= 24 ? x : null; };
    if ((verdict === 'established' || verdict === 'tooFrequent') && since !== null) {
      let low = Math.max(since + h(loH), now), mid = Math.max(since + h(midH), now + 30 * MIN), high = Math.max(since + h(hiH), mid + HOUR);
      let basis = 'From the start of the established pattern plus the typical ' + who + '-labour length from NICE (' + (first ? 8 : 5) + ' hours on average, unlikely over ' + (first ? 18 : 12) + ' hours, plus pushing).';
      const t2 = hoursTo(2);
      if (t2 !== null) { mid = Math.max((mid + now + h(t2 + (first ? 1.5 : 0.75))) / 2, now + 15 * MIN); low = Math.max(Math.min(low, now + h(t2)), now); basis += ' Averaged with the trend, which reaches about 2 minutes apart in ' + t2.toFixed(1) + ' h.'; }
      if (s.interval <= 2.5 && s.secs >= 60) { basis += ' Contractions this strong and close usually mean labour is well advanced.'; mid = Math.min(mid, now + h(first ? 1.5 : 0.75)); }
      if (now > since + h(hiH)) basis += ' This is longer than the usual range, so your midwife will be checking progress.';
      return { low: Math.min(low, mid), mid, high: Math.max(high, mid), basis };
    }
    if (verdict === 'early') {
      const t5 = hoursTo(5); if (t5 === null) return null;
      const spread = Math.max(t5 * 0.5, 0.5);
      return { low: now + h(Math.max(t5 - spread, 0) + loH), mid: now + h(t5 + midH), high: now + h(t5 + spread + hiH),
        basis: 'Projected: at this rate contractions reach about 5 minutes apart in ' + t5.toFixed(1) + ' h (give or take ' + spread.toFixed(1) + ' h), then the typical ' + who + '-labour length from NICE is added. Early labour often speeds up, slows or pauses, so treat this loosely.' };
    }
    return null;
  }

  /* ---------- made-up example labours: how real patterns look (they do not follow one straight line) ---------- */
  const ph = (hours, gap0, gap1, s0, s1, wobble) => ({ hours, gap0, gap1, s0, s1, wobble });
  const pause = (hours) => ({ hours, pause: true });
  function generate(phases, seed) {
    let s = seed; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const out = []; let t = 0;
    phases.forEach((p) => {
      const end = t + p.hours;
      if (p.pause) { t = end; return; }
      while (t < end) {
        const f = clamp((t - (end - p.hours)) / p.hours, 0, 1);
        const sec = Math.max(15, (p.s0 + (p.s1 - p.s0) * f) * (1 + (rnd() - 0.5) * p.wobble));
        const start = Math.round(t * HOUR); out.push({ start, end: start + Math.round(sec * 1000) });
        t += Math.max(1, (p.gap0 + (p.gap1 - p.gap0) * f) * (1 + (rnd() - 0.5) * 2 * p.wobble)) / 60;
      }
    });
    return [out, Math.round(t * HOUR)];
  }
  function examples() {
    const mk = (title, about, first, phases, seed, birthAfter, snaps) => { const [c, end] = generate(phases, seed); return { title, about, first, contractions: c, birth: birthAfter === null ? null : end + birthAfter * HOUR, snapshots: snaps }; };
    return [
      mk('Typical first labour', 'Starts irregular and far apart, then settles into a pattern that gets steadily closer and longer.', true, [ph(3, 18, 9, 30, 45, 0.35), ph(3, 9, 4.5, 45, 60, 0.2), ph(5, 4.5, 2.5, 60, 75, 0.12)], 11, 0.75, [4, 7.5]),
      mk('Faster labour (not the first baby)', 'Later labours are often shorter: the pattern can go from 10 minutes apart to 3 in a couple of hours.', false, [ph(1, 12, 7, 35, 45, 0.3), ph(2, 7, 2.5, 45, 70, 0.12)], 23, 0.33, [1, 2.7]),
      mk('Practice tightenings (Braxton Hicks)', 'Irregular, short and not building. They fade away with rest, a drink or a change of position.', true, [ph(4, 16, 16, 30, 30, 0.8)], 5, null, [2.5, 4.8]),
      mk('Stop-start early labour', 'Regular for a while, then a pause of an hour or more, then labour picks up again. Very common, especially at night.', true, [ph(2, 9, 7, 40, 45, 0.25), pause(1.5), ph(1, 14, 11, 35, 40, 0.45), ph(4, 8, 3, 45, 65, 0.15)], 41, 1.5, [1.8, 3.2, 8]),
      mk('Long, slow early labour', 'Hours of contractions 10 to 15 minutes apart that only slowly come closer. Tiring, and normal for many first labours.', true, [ph(10, 15, 9, 35, 45, 0.3), ph(6, 9, 3, 45, 65, 0.15)], 77, 1, [6, 15]),
    ];
  }
  /** What the tool would have said `hours` into an example. */
  function analyseExample(e, hours) { const now = Math.round(hours * HOUR); return analyse(e.contractions.filter((c) => c.end <= now), now, e.first); }

  window.PBlabour = { analyse, examples, analyseExample, durations, MIN, HOUR };
})();
