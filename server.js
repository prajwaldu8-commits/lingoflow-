/**
 * LingoFlow — Real-time English learning server
 * - Serves the SPA (public/)
 * - Generates fresh questions on demand (/api/question) — endless content
 * - Real-time layer (Socket.io): live feed of completions, online counter,
 *   live leaderboard, anonymous learner names
 */
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const bank = require('./data/bank');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Health check — used by Render / uptime monitors
app.get('/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

// App version — the client compares this to force-refresh stale cached versions
const APP_VERSION = '5';
app.get('/api/version', (req, res) => res.json({ v: APP_VERSION }));

/* ---------------------------- REST API ---------------------------- */

// Fresh question for a mode. `seen` = comma-separated question ids already
// shown this session, so a finished question is always replaced by a new one.
// `due` = ids due for spaced repetition; those get priority (adaptive review).
// `level` = CEFR level (A1..C2) — content is filtered to the learner's level.
app.get('/api/question', (req, res) => {
  const mode = req.query.mode || 'vocab';
  const level = String(req.query.level || '').toUpperCase();
  const seen = String(req.query.seen || '').split(',').filter(Boolean);
  const seenSet = new Set(seen);

  const due = String(req.query.due || '').split(',').filter(Boolean);
  if (due.length) {
    // review queue first: regenerate the exact missed question
    for (const id of shuffle(due)) {
      if (seenSet.has(id)) continue;
      const q = bank.genById(id);
      if (q) return res.json({ ok: true, question: q, fromDue: true });
    }
  }
  const q = bank.genQuestion(mode, seen, level);
  res.json(q ? { ok: true, question: q } : { ok: false });
});

// Placement test: 10 questions spanning A1–C1, each tagged with a CEFR level
app.get('/api/placement', (req, res) => {
  res.json({ ok: true, questions: bank.genPlacement(String(req.query.seed || '')) });
});

// Word details for the vocabulary system / flashcards
app.get('/api/wordinfo', (req, res) => {
  const w = bank.vocabulary.find(x => x.word === String(req.query.w || ''));
  if (!w) return res.json({ ok: false });
  res.json({ ok: true, word: w.word, def: w.def, syn: w.syn, ant: w.ant, ex: w.ex, lvl: bank.wordLevel(w) });
});

// A similar question drilling the same skill (for "try another one")
app.get('/api/similar', (req, res) => {
  const id = String(req.query.id || '');
  const seen = String(req.query.seen || '').split(',').filter(Boolean);
  const q = id ? bank.genSimilar(id, seen) : null;
  res.json(q ? { ok: true, question: q } : { ok: false });
});

// Daily challenge: deterministic 10 questions, same for everyone, per UTC date
const dailyScores = new Map(); // dateKey -> [{name, score, total, timeMs, ts}]
app.get('/api/daily', (req, res) => {
  const dateKey = new Date().toISOString().slice(0, 10);
  res.json({
    ok: true,
    date: dateKey,
    durationSec: 300,
    questions: bank.genDaily(dateKey)
  });
});
app.post('/api/daily/score', (req, res) => {
  const dateKey = new Date().toISOString().slice(0, 10);
  const { score = 0, total = 0, timeMs = 0, name = 'Anonymous' } = req.body || {};
  const list = dailyScores.get(dateKey) || [];
  list.push({ name: String(name).slice(0, 30), score: Number(score) || 0, total: Number(total) || 0, timeMs: Number(timeMs) || 0, ts: Date.now() });
  if (list.length > 500) list.shift();
  dailyScores.set(dateKey, list);
  // rank: higher score first, then faster time
  const sorted = [...list].sort((a, b) => (b.score - a.score) || (a.timeMs - b.timeMs));
  const rank = sorted.findIndex(x => x.ts === list[list.length - 1].ts) + 1;
  res.json({ ok: true, rank, total: list.length, date: dateKey });
});

// Word of the day (stable per calendar day)
app.get('/api/wotd', (req, res) => {
  const day = Math.floor(Date.now() / 86400000);
  const w = bank.vocabulary[day % bank.vocabulary.length];
  res.json({ word: w.word, def: w.def, ex: w.ex, date: new Date().toDateString() });
});

/* ------------------------- Live learner state ------------------------- */

const learners = new Map();          // socket.id -> learner
const feedHistory = [];              // last N completions, sent to newcomers

const NAME_A = ['Swift', 'Bright', 'Brave', 'Clever', 'Sunny', 'Bold', 'Quick', 'Wise', 'Lucky', 'Mighty', 'Gentle', 'Eager'];
const NAME_B = ['Learner', 'Explorer', 'Scholar', 'Polyglot', 'Reader', 'Thinker', 'Wanderer', 'Writer', 'Dreamer', 'Listener'];

function makeName() {
  const a = NAME_A[Math.floor(Math.random() * NAME_A.length)];
  const b = NAME_B[Math.floor(Math.random() * NAME_B.length)];
  return `${a} ${b} ${Math.floor(100 + Math.random() * 900)}`;
}

function leaderboard() {
  return [...learners.values()]
    .sort((x, y) => y.xp - x.xp)
    .slice(0, 10)
    .map(l => ({ name: l.name, xp: l.xp, sets: l.sets }));
}

io.on('connection', (socket) => {
  const learner = { name: makeName(), xp: 0, sets: 0, correct: 0, total: 0 };
  learners.set(socket.id, learner);

  io.emit('online', learners.size);                       // broadcast live count
  socket.emit('hello', { name: learner.name });           // tell the new user their live name
  socket.emit('feed-history', feedHistory.slice(-12));    // catch-up on recent activity
  socket.emit('board', leaderboard());

  // A learner finished a set -> push it live to EVERYONE right now
  socket.on('set-complete', (data) => {
    const { mode, score, total, xp } = data || {};
    learner.xp += Number(xp) || 0;
    learner.sets += 1;
    learner.correct += Number(score) || 0;
    learner.total += Number(total) || 0;

    const item = { name: learner.name, mode, score, total, xp: Number(xp) || 0, ts: Date.now() };
    feedHistory.push(item);
    if (feedHistory.length > 30) feedHistory.shift();

    io.emit('feed', item);          // real-time feed update for everyone
    io.emit('board', leaderboard()); // real-time leaderboard update
  });

  socket.on('disconnect', () => {
    learners.delete(socket.id);
    io.emit('online', learners.size);
    io.emit('board', leaderboard());
  });
});

/* ------------------------------- Run ------------------------------- */

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`LingoFlow running on http://0.0.0.0:${PORT}`);
});
