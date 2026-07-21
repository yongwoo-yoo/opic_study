const SRS_KEY = 'opic_srs';

function loadSRS() {
  try { return JSON.parse(localStorage.getItem(SRS_KEY) || '{}'); } catch { return {}; }
}
function saveSRS(data) {
  localStorage.setItem(SRS_KEY, JSON.stringify(data));
}

function getCardState(srs, id) {
  return srs[id] || { interval: 0, ease: 2.5, due: 0 };
}

function rateCard(srs, id, rating) {
  // rating: 0=몰랐음, 1=애매함, 2=알았음
  const s = getCardState(srs, id);
  const day = 86400000;
  if (rating === 0) {
    s.interval = 1;
    s.ease = Math.max(1.3, s.ease - 0.2);
  } else if (rating === 1) {
    s.interval = Math.max(1, Math.round(s.interval * 1.2));
    s.ease = Math.max(1.3, s.ease - 0.15);
  } else {
    s.interval = s.interval < 1 ? 1 : Math.round(s.interval * s.ease);
    s.ease = Math.min(3.0, s.ease + 0.1);
  }
  s.due = Date.now() + s.interval * day;
  srs[id] = s;
  saveSRS(srs);
}

function isDue(srs, id) {
  const s = srs[id];
  if (!s) return true;
  return s.due <= Date.now();
}

let index = null;
let reviewQueue = [];
let reviewIdx = 0;
let flipped = false;

function setView(viewId, title, showBack = false) {
  document.getElementById('header-title').textContent = title;
  document.getElementById('back-btn').style.display = showBack ? '' : 'none';
  ['home-view', 'note-view', 'flashcard-view'].forEach(id => {
    document.getElementById(id).style.display = id === viewId ? '' : 'none';
  });
}

async function renderHome() {
  setView('home-view', 'OPIC 스터디');

  if (!index) {
    const res = await fetch('data/index.json');
    index = await res.json();
  }

  const srs = loadSRS();
  let dueCount = 0;

  for (const lesson of index.lessons) {
    const data = await fetch(`data/lessons/${lesson.file}`).then(r => r.json());
    for (const card of data.cards) {
      if (isDue(srs, card.id)) dueCount++;
    }
  }

  document.getElementById('due-count').textContent = dueCount;
  document.getElementById('study-btn').onclick = () => startReview(null);

  const list = document.getElementById('lesson-list');
  list.innerHTML = '';
  for (const lesson of index.lessons) {
    const li = document.createElement('li');
    li.className = 'lesson-item';
    li.innerHTML = `
      <div class="lesson-info">
        <div class="title">${lesson.title}</div>
        <div class="meta">${lesson.date} · 카드 ${lesson.cardCount}장</div>
      </div>
      <span class="lesson-arrow">›</span>`;
    li.onclick = () => renderNote(lesson.file);
    list.appendChild(li);
  }
}

async function renderNote(file) {
  setView('note-view', '레슨 노트', true);
  document.getElementById('back-btn').onclick = renderHome;

  const lesson = await fetch(`data/lessons/${file}`).then(r => r.json());

  document.getElementById('note-summary-list').innerHTML =
    lesson.summary.map(s => `<li>${s}</li>`).join('');

  document.getElementById('expr-list').innerHTML =
    lesson.keyExpressions.map(e => `
      <li class="expr-card">
        <div class="expr-en">${e.en}</div>
        <div class="expr-ko">${e.ko}</div>
        ${e.note ? `<div class="expr-note">${e.note}</div>` : ''}
      </li>`).join('');

  document.getElementById('note-study-btn').onclick = () => startReview(file);
}

async function startReview(file) {
  setView('flashcard-view', '복습', true);
  document.getElementById('back-btn').onclick = renderHome;

  const srs = loadSRS();
  let cards = [];

  if (file) {
    const lesson = await fetch(`data/lessons/${file}`).then(r => r.json());
    cards = lesson.cards.filter(c => isDue(srs, c.id));
    if (cards.length === 0) cards = [...lesson.cards];
  } else {
    if (!index) {
      index = await fetch('data/index.json').then(r => r.json());
    }
    for (const lesson of index.lessons) {
      const data = await fetch(`data/lessons/${lesson.file}`).then(r => r.json());
      cards.push(...data.cards.filter(c => isDue(srs, c.id)));
    }
  }

  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  reviewQueue = cards;
  reviewIdx = 0;
  renderCard();
}

function renderCard() {
  const container = document.getElementById('flashcard-container');

  if (reviewIdx >= reviewQueue.length) {
    container.innerHTML = `
      <div class="done-msg">
        <div class="icon">&#127881;</div>
        <h2>복습 완료!</h2>
        <p>오늘 할당량을 모두 마쳤어요.</p>
      </div>`;
    return;
  }

  const card = reviewQueue[reviewIdx];
  const total = reviewQueue.length;
  const pct = (reviewIdx / total * 100).toFixed(0);
  flipped = false;

  container.innerHTML = `
    <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
    <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:12px;align-self:flex-start">${reviewIdx + 1} / ${total}</p>
    <div class="card-wrap" id="card-wrap">
      <div class="card-inner" id="card-inner">
        <div class="card-face front">
          <div class="card-label">한국어</div>
          <div class="card-text">${card.front}</div>
          <div class="tap-hint">탭해서 뒤집기</div>
        </div>
        <div class="card-face back">
          <div class="card-label">영어</div>
          <div class="card-text">${card.back}</div>
          ${card.example ? `<div class="card-example">${card.example}</div>` : ''}
        </div>
      </div>
    </div>
    <div class="rating-btns hidden" id="rating-btns">
      <button class="btn-miss" data-r="0">몰랐음</button>
      <button class="btn-fuzzy" data-r="1">애매함</button>
      <button class="btn-got" data-r="2">알았음</button>
    </div>`;

  document.getElementById('card-wrap').onclick = () => {
    flipped = !flipped;
    document.getElementById('card-inner').classList.toggle('flipped', flipped);
    if (flipped) document.getElementById('rating-btns').classList.remove('hidden');
  };

  document.getElementById('rating-btns').onclick = (e) => {
    const btn = e.target.closest('[data-r]');
    if (!btn) return;
    rateCard(loadSRS(), card.id, parseInt(btn.dataset.r));
    reviewIdx++;
    renderCard();
  };
}

document.addEventListener('DOMContentLoaded', renderHome);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}
