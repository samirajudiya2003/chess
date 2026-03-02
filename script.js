let myName = 'ChessPlayer';

// ===================== CHESS ENGINE =====================
const FILES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const PIECES = {
  'K': 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg',
  'Q': 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
  'R': 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
  'B': 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
  'N': 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
  'P': 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
  'k': 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg',
  'q': 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
  'r': 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
  'b': 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
  'n': 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg',
  'p': 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg'
};

const WHITE_PIECES = 'KQRBNP';



let gameMode = 'two-player';
let timeControl = 600;
let timers = [600, 600];
let timerInterval = null;
let currentTurn = 'w';
let flipped = false;
let selectedSq = null;
let legalMoves = [];
let moveHistory = [];
let captureCount = 0;
let pendingPromotion = null;
let gameOver = false;
let lastMove = null;
let board = new Array(64).fill(null);
let castling = { wK: true, wQ: true, bK: true, bQ: true };
let enPassant = null;
let modalMode = 'two-player';

const chickenMsgs = {
  move: ["Cluck cluck! Nice move!", "Bawk! Keep going!", "🐔 Cluck!", "Ooh, interesting!"],
  capture: ["SQUAWK! A capture!", "Cluck cluck CLUCK!", "🐔💥 Got 'em!", "Feathers flying!"],
  check: ["BAWWWK! CHECK!", "🐔🔥 Check check!", "The king is in danger!"],
  checkmate: ["BAWWWWK! CHECKMATE! 🐔🏆", "Kukdi jeet gayi! 🎉", "🐔👑 The chicken wins!"],
  start: ["Cluck! Let's play!", "🐔 Ready to rumble!", "New game! BAWK!"],

};
function rMsg(t) { const a = chickenMsgs[t] || chickenMsgs.move; return a[Math.floor(Math.random() * a.length)]; }

function initBoard() {
  board = new Array(64).fill(null);
  ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'].forEach((p, i) => board[i] = p);
  for (let i = 8; i < 16; i++)board[i] = 'p';
  for (let i = 48; i < 56; i++)board[i] = 'P';
  ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'].forEach((p, i) => board[56 + i] = p);
}

function idx(f, r) { return (8 - r) * 8 + f; }
function fileOf(i) { return i % 8; }
function rankOf(i) { return 8 - Math.floor(i / 8); }
function sqName(i) { return FILES[fileOf(i)] + rankOf(i); }
function isWhite(p) { return p && WHITE_PIECES.includes(p); }
function isBlack(p) { return p && p === p.toLowerCase() && p !== '' && p != null; }

function getLegalMoves(sq) {
  const p = board[sq]; if (!p) return [];
  const color = isWhite(p) ? 'w' : 'b';
  return getPseudoMoves(sq, p, color).filter(to => {
    const saved = makeMoveTmp(sq, to, p);
    const inc = isInCheck(color);
    undoMoveTmp(saved);
    return !inc;
  });
}

function getPseudoMoves(sq, p, color) {
  const f = fileOf(sq), r = rankOf(sq);
  const moves = [];
  const enemy = color === 'w' ? isBlack : isWhite;
  const friendly = color === 'w' ? isWhite : isBlack;
  const addIf = to => { if (to >= 0 && to < 64 && !friendly(board[to])) moves.push(to); };
  const slide = dirs => {
    for (const [df, dr] of dirs) {
      let nf = f + df, nr = r + dr;
      while (nf >= 0 && nf < 8 && nr >= 1 && nr <= 8) {
        const ni = idx(nf, nr);
        if (friendly(board[ni])) break;
        moves.push(ni);
        if (enemy(board[ni])) break;
        nf += df; nr += dr;
      }
    }
  };
  const pt = p.toLowerCase();
  if (pt === 'p') {
    const dir = color === 'w' ? 1 : -1, sr = color === 'w' ? 2 : 7;
    const fwd = idx(f, r + dir);
    if (fwd >= 0 && fwd < 64 && !board[fwd]) {
      moves.push(fwd);
      if (r === sr && !board[idx(f, r + 2 * dir)]) moves.push(idx(f, r + 2 * dir));
    }
    for (const df of [-1, 1]) {
      if (f + df < 0 || f + df > 7) continue;
      const cap = idx(f + df, r + dir);
      if (cap >= 0 && cap < 64 && enemy(board[cap])) moves.push(cap);
      if (cap === enPassant) moves.push(cap);
    }
  } else if (pt === 'n') {
    for (const [df, dr] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) {
      const nf = f + df, nr = r + dr;
      if (nf >= 0 && nf < 8 && nr >= 1 && nr <= 8) addIf(idx(nf, nr));
    }
  } else if (pt === 'b') { slide([[1, 1], [1, -1], [-1, 1], [-1, -1]]); }
  else if (pt === 'r') { slide([[1, 0], [-1, 0], [0, 1], [0, -1]]); }
  else if (pt === 'q') { slide([[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]); }
  else if (pt === 'k') {
    for (const [df, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nf = f + df, nr = r + dr;
      if (nf >= 0 && nf < 8 && nr >= 1 && nr <= 8) addIf(idx(nf, nr));
    }
    if (color === 'w' && r === 1) {
      if (castling.wK && !board[idx(5, 1)] && !board[idx(6, 1)] && !isInCheck('w') && !isAttacked(idx(5, 1), 'b')) moves.push(idx(6, 1));
      if (castling.wQ && !board[idx(3, 1)] && !board[idx(2, 1)] && !board[idx(1, 1)] && !isInCheck('w') && !isAttacked(idx(3, 1), 'b')) moves.push(idx(2, 1));
    }
    if (color === 'b' && r === 8) {
      if (castling.bK && !board[idx(5, 8)] && !board[idx(6, 8)] && !isInCheck('b') && !isAttacked(idx(5, 8), 'w')) moves.push(idx(6, 8));
      if (castling.bQ && !board[idx(3, 8)] && !board[idx(2, 8)] && !board[idx(1, 8)] && !isInCheck('b') && !isAttacked(idx(3, 8), 'w')) moves.push(idx(2, 8));
    }
  }
  return moves;
}

function isAttacked(sq, byColor) {
  for (let i = 0; i < 64; i++) {
    const p = board[i]; if (!p) continue;
    if (byColor === 'w' && !isWhite(p)) continue;
    if (byColor === 'b' && !isBlack(p)) continue;
    if (getPseudoMoves(i, p, byColor).includes(sq)) return true;
  }
  return false;
}
function findKing(color) { return board.indexOf(color === 'w' ? 'K' : 'k'); }
function isInCheck(color) { const k = findKing(color); return k !== -1 && isAttacked(k, color === 'w' ? 'b' : 'w'); }

function makeMoveTmp(from, to, piece) {
  const saved = { from, to, fp: board[from], tp: board[to], ep: enPassant, castling: { ...castling } };
  board[to] = piece; board[from] = null;
  if (piece.toLowerCase() === 'p' && to === enPassant) {
    const dir = isWhite(piece) ? -1 : 1;
    saved.epSq = to + dir * 8; saved.epPiece = board[saved.epSq];
    board[saved.epSq] = null;
  }
  return saved;
}
function undoMoveTmp(s) {
  board[s.from] = s.fp; board[s.to] = s.tp; enPassant = s.ep; castling = s.castling;
  if (s.epSq !== undefined) board[s.epSq] = s.epPiece;
}

function executeMove(from, to, promoChoice) {
  const piece = board[from];
  const captured = board[to];
  const color = isWhite(piece) ? 'w' : 'b';
  const pt = piece.toLowerCase();
  const toR = rankOf(to), fromR = rankOf(from), fromF = fileOf(from), toF = fileOf(to);

  let epCaptured = null;
  if (pt === 'p' && to === enPassant) {
    const dir = color === 'w' ? -1 : 1; const capSq = to + dir * 8;
    epCaptured = board[capSq]; board[capSq] = null;
  }

  enPassant = null;
  if (pt === 'p' && Math.abs(toR - fromR) === 2) enPassant = idx(fromF, (fromR + toR) / 2);

  if (pt === 'k') {
    if (toF - fromF === 2) { board[idx(5, fromR)] = board[idx(7, fromR)]; board[idx(7, fromR)] = null; }
    else if (fromF - toF === 2) { board[idx(3, fromR)] = board[idx(0, fromR)]; board[idx(0, fromR)] = null; }
    if (color === 'w') { castling.wK = false; castling.wQ = false; }
    else { castling.bK = false; castling.bQ = false; }
  }
  if (pt === 'r') {
    if (from === idx(0, 1)) castling.wQ = false; if (from === idx(7, 1)) castling.wK = false;
    if (from === idx(0, 8)) castling.bQ = false; if (from === idx(7, 8)) castling.bK = false;
  }

  board[to] = piece; board[from] = null;

  if (pt === 'p' && (toR === 8 || toR === 1)) {
    if (promoChoice) { board[to] = color === 'w' ? promoChoice.toUpperCase() : promoChoice.toLowerCase(); }
    else {
      pendingPromotion = { from, to, color };
      renderBoard();
      document.getElementById('promo-modal').style.display = 'flex';
      const btns = document.querySelectorAll('.pbtn');
      const pp = color === 'w' ? ['♕', '♖', '♗', '♘'] : ['♛', '♜', '♝', '♞'];
      btns.forEach((b, i) => b.textContent = pp[i]);
      return;
    }
  }

  const isCapture = !!(captured || epCaptured);
  if (isCapture) captureCount++;
  lastMove = { from, to };
  const moveStr = sqName(from) + '-' + sqName(to);
  moveHistory.push({ from, to, piece, captured, moveStr });
  currentTurn = color === 'w' ? 'b' : 'w';



  renderBoard(); updateMoveList(); updateStats();

  const inCheck = isInCheck(currentTurn);
  const allMoves = getAllLegalMoves(currentTurn);

  if (allMoves.length === 0) {
    if (inCheck) {
      setStatus(`${color === 'w' ? 'White' : 'Black'} wins! Checkmate!`);
      showWin(color === 'w' ? 'White' : 'Black');
      exciteChicken('checkmate'); stopTimers(); gameOver = true;
    } else {
      setStatus("Stalemate! Draw!"); stopTimers(); gameOver = true;
    }
    return;
  }

  if (inCheck) {
    setStatus(`${currentTurn === 'w' ? 'White' : 'Black'} in Check!`);
    document.getElementById('stat-check').textContent = 'Yes';
    document.getElementById('stat-check').style.color = '#f88';
    exciteChicken('check');
  } else {
    setStatus(`${currentTurn === 'w' ? 'White' : 'Black'} to move`);
    document.getElementById('stat-check').textContent = 'No';
    document.getElementById('stat-check').style.color = '';
    if (isCapture) exciteChicken('capture');
    else setChickenMsg(rMsg('move'));
  }

  updateClocks();

  if (gameMode === 'computer' && currentTurn === 'b' && !gameOver) {
    setTimeout(makeComputerMove, 600);
  }
}

function getAllLegalMoves(color) {
  const moves = [];
  for (let i = 0; i < 64; i++) {
    const p = board[i]; if (!p) continue;
    if (color === 'w' && !isWhite(p)) continue;
    if (color === 'b' && !isBlack(p)) continue;
    getLegalMoves(i).forEach(to => moves.push({ from: i, to }));
  }
  return moves;
}

function makeComputerMove() {
  if (gameOver) return;
  const moves = getAllLegalMoves('b'); if (!moves.length) return;
  const pv = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
  let best = null, bestScore = -Infinity;
  for (const m of moves) {
    let score = Math.random() * 0.5;
    if (board[m.to]) score += (pv[board[m.to].toLowerCase()] || 0) * 2;
    const f = fileOf(m.to), r = rankOf(m.to);
    if (f >= 2 && f <= 5 && r >= 3 && r <= 6) score += 0.3;
    if (score > bestScore) { bestScore = score; best = m; }
  }
  if (best) { selectedSq = null; legalMoves = []; executeMove(best.from, best.to); }
}

function doPromotion(choice) {
  document.getElementById('promo-modal').style.display = 'none';
  if (pendingPromotion) {
    const { from, to, color } = pendingPromotion; pendingPromotion = null;
    executeMove(from, to, choice);
  }
}

// ===================== RENDER =====================
function renderBoard() {
  const boardEl = document.getElementById('board'); boardEl.innerHTML = '';
  const indices = flipped ? Array.from({ length: 64 }, (_, i) => 63 - i) : Array.from({ length: 64 }, (_, i) => i);

  // Update Coords UI
  updateCoords();

  indices.forEach(sqIdx => {
    const f = fileOf(sqIdx), r = rankOf(sqIdx);
    const isLight = (f + r) % 2 === 1;
    const div = document.createElement('div');
    div.className = 'sq ' + (isLight ? 'light' : 'dark');
    div.dataset.sq = sqIdx;
    if (lastMove && (sqIdx === lastMove.from || sqIdx === lastMove.to)) div.classList.add('last-move');
    if (isInCheck(currentTurn) && sqIdx === findKing(currentTurn)) div.classList.add('in-check');
    if (sqIdx === selectedSq) div.classList.add('selected');

    // Movable indicator (dot)
    if (legalMoves.includes(sqIdx)) {
      const dot = document.createElement('div');
      dot.style = "width:20px; height:20px; border-radius:50%; background:rgba(0,0,0,0.15); pointer-events:none;";
      if (board[sqIdx]) {
        dot.style = "width:58px; height:58px; border-radius:50%; border:6px solid rgba(0,0,0,0.1); pointer-events:none; position:absolute;";
      }
      div.appendChild(dot);
    }

    const p = board[sqIdx];
    if (p) {
      const img = document.createElement('img');
      img.className = 'piece-img ' + (isWhite(p) ? 'white-p' : 'black-p');
      img.src = PIECES[p];
      div.appendChild(img);
    }

    div.addEventListener('click', () => handleClick(sqIdx));
    boardEl.appendChild(div);
  });
}

function updateCoords() {
  const files = FILES;
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  const fList = flipped ? [...files].reverse() : files;
  const rList = flipped ? [...ranks].reverse() : ranks;

  const top = document.getElementById('coords-top');
  const bot = document.getElementById('coords-bot');
  const left = document.getElementById('coords-left');
  const right = document.getElementById('coords-right');

  top.innerHTML = fList.map(f => `<span>${f}</span>`).join('');
  bot.innerHTML = fList.map(f => `<span>${f}</span>`).join('');
  left.innerHTML = rList.map(r => `<span>${r}</span>`).join('');
  right.innerHTML = rList.map(r => `<span>${r}</span>`).join('');
}


function handleClick(sq) {
  if (gameOver) return;

  const p = board[sq];
  if (selectedSq !== null && legalMoves.includes(sq)) { executeMove(selectedSq, sq); selectedSq = null; legalMoves = []; return; }
  if (p && ((currentTurn === 'w' && isWhite(p)) || (currentTurn === 'b' && isBlack(p)))) {
    if (gameMode === 'computer' && isBlack(p)) return;
    selectedSq = sq; legalMoves = getLegalMoves(sq); renderBoard(); return;
  }
  selectedSq = null; legalMoves = []; renderBoard();
}

function setStatus(txt) { document.getElementById('statusbox').textContent = txt; }

function updateMoveList() {
  const list = document.getElementById('moves-list'); list.innerHTML = '';
  for (let i = 0; i < moveHistory.length; i += 2) {
    const row = document.createElement('div'); row.className = 'mrow';
    row.innerHTML = `<span class="mnum">${Math.floor(i / 2) + 1}.</span><span class="mcell">${moveHistory[i].moveStr}</span><span class="mcell">${moveHistory[i + 1] ? moveHistory[i + 1].moveStr : ''}</span>`;
    list.appendChild(row);
  }
  list.scrollTop = list.scrollHeight;
}
function updateStats() {
  document.getElementById('stat-moves').textContent = moveHistory.length;
  document.getElementById('stat-captures').textContent = captureCount;
}

// ===================== TIMERS =====================
function startTimers() {
  stopTimers(); if (timeControl === 0) return;
  timerInterval = setInterval(() => {
    if (gameOver) { stopTimers(); return; }
    const i = currentTurn === 'w' ? 0 : 1;
    timers[i]--;
    if (timers[i] <= 0) {
      timers[i] = 0; updateClockDisplay(); stopTimers();
      setStatus(`${currentTurn === 'w' ? 'White' : 'Black'} ran out of time!`);
      showWin(currentTurn === 'w' ? 'Black' : 'White'); gameOver = true; return;
    }
    updateClockDisplay();
  }, 1000);
}
function stopTimers() { clearInterval(timerInterval); timerInterval = null; }
function updateClockDisplay() {
  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  document.getElementById('clock1').textContent = timeControl === 0 ? '∞' : fmt(timers[0]);
  document.getElementById('clock2').textContent = timeControl === 0 ? '∞' : fmt(timers[1]);
}
function updateClocks() {
  document.getElementById('clock1').className = 'clock ' + (currentTurn === 'w' ? 'active-clock' : 'inactive-clock');
  document.getElementById('clock2').className = 'clock ' + (currentTurn === 'b' ? 'active-clock' : 'inactive-clock');
}

// ===================== GAME CONTROL =====================
function startNewGame() {
  initBoard();
  currentTurn = 'w'; selectedSq = null; legalMoves = []; moveHistory = [];
  captureCount = 0; enPassant = null; lastMove = null; gameOver = false;
  castling = { wK: true, wQ: true, bK: true, bQ: true };
  timers = [timeControl, timeControl];
  if (timeControl === 0) timers = [999, 999];
  setStatus('White to move');
  document.getElementById('stat-check').textContent = 'No';
  document.getElementById('stat-check').style.color = '';
  document.getElementById('moves-list').innerHTML = '';
  document.getElementById('stat-moves').textContent = '0';
  document.getElementById('stat-captures').textContent = '0';
  renderBoard(); updateClockDisplay(); updateClocks();
  stopTimers(); startTimers();
  setChickenMsg(rMsg('start')); exciteChicken('start');
}

function resignGame() {
  if (gameOver) {
    openNameModal();
    return;
  }

  if (!confirm("Stop this game and declare opponent winner?")) return;

  const winnerColor = currentTurn === 'w' ? 'Black' : 'White';
  gameOver = true;
  stopTimers();

  addChat(`🏳️ ${currentTurn === 'w' ? 'White' : 'Black'} resigned.`);
  showWin(winnerColor);
}


function undoMove() {
  if (moveHistory.length === 0 || gameOver) return;
  const history = [...moveHistory]; history.pop();
  if (gameMode === 'computer' && history.length > 0) history.pop();
  const savedMode = gameMode, savedP1 = document.getElementById('p1name').textContent, savedP2 = document.getElementById('p2name').textContent;
  startNewGame();
  document.getElementById('p1name').textContent = savedP1;
  document.getElementById('p2name').textContent = savedP2;
  for (const m of history) executeMove(m.from, m.to, null);
}

function flipBoard() { flipped = !flipped; renderBoard(); }

function setMode(mode) {
  gameMode = mode;
  ['btn-two', 'btn-comp'].forEach(id => document.getElementById(id).className = 'mode-btn');
  const idMap = { 'two-player': 'btn-two', computer: 'btn-comp' };
  if (idMap[mode]) document.getElementById(idMap[mode]).className = 'mode-btn active';
}

function setTime(mins, el) {
  document.querySelectorAll('.tbtn').forEach(b => b.classList.remove('active'));
  el.classList.add('active'); timeControl = mins * 60;
}

function addChat(msg) {
  const log = document.getElementById('chatlog');
  const d = document.createElement('div');
  d.innerHTML = `<span>System:</span> ${msg}`;
  log.appendChild(d); log.scrollTop = log.scrollHeight;
}

// ===================== NAME MODAL =====================
function openNameModal() {

  document.getElementById('name-modal').style.display = 'flex';
  setTimeout(() => document.getElementById('modal-p1').focus(), 100);
}

function setModalMode(mode) {
  modalMode = mode;
  const isComp = mode === 'computer';
  document.getElementById('modal-btn-two').className = 'mmbtn ' + (isComp ? 'inactive' : 'active');
  document.getElementById('modal-btn-comp').className = 'mmbtn ' + (isComp ? 'active' : 'inactive');
  document.getElementById('modal-p2-wrap').style.opacity = isComp ? '0.3' : '1';
  document.getElementById('modal-p2-wrap').style.pointerEvents = isComp ? 'none' : 'auto';
}

function startGameWithNames() {
  const p1 = document.getElementById('modal-p1').value.trim() || 'Player White';
  const p2 = modalMode === 'computer' ? 'Computer' : (document.getElementById('modal-p2').value.trim() || 'Player Black');
  document.getElementById('p1name').textContent = p1;
  document.getElementById('p2name').textContent = p2;
  gameMode = modalMode;
  setMode(gameMode);
  document.getElementById('name-modal').style.display = 'none';
  onlineMode = false;
  showTab('play');
  startNewGame();
  addChat(`🐔 ${p1} (White) vs ${p2} (Black) — Let's go!`);
}



// ===================== UI TABS =====================
function showTab(tab) {
  document.getElementById('game-area').style.display = tab === 'play' ? 'flex' : 'none';
  document.querySelectorAll('.nav-link').forEach((l, i) => {
    l.classList.remove('active');
    if (tab === 'play' && i === 0) l.classList.add('active');
  });
}

// ===================== CHICKEN =====================
function setChickenMsg(msg) { document.getElementById('chickenmsg').textContent = msg; }
function exciteChicken(type) {
  const c = document.getElementById('chicken');
  c.classList.remove('excited'); void c.offsetWidth;
  c.classList.add('excited'); setChickenMsg(rMsg(type));
  setTimeout(() => c.classList.remove('excited'), 1500);
}
function chickenClick() {
  const msgs = ["Bawk bawk! 🐔", "Cluck cluck!", "Kukdi here! 🐔", "Baaawk! Play chess!"];
  setChickenMsg(msgs[Math.floor(Math.random() * msgs.length)]);
  exciteChicken('move');
}

// ===================== WIN =====================
function showWin(winner) {
  const p1 = document.getElementById('p1name').textContent;
  const p2 = document.getElementById('p2name').textContent;
  const wName = winner === 'White' ? p1 : p2;
  const banner = document.createElement('div');
  banner.className = 'win-banner';
  banner.innerHTML = `
<div style="font-size:44px;margin-bottom:8px;">${rMsg('checkmate')}</div>
<h2>${wName} Wins! 🏆</h2>
<p>Congratulations! Well played!</p>
<button onclick="this.parentElement.remove();openNameModal()">Play Again</button>
`;
  document.body.appendChild(banner);
  if (winner === 'White') document.getElementById('res-won').textContent = parseInt(document.getElementById('res-won').textContent) + 1;
  else document.getElementById('res-lost').textContent = parseInt(document.getElementById('res-lost').textContent) + 1;


}



// ===================== SIDEBAR =====================
document.querySelectorAll('.sb-item').forEach(el => {
  el.addEventListener('click', () => {
    document.querySelectorAll('.sb-item').forEach(s => s.classList.remove('active'));
    el.classList.add('active');
  });
});
document.querySelectorAll('.mtab').forEach(t => {
  t.addEventListener('click', () => {
    document.querySelectorAll('.mtab').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
  });
});

// ===================== INIT =====================
initBoard();
renderBoard();
showTab('play');
openNameModal();



// Set player ID on load
window.addEventListener('load', () => {
  myId = localStorage.getItem('chess_club_id') || ('user_' + Math.random().toString(36).substr(2, 9));
  localStorage.setItem('chess_club_id', myId);
});

// Cleanup old rooms periodically
window.addEventListener('beforeunload', () => {
  // if (myId) fbUpdate(`presence/${myId}`, { status: 'offline' });
});
