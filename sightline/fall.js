/* Falling notes: a keyboard at the bottom and coloured bars that fall onto the keys at the moment each note sounds,
   like a rhythm game. Drawn on a <canvas>. It follows the Player from pc.js, so the position slider, tempo, loops,
   hands and difficulty all apply. Hand colours: right hand = accent colour, left hand = ink.
   How it keeps time: the Player tells us "at audio time T the position was P sixteenths". Between those messages we
   work out where we are now from the audio clock, so the bars glide smoothly. */
const PCfall = (() => {
  function attach(canvas, getPlayer) {
    const g = canvas.getContext('2d'); let last = { time: 0, pos: 0 }, lookahead = 28;                // sixteenths of look-ahead
    const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || '#888';
    const LOW = 36, HIGH = 96, WHITE = [0, 2, 4, 5, 7, 9, 11];                                          // C2 to C7
    const isWhite = (p) => WHITE.includes(p % 12);
    const whites = []; for (let p = LOW; p <= HIGH; p++) if (isWhite(p)) whites.push(p);
    function xOf(p, w) {                                                                              // left edge and width of a key
      const ww = w / whites.length;
      if (isWhite(p)) return [whites.indexOf(p) * ww, ww];
      return [whites.indexOf(p - 1) * ww + ww * 0.65, ww * 0.7];
    }
    function now(pl) { if (!pl) return 0; if (!pl.playing) return pl.pos; return last.pos + (PC.Piano.ctx.currentTime - last.time) / pl.step; }
    function frame() {
      const pl = getPlayer(); const W = canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1), H = canvas.height = canvas.clientHeight * (window.devicePixelRatio || 1), kh = H * 0.16;
      g.clearRect(0, 0, W, H); g.fillStyle = css('--bg'); g.fillRect(0, 0, W, H);
      if (pl) {
        const pos = now(pl), area = H - kh, per = area / lookahead, active = new Set();
        g.strokeStyle = css('--line'); g.lineWidth = 1; for (let b = Math.ceil(pos / pl.score.barLen) * pl.score.barLen; b < pos + lookahead; b += pl.score.barLen) { const y = area - (b - pos) * per; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
        pl.notes.forEach((n) => {
          if (!pl.hands[n.hand]) return; const p = n.pitch + pl.transpose; if (p < LOW || p > HIGH) return;
          const t0 = n.start - pos, t1 = n.start + n.dur - pos; if (t1 < 0 || t0 > lookahead) return;
          const [x, w] = xOf(p, W), y1 = area - t0 * per, y0 = area - t1 * per, on = t0 <= 0 && t1 > 0; if (on) active.add(p);
          g.fillStyle = n.hand === 'R' ? css('--accent') : css('--ink'); g.globalAlpha = on ? 1 : 0.75; g.fillRect(x + 1, Math.max(0, y0), w - 2, Math.max(3, y1 - Math.max(0, y0) - 2)); g.globalAlpha = 1;
        });
        for (let p = LOW; p <= HIGH; p++) if (isWhite(p)) { const [x, w] = xOf(p, W); g.fillStyle = active.has(p) ? css('--accent') : '#f4f4f0'; g.fillRect(x, area, w - 1, kh); }
        for (let p = LOW; p <= HIGH; p++) if (!isWhite(p)) { const [x, w] = xOf(p, W); g.fillStyle = active.has(p) ? css('--accent') : '#1b1b1b'; g.fillRect(x, area, w, kh * 0.62); }
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return { onEvent(e) { if (e.type === 'step') last = { time: e.time, pos: e.pos }; } };
  }
  return { attach };
})();
