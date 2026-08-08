/* ============ LingoFlow client v2 — learning engine ============ */
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
    review:  { label: '🔁 Review',           setLen: 5 }
  };
  const MODE_OF = { v: 'vocab', g: 'grammar', c: 'grammar', i: 'idiom', r: 'reading', b: 'builder' };

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
  socket.on('board', rows => renderBoard(rows || []));

  /* ================= persistent learning store (localStorage) ================= */
  const LS_KEY = 'lingoflow_v2';
  const DAY = 86400000;

  function todayKey() {
    const d = new Date();
    const off = d.getTimezoneOffset() * 60000;
    return new Date(d - off).toISOString().slice(0, 10);
  }
  function defaultStore() {
    return {
      v: 2,
      profile: {}, // id -> {c, w, stage, due, mastered}
      stats: {
        xp: 0, total: 0, correct: 0,
        perMode: {}, dayXP: {}, dayQ: {},
        streakLast: null, streakCur: 0, streakBest: 0,
        timeSec: 0, perfectSets: 0, reviewMastered: 0,
        dailyDone: null, badges: {}
      }
    };
  }
  let store = loadStore();
  function loadStore() {
    try {
      const raw = JSON.parse(localStorage.getItem(LS_KEY));
      if (raw && raw.v === 2) return Object.assign(defaultStore(), raw);
    } catch (e) { /* ignore */ }
    return defaultStore();
  }
  function saveStore() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(store)); } catch (e) { /* ignore */ }
  }

  function modeOf(id) { return MODE_OF[id.slice(0, 1)] || 'grammar'; }
  function modeStats(m) {
    if (!store.stats.perMode[m]) store.stats.perMode[m] = { t: 0, c: 0 };
    return store.stats.perMode[m];
  }

  /* spaced-repetition schedule for a question result */
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

  /* ================= achievements ================= */
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
    { id: 'daily1', e: '🌍', n: 'Daily Player', d: 'Complete a Daily Challenge', c: s => !!s.dailyDone }
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

  /* ---------- state ---------- */
  const state = {
    mode: null,
    setLen: 5,
    seen: new Set(),
    answered: 0,
    correct: 0,
    current: null,
    feedback: null,
    chosen: [],
    recent: [],
    refreshRetried: false,
    t0: Date.now(),
    dailyQs: null,
    dailyIdx: 0,
    timer: null,
    timerLeft: 300
  };
  const qEl = $('question');

  /* ---------- tabs ---------- */
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));
  function switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    $('view-' + tab).classList.add('active');
    if (tab === 'dash') renderDash();
  }

  /* ---------- modes ---------- */
  document.querySelectorAll('.mode-card').forEach(c => c.addEventListener('click', () => startGame(c.dataset.mode)));

  function startGame(mode) {
    state.mode = mode;
    state.setLen = MODES[mode].setLen;
    state.answered = 0;
    state.correct = 0;
    state.feedback = null;
    state.chosen = [];
    state.current = null;
    state.refreshRetried = false;
    $('mode-grid').classList.add('hidden');
    $('game').classList.remove('hidden');
    $('game-mode-label').textContent = MODES[mode].label;
    updateProgress();
    const timer = $('game-timer');
    if (mode === 'daily') {
      timer.classList.remove('hidden');
      loadDaily();
    } else {
      timer.classList.add('hidden');
      nextQuestion();
    }
  }

  $('btn-exit').addEventListener('click', () => {
    stopTimer();
    $('game').classList.add('hidden');
    $('mode-grid').classList.remove('hidden');
    state.current = null;
    state.dailyQs = null;
  });
  $('btn-next').addEventListener('click', nextQuestion);
  $('btn-similar').addEventListener('click', tryAnother);
  $('btn-review').addEventListener('click', () => startGame('review'));

  function updateProgress() {
    const pct = state.setLen ? Math.round((state.answered / state.setLen) * 100) : 0;
    $('progress-bar').style.width = pct + '%';
  }

  /* ---------- fetching questions (adaptive) ---------- */
  async function nextQuestion() {
    state.feedback = null;
    state.chosen = [];
    $('feedback').classList.add('hidden');
    $('feedback').classList.remove('good', 'bad');
    $('btn-similar').classList.add('hidden');
    qEl.innerHTML = '<div class="empty">Loading a fresh question…</div>';
    state.t0 = Date.now();

    const seenStr = [...state.seen].join(',');
    const mode = state.mode === 'review' ? 'grammar' : state.mode;
    const due = (state.mode === 'review' ? dueIds(null) : dueIds(mode)).slice(0, 6).join(',');
    try {
      const res = await fetch(`/api/question?mode=${mode}&seen=${encodeURIComponent(seenStr)}&due=${encodeURIComponent(due)}`);
      const data = await res.json();
      if (!data.ok) {
        if (state.refreshRetried) {
          qEl.innerHTML = '<div class="empty">Something went wrong — <button class="btn ghost" onclick="location.reload()">reload</button></div>';
          return;
        }
        state.refreshRetried = true;
        state.seen.clear();
        toast('Round complete — you mastered the full library! Refreshing 🌱');
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
    } catch (e) {
      nextQuestion();
    }
  }

  /* ---------- daily challenge ---------- */
  async function loadDaily() {
    qEl.innerHTML = '<div class="empty">Loading today\'s challenge…</div>';
    try {
      const res = await fetch('/api/daily');
      const data = await res.json();
      state.dailyQs = data.questions;
      state.dailyIdx = 0;
      state.timerLeft = data.durationSec || 300;
      startTimer();
      renderDailyQ();
    } catch (e) {
      qEl.innerHTML = '<div class="empty">Could not load the challenge — check connection.</div>';
    }
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
    state.current = q;
    state.seen.add(q.id);
    renderQuestion(q);
  }
  async function finishDaily() {
    stopTimer();
    $('game-timer').classList.add('hidden');
    const score = state.correct;
    const used = 300 - state.timerLeft;
    let rank = null, total = null;
    try {
      const res = await fetch('/api/daily/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, total: state.dailyQs.length, timeMs: used * 1000, name: liveName })
      });
      const d = await res.json();
      rank = d.rank; total = d.total;
    } catch (e) { /* rank unavailable offline */ }
    store.stats.dailyDone = todayKey();
    saveStore();
    checkBadges();
    $('feedback').classList.add('hidden');
    qEl.innerHTML = `
      <div class="challenge-result">
        <div class="cr-rank">${rank ? '#' + rank : '—'}</div>
        <div class="cr-score">${score}/${state.dailyQs.length} correct ${rank ? '· ' + total + ' players today' : ''}</div>
        <div class="cr-sub">${rank && rank <= 3 ? '🏆 Podium finish! Incredible!' : rank && rank <= 10 ? '🌟 Top 10! Brilliant!' : rank ? 'Nice work — come back tomorrow to climb higher!' : 'Offline — challenge saved locally.'}</div>
        <button class="btn primary" id="btn-daily-done">See results →</button>
      </div>`;
    $('btn-daily-done').addEventListener('click', () => switchTab('dash'));
    toast(`Daily Challenge: ${score}/10 · rank #${rank || '—'}`);
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
    if (correct) {
      $('chip-area').style.borderColor = 'var(--good)';
      $('chip-area').style.background = '#f0fdf4';
    } else {
      $('chip-area').style.borderColor = 'var(--bad)';
      $('chip-area').style.background = '#fef2f2';
      $('chip-area').insertAdjacentHTML('beforeend',
        `<div style="width:100%;font-size:14px;font-weight:700;color:var(--good);margin-top:4px">✅ ${escapeHtml(q.answer.join(' '))}</div>`);
    }
    [...document.querySelectorAll('.chip')].forEach(c => c.disabled = true);
    $('btn-check').disabled = true;
    $('btn-undo').disabled = true;
    $('btn-reset').disabled = true;
    record(correct, q, got.join(' '), q.answer.join(' '));
  }

  function record(correct, q, yoursText, rightText) {
    state.feedback = { correct, q };
    state.answered++;
    const st = store.stats;
    if (correct) {
      state.correct++;
      st.correct++;
      st.xp += q.points;
    }
    st.total++;
    const pm = modeStats(q.mode);
    pm.t++; if (correct) pm.c++;

    /* streaks */
    const tk = todayKey();
    if (st.streakLast !== tk) {
      const y = new Date(Date.now() - DAY).toISOString().slice(0, 10);
      st.streakCur = st.streakLast === y ? st.streakCur + 1 : 1;
      st.streakLast = tk;
      st.streakBest = Math.max(st.streakBest, st.streakCur);
    }
    st.dayXP[tk] = (st.dayXP[tk] || 0) + (correct ? q.points : 0);
    st.dayQ[tk] = (st.dayQ[tk] || 0) + 1;
    st.timeSec += Math.min(Math.round((Date.now() - state.t0) / 1000), 300);

    recordProfile(q.id, correct);
    if (correct && q.mode === 'builder' && state.mode !== 'daily') {} // builder perfect counted via set
    state.recent.unshift({ ok: correct, mode: q.mode, text: q.prompt.slice(0, 64) + (q.prompt.length > 64 ? '…' : '') });
    if (state.recent.length > 8) state.recent.pop();
    saveStore();
    checkBadges();
    updateChips();

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

  /* ---------- set completion -> push live ---------- */
  function finishSet() {
    const score = state.correct;
    const total = state.answered;
    const st = store.stats;
    if (total >= 3 && score === total) {
      st.perfectSets++;
      saveStore();
      checkBadges();
      toast('💯 Perfect set!');
    }
    socket.emit('set-complete', { mode: state.mode === 'review' ? 'grammar' : state.mode, score, total, xp: score * 10 });
    setTimeout(() => {
      switchTab('dash');
      $('game').classList.add('hidden');
      $('mode-grid').classList.remove('hidden');
    }, 900);
  }

  /* ---------- dashboard ---------- */
  function renderDash() {
    const st = store.stats;
    $('stat-xp').textContent = st.xp;
    $('stat-correct').textContent = st.total;
    $('stat-acc').textContent = st.total ? Math.round((st.correct / st.total) * 100) + '%' : '—';
    $('stat-streak').textContent = st.streakCur;
    $('stat-time').textContent = st.timeSec < 3600 ? Math.max(1, Math.round(st.timeSec / 60)) + 'm' : (st.timeSec / 3600).toFixed(1) + 'h';
    $('stat-perfect').textContent = st.perfectSets;

    renderProfile();
    renderWeekly();
    renderRecent();
    renderReview();
    renderBadges();
    loadWotd();
  }

  function renderProfile() {
    const box = $('profile-bars');
    const names = { vocab: '📚 Vocabulary', grammar: '🧩 Grammar', idiom: '🗣️ Idioms', builder: '🧱 Builder', reading: '📖 Reading' };
    const rows = Object.keys(names).map(m => {
      const pm = store.stats.perMode[m] || { t: 0, c: 0 };
      const acc = pm.t ? Math.round((pm.c / pm.t) * 100) : null;
      return { m, label: names[m], acc, t: pm.t };
    });
    const tested = rows.filter(r => r.t >= 5);
    let strongest = null, weakest = null;
    if (tested.length >= 2) {
      tested.sort((a, b) => b.acc - a.acc);
      strongest = tested[0]; weakest = tested[tested.length - 1];
    }
    box.innerHTML = rows.map(r => `
      <div class="profile-row">
        <div class="pbar-label">${r.label}</div>
        <div class="pbar-track"><div class="pbar-fill" style="width:${r.acc || 0}%"></div></div>
        <div class="pbar-pct">${r.acc !== null ? r.acc + '%' : '—'}</div>
      </div>`).join('') +
      `<div class="profile-note">${tested.length < 2
        ? 'Answer at least 5 questions in a skill to see strengths & weaknesses.'
        : `💪 Strongest: <b>${strongest.label.replace(/^\S+\s/, '')}</b> (${strongest.acc}%) · Focus on: <span class="weak">${weakest.label.replace(/^\S+\s/, '')}</span> (${weakest.acc}%)`}</div>`;
  }

  function renderWeekly() {
    const box = $('weekly-chart');
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * DAY);
      const off = d.getTimezoneOffset() * 60000;
      const key = new Date(d - off).toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en', { weekday: 'short' });
      days.push({ key, label, xp: store.stats.dayXP[key] || 0, today: i === 0 });
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
    if (!state.recent.length) {
      list.innerHTML = '<div class="empty">No questions answered yet — go to <b>Learn</b> and start!</div>';
    } else {
      list.innerHTML = state.recent.map(r => `
        <div class="recent-item">
          <span class="recent-mark ${r.ok ? 'good' : 'bad'}">${r.ok ? '✔' : '✘'}</span>
          <span class="recent-text"><b>${MODES[r.mode].label.replace(/^\S+\s/, '')}:</b> ${escapeHtml(r.text)}</span>
        </div>`).join('');
    }
  }

  function renderReview() {
    const due = dueIds(null);
    $('review-count').textContent = due.length + ' due';
    $('btn-review').disabled = due.length === 0;
    $('review-info').innerHTML = due.length
      ? `<b>${due.length} question${due.length > 1 ? 's' : ''} due for review now</b> — things you got wrong. Master them: tomorrow → 3 days → 7 days.`
      : 'No questions due right now. Miss some questions and they\'ll come back here tomorrow, then 3 and 7 days later.';
  }

  function renderBadges() {
    const box = $('badge-grid');
    box.innerHTML = BADGES.map(b => `
      <div class="badge ${store.stats.badges[b.id] ? 'earned' : ''}">
        <div class="b-emoji">${b.e}</div>
        <div class="b-name">${b.n}</div>
        <div class="b-desc">${b.d}</div>
      </div>`).join('');
  }

  function updateChips() {
    for (const m of ['vocab', 'grammar', 'idiom', 'builder', 'reading']) {
      const n = dueIds(m).length;
      const card = document.querySelector(`.mode-card[data-mode="${m}"] .mode-due`);
      if (card) {
        card.textContent = '🔁 ' + n + ' due';
        card.classList.toggle('hidden', n === 0);
      }
    }
  }

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

  /* ---------- leaderboard ---------- */
  function renderBoard(rows) {
    const box = $('board-list');
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

  /* ---------- toast ---------- */
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

  /* ---------- PWA ---------- */
  if ('serviceWorker' in navigator && location.protocol.startsWith('https')) {
    navigator.serviceWorker.register('/service-worker.js').catch(() => { /* offline only */ });
  }

  loadWotd();
  updateChips();
  renderReview();
})();
