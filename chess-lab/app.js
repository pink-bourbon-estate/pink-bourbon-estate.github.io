/* Chess Lab (a demo of the idea): learn a few opening lines move by move, then drill them from memory.
   The board only applies the moves stored in each line (it does not check whether a move is legal and does not play
   against you): it is a way to learn lines, not a chess engine. The lines were written from general chess knowledge and
   should be checked against a book or a trusted site before you rely on them. Your drill record stays in this browser. */
(() => {
  const $ = (id) => document.getElementById(id), KEY = 'pbe-chess-lab-v1', NS = 'http://www.w3.org/2000/svg';
  const PIECE = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙', k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  /* each line: name, the moves as from-to squares, the same moves in words, and a note on the idea */
  const LINES = [
    { name: 'Italian Game', side: 'w', moves: 'e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 c2c3 g8f6 d2d3 d7d6 e1g1', san: '1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 Nf6 5.d3 d6 6.O-O', idea: 'White develops quickly, aims the bishop at f7, and prepares c3 and d4 to take the centre.' },
    { name: 'Ruy Lopez', side: 'w', moves: 'e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6 e1g1 f8e7', san: '1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7', idea: 'The bishop pressures the knight that defends e5. White keeps long-term pressure on the centre.' },
    { name: "Queen's Gambit Declined", side: 'w', moves: 'd2d4 d7d5 c2c4 e7e6 b1c3 g8f6 c1g5 f8e7 e2e3 e8g8', san: '1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Be7 5.e3 O-O', idea: 'White challenges the d5 pawn; Black holds the centre solidly and finishes development.' },
    { name: 'Sicilian Defence (Najdorf set-up)', side: 'b', moves: 'e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6', san: '1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6', idea: 'Black trades the c-pawn for the centre pawn and plays for an unbalanced fight. A very popular, very deep line.' },
  ];
  const sq = (s) => [s.charCodeAt(0) - 97, 8 - Number(s[1])];                                  // 'e2' -> [4, 6]
  const start = () => ['rnbqkbnr', 'pppppppp', '........', '........', '........', '........', 'PPPPPPPP', 'RNBQKBNR'].map((r) => r.split(''));
  /** Apply one from-to move (also moves the rook when a king goes two squares: castling). */
  function apply(b, mv) { const [fx, fy] = sq(mv.slice(0, 2)), [tx, ty] = sq(mv.slice(2, 4)), p = b[fy][fx]; b[ty][tx] = p; b[fy][fx] = '.'; if ((p === 'K' || p === 'k') && Math.abs(tx - fx) === 2) { const rx = tx > fx ? 7 : 0, nx = tx > fx ? 5 : 3; b[ty][nx] = b[ty][rx]; b[ty][rx] = '.'; } }
  let line = LINES[0], step = 0, mode = 'learn', from = null, tries = 0, stats = {};
  try { stats = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { stats = {}; }
  const saveStats = () => { try { localStorage.setItem(KEY, JSON.stringify(stats)); } catch (e) { /* storage blocked */ } };
  const mv = () => line.moves.split(' ');
  const boardAt = (n) => { const b = start(); mv().slice(0, n).forEach((m) => apply(b, m)); return b; };
  const el = (t, a, p) => { const e = document.createElementNS(NS, t); Object.keys(a || {}).forEach((k) => e.setAttribute(k, a[k])); if (p) p.append(e); return e; };

  function draw() {
    const svg = $('board'); svg.replaceChildren(); const b = boardAt(step), flip = line.side === 'b', last = step ? mv()[step - 1] : '';
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const dx = flip ? 7 - x : x, dy = flip ? 7 - y : y, name = String.fromCharCode(97 + x) + (8 - y);
      const r = el('rect', { x: dx * 50, y: dy * 50, width: 50, height: 50, fill: (x + y) % 2 ? 'var(--line)' : 'var(--soft)', 'data-sq': name, style: 'cursor:pointer' }, svg);
      if (last && (name === last.slice(0, 2) || name === last.slice(2, 4))) r.setAttribute('fill', 'rgba(255,212,0,.35)');
      if (from === name) r.setAttribute('fill', 'rgba(224,36,94,.35)');
      r.addEventListener('click', () => click(name));
      const p = b[y][x]; if (p !== '.') { const t = el('text', { x: dx * 50 + 25, y: dy * 50 + 38, 'text-anchor': 'middle', 'font-size': 38, fill: 'var(--ink)', style: 'pointer-events:none' }, svg); t.textContent = PIECE[p]; }
    }
    const words = line.san.split(' '); $('moves').textContent = line.san; $('idea').textContent = line.idea;
    $('step').textContent = mode === 'learn' ? 'Move ' + step + ' of ' + mv().length : 'Drill: you play ' + (line.side === 'w' ? 'White' : 'Black') + ', move ' + Math.floor(step / 2 + 1);
    $('rec').textContent = (stats[line.name] ? 'Completed from memory ' + stats[line.name].done + ' time' + (stats[line.name].done === 1 ? '' : 's') + '.' : 'Not drilled yet.');
  }
  const myTurn = () => (line.side === 'w') === (step % 2 === 0);
  function opp() { if (step < mv().length && !myTurn()) { step++; draw(); setTimeout(opp, 450); } }
  function click(name) {
    if (mode !== 'drill' || step >= mv().length || !myTurn()) return;
    if (!from) { from = name; draw(); return; }
    const want = mv()[step], got = from + name; from = null;
    if (got === want) { step++; tries = 0; $('msg').textContent = 'Correct.'; draw(); if (step >= mv().length) { stats[line.name] = { done: ((stats[line.name] || {}).done || 0) + 1 }; saveStats(); $('msg').textContent = 'You played the whole line from memory.'; draw(); } else setTimeout(opp, 450); }
    else { tries++; $('msg').textContent = tries >= 2 ? 'Not that one. The move is ' + want.slice(0, 2) + ' to ' + want.slice(2) + '.' : 'Not that one: try again.'; draw(); }
  }
  document.addEventListener('DOMContentLoaded', () => {
    LINES.forEach((l, i) => { const o = document.createElement('option'); o.value = i; o.textContent = l.name; $('line').append(o); });
    const reset = () => { step = 0; from = null; tries = 0; $('msg').textContent = ''; draw(); if (mode === 'drill') opp(); };
    $('line').addEventListener('change', () => { line = LINES[$('line').value]; reset(); });
    $('learn').addEventListener('click', () => { mode = 'learn'; reset(); }); $('drill').addEventListener('click', () => { mode = 'drill'; reset(); });
    $('next').addEventListener('click', () => { if (mode === 'learn' && step < mv().length) { step++; draw(); } }); $('back').addEventListener('click', () => { if (mode === 'learn' && step > 0) { step--; draw(); } });
    draw();
  });
})();
