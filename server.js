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

// Health check — used by Render / uptime monitors
app.get('/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

/* ---------------------------- REST API ---------------------------- */

// Fresh question for a mode. `seen` = comma-separated question ids already
// shown this session, so a finished question is always replaced by a new one.
app.get('/api/question', (req, res) => {
  const mode = req.query.mode || 'vocab';
  const seen = String(req.query.seen || '').split(',').filter(Boolean);
  const q = bank.genQuestion(mode, seen);
  res.json(q ? { ok: true, question: q } : { ok: false });
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
