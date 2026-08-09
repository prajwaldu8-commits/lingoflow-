/* ============ LingoFlow client v3 — zero-to-advanced platform ============ */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const MODES = {
    vocab:   { label: '📚 Vocabulary',      setLen: 5 },
    grammar: { label: '🧩 Grammar',         setLen: 5 },
    idiom:   { label: '🗣️ Idioms & Phrases', setLen: 5 },
    builder: { label: '🧱 Sentence Builder', setLen: 3 },
    reading: { label: '📖 Reading',         setLen: 3 },
    daily:   { label: '🔥 Daily Challenge',  setLen: 10 },
    review:  { label: '🔁 Review',           setLen: 5 },
    coach:   { label: '🤖 AI Coach',         setLen: 6 }
  };
  const MODE_OF = { v: 'vocab', g: 'grammar', c: 'grammar', i: 'idiom', r: 'reading', b: 'builder' };
  const LVLS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const LVL_INFO = {
    A1: { t: 'A1 · Beginner', d: 'You can use simple phrases and basic sentences.' },
    A2: { t: 'A2 · Elementary', d: 'You handle everyday situations with simple English.' },
    B1: { t: 'B1 · Intermediate', d: 'You manage travel, work and familiar topics well.' },
    B2: { t: 'B2 · Upper Intermediate', d: 'You can discuss complex topics with confidence.' },
    C1: { t: 'C1 · Advanced', d: 'You express ideas fluently and precisely.' },
    C2: { t: 'C2 · Mastery', d: 'Near-native command of the language.' }
  };

  /* ---------- live socket ---------- */
  const socket = io();
  let liveName = 'Anonymous Learner';
  const AVATAR_COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6'];
  const colorOf = s => AVATAR_COLORS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
  const initial = s => s.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  socket.on('hello', ({ name }) => { liveName = name; $('you').textContent = '👤 ' + name; });
  socket.on('online', n => { $('online-num').textContent = n; });
  socket.on('feed', item => prependFeed(item, false));
  socket.on('feed-history', items => { $('feed').innerHTML = ''; (items || []).forEach(it => prependFeed(it, true)); });
  socket.on('board', rows => { renderBoard($('board-list'), rows); renderBoard($('board-inline'), rows); });

  /* ================= persistent store (localStorage) ================= */
  const LS_KEY = 'lingoflow_v3';
  const DAY = 86400000;
  function todayKey() {
    const d = new Date();
    return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }
  function defaultStore() {
    return {
      v: 3,
      profile: {},
      words: {},
      level: null,
      placement: null,
      stats: {
        xp: 0, total: 0, correct: 0, perMode: {}, dayXP: {}, dayQ: {}, dayAcc: {},
        streakLast: null, streakCur: 0, streakBest: 0,
        timeSec: 0, perfectSets: 0, reviewMastered: 0,
        dailyDone: null, badges: {}, missions: {}, speakDone: 0, lastSetAcc: null,
        chats: 0, coachSessions: 0
      }
    };
  }
  let store = loadStore();
  function loadStore() {
    try {
      const raw = JSON.parse(localStorage.getItem(LS_KEY));
      if (raw && raw.v === 3) return Object.assign(defaultStore(), raw);
    } catch (e) { /* ignore */ }
    return defaultStore();
  }
  function saveStore() { try { localStorage.setItem(LS_KEY, JSON.stringify(store)); } catch (e) { /* ignore */ } }

  function modeOf(id) { return MODE_OF[id.slice(0, 1)] || 'grammar'; }
  function modeStats(m) {
    if (!store.stats.perMode[m]) store.stats.perMode[m] = { t: 0, c: 0 };
    return store.stats.perMode[m];
  }

  /* spaced repetition */
  function recordProfile(id, ok) {
    const p = store.profile[id] || { c: 0, w: 0, stage: 0, due: null, mastered: false };
    if (ok) {
      p.c++;
      if (p.stage >= 1) {
        if (p.stage === 1) { p.stage = 2; p.due = Date.now() + 3 * DAY; }
        else if (p.stage === 2) { p.stage = 3; p.due = Date.now() + 7 * DAY; }
        else if (p.stage === 3) { p.stage = 4; p.due = null; p.mastered = true; store.stats.reviewMastered++; }
      }
    } else {
      p.w++;
      p.stage = Math.max(p.stage, 1);
      p.due = Date.now() + DAY;
      p.mastered = false;
    }
    store.profile[id] = p;
  }
  function dueIds(mode) {
    const out = [];
    for (const [id, p] of Object.entries(store.profile)) {
      if (p.mastered || !p.due || p.due > Date.now()) continue;
      if (p.stage < 1 || p.stage > 3) continue;
      if (mode && modeOf(id) !== mode) continue;
      out.push(id);
    }
    return out;
  }

  /* vocabulary collection */
  function recordWord(id, ok) {
    if (!id.startsWith('v:')) return;
    const w = id.split(':')[1];
    if (!w) return;
    const e = store.words[w] || { c: 0, w: 0 };
    if (ok) e.c++; else e.w++;
    store.words[w] = e;
  }

  /* ---------- achievements ---------- */
  const BADGES = [
    { id: 'first10', e: '🎓', n: 'First Steps', d: 'Answer 10 questions', c: s => s.total >= 10 },
    { id: 'q100', e: '⚡', n: 'Century', d: 'Answer 100 questions', c: s => s.total >= 100 },
    { id: 'q500', e: '🚀', n: 'Marathoner', d: 'Answer 500 questions', c: s => s.total >= 500 },
    { id: 'xp1000', e: '🌟', n: 'Star Learner', d: 'Earn 1,000 XP', c: s => s.xp >= 1000 },
    { id: 'xp5000', e: '👑', n: 'English King', d: 'Earn 5,000 XP', c: s => s.xp >= 5000 },
    { id: 'streak3', e: '🔥', n: 'On Fire', d: '3-day streak', c: s => s.streakBest >= 3 },
    { id: 'streak7', e: '🌋', n: 'Unstoppable', d: '7-day streak', c: s => s.streakBest >= 7 },
    { id: 'perfect', e: '💯', n: 'Perfect Set', d: 'Finish a set at 100%', c: s => s.perfectSets >= 1 },
    { id: 'vocab50', e: '📚', n: 'Vocabulary Master', d: '50 vocab questions', c: s => (s.perMode.vocab || {}).t >= 50 },
    { id: 'grammar50', e: '🧩', n: 'Grammar Warrior', d: '50 grammar questions', c: s => (s.perMode.grammar || {}).t >= 50 },
    { id: 'idiom25', e: '🗣️', n: 'Idiom Expert', d: '25 idiom questions', c: s => (s.perMode.idiom || {}).t >= 25 },
    { id: 'builder25', e: '🧱', n: 'Sentence Architect', d: '25 builder questions', c: s => (s.perMode.builder || {}).t >= 25 },
    { id: 'reading25', e: '📖', n: 'Reading Pro', d: '25 reading questions', c: s => (s.perMode.reading || {}).t >= 25 },
    { id: 'review5', e: '🧠', n: 'Comeback Kid', d: 'Master 5 reviewed questions', c: s => s.reviewMastered >= 5 },
    { id: 'daily1', e: '🌍', n: 'Daily Player', d: 'Complete a Daily Challenge', c: s => !!s.dailyDone },
    { id: 'speak10', e: '🎙️', n: 'Voice Starter', d: '10 speaking/listening exercises', c: s => s.speakDone >= 10 },
    { id: 'word25', e: '🗃️', n: 'Word Collector', d: '25 words in your collection', c: () => Object.keys(store.words).length >= 25 },
    { id: 'placed', e: '🧭', n: 'Placed', d: 'Complete the placement test', c: () => !!store.placement },
    { id: 'chat1', e: '💬', n: 'Chatter', d: 'Have your first AI chat', c: () => store.stats.chats >= 1 },
    { id: 'coach1', e: '🤖', n: 'Coach Session', d: 'Complete an AI Coach session', c: () => store.stats.coachSessions >= 1 }
  ];
  function checkBadges() {
    const s = store.stats;
    for (const b of BADGES) {
      if (!s.badges[b.id] && b.c(s)) {
        s.badges[b.id] = true;
        toast(`🏅 Badge unlocked: ${b.n}!`);
      }
    }
  }

  /* ---------- level & missions ---------- */
  function xpLevel(xp) { return Math.floor(Math.sqrt(xp / 150)) + 1; }
  function xpLevelBounds(l) { return { lo: 150 * (l - 1) * (l - 1), hi: 150 * l * l }; }

  const MISSIONS = [
    { id: 'm1', e: '🎯', n: 'Active Learner', d: 'Answer 15 questions today', xp: 20, check: () => (store.stats.dayQ[todayKey()] || 0) >= 15 },
    { id: 'm2', e: '💯', n: 'Sharpshooter', d: 'Finish a set with 80%+ accuracy', xp: 20, check: () => { const a = store.stats.lastSetAcc; return a && a.total >= 3 && a.acc >= 0.8; } },
    { id: 'm3', e: '🎙️', n: 'Voice Practice', d: 'Do 1 listening or speaking exercise', xp: 20, check: () => store.stats.speakDone > 0 }
  ];
  function checkMissions() {
    const tk = todayKey();
    if (store.stats.missions.day !== tk) store.stats.missions = { day: tk };
    const m = store.stats.missions;
    for (const mm of MISSIONS) {
      if (!m[mm.id] && mm.check()) {
        m[mm.id] = true;
        store.stats.xp += mm.xp;
        toast(`🎯 Mission complete: ${mm.n} (+${mm.xp} XP)`);
      }
    }
  }

  /* ---------- state ---------- */
  const state = {
    mode: null, setLen: 5, seen: new Set(), answered: 0, correct: 0,
    current: null, feedback: null, chosen: [], recent: [], refreshRetried: false,
    t0: Date.now(), dailyQs: null, dailyIdx: 0, timer: null, timerLeft: 300,
    routine: null, placement: null, plIdx: 0, plCorrect: 0
  };
  const qEl = $('question');

  /* ---------- tabs ---------- */
  function switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.querySelectorAll('.bnav').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    $('view-' + tab).classList.add('active');
    if (tab === 'dash') renderDash();
    if (tab === 'profile') renderProfile();
    if (tab === 'live') { $('btn-feed').classList.add('active'); $('btn-board2').classList.remove('active'); }
  }
  document.querySelectorAll('.tab, .bnav').forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));
  $('btn-feed').addEventListener('click', () => { $('feed').classList.remove('hidden'); $('board-inline').classList.add('hidden'); $('btn-feed').classList.add('active'); $('btn-board2').classList.remove('active'); });
  $('btn-board2').addEventListener('click', () => { $('feed').classList.add('hidden'); $('board-inline').classList.remove('hidden'); $('btn-board2').classList.add('active'); $('btn-feed').classList.remove('active'); });

  /* ---------- modes ---------- */
  document.querySelectorAll('.mode-card').forEach(c => c.addEventListener('click', () => startGame(c.dataset.mode)));

  function startGame(mode) {
    state.mode = mode;
    state.setLen = MODES[mode] ? MODES[mode].setLen : 1;
    state.answered = 0; state.correct = 0;
    state.feedback = null; state.chosen = []; state.current = null; state.refreshRetried = false;
    if (mode === 'coach') return startCoach();
    if (mode === 'routine') return startRoutine();
    $('mode-grid').classList.add('hidden');
    $('game').classList.remove('hidden');
    $('game-mode-label').textContent = (MODES[mode] || {}).label || mode;
    updateProgress();
    const timer = $('game-timer');
    if (mode === 'daily') { timer.classList.remove('hidden'); loadDaily(); }
    else { timer.classList.add('hidden'); nextQuestion(); }
  }
  $('btn-exit').addEventListener('click', () => {
    stopTimer();
    $('game').classList.add('hidden');
    $('mode-grid').classList.remove('hidden');
    state.current = null; state.dailyQs = null; state.routine = null;
  });
  $('btn-next').addEventListener('click', nextQuestion);
  $('btn-similar').addEventListener('click', tryAnother);
  $('btn-review').addEventListener('click', () => startGame('review'));

  function updateProgress() {
    const pct = state.setLen ? Math.round((state.answered / state.setLen) * 100) : 0;
    $('progress-bar').style.width = pct + '%';
  }

  /* ---------- daily plan routine ---------- */
  const ROUTINE = [
    { mode: 'vocab', n: 5, label: 'Vocabulary · 5 min' },
    { mode: 'grammar', n: 3, label: 'Grammar · 3 min' },
    { type: 'listen', n: 1, label: 'Listening · 3 min' },
    { type: 'speak', n: 1, label: 'Speaking · 2 min' },
    { type: 'review', n: 2, label: 'Review · 2 min' }
  ];
  function startRoutine() {
    state.routine = { stage: 0 };
    routineStage(0);
  }
  function routineStage(i) {
    const st = ROUTINE[i];
    state.routine.stage = i;
    if (st.type === 'listen' || st.type === 'speak') {
      $('game').classList.add('hidden');
      $('mode-grid').classList.add('hidden');
      switchTab('speak');
      if (st.type === 'listen') openListen(true);
      else openSpeak(true);
      return;
    }
    if (st.type === 'review') {
      const due = dueIds(null);
      if (!due.length) return routineNext();
      startGame('review');
      $('game-mode-label').textContent = '🔁 Review · 2 min';
      return;
    }
    startGame(st.mode);
    $('game-mode-label').textContent = '🎯 Daily Plan — ' + st.label;
    state.routineSetLen = st.n;
    state.setLen = st.n;
    updateProgress();
  }
  function routineNext() {
    if (!state.routine) return;
    const next = state.routine.stage + 1;
    if (next >= ROUTINE.length) {
      toast('🎉 Daily plan complete! See you tomorrow.');
      state.routine = null;
      $('game').classList.add('hidden');
      $('mode-grid').classList.remove('hidden');
      switchTab('profile');
      return;
    }
    routineStage(next);
  }
  window.routineNext = routineNext;

  /* ---------- fetching questions (adaptive + level-aware) ---------- */
  async function nextQuestion() {
    state.feedback = null; state.chosen = [];
    $('feedback').classList.add('hidden');
    $('feedback').classList.remove('good', 'bad');
    $('btn-similar').classList.add('hidden');
    qEl.innerHTML = '<div class="empty">Loading a fresh question…</div>';
    state.t0 = Date.now();

    const seenStr = [...state.seen].join(',');
    const mode = (state.mode === 'review' || state.mode === 'coach') ? 'grammar' : state.mode;
    const lvl = store.level || 'B1';
    const due = (state.mode === 'review' ? dueIds(null) : dueIds(mode)).slice(0, 6).join(',');
    try {
      const res = await fetch(`/api/question?mode=${mode}&level=${lvl}&seen=${encodeURIComponent(seenStr)}&due=${encodeURIComponent(due)}`);
      const data = await res.json();
      if (!data.ok) {
        if (state.refreshRetried) { qEl.innerHTML = '<div class="empty">Something went wrong — <button class="btn ghost" onclick="location.reload()">reload</button></div>'; return; }
        state.refreshRetried = true; state.seen.clear();
        toast('Round complete — library refreshed 🌱');
        return nextQuestion();
      }
      state.refreshRetried = false;
      state.current = data.question;
      state.seen.add(data.question.id);
      renderQuestion(data.question);
    } catch (e) {
      qEl.innerHTML = '<div class="empty">Network hiccup — check your connection and reload.</div>';
    }
  }

  async function tryAnother() {
    const q = state.current;
    if (!q) return;
    $('feedback').classList.add('hidden');
    qEl.innerHTML = '<div class="empty">Loading a similar question…</div>';
    try {
      const res = await fetch(`/api/similar?id=${encodeURIComponent(q.id)}&seen=${encodeURIComponent([...state.seen].join(','))}`);
      const data = await res.json();
      if (!data.ok) return nextQuestion();
      state.current = data.question;
      state.seen.add(data.question.id);
      state.t0 = Date.now();
      renderQuestion(data.question);
    } catch (e) { nextQuestion(); }
  }

  /* ---------- daily challenge ---------- */
  async function loadDaily() {
    qEl.innerHTML = '<div class="empty">Loading today\'s challenge…</div>';
    try {
      const res = await fetch('/api/daily');
      const data = await res.json();
      state.dailyQs = data.questions; state.dailyIdx = 0;
      state.timerLeft = data.durationSec || 300;
      startTimer();
      renderDailyQ();
    } catch (e) { qEl.innerHTML = '<div class="empty">Could not load the challenge — check connection.</div>'; }
  }
  function startTimer() {
    stopTimer();
    const el = $('game-timer');
    const tick = () => {
      state.timerLeft--;
      if (state.timerLeft <= 0) { finishDaily(); return; }
      const m = Math.floor(state.timerLeft / 60), s = state.timerLeft % 60;
      el.textContent = `⏱ ${m}:${String(s).padStart(2, '0')}`;
      el.classList.toggle('urgent', state.timerLeft < 60);
    };
    tick();
    state.timer = setInterval(tick, 1000);
  }
  function stopTimer() { if (state.timer) { clearInterval(state.timer); state.timer = null; } }
  function renderDailyQ() {
    const q = state.dailyQs[state.dailyIdx];
    state.current = q; state.seen.add(q.id);
    renderQuestion(q);
  }
  async function finishDaily() {
    stopTimer();
    $('game-timer').classList.add('hidden');
    const score = state.correct;
    const used = 300 - state.timerLeft;
    let rank = null, total = null;
    try {
      const res = await fetch('/api/daily/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ score, total: state.dailyQs.length, timeMs: used * 1000, name: liveName }) });
      const d = await res.json();
      rank = d.rank; total = d.total;
    } catch (e) { /* offline */ }
    store.stats.dailyDone = todayKey();
    saveStore(); checkBadges();
    $('feedback').classList.add('hidden');
    qEl.innerHTML = `
      <div class="challenge-result">
        <div class="cr-rank">${rank ? '#' + rank : '—'}</div>
        <div class="cr-score">${score}/${state.dailyQs.length} correct ${rank ? '· ' + total + ' players today' : ''}</div>
        <div class="cr-sub">${rank && rank <= 3 ? '🏆 Podium finish!' : rank && rank <= 10 ? '🌟 Top 10!' : rank ? 'Nice work — come back tomorrow to climb!' : 'Offline — saved locally.'}</div>
        <button class="btn primary" id="btn-daily-done">See profile →</button>
      </div>`;
    $('btn-daily-done').addEventListener('click', () => switchTab('profile'));
    toast(`Daily Challenge: ${score}/${state.dailyQs.length} · rank #${rank || '—'}`);
  }

  /* ---------- placement test ---------- */
  const plModal = $('placement-modal');
  $('btn-pl-start').addEventListener('click', async () => {
    $('pl-intro').classList.add('hidden');
    $('pl-q').classList.remove('hidden');
    $('pl-result').classList.add('hidden');
    try {
      const res = await fetch('/api/placement');
      const data = await res.json();
      state.placement = data.questions;
      state.plIdx = 0; state.plCorrect = 0;
      renderPlacementQ();
    } catch (e) {
      toast('Could not load the placement test — check connection.');
      plModal.classList.add('hidden');
    }
  });
  $('btn-pl-skip').addEventListener('click', () => { plModal.classList.add('hidden'); if (!store.level) { store.level = 'B1'; saveStore(); } });
  $('btn-placement').addEventListener('click', () => plModal.classList.remove('hidden'));

  function renderPlacementQ() {
    const q = state.placement[state.plIdx];
    const wrap = $('pl-q');
    wrap.innerHTML = `<div class="q-top"><span class="q-type">Placement · ${q.lvl}</span><span class="q-points">${state.plIdx + 1}/${state.placement.length}</span></div>
      <div class="q-prompt">${escapeHtml(q.prompt)}</div>
      <div class="q-options" id="pl-options"></div>`;
    const opts = wrap.querySelector('#pl-options');
    if (q.type === 'builder') {
      const words = [...q.chunks];
      opts.innerHTML = words.map((w, i) => `<button class="opt" data-i="${i}"><span class="letter">${i + 1}</span><span>${escapeHtml(w)}</span></button>`).join('');
      // simple ordered-tap builder for placement
      const chosen = [];
      opts.addEventListener('click', e => {
        const b = e.target.closest('.opt');
        if (!b) return;
        chosen.push(words[+b.dataset.i]);
        b.classList.add('correct');
        b.disabled = true;
        if (chosen.length === words.length) {
          setTimeout(() => plAnswer(chosen.join(' ') === q.answer.join(' ')), 400);
        }
      });
    } else {
      q.options.forEach((opt, i) => {
        const b = document.createElement('button');
        b.className = 'opt';
        b.innerHTML = `<span class="letter">${'ABCD'[i]}</span><span>${escapeHtml(opt)}</span>`;
        b.addEventListener('click', () => {
          [...opts.children].forEach(x => x.disabled = true);
          b.classList.add(i === q.answer ? 'correct' : 'wrong');
          if (i !== q.answer) opts.children[q.answer].classList.add('correct');
          setTimeout(() => plAnswer(i === q.answer), 400);
        });
        opts.appendChild(b);
      });
    }
  }
  function plAnswer(ok) {
    if (ok) state.plCorrect++;
    state.plIdx++;
    if (state.plIdx >= state.placement.length) return finishPlacement();
    renderPlacementQ();
  }
  function finishPlacement() {
    // level = highest band with >=50% correct in that band's questions
    const bands = {};
    state.placement.forEach(q => { (bands[q.lvl] = bands[q.lvl] || { t: 0, c: 0 }); });
    // we don't track per-question correctness bands in this simple pass — compute via order
    // simpler robust approach: 0-3 correct -> A1, 4-5 -> A2, 6-7 -> B1, 8-9 -> B2, 10 -> C1
    const sc = state.plCorrect;
    const lvl = sc <= 3 ? 'A1' : sc <= 5 ? 'A2' : sc <= 7 ? 'B1' : sc <= 9 ? 'B2' : 'C1';
    store.level = lvl;
    store.placement = { level: lvl, score: sc, total: state.placement.length, date: todayKey() };
    saveStore(); checkBadges();
    $('pl-q').classList.add('hidden');
    const r = $('pl-result');
    r.classList.remove('hidden');
    const idx = LVLS.indexOf(lvl);
    const next = idx < LVLS.length - 1 ? LVLS[idx + 1] : null;
    r.innerHTML = `
      <div class="pl-emoji">🧭</div>
      <h2>Your level: ${lvl} — ${LVL_INFO[lvl].t}</h2>
      <p>${LVL_INFO[lvl].d}<br><b>${sc}/${state.placement.length} correct</b> · Recommended path: <b>${lvl}${next ? ' → ' + next : ' (top level!)'}</b></p>
      <div class="fb-actions">
        <button class="btn primary" id="btn-pl-done">Start learning at ${lvl} 🚀</button>
      </div>`;
    $('btn-pl-done').addEventListener('click', () => {
      plModal.classList.add('hidden');
      renderProfile();
      toast(`Welcome! Level ${lvl} — lessons will match your level.`);
    });
  }

  /* ---------- render question ---------- */
  function renderQuestion(q) {
    qEl.innerHTML = '';
    const tpl = $('tpl-question').content.cloneNode(true);
    tpl.querySelector('#q-type').textContent = MODES[q.mode].label.replace(/^\S+\s/, '');
    tpl.querySelector('#q-points').textContent = '+' + q.points + ' XP';
    const passage = tpl.querySelector('#q-passage');
    if (q.passage) {
      passage.classList.remove('hidden');
      passage.innerHTML = `<div class="p-title">📖 ${escapeHtml(q.passage.title)}</div>${escapeHtml(q.passage.text)}`;
    }
    tpl.querySelector('#q-prompt').textContent = q.prompt;
    const opts = tpl.querySelector('#q-options');
    if (q.type === 'builder') {
      opts.innerHTML = `
        <div class="chips" id="chip-area"></div>
        <div class="builder-actions">
          <button class="btn ghost" id="btn-undo">↩ Undo</button>
          <button class="btn ghost" id="btn-reset">⟲ Reset</button>
          <button class="btn primary" id="btn-check" disabled>Check ✓</button>
        </div>`;
      buildChips(q);
    } else {
      q.options.forEach((opt, i) => {
        const b = document.createElement('button');
        b.className = 'opt';
        b.innerHTML = `<span class="letter">${'ABCD'[i]}</span><span>${escapeHtml(opt)}</span>`;
        b.addEventListener('click', () => answer(i));
        opts.appendChild(b);
      });
    }
    qEl.appendChild(tpl);
  }

  function buildChips(q) {
    const area = $('chip-area');
    const bank = q.chunks.map((w, i) => ({ w, i, used: false }));
    const render = () => {
      area.innerHTML = '';
      const chosenEls = document.createElement('div');
      chosenEls.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px;width:100%';
      state.chosen.forEach((c, ci) => {
        const chip = document.createElement('button');
        chip.className = 'chip';
        chip.style.background = 'linear-gradient(135deg,#10b981,#059669)';
        chip.textContent = c.w;
        chip.addEventListener('click', () => { state.chosen.splice(ci, 1); markUsed(c.i, false); render(); });
        chosenEls.appendChild(chip);
      });
      area.appendChild(chosenEls);
      const restEls = document.createElement('div');
      restEls.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px';
      bank.filter(x => !x.used).forEach(x => {
        const chip = document.createElement('button');
        chip.className = 'chip';
        chip.textContent = x.w;
        chip.addEventListener('click', () => { state.chosen.push(x); markUsed(x.i, true); render(); });
        restEls.appendChild(chip);
      });
      area.appendChild(restEls);
      $('btn-check').disabled = state.chosen.length === 0;
    };
    const markUsed = (i, v) => { bank[i].used = v; };
    $('btn-undo').onclick = () => { if (state.chosen.length) { markUsed(state.chosen.pop().i, false); render(); } };
    $('btn-reset').onclick = () => { state.chosen.forEach(c => markUsed(c.i, false)); state.chosen = []; render(); };
    $('btn-check').onclick = () => answerBuilder(q);
    render();
  }

  /* ---------- answering ---------- */
  function answer(i) {
    const q = state.current;
    if (!q || state.feedback) return;
    const correct = i === q.answer;
    const buttons = [...qEl.querySelectorAll('.opt')];
    buttons.forEach((b, bi) => {
      b.disabled = true;
      if (bi === q.answer) b.classList.add('correct');
      else if (bi === i && !correct) b.classList.add('wrong');
    });
    const yours = buttons[i] ? buttons[i].textContent.trim().replace(/^[A-D]/, '').trim() : '';
    const right = buttons[q.answer] ? buttons[q.answer].textContent.trim().replace(/^[A-D]/, '').trim() : '';
    record(correct, q, yours, right);
  }
  function answerBuilder(q) {
    if (state.feedback) return;
    const got = state.chosen.map(c => c.w);
    const correct = got.join(' ') === q.answer.join(' ');
    if (correct) { $('chip-area').style.borderColor = 'var(--good)'; $('chip-area').style.background = '#f0fdf4'; }
    else {
      $('chip-area').style.borderColor = 'var(--bad)'; $('chip-area').style.background = '#fef2f2';
      $('chip-area').insertAdjacentHTML('beforeend', `<div style="width:100%;font-size:14px;font-weight:700;color:var(--good);margin-top:4px">✅ ${escapeHtml(q.answer.join(' '))}</div>`);
    }
    [...document.querySelectorAll('.chip')].forEach(c => c.disabled = true);
    $('btn-check').disabled = true; $('btn-undo').disabled = true; $('btn-reset').disabled = true;
    record(correct, q, got.join(' '), q.answer.join(' '));
  }

  function record(correct, q, yoursText, rightText) {
    state.feedback = { correct, q };
    state.answered++;
    const st = store.stats;
    if (correct) { state.correct++; st.correct++; st.xp += q.points; }
    st.total++;
    const pm = modeStats(q.mode);
    pm.t++; if (correct) pm.c++;

    const tk = todayKey();
    if (st.streakLast !== tk) {
      const y = new Date(Date.now() - DAY).toISOString().slice(0, 10);
      st.streakCur = st.streakLast === y ? st.streakCur + 1 : 1;
      st.streakLast = tk;
      st.streakBest = Math.max(st.streakBest, st.streakCur);
    }
    st.dayXP[tk] = (st.dayXP[tk] || 0) + (correct ? q.points : 0);
    st.dayQ[tk] = (st.dayQ[tk] || 0) + 1;
    const da = st.dayAcc[tk] = st.dayAcc[tk] || { c: 0, t: 0 };
    da.t++; if (correct) da.c++;
    st.timeSec += Math.min(Math.round((Date.now() - state.t0) / 1000), 300);

    recordProfile(q.id, correct);
    recordWord(q.id, correct);
    state.recent.unshift({ ok: correct, mode: q.mode, text: q.prompt.slice(0, 64) + (q.prompt.length > 64 ? '…' : '') });
    if (state.recent.length > 8) state.recent.pop();
    saveStore(); checkBadges(); checkMissions();

    $('score-val').textContent = st.xp;
    updateProgress();

    const fb = $('feedback');
    fb.classList.remove('hidden', 'good', 'bad');
    fb.classList.add(correct ? 'good' : 'bad');
    $('fb-emoji').textContent = correct ? ['🎉', '🌟', '🚀', '🔥', '💪'][Math.min(state.correct, 4)] : '💡';
    $('fb-title').textContent = correct ? (state.correct > 1 ? `Correct! ${state.correct} in a row 🔥` : 'Correct! 🎉') : 'Not quite';
    $('fb-yours').classList.toggle('hidden', correct);
    $('fb-correct').classList.toggle('hidden', correct);
    if (!correct) {
      $('fb-yours').textContent = '❌ You chose: ' + (yoursText || '—');
      $('fb-correct').textContent = '✅ Correct: ' + (rightText || '—');
    }
    $('fb-text').innerHTML = `<b>${correct ? 'Great job!' : 'Why:'}</b> ${escapeHtml(q.explain)}`;
    $('btn-similar').classList.toggle('hidden', correct);
    $('btn-next').textContent = state.answered >= state.setLen ? 'See results →' : 'Next question →';
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (state.mode === 'daily') {
      state.dailyIdx++;
      if (state.dailyIdx >= state.dailyQs.length) finishDaily();
      else setTimeout(renderDailyQ, 650);
    } else if (state.answered >= state.setLen) {
      finishSet();
    }
  }

  /* ---------- set completion ---------- */
  function finishSet() {
    const score = state.correct;
    const total = state.answered;
    const st = store.stats;
    st.lastSetAcc = { acc: total ? score / total : 0, total };
    if (total >= 3 && score === total) { st.perfectSets++; saveStore(); checkBadges(); toast('💯 Perfect set!'); }
    if (state.routine) {
      saveStore(); checkMissions();
      setTimeout(() => { $('game').classList.add('hidden'); routineNext(); }, 700);
      return;
    }
    if (state.mode === 'coach') {
      saveStore(); checkBadges(); checkMissions();
      setTimeout(coachSummary, 800);
      return;
    }
    socket.emit('set-complete', { mode: state.mode === 'review' ? 'grammar' : state.mode, score, total, xp: score * 10 });
    setTimeout(() => {
      switchTab('dash');
      $('game').classList.add('hidden');
      $('mode-grid').classList.remove('hidden');
    }, 900);
  }

  /* ================= SPEAK view ================= */
  const LISTENING = [
    { lvl: 'A1', text: 'The cat is on the table.' },
    { lvl: 'A1', text: 'I like coffee in the morning.' },
    { lvl: 'A1', text: 'She is my best friend.' },
    { lvl: 'A1', text: 'We live near the station.' },
    { lvl: 'A1', text: 'He has two brothers.' },
    { lvl: 'A2', text: 'She goes to work by bus every morning.' },
    { lvl: 'A2', text: 'I visited my grandmother last weekend.' },
    { lvl: 'A2', text: 'Can you help me carry these bags?' },
    { lvl: 'A2', text: 'There is a good restaurant near the park.' },
    { lvl: 'A2', text: 'It was raining when we left home.' },
    { lvl: 'B1', text: 'I have been learning English for two years.' },
    { lvl: 'B1', text: 'The meeting has been postponed until Friday.' },
    { lvl: 'B1', text: 'She asked me where I had bought my phone.' },
    { lvl: 'B1', text: 'We would have arrived earlier if the traffic had been better.' },
    { lvl: 'B1', text: 'He is used to working late at night.' },
    { lvl: 'B2', text: 'Although it was raining heavily, they decided to continue the journey.' },
    { lvl: 'B2', text: 'Not only did she finish the project, but she also presented it.' },
    { lvl: 'B2', text: 'The company whose products we use has expanded overseas.' },
    { lvl: 'B2', text: 'Had I known about the delay, I would have left earlier.' },
    { lvl: 'B2', text: 'It is essential that every member adhere to the guidelines.' }
  ];
  const SPEAKING = [
    { lvl: 'A1', text: 'Hello, my name is Priya.' },
    { lvl: 'A1', text: 'I am from India.' },
    { lvl: 'A1', text: 'I like to read books.' },
    { lvl: 'A2', text: 'I usually wake up at six in the morning.' },
    { lvl: 'A2', text: 'Yesterday I went to the market with my mother.' },
    { lvl: 'A2', text: 'Could you tell me where the railway station is?' },
    { lvl: 'B1', text: 'I have been working in this company for three years.' },
    { lvl: 'B1', text: 'If I had more time, I would learn to play the guitar.' },
    { lvl: 'B1', text: 'She suggested that we meet at the new café near the office.' },
    { lvl: 'B2', text: 'Despite the challenges, the team managed to deliver the project on time.' }
  ];
  const CONVERSATIONS = {
    restaurant: {
      title: '🍽️ At the Restaurant',
      lines: [
        { ai: 'Good evening! Welcome to Spice Garden. How many people are in your party?', opts: [
          { t: 'A table for two, please.', ok: true, fb: '👍 Polite and natural.' },
          { t: 'Give me a table!', ok: false, fb: '💡 Softer: "Could we have a table for two, please?"' },
          { t: 'Two.', ok: true, fb: '👍 Clear, though "A table for two, please" sounds more polite.' }
        ] },
        { ai: 'Of course. Right this way. Here are your menus — can I get you something to drink?', opts: [
          { t: 'Yes, I would like a mango lassi, please.', ok: true, fb: '👍 Perfect: "I would like…, please".' },
          { t: 'Mango lassi.', ok: true, fb: '👍 Fine, but adding "please" is more polite.' },
          { t: 'Give me water fast.', ok: false, fb: '💡 Try: "Could I have some water, please?"' }
        ] },
        { ai: 'Great choice! Are you ready to order, or would you like a few more minutes?', opts: [
          { t: 'We are ready. I will have the paneer curry and a plain naan.', ok: true, fb: '👍 Excellent — "I will have…" is exactly what waiters expect.' },
          { t: 'Paneer curry, naan.', ok: true, fb: '👍 Clear. Adding "I will have" sounds even better.' },
          { t: 'You decide for us.', ok: false, fb: '💡 Try: "What would you recommend?" — very natural in restaurants.' }
        ] },
        { ai: 'Excellent choice! Would you like it spicy or mild?', opts: [
          { t: 'Mild, please. My friend cannot eat very spicy food.', ok: true, fb: '👍 Great — giving a reason sounds natural.' },
          { t: 'Mild.', ok: true, fb: '👍 Simple and clear.' },
          { t: 'I do not know. You choose.', ok: false, fb: '💡 Try: "What do you recommend? I am not sure what to choose."' }
        ] },
        { ai: 'Mild it is. Anything else — some dessert maybe?', opts: [
          { t: 'Yes, what desserts do you have?', ok: true, fb: '👍 Natural question.' },
          { t: 'Dessert?', ok: true, fb: '👍 Short but clear.' },
          { t: 'No. Finish. Bill.', ok: false, fb: '💡 Try: "No, thank you. Could we have the bill, please?"' }
        ] },
        { ai: 'We have gulab jamun and kulfi. The kulfi is our special today.', opts: [
          { t: 'Then we will take two kulfis, please.', ok: true, fb: '👍 Excellent — decisive and polite.' },
          { t: 'Ok kulfi.', ok: true, fb: '👍 Fine; "We will take two kulfis, please" sounds more polished.' }
        ] },
        { ai: 'Wonderful! I will bring that right away. Enjoy your meal!', opts: [] }
      ]
    },
    interview: {
      title: '👔 Job Interview',
      lines: [
        { ai: 'Good morning! Please come in. Thank you for coming today — how are you?', opts: [
          { t: 'I am doing well, thank you. I am happy to be here.', ok: true, fb: '👍 Excellent start — warm and professional.' },
          { t: 'Fine.', ok: true, fb: '👍 Acceptable; adding one more sentence sounds more engaged.' },
          { t: 'Tired, I woke up late.', ok: false, fb: '💡 Keep it positive in interviews: "I am doing well, thank you."' }
        ] },
        { ai: 'Great. So, tell me a little about yourself.', opts: [
          { t: 'I studied computer science and have worked as a developer for three years. I enjoy solving problems.', ok: true, fb: '👍 Perfect structure: education + experience + interest.' },
          { t: 'I am a developer.', ok: true, fb: '👍 Fine, but interviewers want more: add experience and interests.' },
          { t: 'I am from Mysore. I like cricket.', ok: false, fb: '💡 Good small talk, but also mention your work and skills.' }
        ] },
        { ai: 'Interesting! Why do you want to work at this company?', opts: [
          { t: 'I admire your focus on innovation, and I think my skills in cloud computing would help your team.', ok: true, fb: '👍 Excellent — connects your skills to the company.' },
          { t: 'I need a job.', ok: false, fb: '💡 Talk about the company: research it and mention something specific you like.' },
          { t: 'Better salary.', ok: false, fb: '💡 Salary is fine to discuss later, but for this question focus on the company.' }
        ] },
        { ai: 'What would you say is your greatest strength?', opts: [
          { t: 'I am very persistent — I keep working on a problem until it is solved, and I support my teammates.', ok: true, fb: '👍 Great: a strength plus a short example.' },
          { t: 'I am a quick learner.', ok: true, fb: '👍 Good; add an example: "I learned Python in two months for my last project."' },
          { t: 'I am better than everyone else.', ok: false, fb: '💡 Humility + evidence works better: "I am good at X, for example…"' }
        ] },
        { ai: 'Where do you see yourself in five years?', opts: [
          { t: 'I hope to grow into a senior role here while improving my skills in leadership and architecture.', ok: true, fb: '👍 Ambitious but grounded — interviewers love this.' },
          { t: 'Your job.', ok: false, fb: '💡 Too short and cheeky. Show long-term commitment to the field.' },
          { t: 'I do not know.', ok: false, fb: '💡 Try: "I want to keep growing — ideally into a senior technical role."' }
        ] },
        { ai: 'Thank you! We will contact you within a week. Do you have any questions for us?', opts: [
          { t: 'Yes — what does a typical day look like for this role?', ok: true, fb: '👍 Excellent question — shows genuine interest.' },
          { t: 'No, I am fine.', ok: true, fb: '👍 Acceptable, but asking 1–2 questions makes you memorable.' },
          { t: 'What is the salary and leave policy?', ok: false, fb: '💡 Better to ask about the role first; salary talk comes later or with HR.' }
        ] },
        { ai: 'That is a great question! You will work with our product team on customer-facing features. Thanks again — good luck!', opts: [] }
      ]
    },
    travel: {
      title: '✈️ At the Airport',
      lines: [
        { ai: 'Good morning! May I see your passport and ticket, please?', opts: [
          { t: 'Here you are.', ok: true, fb: '👍 Perfect and natural.' },
          { t: 'Yes, take it.', ok: true, fb: '👍 Fine; "Here you are" is the classic phrase.' },
          { t: 'Why do you need it?', ok: false, fb: '💡 It is normal at check-in: just say "Here you are."' }
        ] },
        { ai: 'Thank you. Are you checking in any bags today?', opts: [
          { t: 'Yes, one suitcase, please.', ok: true, fb: '👍 Clear and polite.' },
          { t: 'One bag.', ok: true, fb: '👍 Simple and fine.' },
          { t: 'Maybe. Not sure.', ok: false, fb: '💡 Be clear: "Yes, one suitcase" or "No, just carry-on."' }
        ] },
        { ai: 'Sure. Did you pack the bag yourself?', opts: [
          { t: 'Yes, I packed it myself.', ok: true, fb: '👍 Exactly the expected answer.' },
          { t: 'My mother packed it.', ok: false, fb: '💡 Security expects "Yes, I packed it myself." (truthfully!)' }
        ] },
        { ai: 'Great. Which seat would you prefer — window or aisle?', opts: [
          { t: 'A window seat, please.', ok: true, fb: '👍 Perfect.' },
          { t: 'Window.', ok: true, fb: '👍 Clear; adding "please" is nicer.' }
        ] },
        { ai: 'Window seat 14A. Your flight boards at gate 12 at 2:30. Enjoy your trip!', opts: [
          { t: 'Thank you very much. Have a nice day!', ok: true, fb: '👍 Polite and complete.' },
          { t: 'Thanks.', ok: true, fb: '👍 Fine; a full sentence sounds warmer.' }
        ] },
        { ai: '— Conversation complete! You handled check-in smoothly. ✈️', opts: [] }
      ]
    }
  };

  let listenPool = [], listenIdx = 0, listenMode = 'dict', listenRoutine = false;
  let speakPool = [], speakIdx = 0, speakRoutine = false;

  document.querySelectorAll('.stab').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.stab').forEach(x => x.classList.toggle('active', x === b));
    ['listen', 'speak', 'talk', 'chat'].forEach(k => $('st-' + k).classList.toggle('hidden', k !== b.dataset.st));
    if (b.dataset.st === 'listen') openListen(false);
    if (b.dataset.st === 'speak') openSpeak(false);
  }));

  function pickByLevel(pool, lvl) {
    const L = LVLS.indexOf(lvl);
    const ok = pool.filter(x => {
      const i = LVLS.indexOf(x.lvl);
      return Math.abs(i - L) <= 1;
    });
    return (ok.length ? ok : pool);
  }

  function openListen(routine) {
    listenRoutine = !!routine;
    const lvl = store.level || 'B1';
    $('listen-level').value = lvl;
    listenPool = shuffle(pickByLevel(LISTENING, lvl));
    listenIdx = 0;
    listenMode = $('listen-mode').value;
    nextListen();
  }
  function nextListen() {
    if (listenIdx >= listenPool.length) listenPool = shuffle(listenPool);
    const item = listenPool[listenIdx % listenPool.length];
    $('listen-sentence').textContent = 'Press play and type what you hear.';
    $('listen-result').innerHTML = '';
    $('listen-input').value = '';
    $('listen-input').disabled = false;
    $('btn-listen-check').disabled = true;
    $('listen-input').dataset.text = item.text;
    $('listen-input').dataset.lvl = item.lvl;
    $('listen-input').addEventListener('input', () => { $('btn-listen-check').disabled = !$('listen-input').value.trim(); });
    setTimeout(() => speak(item.text), 350);
  }
  $('btn-play').addEventListener('click', () => {
    const t = $('listen-input').dataset.text;
    if (t) speak(t);
  });
  $('btn-listen-check').addEventListener('click', () => {
    const target = $('listen-input').dataset.text;
    const got = $('listen-input').value.trim().toLowerCase();
    const norm = s => s.toLowerCase().replace(/[^a-z0-9'\s]/g, '').replace(/\s+/g, ' ').trim();
    const tW = norm(target).split(' '), gW = norm(got).split(' ').filter(Boolean);
    if (!gW.length) return;
    const matched = tW.filter(w => gW.includes(w)).length;
    const pct = Math.round((matched / tW.length) * 100);
    const ok = pct >= 80;
    const r = $('listen-result');
    r.innerHTML = `<span class="${ok ? 'ok' : 'bad'}">${pct >= 80 ? '🎉 Great! ' + pct + '% match' : '💡 ' + pct + '% match — keep listening!'}</span><br>
      <span class="ok">✅ ${escapeHtml(target)}</span>${ok ? '' : `<br><span class="bad">You wrote:</span> ${escapeHtml(got || '—')}`}`;
    store.stats.speakDone++;
    saveStore(); checkBadges(); checkMissions();
    $('listen-input').disabled = true;
    $('btn-listen-check').disabled = true;
  });
  $('btn-listen-skip').addEventListener('click', () => {
    if (listenRoutine) { listenRoutine = false; routineNext(); return; }
    listenIdx++;
    nextListen();
  });

  function openSpeak(routine) {
    speakRoutine = !!routine;
    const lvl = store.level || 'B1';
    $('speak-level').value = lvl;
    speakPool = shuffle(pickByLevel(SPEAKING, lvl));
    speakIdx = 0;
    nextSpeak();
  }
  function nextSpeak() {
    if (speakIdx >= speakPool.length) speakPool = shuffle(speakPool);
    const item = speakPool[speakIdx % speakPool.length];
    $('speak-sentence').textContent = item.text;
    $('speak-sentence').dataset.text = item.text;
    $('speak-status').textContent = 'Tap the mic and read the sentence aloud.';
    $('speak-status').classList.remove('rec');
    $('speak-result').classList.add('hidden');
    $('btn-speak-mic').disabled = false;
  }
  $('btn-speak-replay').addEventListener('click', () => speak($('speak-sentence').dataset.text));
  $('btn-speak-skip').addEventListener('click', () => {
    if (speakRoutine) { speakRoutine = false; routineNext(); return; }
    speakIdx++;
    nextSpeak();
  });
  $('btn-speak-mic').addEventListener('click', () => {
    const target = $('speak-sentence').dataset.text;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      $('speak-result').classList.remove('hidden');
      $('speak-result').innerHTML = `<div class="score">🎙️ Not supported here</div><div>This browser doesn't support voice input. Read it aloud and practice the rhythm — or try Chrome on Android.</div>`;
      return;
    }
    const rec = new SR();
    rec.lang = 'en-IN';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    $('speak-status').textContent = '🎤 Listening… speak now!';
    $('speak-status').classList.add('rec');
    rec.onresult = e => {
      const got = e.results[0][0].transcript.trim();
      $('speak-status').classList.remove('rec');
      $('speak-status').textContent = '';
      const norm = s => s.toLowerCase().replace(/[^a-z0-9'\s]/g, '').replace(/\s+/g, ' ').trim();
      const tW = norm(target).split(' '), gW = norm(got).split(' ').filter(Boolean);
      const matched = tW.filter(w => gW.includes(w)).length;
      const pct = Math.round((matched / tW.length) * 100);
      const missed = tW.filter(w => !gW.includes(w));
      const r = $('speak-result');
      r.classList.remove('hidden');
      r.innerHTML = `<div class="score" style="color:${pct >= 80 ? 'var(--good)' : pct >= 50 ? 'var(--accent)' : 'var(--bad)'}">${pct >= 80 ? '🌟' : pct >= 50 ? '👍' : '💪'} Pronunciation score: ${pct}%</div>
        <div>🎤 You said: <i>"${escapeHtml(got || '—')}"</i></div>
        ${missed.length ? `<div class="bad">🔍 Focus on: ${missed.map(w => `<span class="miss">${escapeHtml(w)}</span>`).join(' ')}</div>` : '<div class="good">All words recognized — great clarity!</div>'}
        <div class="good">✅ ${escapeHtml(target)}</div>`;
      store.stats.speakDone++;
      saveStore(); checkBadges(); checkMissions();
    };
    rec.onerror = () => {
      $('speak-status').classList.remove('rec');
      $('speak-status').textContent = 'Microphone issue — check permissions and try again.';
    };
    rec.onend = () => $('speak-status').classList.remove('rec');
    try { rec.start(); } catch (e) { /* already started */ }
  });

  /* conversation simulation */
  let convo = null, convoLine = 0, convoScore = 0;
  document.querySelectorAll('.talk-scen').forEach(b => b.addEventListener('click', () => {
    convo = CONVERSATIONS[b.dataset.s];
    convoLine = 0; convoScore = 0;
    $('talk-picker').classList.add('hidden');
    $('talk-chat').classList.remove('hidden');
    $('talk-lines').innerHTML = '';
    $('talk-end').classList.add('hidden');
    convoNext();
  }));
  function convoNext() {
    const line = convo.lines[convoLine];
    const box = $('talk-lines');
    box.insertAdjacentHTML('beforeend', `<div class="talk-bubble ai">${escapeHtml(line.ai)}</div>`);
    box.scrollTop = box.scrollHeight;
    const optsBox = $('talk-opts');
    optsBox.innerHTML = '';
    if (!line.opts.length) {
      $('talk-end').classList.remove('hidden');
      $('talk-end').innerHTML = `<div class="cr-rank">${convoScore}/${convoLine}</div>
        <div class="cr-score">${convoScore >= convoLine * 0.8 ? '🌟 Excellent conversation skills!' : convoScore >= convoLine * 0.5 ? '👍 Good job — keep practicing!' : '💪 Keep practicing!'}</div>
        <div class="fb-actions"><button class="btn primary" id="btn-convo-again">Try again</button><button class="btn ghost" id="btn-convo-close">Choose another topic</button></div>`;
      $('btn-convo-again').onclick = () => { convoLine = 0; convoScore = 0; $('talk-lines').innerHTML = ''; $('talk-end').classList.add('hidden'); convoNext(); };
      $('btn-convo-close').onclick = () => { $('talk-chat').classList.add('hidden'); $('talk-picker').classList.remove('hidden'); };
      store.stats.speakDone += 2;
      saveStore(); checkBadges(); checkMissions();
      return;
    }
    line.opts.forEach((o, i) => {
      const b = document.createElement('button');
      b.className = 'talk-opt';
      b.textContent = o.t;
      b.addEventListener('click', () => {
        [...optsBox.children].forEach(x => x.disabled = true);
        box.insertAdjacentHTML('beforeend', `<div class="talk-bubble me">${escapeHtml(o.t)}</div>`);
        if (o.fb) {
          box.insertAdjacentHTML('beforeend', `<div class="talk-bubble fb">${escapeHtml(o.fb)}</div>`);
          if (o.ok) convoScore++;
        }
        box.scrollTop = box.scrollHeight;
        convoLine++;
        setTimeout(convoNext, 500);
      });
      optsBox.appendChild(b);
    });
  }

  /* ================= AI COACH ================= */
  const TOPICS = [
    { id: 'prep', name: 'Prepositions', match: id => /^g:(0|1[01])$/.test(id) },
    { id: 'art', name: 'Articles (a/an/the)', match: id => /^g:(1[2-9])$/.test(id) },
    { id: 'tense', name: 'Tenses', match: id => /^g:(2[0-9]|3[0-5])$/.test(id) || /^c:/.test(id) },
    { id: 'voice', name: 'Passive & agreement', match: id => /^g:(3[6-9]|4[01])$/.test(id) },
    { id: 'comp', name: 'Comparatives & quantifiers', match: id => /^g:(4[2-9]|5[01])$/.test(id) },
    { id: 'modal', name: 'Modals', match: id => /^g:(5[2-9])$/.test(id) },
    { id: 'tag', name: 'Question tags', match: id => /^g:(6[0-6])$/.test(id) },
    { id: 'clause', name: 'Clauses & conditionals', match: id => /^g:(6[7-9]|7\d)$/.test(id) },
    { id: 'vocab', name: 'Vocabulary', match: id => /^v:/.test(id) },
    { id: 'idiom', name: 'Idioms', match: id => /^i:/.test(id) },
    { id: 'build', name: 'Sentence structure', match: id => /^b/.test(id) },
    { id: 'read', name: 'Reading comprehension', match: id => /^r:/.test(id) }
  ];

  function analyzeWeak() {
    const counts = {}, idsBy = {};
    for (const [id, p] of Object.entries(store.profile)) {
      if (!(p.w > 0) && p.stage < 1) continue;
      for (const tp of TOPICS) {
        if (tp.match(id)) {
          counts[tp.name] = (counts[tp.name] || 0) + 1;
          (idsBy[tp.name] = idsBy[tp.name] || []).push(id);
        }
      }
    }
    return Object.entries(counts)
      .map(([topic, count]) => ({ topic, count, ids: idsBy[topic] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }

  function startCoach() {
    const weak = analyzeWeak();
    state.mode = 'coach';
    state.answered = 0; state.correct = 0;
    state.feedback = null; state.chosen = []; state.current = null;
    state.coachIds = weak.flatMap(w => w.ids).slice(0, 8);
    state.coachTopics = weak.map(w => w.topic);
    state.setLen = Math.min(6, Math.max(state.coachIds.length, 1));
    $('mode-grid').classList.add('hidden');
    $('game').classList.remove('hidden');
    $('game-mode-label').textContent = '🤖 AI Coach';
    $('game-timer').classList.add('hidden');
    updateProgress();
    const go = () => state.coachIds.length ? nextCoach() : nextQuestion();
    if (!state.coachIds.length) {
      qEl.innerHTML = `<div class="coach-intro"><div class="ci-emoji">🤖</div><h3>Your AI Coach</h3>
        <p>You haven't missed any questions yet — impressive! 🎉 Let's keep it that way: I'll quiz you on your least-practiced skill so you stay sharp.</p>
        <button id="btn-coach-go" class="btn primary">Let's practice!</button></div>`;
      $('btn-coach-go').onclick = go;
      return;
    }
    const list = weak.map(w => `<b>${w.topic}</b> (${w.count} mistake${w.count > 1 ? 's' : ''})`).join(', ');
    qEl.innerHTML = `<div class="coach-intro"><div class="ci-emoji">🤖</div><h3>Your AI Coach</h3>
      <p>I noticed you frequently make mistakes with ${list}. Let's fix that together — ${state.setLen} targeted questions, one by one.</p>
      <button id="btn-coach-go" class="btn primary">Let's practice!</button></div>`;
    $('btn-coach-go').onclick = go;
  }

  async function nextCoach() {
    state.feedback = null; state.chosen = [];
    $('feedback').classList.add('hidden');
    $('feedback').classList.remove('good', 'bad');
    $('btn-similar').classList.add('hidden');
    qEl.innerHTML = '<div class="empty">Coach is preparing your question…</div>';
    state.t0 = Date.now();
    while (state.coachIds.length) {
      const id = state.coachIds.shift();
      if (state.seen.has(id)) continue;
      try {
        const res = await fetch(`/api/question?mode=grammar&due=${encodeURIComponent(id)}&seen=${encodeURIComponent([...state.seen].join(','))}`);
        const data = await res.json();
        if (data.ok && data.question) {
          state.current = data.question;
          state.seen.add(data.question.id);
          renderQuestion(data.question);
          return;
        }
      } catch (e) { /* fall through */ }
    }
    nextQuestion();
  }

  function coachSummary() {
    store.stats.coachSessions = (store.stats.coachSessions || 0) + 1;
    saveStore(); checkBadges(); checkMissions();
    const acc = state.answered ? Math.round((state.correct / state.answered) * 100) : 0;
    qEl.innerHTML = `<div class="challenge-result">
      <div class="cr-rank">${acc >= 80 ? '🌟' : acc >= 50 ? '👍' : '💪'}</div>
      <div class="cr-score">Coach session: ${state.correct}/${state.answered} correct (${acc}%)</div>
      <div class="cr-sub">${state.coachTopics.length ? 'Practiced: ' + state.coachTopics.join(', ') : ''}${acc >= 80 ? ' — your weak spots are improving!' : ' — missed ones are saved to your Review queue.'}</div>
      <div class="fb-actions">
        <button class="btn primary" id="btn-coach-done">See my profile</button>
        <button class="btn ghost" id="btn-coach-more">Practice again</button>
      </div></div>`;
    $('btn-coach-done').onclick = () => { $('game').classList.add('hidden'); $('mode-grid').classList.remove('hidden'); switchTab('profile'); };
    $('btn-coach-more').onclick = () => startCoach();
  }

  function renderCoachReport() {
    const box = $('coach-report');
    const weak = analyzeWeak();
    if (!weak.length) {
      box.innerHTML = '<div class="empty">No weak topics detected yet — you are doing great! Keep practicing to feed your coach.</div>';
      return;
    }
    const worst = weak[0];
    const pm = store.stats.perMode;
    const lines = weak.map(w => `<span class="weak-chip">${w.topic} · ${w.count} miss</span>`).join(' ');
    box.innerHTML = `<p>Your coach analyzed <b>${Object.values(pm).reduce((a, m) => a + m.t, 0)}</b> answers and found:</p>
      <p>${lines}</p>
      <p>💡 Recommendation: focus on <b>${worst.topic}</b> today — try the <b>AI Coach</b> mode or the Daily Plan.</p>`;
  }

  /* ================= AI CHAT (free typing + grammar feedback) ================= */
  const COMMON_VERBS = ['go', 'come', 'work', 'play', 'like', 'want', 'need', 'have', 'do', 'eat', 'drink', 'read', 'write', 'walk', 'talk', 'study', 'watch', 'live', 'love', 'hate', 'know', 'think', 'say', 'see', 'make', 'take', 'get', 'use', 'help', 'call', 'ask', 'visit', 'stay', 'learn', 'teach', 'buy', 'sell', 'run', 'sleep', 'start', 'finish', 'feel', 'look', 'listen', 'speak', 'understand', 'remember', 'enjoy', 'wake', 'cook', 'clean', 'try', 'plan', 'travel', 'join', 'meet', 'send', 'tell', 'show', 'pay', 'wait', 'sit', 'stand'];
  const IRREG_PAST = { go: 'went', see: 'saw', eat: 'ate', come: 'came', buy: 'bought', take: 'took', make: 'made', write: 'wrote', speak: 'spoke', get: 'got', have: 'had', do: 'did', read: 'read', give: 'gave', know: 'knew', think: 'thought', find: 'found', leave: 'left', meet: 'met', tell: 'told', say: 'said', sleep: 'slept', run: 'ran', sit: 'sat', stand: 'stood', understand: 'understood', win: 'won', teach: 'taught', build: 'built', send: 'sent', pay: 'paid' };
  const NO_ING = ['want', 'like', 'need', 'believe', 'know', 'understand', 'have', 'agree', 'love', 'hate', 'remember', 'think', 'mean'];

  function sForm3(v) {
    if (v === 'have') return 'has';
    if (v === 'do') return 'does';
    if (v === 'go') return 'goes';
    if (/(s|x|z|ch|sh|o)$/.test(v)) return v + 'es';
    if (/[^aeiou]y$/.test(v)) return v.slice(0, -1) + 'ies';
    return v + 's';
  }
  function checkGrammar(text) {
    const fixes = [];
    const low = (' ' + text.toLowerCase().replace(/\s+/g, ' ').trim() + ' ');
    const add = (orig, fixed, note) => fixes.push({ orig, fixed, note });

    if (/\b(she|he|it) don'?t\b/.test(low)) add('(he/she/it) don\'t', 'doesn\'t', 'Use "doesn\'t" with he/she/it.');
    if (/\b(she|he|it) have\b/.test(low)) add('(he/she/it) have', 'has', 'Use "has" with he/she/it.');
    if (/\b(i|you|we|they|my friends|the children) has\b/.test(low)) add('has → have', 'have', 'Use "have" with I/you/we/they.');
    if (/\bi am agree\b/.test(low)) add('I am agree', 'I agree', '"Agree" is a verb — no "am" needed.');
    const stative = low.match(/\bi am (want|like|need|believe|know|understand)\b/);
    if (stative) add('I am ' + stative[1], 'I ' + stative[1], 'These verbs don\'t use "am": "I ' + stative[1] + '".');
    if (/\bwhat you (want|like|need|do|doing)\b/.test(low)) add('what you…', 'what do you…', 'Questions need "do": "What do you …?"');
    const none = low.match(/\bi no (have|like|want|know|go|work|understand)\b/);
    if (none) add('I no ' + none[1], 'I don\'t ' + none[1], 'Negatives use "don\'t": "I don\'t ' + none[1] + '".');
    if (/\bcan (you|i|we|he|she|they|one)? ?able to\b/.test(low)) add('can … able to', 'can', 'Use just "can": "Can you help me?"');
    if (/\bmore better\b/.test(low)) add('more better', 'better', '"Better" is already comparative.');
    if (/\bmore easier\b/.test(low)) add('more easier', 'easier', 'Drop "more".');
    if (/\ba (apple|orange|egg|hour|umbrella|idea|engineer|honest|animal|exam|airport|office|umbrella)\b/.test(low)) add('a → an', 'an', 'Vowel sound → "an".');
    if (/\ban (book|dog|car|pen|table|phone|school|student|teacher|cat|friend|market|park|bike|computer|house|village|boy|girl|man|woman|job|shop|trip)\b/.test(low)) add('an → a', 'a', 'Consonant sound → "a".');
    if (/\byesterday|last (night|week|month|year|sunday|monday|weekend)\b/.test(low)) {
      for (const [v, p] of Object.entries(IRREG_PAST)) {
        if (new RegExp('\\b' + v + '\\b').test(low) && !new RegExp('\\b' + p + '\\b').test(low)) { add(v, p, 'Past time → past form "' + p + '".'); break; }
      }
    }
    for (const v of COMMON_VERBS) {
      if (new RegExp('\\b(she|he|it|my friend|my brother|my sister|the teacher|ravi) ' + v + '\\b(?!s)', 'i').test(text)) {
        const f = sForm3(v);
        add('(he/she/it) ' + v, f, 'With he/she/it, use "' + f + '".'); break;
      }
    }
    for (const v of COMMON_VERBS) {
      const f = sForm3(v);
      if (new RegExp('\\b(i|you|we|they|my friends|the children) ' + f + '\\b', 'i').test(text)) { add('(I/you/we/they) ' + f, v, 'With I/you/we/they, no -s: "' + v + '".'); break; }
      if (f !== v + 's' && new RegExp('\\b(i|you|we|they|my friends|the children) ' + v + 's\\b', 'i').test(text)) { add('(I/you/we/they) ' + v + 's', v, 'With I/you/we/they, no -s: "' + v + '".'); break; }
    }
    for (const v of COMMON_VERBS) {
      if (NO_ING.includes(v)) continue;
      if (new RegExp('\\bi am ' + v + '\\b(?!\\w)', 'i').test(text)) { add('I am ' + v, 'I am ' + v + 'ing', 'After "am" use the -ing form: "I am ' + v + 'ing".'); break; }
    }
    // dedupe identical fixes
    return fixes.filter((f, i) => fixes.findIndex(x => x.orig === f.orig && x.fixed === f.fixed) === i).slice(0, 3);
  }

  function detectIntent(text) {
    const l = text.toLowerCase();
    if (/bye|goodbye|see you|good night|end the chat|exit/.test(l)) return 'bye';
    if (/hi|hello|hey|namaste|good (morning|evening|afternoon|night)/.test(l)) return 'greet';
    if (/how are (you|u)|how('s| is) it going|kaise/.test(l)) return 'howareyou';
    if (/your name|who are you/.test(l)) return 'askname';
    if (/where (are you|r u)|where.*(from|live)|i (am|live|stay) from|i am from/.test(l)) return 'hometown';
    if (/my name is|call me|i am /.test(l)) return 'name';
    if (/(work|job|office|company|developer|engineer|teacher|doctor|nurse|business|employee|software|it )/.test(l)) return 'work';
    if (/(study|school|college|university|student|exam|learn)/.test(l)) return 'study';
    if (/(food|eat|restaurant|chai|coffee|tea|dosa|biryani|curry|lunch|dinner|breakfast|taste|hungry)/.test(l)) return 'food';
    if (/(hobby|like|love|enjoy|free time|weekend|cricket|movies|music|books|reading|travel|football|game|play)/.test(l)) return 'hobby';
    if (/(family|mother|father|sister|brother|wife|husband|children|parents)/.test(l)) return 'family';
    if (/(weather|rain|hot|cold|sunny|monsoon)/.test(l)) return 'weather';
    if (/(plan|future|tomorrow|next week|goal|dream|will)/.test(l)) return 'plans';
    if (/(thank|thanks|thx)/.test(l)) return 'thanks';
    if (/^(yes|ok|okay|sure|no|yep|yeah)/.test(l.trim())) return 'yesno';
    return 'fallback';
  }

  const CHAT_SCENES = {
    smalltalk: {
      botName: 'Alex',
      intro: 'Hi! I am Alex 👋 Let us have a relaxed chat in English. Tell me your name, where you are from, or what you like!',
      resp: {
        greet: ['Hello! Great to meet you. Tell me about yourself — where are you from?', 'Hi there! How is your day going?'],
        howareyou: ['I am doing great, thank you! And how about you?', 'All good here! What about you?'],
        askname: ['I am Alex, your AI practice partner. And what is your name?'],
        name: ['Nice to meet you! What do you do — work or study?', 'Lovely! Where are you from?'],
        hometown: ['Interesting! What is it like there? Do you like your city?', 'Nice! Do you visit your hometown often?'],
        work: ['That sounds interesting! What do you like most about your work?', 'Great! How long have you been doing that?'],
        study: ['Nice! Which subject do you like the most?', 'Great — what do you want to do after you finish?'],
        food: ['Yum! What is your favourite dish? Do you cook it yourself?', 'I love Indian food! What is your comfort meal?'],
        hobby: ['That sounds fun! How often do you do that?', 'Nice hobby! Do you do it alone or with friends?'],
        family: ['Family is important. Do you have brothers or sisters?', 'That is lovely. Do you all live together?'],
        weather: ['The weather has been unpredictable lately, right? Do you like it?', 'Same here — I hope it clears up soon!'],
        plans: ['Great goal! What is your first step?', 'That sounds exciting. When do you plan to start?'],
        thanks: ['You are welcome! Keep practicing — you are doing really well!', 'Anytime! I am here whenever you want to chat.'],
        bye: ['It was great chatting with you! Practice a little every day — see you soon! 👋', 'Goodbye! Remember: every chat makes you better. Bye!'],
        yesno: ['Nice! Tell me more about that.', 'Sounds good — what else do you like?'],
        fallback: ['Interesting! Tell me more.', 'I see! And what do you think about that?', 'Good point! What else?']
      }
    },
    interview: {
      botName: 'Ms. Rao',
      intro: 'Good morning! I am Ms. Rao, the interviewer. Welcome — how are you today? Let us begin with introductions.',
      resp: {
        greet: ['Good morning! Please make yourself comfortable. How are you today?', 'Hello! Thank you for coming. Tell me about yourself.'],
        howareyou: ['I am well, thank you. I am eager to learn about you — please introduce yourself.'],
        askname: ['I am Ms. Rao, the hiring manager. And you are?'],
        name: ['Pleased to meet you! Tell me about your education and work experience.', 'Great to meet you! What made you apply for this role?'],
        hometown: ['Interesting background. Does your hometown influence how you work?', 'Nice! Why did you move to this city for work?'],
        work: ['Good experience. What would you say is your biggest achievement at work?', 'How do you handle pressure or tight deadlines?'],
        study: ['Great. What did you enjoy most during your studies?', 'How has your education helped you in your career?'],
        food: ['Interesting! Now, let us focus on the role — tell me about a challenge you solved at work.'],
        hobby: ['Nice to know! Hobbies show balance. Now — what is your greatest strength?', 'Great. And what is one weakness you are working on?'],
        family: ['That is nice. Let us talk about your career goals — where do you see yourself in five years?'],
        weather: ['Indeed. Now, back to the interview — why do you want to work at our company?'],
        plans: ['Ambitious! How would you grow into that role here?', 'That is a solid plan. What skills are you building for it?'],
        thanks: ['Thank you! We value enthusiasm. Do you have any questions for us?', 'You are welcome. Any questions about the role?'],
        bye: ['Thank you for your time today. We will contact you soon — good luck!', 'It was a pleasure. Expect to hear from us within a week. Goodbye!'],
        yesno: ['Great. Can you give me an example?', 'Noted. And how did that situation end?'],
        fallback: ['Interesting point. Can you elaborate a little?', 'I see. And what did you learn from that?']
      }
    },
    office: {
      botName: 'Sam',
      intro: 'Hey, I am Sam, your teammate 👋 We have a project review today. Let us chat like colleagues — how is your work going?',
      resp: {
        greet: ['Hey! Good to see you. Ready for the project review?', 'Hello! Busy day? Let us quickly sync up.'],
        howareyou: ['Pretty good! Slightly busy with the new feature. How about you?', 'Doing well, thanks. How is your week going?'],
        askname: ['I am Sam from the backend team. And you are?'],
        name: ['Nice to meet you! Which team are you on?', 'Good to have you on the team! What do you work on?'],
        hometown: ['Nice! How long have you been in this city?', 'Great. Do you work from the office or remotely?'],
        work: ['What are you working on this week?', 'How is the project going on your side?'],
        study: ['Interesting background! How did you get into this field?'],
        food: ['Haha, coffee keeps the team going too! So — any blockers on the task?'],
        hobby: ['Nice! Balance is important. Back to work — what is our deadline status?'],
        family: ['That is sweet. Now, about the client meeting — are we ready for Thursday?'],
        weather: ['Tell me about it! Anyway — did you get my email about the release?'],
        plans: ['Good plan! Let us align on the timeline — when can we ship?', 'I like it. Can you share the details in the group chat?'],
        thanks: ['No problem! Ping me if you need anything.', 'Anytime — we are a team!'],
        bye: ['See you at the stand-up tomorrow! Keep up the great work 👋', 'Alright, let us catch up after the meeting. Bye!'],
        yesno: ['Sounds good. What is the estimated time for that?', 'Perfect. Keep me posted on progress.'],
        fallback: ['Understood. Any updates I should know about?', 'Got it. Should we discuss this in the next meeting?']
      }
    }
  };

  let chatScene = null, chatCount = 0, chatFixes = [], chatName = null, chatTopics = new Set();
  document.querySelectorAll('#chat-picker .talk-scen').forEach(b => b.addEventListener('click', () => {
    chatScene = CHAT_SCENES[b.dataset.c];
    chatCount = 0; chatFixes = []; chatName = null; chatTopics = new Set();
    $('chat-picker').classList.add('hidden');
    $('chat-box').classList.remove('hidden');
    $('chat-summary').classList.add('hidden');
    const lines = $('chat-lines');
    lines.innerHTML = `<div class="talk-bubble ai">${escapeHtml(chatScene.intro)}</div>`;
    $('chat-input').focus();
  }));
  $('btn-chat-send').addEventListener('click', chatSend);
  $('chat-input').addEventListener('keydown', e => { if (e.key === 'Enter') chatSend(); });
  $('btn-chat-end').addEventListener('click', chatEnd);

  function chatSend() {
    const input = $('chat-input');
    const text = input.value.trim();
    if (!text || !chatScene) return;
    input.value = '';
    const lines = $('chat-lines');
    lines.insertAdjacentHTML('beforeend', `<div class="talk-bubble me">${escapeHtml(text)}</div>`);
    chatCount++;
    const fixes = checkGrammar(text);
    const intent = detectIntent(text);
    chatTopics.add(intent);
    let reply;
    if (intent === 'name') {
      const m = text.match(/my name is (\w+)/i) || text.match(/i am (\w+)/i) || text.match(/call me (\w+)/i);
      if (m) chatName = m[1].charAt(0).toUpperCase() + m[1].slice(1);
    }
    const pool = chatScene.resp[intent] || chatScene.resp.fallback;
    reply = pool[Math.floor(Math.random() * pool.length)];
    if (chatName && intent === 'name') reply = reply.replace('{name}', chatName);
    setTimeout(() => {
      lines.insertAdjacentHTML('beforeend', `<div class="talk-bubble ai">${escapeHtml(reply)}</div>`);
      if (fixes.length) {
        chatFixes.push(...fixes);
        const fixHtml = fixes.map(f => `<div class="fix-item"><span class="fix-old">${escapeHtml(f.orig)}</span> → <span class="fix-new">${escapeHtml(f.fixed)}</span> <span style="color:#6b7280">(${escapeHtml(f.note)})</span></div>`).join('');
        lines.insertAdjacentHTML('beforeend', `<div class="talk-bubble fb">💡 Quick fix: ${fixHtml}</div>`);
      }
      lines.scrollTop = lines.scrollHeight;
    }, 450);
    lines.scrollTop = lines.scrollHeight;
  }

  function chatEnd() {
    if (!chatScene) return;
    store.stats.chats = (store.stats.chats || 0) + 1;
    saveStore(); checkBadges();
    const sum = $('chat-summary');
    sum.classList.remove('hidden');
    const topics = [...chatTopics].map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ') || 'General chat';
    sum.innerHTML = `<h4>📋 Chat feedback — ${escapeHtml(chatScene.botName)}</h4>
      <div>💬 You sent <b>${chatCount}</b> messages · topics: ${escapeHtml(topics)}</div>
      ${chatFixes.length ? `<div style="margin-top:6px">✏️ Grammar corrections (${chatFixes.length}):</div>` + chatFixes.map(f => `<div class="fix-item"><span class="fix-old">${escapeHtml(f.orig)}</span> → <span class="fix-new">${escapeHtml(f.fixed)}</span></div>`).join('') : '<div style="margin-top:6px">✏️ No grammar mistakes this chat — excellent! 🌟</div>'}
      <div style="margin-top:8px">💡 <b>Tip:</b> ${chatFixes.length ? 'Review the corrections above, then try a new scenario and use them correctly.' : 'Try a longer reply next time — use "because", "although", "for example" to build fluency.'}</div>
      <div class="fb-actions" style="margin-top:10px"><button class="btn primary" id="btn-chat-restart">Chat again</button><button class="btn ghost" id="btn-chat-close">Choose topic</button></div>`;
    $('btn-chat-restart').onclick = () => { sum.classList.add('hidden'); $('chat-lines').innerHTML = `<div class="talk-bubble ai">${escapeHtml(chatScene.intro)}</div>`; chatCount = 0; chatFixes = []; chatName = null; chatTopics = new Set(); };
    $('btn-chat-close').onclick = () => { $('chat-box').classList.add('hidden'); $('chat-picker').classList.remove('hidden'); };
  }

  /* ---------- TTS ---------- */
  let voicesLoaded = false;
  function loadVoices() {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.getVoices();
    speechSynthesis.onvoiceschanged = () => { voicesLoaded = true; };
    setTimeout(() => { voicesLoaded = true; }, 800);
  }
  function speak(text) {
    if (!('speechSynthesis' in window)) { toast('Text-to-speech not supported here'); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-GB';
    u.rate = 0.9;
    const voices = speechSynthesis.getVoices().filter(v => /en(-|_)(GB|IN|US)/i.test(v.lang));
    if (voices.length) u.voice = voices.find(v => /en-GB/i.test(v.lang)) || voices[0];
    speechSynthesis.speak(u);
  }
  loadVoices();

  /* ---------- dashboard ---------- */
  function renderDash() {
    const st = store.stats;
    $('stat-xp').textContent = st.xp;
    $('stat-correct').textContent = st.total;
    $('stat-acc').textContent = st.total ? Math.round((st.correct / st.total) * 100) + '%' : '—';
    $('stat-streak').textContent = st.streakCur;
    $('stat-time').textContent = st.timeSec < 3600 ? Math.max(1, Math.round(st.timeSec / 60)) + 'm' : (st.timeSec / 3600).toFixed(1) + 'h';
    $('stat-perfect').textContent = st.perfectSets;
    renderWeekly();
    renderRecent();
    renderReview();
    loadWotd();
  }
  function renderWeekly() {
    const box = $('weekly-chart');
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * DAY);
      const key = new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      days.push({ key, label: d.toLocaleDateString('en', { weekday: 'short' }), xp: store.stats.dayXP[key] || 0, today: i === 0 });
    }
    const max = Math.max(...days.map(d => d.xp), 1);
    box.innerHTML = days.map(d => `
      <div class="wday">
        <span class="wxp">${d.xp || ''}</span>
        <div class="wbar ${d.today ? 'today' : ''}" style="height:${Math.max(3, Math.round((d.xp / max) * 84))}%"></div>
        <span class="wlabel">${d.label}</span>
      </div>`).join('');
    const weekXp = days.reduce((a, d) => a + d.xp, 0);
    $('week-xp').textContent = weekXp ? `· ${weekXp} XP this week` : '';
  }
  function renderRecent() {
    const list = $('recent-list');
    if (!state.recent.length) list.innerHTML = '<div class="empty">No questions answered yet — go to <b>Learn</b> and start!</div>';
    else list.innerHTML = state.recent.map(r => `
      <div class="recent-item">
        <span class="recent-mark ${r.ok ? 'good' : 'bad'}">${r.ok ? '✔' : '✘'}</span>
        <span class="recent-text"><b>${MODES[r.mode].label.replace(/^\S+\s/, '')}:</b> ${escapeHtml(r.text)}</span>
      </div>`).join('');
  }
  function renderReview() {
    const due = dueIds(null);
    $('review-count').textContent = due.length + ' due';
    $('btn-review').disabled = due.length === 0;
    $('review-info').innerHTML = due.length
      ? `<b>${due.length} question${due.length > 1 ? 's' : ''} due now</b> — things you got wrong. Master them: tomorrow → 3 days → 7 days.`
      : 'No questions due right now. Miss some and they\'ll return tomorrow, then 3 and 7 days later.';
  }
  function renderBadgesInto(box) {
    box.innerHTML = BADGES.map(b => `
      <div class="badge ${store.stats.badges[b.id] ? 'earned' : ''}">
        <div class="b-emoji">${b.e}</div><div class="b-name">${b.n}</div><div class="b-desc">${b.d}</div>
      </div>`).join('');
  }

  /* ---------- profile ---------- */
  function renderProfile() {
    const st = store.stats;
    const lvl = store.level || '—';
    $('level-badge').textContent = lvl;
    if (store.placement) {
      const p = store.placement;
      $('level-title').textContent = `${p.level} · ${LVL_INFO[p.level].t}`;
      const idx = LVLS.indexOf(p.level);
      const next = idx < LVLS.length - 1 ? LVLS[idx + 1] : null;
      $('level-sub').textContent = `${p.score}/${p.total} on placement · path: ${p.level}${next ? ' → ' + next : ' (max!)'} · ${p.date}`;
      $('prof-path').textContent = next ? `→ Next: ${next}` : '';
      $('btn-placement').textContent = 'Retake test';
    } else {
      $('level-title').textContent = 'No level yet';
      $('level-sub').textContent = 'Take the placement test to find your English level.';
      $('btn-placement').textContent = '🎯 Take placement test';
    }
    const L = xpLevel(st.xp);
    $('xp-level').textContent = L;
    const { lo, hi } = xpLevelBounds(L);
    const pct = Math.min(100, Math.round(((st.xp - lo) / (hi - lo)) * 100));
    $('xp-bar-fill').style.width = pct + '%';
    $('xp-now').textContent = st.xp - lo;
    $('xp-next').textContent = hi - lo;

    // skill bars
    const box = $('skill-bars');
    const sk = store.placement
      ? { vocab: 'B1', grammar: 'B1', reading: 'A2' } // fallback shape; real data from test:
      : {};
    // Build skill bars from placement question performance by band
    const names = { vocab: '📚 Vocabulary', grammar: '🧩 Grammar', reading: '📖 Reading' };
    const skill = { vocab: null, grammar: null, reading: null };
    if (store.placement) {
      const qs = state.placement || [];
      // we don't retain per-question results; use overall level as base and per-mode counts
      skill.vocab = lvl; skill.grammar = lvl; skill.reading = lvl;
    }
    const rows = ['vocab', 'grammar', 'reading', 'idiom', 'builder'].map(m => {
      const pm = st.perMode[m] || { t: 0, c: 0 };
      const acc = pm.t ? Math.round((pm.c / pm.t) * 100) : null;
      return `<div class="profile-row"><div class="pbar-label">${names[m] || m}</div>
        <div class="pbar-track"><div class="pbar-fill" style="width:${acc || 0}%"></div></div>
        <div class="pbar-pct">${acc !== null ? acc + '%' : '—'}</div></div>`;
    }).join('');
    box.innerHTML = rows +
      (store.placement ? `<div class="profile-note">🎓 Overall level <b>${lvl}</b> — lessons auto-match your level. Practice regularly to level up to ${LVLS[Math.min(LVLS.indexOf(lvl) + 1, LVLS.length - 1)]}!</div>` : '');

    renderCoachReport();

    // missions
    const mlist = $('mission-list');
    mlist.innerHTML = MISSIONS.map(mm => {
      const done = store.stats.missions[mm.id];
      return `<div class="mission ${done ? 'done' : ''}">
        <div class="m-emoji">${mm.e}</div>
        <div class="m-body"><div class="m-name">${mm.n}</div><div class="m-desc">${mm.d}</div></div>
        <div class="m-xp">+${mm.xp} XP</div>
        <div class="m-status">${done ? '✅' : '…'}</div>
      </div>`;
    }).join('');

    // words
    const words = Object.entries(store.words);
    $('words-count').textContent = words.length ? `· ${words.length} words` : '';
    const wl = $('words-list');
    if (!words.length) wl.innerHTML = '<div class="empty">Answer vocabulary questions to build your collection.</div>';
    else {
      const sorted = words.sort((a, b) => (b[1].w + b[1].c) - (a[1].w + a[1].c)).slice(0, 12);
      wl.innerHTML = sorted.map(([w, e]) => `
        <div class="word-row"><span class="w">${escapeHtml(w)}</span>
        ${e.w ? `<span class="wbad">${e.w} wrong</span>` : ''}
        <span class="wl">${e.c > 0 ? '✓' : ''}</span></div>`).join('') +
        (words.length > 12 ? `<div class="empty" style="padding:4px 0">+${words.length - 12} more…</div>` : '');
    }
    $('btn-flashcards').disabled = !words.length;

    // accuracy chart
    const accBox = $('acc-chart');
    const accs = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * DAY);
      const key = new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      const a = st.dayAcc[key];
      accs.push({ label: d.toLocaleDateString('en', { weekday: 'short' }), v: a && a.t ? Math.round((a.c / a.t) * 100) : null });
    }
    if (!accs.some(a => a.v !== null)) accBox.innerHTML = '<div class="empty">More data coming as you practice.</div>';
    else {
      const W = 340, H = 110, P = 8;
      const pts = accs.map((a, i) => ({ x: P + (i * (W - 2 * P)) / 6, y: a.v === null ? null : H - P - (a.v / 100) * (H - 2 * P), ...a }));
      const line = pts.filter(p => p.y !== null).map(p => `${p.x},${p.y}`).join(' ');
      accBox.innerHTML = `<svg viewBox="0 0 ${W} ${H + 20}" style="width:100%;height:130px">
        <polyline points="${line}" fill="none" stroke="#4f46e5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        ${pts.map(p => p.y === null ? '' : `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="${p.v >= 80 ? '#16a34a' : p.v >= 50 ? '#f59e0b' : '#dc2626'}"/>`).join('')}
        ${pts.map(p => `<text x="${p.x}" y="${H + 14}" font-size="10" text-anchor="middle" fill="#6b7280">${p.label}</text>`).join('')}
      </svg>`;
    }
    renderBadgesInto($('badge-grid2'));
  }

  /* ---------- flashcards ---------- */
  let fcDeck = [], fcIdx = 0, fcFlipped = false;
  window._fcFlip = () => {
    if (!fcDeck.length) return;
    fcFlipped = !fcFlipped;
    $('fc-card').classList.toggle('flipped', fcFlipped);
  };
  $('btn-flashcards').addEventListener('click', async () => {
    const entries = Object.entries(store.words).sort((a, b) => (b[1].w) - (a[1].w)).slice(0, 24);
    fcDeck = [];
    for (const [w] of entries) {
      try {
        const r = await fetch('/api/wordinfo?w=' + encodeURIComponent(w));
        const d = await r.json();
        if (d.ok) fcDeck.push(d);
      } catch (e) { /* skip */ }
    }
    if (!fcDeck.length) { toast('No words to show yet'); return; }
    fcIdx = 0; fcFlipped = false;
    $('flash-modal').classList.remove('hidden');
    renderFc();
  });
  function renderFc() {
    $('fc-count').textContent = (fcIdx + 1) + ' / ' + fcDeck.length;
    const w = fcDeck[fcIdx];
    $('fc-front').textContent = w.word;
    $('fc-back').innerHTML = `<div style="font-weight:800;color:#92400e">${escapeHtml(w.def)}</div>
      <div style="font-size:13px"><b>Example:</b> ${escapeHtml(w.ex)}</div>
      <div style="font-size:12px;color:#6b7280">${w.syn.length ? 'Syn: ' + escapeHtml(w.syn.join(', ')) : ''}${w.ant.length ? '<br>Ant: ' + escapeHtml(w.ant.join(', ')) : ''}</div>
      <div style="font-size:11px;background:#eef0fe;color:#4f46e5;border-radius:999px;padding:2px 10px">${w.lvl}</div>`;
    fcFlipped = false;
    $('fc-card').classList.remove('flipped');
  }
  $('btn-fc-flip').addEventListener('click', () => window._fcFlip());
  $('btn-fc-next').addEventListener('click', () => { fcIdx = (fcIdx + 1) % fcDeck.length; renderFc(); });
  $('btn-fc-prev').addEventListener('click', () => { fcIdx = (fcIdx - 1 + fcDeck.length) % fcDeck.length; renderFc(); });
  $('btn-fc-close').addEventListener('click', () => $('flash-modal').classList.add('hidden'));

  /* ---------- wotd ---------- */
  async function loadWotd() {
    try {
      const r = await fetch('/api/wotd');
      const d = await r.json();
      $('wotd').innerHTML = `
        <div class="wotd-word">${escapeHtml(d.word)}</div>
        <div class="wotd-def">${escapeHtml(d.def)}</div>
        <div class="wotd-ex">“${escapeHtml(d.ex)}”</div>`;
    } catch (e) { /* ignore */ }
  }

  /* ---------- live feed ---------- */
  function prependFeed(item, recent) {
    const feed = $('feed');
    const first = feed.querySelector('.empty');
    if (first) first.remove();
    const el = document.createElement('div');
    el.className = 'feed-item';
    const ago = timeAgo(item.ts);
    el.innerHTML = `
      <div class="avatar" style="background:${colorOf(item.name)}">${initial(item.name)}</div>
      <div class="feed-body">
        <div class="feed-name">${escapeHtml(item.name)}</div>
        <div class="feed-act">completed a <b>${escapeHtml(MODES[item.mode] ? MODES[item.mode].label.replace(/^\S+\s/, '') : item.mode)}</b> set — ${item.score}/${item.total} correct</div>
        ${recent ? '<div class="feed-recent">Recent activity</div>' : ''}
      </div>
      <div class="feed-xp">+${item.xp} XP</div>
      <div class="feed-time">${ago}</div>`;
    feed.prepend(el);
    while (feed.children.length > 14) feed.lastChild.remove();
  }
  function timeAgo(ts) {
    if (!ts) return '';
    const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
    if (s < 60) return s + 's ago';
    const m = Math.floor(s / 60);
    return m < 60 ? m + 'm ago' : Math.floor(m / 60) + 'h ago';
  }
  function renderBoard(box, rows) {
    if (!rows.length) { box.innerHTML = '<div class="empty">Be the first to finish a set!</div>'; return; }
    box.innerHTML = rows.map((r, i) => `
      <div class="board-row">
        <div class="rank ${i < 3 ? 'r' + (i + 1) : ''}">${i + 1}</div>
        <div class="board-avatar" style="background:${colorOf(r.name)}">${initial(r.name)}</div>
        <div class="board-name ${r.name === liveName ? 'board-me' : ''}">${escapeHtml(r.name)}${r.name === liveName ? ' (you)' : ''}</div>
        <div class="board-sets">${r.sets} set${r.sets === 1 ? '' : 's'}</div>
        <div class="board-xp">${r.xp} XP</div>
      </div>`).join('');
  }

  /* ---------- toast & helpers ---------- */
  let toastTimer = null;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add('hidden'), 3400);
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ---------- PWA ---------- */
  if ('serviceWorker' in navigator && location.protocol.startsWith('https')) {
    navigator.serviceWorker.register('/service-worker.js').catch(() => { /* offline-only */ });
  }

  /* ---------- boot ---------- */
  loadWotd();
  renderReview();
  updateDueChips();
  function updateDueChips() {
    for (const m of ['vocab', 'grammar', 'idiom', 'builder', 'reading']) {
      const n = dueIds(m).length;
      const card = document.querySelector(`.mode-card[data-mode="${m}"] .mode-due`);
      if (card) { card.textContent = '🔁 ' + n + ' due'; card.classList.toggle('hidden', n === 0); }
    }
  }

  /* ---------- auto-update: if the server is newer than this cached app, reload ---------- */
  const APP_VERSION = '4';
  (async () => {
    try {
      const r = await fetch('/api/version', { cache: 'no-store' });
      const d = await r.json();
      if (d.v && d.v !== APP_VERSION && !sessionStorage.getItem('lf-ver-reload')) {
        sessionStorage.setItem('lf-ver-reload', '1');
        location.reload();
      }
    } catch (e) { /* offline or error — keep current version */ }
  })();

  if (!store.placement) {
    setTimeout(() => plModal.classList.remove('hidden'), 900);
  }
})();
