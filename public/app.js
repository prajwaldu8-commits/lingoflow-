/* ============ LingoFlow client ============ */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const MODES = {
    vocab:   { label: '📚 Vocabulary',      setLen: 5 },
    grammar: { label: '🧩 Grammar',         setLen: 5 },
    idiom:   { label: '🗣️ Idioms & Phrases', setLen: 5 },
    builder: { label: '🧱 Sentence Builder', setLen: 3 },
    reading: { label: '📖 Reading',         setLen: 3 }
  };

  /* ---------- live socket ---------- */
  const socket = io();
  let liveName = 'Anonymous Learner';
  const AVATAR_COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6'];
  const colorOf = s => AVATAR_COLORS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
  const initial = s => s.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  socket.on('hello', ({ name }) => {
    liveName = name;
    $('you').textContent = '👤 ' + name;
  });
  socket.on('online', n => { $('online-num').textContent = n; });
  socket.on('feed', item => prependFeed(item, false));
  socket.on('feed-history', items => { $('feed').innerHTML = ''; (items || []).forEach(it => prependFeed(it, true)); });
  socket.on('board', rows => renderBoard(rows || []));

  /* ---------- state ---------- */
  const state = {
    mode: null,
    setLen: 5,
    seen: new Set(),        // question ids already shown this session
    answered: 0,
    correct: 0,
    streak: 0,
    bestStreak: 0,
    xp: 0,
    sets: 0,
    current: null,          // current question
    feedback: null,
    chosen: [],             // builder: chosen chips
    recent: []              // recent answered questions (dash)
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
    state.streak = 0;
    state.feedback = null;
    state.chosen = [];
    state.current = null;
    $('mode-grid').classList.add('hidden');
    $('game').classList.remove('hidden');
    $('game-mode-label').textContent = MODES[mode].label;
    $('score-val').textContent = state.xp;
    updateProgress();
    nextQuestion();
  }

  $('btn-exit').addEventListener('click', () => {
    $('game').classList.add('hidden');
    $('mode-grid').classList.remove('hidden');
    state.current = null;
  });
  $('btn-next').addEventListener('click', nextQuestion);

  function updateProgress() {
    const pct = state.setLen ? Math.round((state.answered / state.setLen) * 100) : 0;
    $('progress-bar').style.width = pct + '%';
  }

  /* ---------- fetching fresh questions ---------- */
  let refreshRetried = false; // true when a full-library refresh already happened for this question
  async function nextQuestion() {
    state.feedback = null;
    state.chosen = [];
    $('feedback').classList.add('hidden');
    $('feedback').classList.remove('good', 'bad');
    qEl.innerHTML = '<div class="empty">Loading a fresh question…</div>';

    const seenStr = [...state.seen].join(',');
    try {
      const res = await fetch(`/api/question?mode=${state.mode}&seen=${encodeURIComponent(seenStr)}`);
      const data = await res.json();
      if (!data.ok) {
        // Library round complete → refresh "seen" and keep going, forever.
        if (refreshRetried) {
          qEl.innerHTML = '<div class="empty">Something went wrong — <button class="btn ghost" onclick="location.reload()">reload</button></div>';
          return;
        }
        refreshRetried = true;
        state.seen.clear();
        toast('Round complete — you mastered the full library! Refreshing with new questions 🌱');
        return nextQuestion();
      }
      refreshRetried = false;
      state.current = data.question;
      state.seen.add(data.question.id);
      renderQuestion(data.question);
    } catch (e) {
      qEl.innerHTML = '<div class="empty">Network hiccup — <button class="btn ghost" onclick="location.reload()">reload</button></div>';
    }
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
    record(correct, q);
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
      const area = $('chip-area');
      area.insertAdjacentHTML('beforeend',
        `<div style="width:100%;font-size:14px;font-weight:700;color:var(--good);margin-top:4px">✅ ${escapeHtml(q.answer.join(' '))}</div>`);
    }
    [...document.querySelectorAll('.chip')].forEach(c => c.disabled = true);
    $('btn-check').disabled = true;
    $('btn-undo').disabled = true;
    $('btn-reset').disabled = true;
    record(correct, q);
  }

  function record(correct, q) {
    state.feedback = { correct, q };
    state.answered++;
    if (correct) {
      state.correct++;
      state.streak++;
      state.bestStreak = Math.max(state.bestStreak, state.streak);
      state.xp += q.points;
    } else {
      state.streak = 0;
    }
    state.recent.unshift({
      ok: correct, mode: q.mode, text: q.prompt.slice(0, 70) + (q.prompt.length > 70 ? '…' : '')
    });
    if (state.recent.length > 8) state.recent.pop();
    $('score-val').textContent = state.xp;
    updateProgress();

    const fb = $('feedback');
    fb.classList.remove('hidden', 'good', 'bad');
    fb.classList.add(correct ? 'good' : 'bad');
    $('fb-emoji').textContent = correct ? ['🎉', '🌟', '🚀', '🔥', '💪'][Math.min(state.streak, 4)] : '💡';
    $('fb-title').textContent = correct ? (state.streak > 1 ? `Correct! ${state.streak} in a row 🔥` : 'Correct! 🎉') : 'Not quite';
    $('fb-text').innerHTML = `<b>${correct ? 'Great job!' : 'The right answer:'}</b> ${escapeHtml(q.explain)}`;
    $('btn-next').textContent = state.answered >= state.setLen ? 'See results →' : 'Next question →';
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (state.answered >= state.setLen) {
      finishSet();
    }
  }

  /* ---------- set completion -> push live ---------- */
  function finishSet() {
    const total = state.answered;
    const score = state.correct;
    const xp = state.correct * 10; // nominal xp for the live feed
    state.sets++;
    socket.emit('set-complete', { mode: state.mode, score, total, xp });
    setTimeout(() => {
      toast(`Set complete! +${xp} XP → ${score}/${total} correct` +
        (state.bestStreak > 1 ? ` · best streak ${state.bestStreak} 🔥` : ''));
      switchTab('dash');
      $('game').classList.add('hidden');
      $('mode-grid').classList.remove('hidden');
    }, 900);
  }

  /* ---------- dashboard ---------- */
  function renderDash() {
    $('stat-xp').textContent = state.xp;
    $('stat-correct').textContent = state.correct;
    $('stat-acc').textContent = state.answered ? Math.round((state.correct / state.answered) * 100) + '%' : '—';
    $('stat-streak').textContent = state.bestStreak;

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
    loadWotd();
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

  loadWotd();
})();
