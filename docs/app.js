const SRS_KEY = 'opic_srs';
const ANSWER_PROGRESS_KEY = 'opic_answer_progress';
const ANSWER_CATEGORY = {
  D: { name: '묘사', className: 'description' },
  H: { name: '습관', className: 'habit' },
  P: { name: '과거 경험', className: 'past' },
  C: { name: '비교', className: 'comparison' }
};

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
let personalAnswers = null;
let activeAnswerCategory = 'all';

function setView(viewId, title, showBack = false) {
  document.getElementById('header-title').textContent = title;
  document.getElementById('back-btn').style.display = showBack ? '' : 'none';
  ['home-view', 'note-view', 'flashcard-view', 'answer-list-view', 'answer-detail-view'].forEach(id => {
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
  document.getElementById('answer-study-btn').onclick = renderAnswerList;

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

function plainText(value) {
  return value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\*\*/g, '')
    .trim();
}

function extractField(block, label) {
  const match = block.match(new RegExp(`- \\*\\*${label}:\\*\\* (.+)`));
  return match ? plainText(match[1]) : '';
}

function extractParagraph(block, heading) {
  const match = block.match(new RegExp(`\\*\\*${heading}\\*\\*\\n\\n([\\s\\S]*?)(?=\\n\\*\\*|$)`));
  return match ? plainText(match[1].replace(/\n+/g, ' ')) : '';
}

async function loadPersonalAnswers() {
  if (personalAnswers) return personalAnswers;
  const markdown = await fetch('opic-personal-workbook.md').then(response => {
    if (!response.ok) throw new Error('답변 자료를 불러오지 못했습니다.');
    return response.text();
  });
  const blocks = [...markdown.matchAll(/<a id="([dhpc]\d+)"[^>]*><\/a>\n### ([DHPC]\d+)\. ([^\n]+)\n([\s\S]*?)(?=<a id="[dhpc]\d+"|\n## [3-7]\.|$)/g)];
  personalAnswers = blocks.map(match => {
    const id = match[2];
    const body = match[4];
    const context = body.match(/\*\*시험지:\*\* ([\s\S]*?)(?=\n\n\*\*MP\*\*)/);
    const expressions = body.match(/\*\*표현:\*\* ([^.\n]+)/);
    return {
      id,
      category: id[0],
      title: plainText(match[3]),
      context: context ? plainText(context[1]) : '',
      what: extractField(body, 'What'),
      why: extractField(body, 'Why'),
      feeling: extractField(body, 'Feeling'),
      body: extractParagraph(body, '본문'),
      ending: extractParagraph(body, '마무리'),
      korean: extractParagraph(body, '한글'),
      expressions: expressions ? plainText(expressions[1]) : ''
    };
  });
  return personalAnswers;
}

function loadAnswerProgress() {
  try { return JSON.parse(localStorage.getItem(ANSWER_PROGRESS_KEY) || '{}'); } catch { return {}; }
}

function updateAnswerProgress(answers) {
  const done = loadAnswerProgress();
  const completed = answers.filter(answer => done[answer.id]).length;
  document.getElementById('answer-progress-count').textContent = `${completed} / ${answers.length}`;
  document.getElementById('answer-progress-fill').style.width = `${completed / answers.length * 100}%`;
}

async function renderAnswerList() {
  setView('answer-list-view', '내 답변 연습', true);
  document.getElementById('back-btn').onclick = renderHome;
  const list = document.getElementById('answer-list');
  list.innerHTML = '<li class="empty"><p>답변을 불러오는 중…</p></li>';

  try {
    const answers = await loadPersonalAnswers();
    updateAnswerProgress(answers);
    renderAnswerItems();
    document.getElementById('answer-search-input').oninput = renderAnswerItems;
    document.getElementById('category-filters').onclick = event => {
      const button = event.target.closest('[data-category]');
      if (!button) return;
      activeAnswerCategory = button.dataset.category;
      document.querySelectorAll('#category-filters button').forEach(item => {
        item.classList.toggle('active', item === button);
      });
      renderAnswerItems();
    };
    document.getElementById('random-answer-btn').onclick = () => {
      const candidates = getVisibleAnswers();
      if (candidates.length) renderAnswerDetail(candidates[Math.floor(Math.random() * candidates.length)].id);
    };
  } catch (error) {
    list.innerHTML = `<li class="empty"><p>${error.message}</p></li>`;
  }
}

function getVisibleAnswers() {
  const query = document.getElementById('answer-search-input').value.trim().toLowerCase();
  return personalAnswers.filter(answer => {
    const categoryMatches = activeAnswerCategory === 'all' || answer.category === activeAnswerCategory;
    const textMatches = !query || `${answer.title} ${answer.context} ${answer.what}`.toLowerCase().includes(query);
    return categoryMatches && textMatches;
  });
}

function renderAnswerItems() {
  const answers = getVisibleAnswers();
  const progress = loadAnswerProgress();
  document.getElementById('answer-result-count').textContent = `${answers.length}개 답변`;
  document.getElementById('answer-list').innerHTML = answers.length ? answers.map(answer => {
    const category = ANSWER_CATEGORY[answer.category];
    return `<li class="answer-item ${progress[answer.id] ? 'completed' : ''}" data-id="${answer.id}">
      <span class="category-badge ${category.className}">${category.name}</span>
      <span class="answer-item-copy">
        <strong>${answer.title}</strong>
        <small>${answer.context}</small>
      </span>
      <span class="answer-check">${progress[answer.id] ? '✓' : '›'}</span>
    </li>`;
  }).join('') : '<li class="empty"><p>조건에 맞는 답변이 없어요.</p></li>';
  document.getElementById('answer-list').onclick = event => {
    const item = event.target.closest('[data-id]');
    if (item) renderAnswerDetail(item.dataset.id);
  };
}

function renderAnswerDetail(id) {
  const answer = personalAnswers.find(item => item.id === id);
  if (!answer) return;
  const category = ANSWER_CATEGORY[answer.category];
  const progress = loadAnswerProgress();
  const mpText = [answer.what, answer.why, answer.feeling].join(' ');
  const mpWordCount = mpText.split(/\s+/).length;
  setView('answer-detail-view', category.name, true);
  document.getElementById('back-btn').onclick = renderAnswerList;
  document.getElementById('answer-detail').innerHTML = `
    <div class="answer-detail-heading">
      <span class="category-badge ${category.className}">${category.name}</span>
      <span class="answer-code">${answer.id}</span>
      <h2>${answer.title}</h2>
      <p>${answer.context}</p>
    </div>
    <div class="answer-prompt-card">
      <span>이 질문을 받았다고 생각하고 먼저 말해보세요</span>
      <strong>${answer.title.replace(/ \[확인용\]$/, '')}</strong>
      <div class="answer-timer-row">
        <span id="answer-timer">20초</span>
        <button id="answer-timer-btn">타이머 시작</button>
      </div>
    </div>
    <button class="reveal-button" data-target="mp-section">MP 힌트 보기</button>
    <section class="answer-reveal hidden" id="mp-section">
      <h3>MP · What → Why → Feeling <small>${mpWordCount}단어 · 20초 목표</small></h3>
      <div class="mp-step what"><b>What</b><p>${answer.what}</p></div>
      <div class="mp-step why"><b>Why</b><p>${answer.why}</p></div>
      <div class="mp-step feeling"><b>Feeling</b><p>${answer.feeling}</p></div>
      <button class="speak-button" data-speak="mp">▶ MP 듣기</button>
    </section>
    <button class="reveal-button" data-target="full-section">전체 답변 보기</button>
    <section class="answer-reveal hidden" id="full-section">
      <h3>전체 답변</h3>
      <p class="answer-script-ko">${answer.korean}</p>
      <button class="answer-script-english" type="button" aria-label="가려진 영어 답변 보기" aria-pressed="false">
        <span class="answer-script-hint">클릭해서 영어 답변 보기</span>
        <span class="answer-script-text">${[answer.what, answer.why, answer.feeling, answer.body, answer.ending].join(' ')}</span>
      </button>
      ${answer.expressions ? `<p class="answer-expression">활용 표현 · ${answer.expressions}</p>` : ''}
      <button class="speak-button" data-speak="full">▶ 전체 답변 듣기</button>
    </section>
    <button class="answer-complete-button ${progress[id] ? 'done' : ''}" id="answer-complete-btn">
      ${progress[id] ? '✓ 학습 완료됨' : '오늘 학습 완료'}
    </button>`;

  document.getElementById('answer-detail').onclick = event => {
    const english = event.target.closest('.answer-script-english');
    if (english) {
      const revealed = english.classList.toggle('revealed');
      english.setAttribute('aria-pressed', String(revealed));
      english.setAttribute('aria-label', revealed ? '영어 답변 다시 가리기' : '가려진 영어 답변 보기');
      english.querySelector('.answer-script-hint').textContent = revealed ? '클릭해서 영어 다시 가리기' : '클릭해서 영어 답변 보기';
      return;
    }
    const reveal = event.target.closest('[data-target]');
    if (reveal) {
      const section = document.getElementById(reveal.dataset.target);
      section.classList.toggle('hidden');
      reveal.textContent = section.classList.contains('hidden')
        ? (reveal.dataset.target === 'mp-section' ? 'MP 힌트 보기' : '전체 답변 보기')
        : '접기';
      return;
    }
    const speak = event.target.closest('[data-speak]');
    if (speak) {
      const text = speak.dataset.speak === 'mp'
        ? [answer.what, answer.why, answer.feeling].join(' ')
        : [answer.what, answer.why, answer.feeling, answer.body, answer.ending].join(' ');
      speakEnglish(text, speak);
    }
  };
  document.getElementById('answer-complete-btn').onclick = event => {
    const saved = loadAnswerProgress();
    saved[id] = !saved[id];
    localStorage.setItem(ANSWER_PROGRESS_KEY, JSON.stringify(saved));
    event.currentTarget.classList.toggle('done', saved[id]);
    event.currentTarget.textContent = saved[id] ? '✓ 학습 완료됨' : '오늘 학습 완료';
  };
  let timerId = null;
  document.getElementById('answer-timer-btn').onclick = event => {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
      document.getElementById('answer-timer').textContent = '20초';
      document.getElementById('answer-timer').classList.remove('time-up');
      event.currentTarget.textContent = '타이머 시작';
      return;
    }
    let seconds = 20;
    const timer = document.getElementById('answer-timer');
    timer.classList.remove('time-up');
    event.currentTarget.textContent = '다시 시작';
    timer.textContent = `${seconds}초`;
    timerId = setInterval(() => {
      seconds--;
      timer.textContent = seconds > 0 ? `${seconds}초` : '시간 끝!';
      if (seconds <= 0) {
        clearInterval(timerId);
        timerId = null;
        timer.classList.add('time-up');
        event.currentTarget.textContent = '다시 시작';
      }
    }, 1000);
  };
}

function speakEnglish(text, button) {
  if (!('speechSynthesis' in window)) {
    button.textContent = '이 브라우저는 음성 재생을 지원하지 않아요';
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.86;
  button.textContent = '■ 재생 중지';
  utterance.onend = () => { button.textContent = '▶ 다시 듣기'; };
  utterance.onerror = () => { button.textContent = '▶ 다시 듣기'; };
  window.speechSynthesis.speak(utterance);
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
