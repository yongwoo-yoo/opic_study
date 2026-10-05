const SRS_KEY = 'opic_srs';
const CUSTOM_CARDS_KEY = 'opic_custom_cards';
const COURSE_START_KEY = 'opic_course_start';
const SELECTED_STUDY_DAY_KEY = 'opic_selected_study_day';
const BATCH_SIZE = 20;
const REVIEW_DAYS = [1, 3, 5, 7, 14, 30];
let lessonCards = [];
let activeBatch = null;
let activeCourseDay = null;
let activeBatchIndex = null;
let scheduledReviewCards = [];

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function courseDayNumber() {
  const selected = Number(localStorage.getItem(SELECTED_STUDY_DAY_KEY));
  return Number.isInteger(selected) && selected > 0 ? selected : 1;
}

function calendarDayDifference(later, earlier) {
  const a = new Date(`${later}T00:00:00`);
  const b = new Date(`${earlier}T00:00:00`);
  return Math.floor((a - b) / 86400000);
}

function loadLearnedBatches() {
  try {
    const value = JSON.parse(localStorage.getItem('opic_learned_batches') || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}

function getCourseBatches() {
  const cards = [...lessonCards];
  const batches = [];
  for (let i = 0; i < cards.length; i += BATCH_SIZE) {
    batches.push(cards.slice(i, i + BATCH_SIZE));
  }
  return batches;
}

function loadReviewLog() {
  try {
    const log = JSON.parse(localStorage.getItem('opic_review_log') || '[]');
    return Array.isArray(log) ? log : [];
  } catch { return []; }
}

function recordStudy(id, rating, due, label = '') {
  const log = loadReviewLog();
  log.push({ id, at: Date.now(), rating, due, label });
  localStorage.setItem('opic_review_log', JSON.stringify(log.slice(-3000)));
}

function renderStudyHistory() {
  const grouped = new Map();
  for (const item of loadReviewLog()) {
    const date = localDateKey(new Date(item.at));
    if (!grouped.has(date)) grouped.set(date, []);
    grouped.get(date).push(item);
  }
  const list = document.getElementById('today-study-list');
  const dates = [...grouped.keys()].sort((a, b) => b.localeCompare(a)).slice(0, 14);
  list.innerHTML = dates.length ? dates.map(date => {
    const latest = new Map();
    grouped.get(date).forEach(item => {
      const old = latest.get(item.id);
      if (!old || old.at < item.at) latest.set(item.id, item);
    });
    return '<li class="study-day"><strong>' + date + ' · ' + latest.size + '개 학습</strong><ul>' + [...latest.values()].sort((a, b) => b.at - a.at).map(item =>
      '<li><span>' + escapeHTML(item.label || item.id) + ' · ' + ['못 떠올림', '힌트 필요', '혼자 떠올림'][item.rating] + ' · 다음 ' + (item.due ? new Date(item.due).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) : '암기 완료') + '</span></li>'
    ).join('') + '</ul></li>';
  }).join('') : '<li class="empty"><p>아직 학습 기록이 없어요.</p></li>';
}

function exportStudyData() {
  const payload = {
    version: 1,
    exportedAt: Date.now(),
    courseStart: localStorage.getItem(COURSE_START_KEY),
    learnedBatches: loadLearnedBatches(),
    lastBatchDate: localStorage.getItem('opic_last_batch_date'),
    srs: loadSRS(),
    customCards: loadCustomCards(),
    answerProgress: loadAnswerProgress(),
    reviewLog: loadReviewLog()
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'opic-study-' + localDateKey() + '.json';
  link.click();
  URL.revokeObjectURL(url);
}

async function importStudyData(file) {
  const payload = JSON.parse(await file.text());
  if (payload.version !== 1 || !payload.srs || !Array.isArray(payload.customCards)) throw new Error('OPIC 학습 백업 파일 형식이 맞지 않습니다.');
  const current = loadSRS();
  for (const [id, incoming] of Object.entries(payload.srs)) {
    const local = getCardState(current, id);
    const history = [...local.history, ...(Array.isArray(incoming.history) ? incoming.history : [])]
      .filter(item => Number.isFinite(item.at) && Number.isInteger(item.rating))
      .sort((a, b) => a.at - b.at)
      .filter((item, i, all) => i === 0 || item.at !== all[i - 1].at)
      .slice(-50);
    const incomingAt = incoming.history?.at(-1)?.at || 0;
    const localAt = local.history.at(-1)?.at || 0;
    current[id] = { ...(incomingAt > localAt ? incoming : local), history };
  }
  saveSRS(current);
  const cards = new Map([...loadCustomCards(), ...payload.customCards]
    .filter(card => card && typeof card.id === 'string' && typeof card.front === 'string' && typeof card.back === 'string')
    .map(card => [card.id, card]));
  localStorage.setItem(CUSTOM_CARDS_KEY, JSON.stringify([...cards.values()]));
  localStorage.setItem(ANSWER_PROGRESS_KEY, JSON.stringify({ ...loadAnswerProgress(), ...(payload.answerProgress || {}) }));
  const logs = [...loadReviewLog(), ...(Array.isArray(payload.reviewLog) ? payload.reviewLog : [])].sort((a, b) => a.at - b.at).slice(-3000);
  localStorage.setItem('opic_review_log', JSON.stringify(logs));
  const currentStart = localStorage.getItem(COURSE_START_KEY);
  if (/^\d{4}-\d{2}-\d{2}$/.test(payload.courseStart || '')) {
    localStorage.setItem(COURSE_START_KEY, !currentStart || payload.courseStart < currentStart ? payload.courseStart : currentStart);
  }
  if (payload.learnedBatches && typeof payload.learnedBatches === 'object') {
    const learned = loadLearnedBatches();
    for (const [batch, date] of Object.entries(payload.learnedBatches)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(date) && (!learned[batch] || date < learned[batch])) learned[batch] = date;
    }
    localStorage.setItem('opic_learned_batches', JSON.stringify(learned));
  }
  const currentBatchDate = localStorage.getItem('opic_last_batch_date');
  if (/^\d{4}-\d{2}-\d{2}$/.test(payload.lastBatchDate || '') && (!currentBatchDate || payload.lastBatchDate > currentBatchDate)) {
    localStorage.setItem('opic_last_batch_date', payload.lastBatchDate);
  }
}

function loadCustomCards() {
  try {
    const cards = JSON.parse(localStorage.getItem(CUSTOM_CARDS_KEY) || '[]');
    return Array.isArray(cards) ? cards.filter(c => typeof c.id === 'string' && typeof c.front === 'string' && typeof c.back === 'string') : [];
  } catch { return []; }
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
const ANSWER_PROGRESS_KEY = 'opic_answer_progress';
const ANSWER_CATEGORY = {
  D: { name: '묘사', className: 'description' },
  H: { name: '습관', className: 'habit' },
  P: { name: '과거 경험', className: 'past' },
  C: { name: '비교', className: 'comparison' },
  R: { name: '롤플레이', className: 'roleplay' },
  A: { name: '고난도', className: 'advanced' }
};

function loadSRS() {
  try {
    const saved = JSON.parse(localStorage.getItem(SRS_KEY) || '{}');
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  } catch { return {}; }
}
function saveSRS(data) {
  localStorage.setItem(SRS_KEY, JSON.stringify(data));
}

function getCardState(srs, id) {
  return { interval: 0, ease: 2.5, due: 0, streak: 0, level: 0, mastered: false, history: [], ...srs[id] };
}

function rateCard(srs, id, rating) {
  // rating: 0=몰랐음, 1=애매함, 2=알았음
  const s = getCardState(srs, id);
  const day = 86400000;
  const steps = REVIEW_DAYS;
  const now = Date.now();
  const last = s.history[s.history.length - 1];
  const spaced = !last || (now >= s.due && new Date(last.at).toDateString() !== new Date(now).toDateString());
  s.streak = rating === 2 ? s.streak + (spaced ? 1 : 0) : 0;
  s.level = rating === 2 ? Math.min(4, Math.max(0, s.streak - 1)) : 0;
  s.mastered = s.streak >= 3;
  if (rating === 0) {
    s.interval = 1;
    s.ease = Math.max(1.3, s.ease - 0.2);
  } else if (rating === 1) {
    s.interval = 1;
    s.ease = Math.max(1.3, s.ease - 0.15);
  } else {
    s.interval = steps[s.level];
    s.ease = Math.min(3.0, s.ease + 0.1);
  }
  if (spaced || rating !== 2) s.due = now + s.interval * day;
  s.history = [...s.history, { at: Date.now(), rating }].slice(-50);
  srs[id] = s;
  saveSRS(srs);
}

function isDue(srs, id) {
  const s = srs[id];
  if (!s || !s.history?.length) return false;
  return !s.mastered && (s.due || 0) <= Date.now();
}

function memoryStatus(id) {
  const s = getCardState(loadSRS(), id);
  if (s.mastered) return '암기 완료 · 전체에서 다시 연습 가능';
  if (!s.history.length) return '새 항목 · 먼저 안 보고 떠올려 보세요';
  return `연속 ${s.streak}/3회 · 다음 복습 ${new Date(s.due).toLocaleDateString('ko-KR')}`;
}

function saveMnemonic(id, value) {
  const saved = loadSRS();
  saved[id] = { ...getCardState(saved, id), mnemonic: value };
  saveSRS(saved);
}

let index = null;
let reviewQueue = [];
let reviewIdx = 0;
let flipped = false;
let personalAnswers = null;
let activeAnswerCategory = 'all';
let activeSpeechButton = null;
let audioDelay = null;

function stopAudio() {
  clearTimeout(audioDelay);
  if (activeSpeechButton) activeSpeechButton.textContent = '▶ 다시 듣기';
  activeSpeechButton = null;
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}
let answerTimerId = null;
let retryCards = new Set();

function setView(viewId, title, showBack = false) {
  clearInterval(answerTimerId);
  answerTimerId = null;
  stopAudio();
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
  const customCards = loadCustomCards();
  let dueCount = 0;

  lessonCards = [];

  for (const lesson of [...index.lessons].sort((a, b) => a.date.localeCompare(b.date) || a.file.localeCompare(b.file))) {
    const data = await fetch(`data/lessons/${lesson.file}`).then(r => r.json());
    lessonCards.push(...data.cards.map(card => ({ ...card, topic: data.title })));
  }

  const batches = getCourseBatches();
  const dayPicker = document.getElementById('course-day-picker');
  const maxCourseDay = batches.length + Math.max(...REVIEW_DAYS);
  dayPicker.innerHTML = Array.from({ length: maxCourseDay }, (_, i) => `<option value="${i + 1}">Day ${i + 1}</option>`).join('');
  const day = Math.min(maxCourseDay || 1, courseDayNumber());
  dayPicker.value = String(day);
  localStorage.setItem(SELECTED_STUDY_DAY_KEY, String(day));
  dayPicker.onchange = () => {
    localStorage.setItem(SELECTED_STUDY_DAY_KEY, dayPicker.value);
    renderHome();
  };
  const batchIndex = day - 1;
  const todaysBatch = batches[batchIndex] || [];
  const scheduledBatchIndices = REVIEW_DAYS
    .map(offset => day - offset - 1)
    .filter(i => i >= 0 && batches[i]);
  const scheduledCards = scheduledBatchIndices.flatMap(i => batches[i] || []);
  scheduledReviewCards = scheduledCards;
  const dueCardIds = new Set(scheduledCards.map(card => card.id));
  customCards.filter(card => isDue(srs, card.id)).forEach(card => dueCardIds.add(card.id));
  dueCount = dueCardIds.size;
  document.getElementById('due-count').textContent = dueCount;
  document.getElementById('study-btn').textContent = dueCount ? '예정 복습 시작' : '예정 복습 없음';
  document.getElementById('study-btn').disabled = dueCount === 0;
  document.getElementById('study-btn').onclick = () => startReview(null);
  const batchButton = document.getElementById('batch-study-btn');
  batchButton.disabled = todaysBatch.length === 0;
  batchButton.textContent = todaysBatch.length ? `Day ${day} 새 카드 ${todaysBatch.length}장 학습` : '이 일차에는 새 카드가 없어요';
  batchButton.onclick = () => startBatchReview(todaysBatch, day);
  document.getElementById('day-review-btn').textContent = scheduledCards.length
    ? `Day ${day} 복습 ${scheduledCards.length}장 시작` : `Day ${day} 복습 카드 없음`;
  document.getElementById('day-review-btn').disabled = scheduledCards.length === 0;
  document.getElementById('day-review-btn').onclick = () => startBatchReview(scheduledCards, day, true);
  const dueBatchNames = scheduledBatchIndices.map(i => `Day ${i + 1}`).join(', ');
  document.getElementById('course-day').textContent = `Day ${day} · 새 카드 ${todaysBatch.length}장${dueBatchNames ? ` · 복습: ${dueBatchNames}` : ' · 복습 카드 없음'} · 새 카드 과정 ${batches.length}일 / 전체 ${lessonCards.length}장`;
  renderStudyHistory();
  document.getElementById('answer-study-btn').onclick = renderAnswerList;
  const answers = await loadPersonalAnswers();
  document.getElementById('memory-today').textContent = `Day ${day} 고정 복습 ${scheduledCards.length}장${dueBatchNames ? ` · 복습 일차 ${dueBatchNames}` : ''} · 내 답변 복습 ${answers.filter(a => isDue(srs, 'answer:' + a.id)).length}개. 새 카드와 복습을 따로 연습하세요.`;
  document.getElementById('custom-card-form').onsubmit = async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const question = form.elements.question.value.trim();
    const answer = form.elements.answer.value.trim();
    if (!question || !answer) return;
    const cards = loadCustomCards();
    cards.push({ id: 'custom:' + crypto.randomUUID(), front: question, back: answer, topic: form.elements.topic.value.trim() || '내 카드' });
    try {
      localStorage.setItem(CUSTOM_CARDS_KEY, JSON.stringify(cards));
      form.reset();
      await renderHome();
      document.getElementById('custom-card-status').textContent = '저장했어요. 오늘 복습에 포함됩니다.';
    } catch {
      document.getElementById('custom-card-status').textContent = '저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.';
    }
  };

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

function extractSentenceList(block, heading) {
  const match = block.match(new RegExp(`\\*\\*${heading}\\*\\*\\n\\n((?:- [^\\n]+\\n?)+)`));
  return match ? match[1].trim().split('\n').map(line => plainText(line.slice(2))) : [];
}

function splitEnglishSentences(text) {
  return (plainText(text).match(/[^.!?]+[.!?][”"']?(?=\s|$)/g) || [])
    .map(sentence => sentence.trim());
}

async function loadPersonalAnswers() {
  if (personalAnswers) return personalAnswers;
  const markdown = await fetch('opic-personal-workbook.md?v=18').then(response => {
    if (!response.ok) throw new Error('답변 자료를 불러오지 못했습니다.');
    return response.text();
  });
  const blocks = [...markdown.matchAll(/<a id="([dhpcra]\d+)"[^>]*><\/a>\n### ([DHPCRA]\d+)\. ([^\n]+)\n([\s\S]*?)(?=<a id="[dhpcra]\d+"|\n## \d+\.|$)/g)];
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
      koreanSentences: extractSentenceList(body, '한글 문장'),
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
    document.getElementById('answer-memory-filter').onchange = renderAnswerItems;
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
  const mode = document.getElementById('answer-memory-filter').value;
  const srs = loadSRS();
  return personalAnswers.filter(answer => {
    const categoryMatches = activeAnswerCategory === 'all' || answer.category === activeAnswerCategory;
    const textMatches = !query || `${answer.title} ${answer.context} ${answer.what}`.toLowerCase().includes(query);
    const state = getCardState(srs, 'answer:' + answer.id);
    const memoryMatches = mode === 'all' || (mode === 'mastered' ? state.mastered : mode === 'weak'
      ? state.history.length > 0 && !state.mastered && state.streak === 0 : isDue(srs, 'answer:' + answer.id));
    return categoryMatches && textMatches && memoryMatches;
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
        <small>${memoryStatus('answer:' + answer.id)}</small>
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

function renderSentenceList(koreanSentences, englishSentences, start, end, labels = []) {
  return `<ol class="answer-sentence-list" start="${start + 1}">
    ${koreanSentences.slice(start, end).map((korean, offset) => {
      const number = start + offset + 1;
      return `<li>
        ${labels[offset] ? `<b class="answer-sentence-label">${labels[offset]}</b>` : ''}
        <p class="answer-script-ko">${korean}</p>
        <div class="answer-sentence-actions">
          <button class="answer-script-english" type="button" data-sentence="${number}" aria-label="${number}번 영어 문장 보기" aria-pressed="false">
            <span class="answer-script-hint">영어 확인</span>
            <span class="answer-script-text">${englishSentences[number - 1]}</span>
          </button>
          <button class="sentence-speak-button" type="button" data-speak-sentence="${number}" aria-label="${number}번 영어 문장 발음 듣기">▶ 발음 듣기</button>
        </div>
      </li>`;
    }).join('')}
  </ol>`;
}

function renderAnswerDetail(id) {
  const answer = personalAnswers.find(item => item.id === id);
  if (!answer) return;
  const category = ANSWER_CATEGORY[answer.category];
  const progress = loadAnswerProgress();
  const mpText = [answer.what, answer.feeling, answer.why].join(' ');
  const mpWordCount = mpText.split(/\s+/).length;
  const englishSentences = splitEnglishSentences([answer.what, answer.feeling, answer.why, answer.body, answer.ending].join(' '));
  setView('answer-detail-view', category.name, true);
  document.getElementById('back-btn').onclick = renderAnswerList;
  if (answer.koreanSentences.length !== englishSentences.length || !englishSentences.length) {
    document.getElementById('answer-detail').innerHTML = '<p class="empty">답변 파일을 새로 불러와야 합니다. 페이지를 새로고침해 주세요.</p>';
    return;
  }
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
      <h3>MP · What → Feeling → Why <small>${mpWordCount}단어 · 20초 목표</small></h3>
      <p class="answer-script-guide">한글을 보고 영어로 말한 뒤, 문장별로 눌러 확인하세요.</p>
      ${renderSentenceList(answer.koreanSentences, englishSentences, 0, 3, ['What', 'Feeling', 'Why'])}
      <button class="speak-button" data-speak="mp">▶ MP 듣기</button>
    </section>
    <button class="reveal-button" data-target="full-section">전체 답변 보기</button>
    <section class="answer-reveal hidden" id="full-section">
      <h3>전체 답변</h3>
      <p class="answer-script-guide">한글을 보고 영어로 말한 뒤, 문장별로 눌러 확인하세요.</p>
      ${renderSentenceList(answer.koreanSentences, englishSentences, 0, englishSentences.length)}
      ${answer.expressions ? `<p class="answer-expression">활용 표현 · ${answer.expressions}</p>` : ''}
      <button class="speak-button" data-speak="full">▶ 전체 답변 듣기</button>
    </section>
    <section class="memory-panel">
      <h3>안 보고 말하기 · 기억 점검</h3>
      <p class="memory-context">답변을 접고 내 말로 말해보세요. 문구가 달라도 핵심·감정·이유를 전달하면 됩니다.</p>
      <button id="answer-hide" class="reveal-button">답변 모두 가리고 말하기</button>
      <label class="memory-context">내 장면 / 기억 연결 문장
        <input id="answer-mnemonic" maxlength="200" placeholder="예: 부엌 → 커피 향 → 편안함">
      </label>
      <label class="memory-context">백지 테스트 · 떠오르는 키워드나 영어 쓰기
        <textarea id="answer-recall" rows="3" placeholder="안 보고 떠올려 쓴 뒤 위 답변과 비교하세요"></textarea>
      </label>
      <p id="answer-memory-status" class="memory-context" aria-live="polite">${memoryStatus('answer:' + id)}</p>
      <div class="rating-btns" id="answer-memory-rating">
        <button class="btn-miss" data-rating="0">못 떠올림</button>
        <button class="btn-fuzzy" data-rating="1">힌트 필요</button>
        <button class="btn-got" data-rating="2">혼자 말함</button>
      </div>
    </section>
    <button class="answer-complete-button ${progress[id] ? 'done' : ''}" id="answer-complete-btn">
      ${progress[id] ? '✓ 학습 완료됨' : '오늘 학습 완료'}
    </button>`;

  document.getElementById('answer-detail').onclick = event => {
    const sentenceSpeak = event.target.closest('[data-speak-sentence]');
    if (sentenceSpeak) {
      speakEnglish(englishSentences[Number(sentenceSpeak.dataset.speakSentence) - 1], sentenceSpeak);
      return;
    }
    const english = event.target.closest('.answer-script-english');
    if (english) {
      const revealed = english.classList.toggle('revealed');
      english.setAttribute('aria-pressed', String(revealed));
      english.setAttribute('aria-label', `${english.dataset.sentence}번 영어 문장 ${revealed ? '다시 가리기' : '보기'}`);
      english.querySelector('.answer-script-hint').textContent = revealed ? '영어 다시 가리기' : '영어 확인';
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
        ? [answer.what, answer.feeling, answer.why].join(' ')
        : [answer.what, answer.feeling, answer.why, answer.body, answer.ending].join(' ');
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
  const mnemonic = document.getElementById('answer-mnemonic');
  mnemonic.value = getCardState(loadSRS(), 'answer:' + id).mnemonic || '';
  mnemonic.oninput = () => saveMnemonic('answer:' + id, mnemonic.value);
  document.getElementById('answer-hide').onclick = () => {
    stopAudio();
    document.querySelectorAll('#answer-detail [data-target]').forEach(button => {
      document.getElementById(button.dataset.target).classList.add('hidden');
      button.textContent = button.dataset.target === 'mp-section' ? 'MP 힌트 보기' : '전체 답변 보기';
    });
    document.getElementById('answer-recall').focus();
  };
  document.getElementById('answer-memory-rating').onclick = event => {
    const button = event.target.closest('[data-rating]');
    if (!button) return;
    const memoryId = 'answer:' + id;
    const saved = loadSRS();
    const rating = Number(button.dataset.rating);
    rateCard(saved, memoryId, rating);
    recordStudy(memoryId, rating, saved[memoryId]?.mastered ? null : saved[memoryId]?.due, answer.title);
    document.getElementById('answer-memory-status').textContent = memoryStatus('answer:' + id);
    document.querySelectorAll('#answer-memory-rating button').forEach(item => { item.disabled = true; });
  };
  document.getElementById('answer-timer-btn').onclick = event => {
    if (answerTimerId) {
      clearInterval(answerTimerId);
      answerTimerId = null;
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
    answerTimerId = setInterval(() => {
      seconds--;
      timer.textContent = seconds > 0 ? `${seconds}초` : '시간 끝!';
      if (seconds <= 0) {
        clearInterval(answerTimerId);
        answerTimerId = null;
        timer.classList.add('time-up');
        event.currentTarget.textContent = '다시 시작';
      }
    }, 1000);
  };
}

function speakEnglish(text, button) {
  clearTimeout(audioDelay);
  if (!('speechSynthesis' in window)) {
    button.textContent = '이 브라우저는 음성 재생을 지원하지 않아요';
    return;
  }
  if (activeSpeechButton === button) {
    window.speechSynthesis.cancel();
    button.textContent = '▶ 다시 듣기';
    activeSpeechButton = null;
    return;
  }
  window.speechSynthesis.cancel();
  if (activeSpeechButton) activeSpeechButton.textContent = '▶ 다시 듣기';
  activeSpeechButton = button;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.86;
  button.textContent = '■ 재생 중지';
  utterance.onend = utterance.onerror = () => {
    if (activeSpeechButton === button) {
      button.textContent = '▶ 다시 듣기';
      activeSpeechButton = null;
    }
  };
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
  activeBatch = null;
  activeCourseDay = null;
  const mode = file ? 'all' : document.getElementById('review-mode').value;
  const matches = card => mode === 'all' || (mode === 'due'
    ? isDue(srs, card.id)
    : mode === 'weak' && getCardState(srs, card.id).history.length > 0 && !getCardState(srs, card.id).mastered && getCardState(srs, card.id).streak === 0);
  let cards = [];

  if (file) {
    const lesson = await fetch(`data/lessons/${file}`).then(r => r.json());
    cards = lesson.cards.map(c => ({ ...c, topic: lesson.title }));
  } else {
    cards.push(...loadCustomCards().filter(matches));
    if (!index) {
      index = await fetch('data/index.json').then(r => r.json());
    }
    for (const lesson of index.lessons) {
      const data = await fetch(`data/lessons/${lesson.file}`).then(r => r.json());
      if (mode !== 'due') cards.push(...data.cards.filter(matches).map(c => ({ ...c, topic: data.title })));
    }
  }

  if (!file && mode === 'due') cards.push(...scheduledReviewCards);
  const uniqueCards = [...new Map(cards.map(card => [card.id, card])).values()];
  if (!file && mode === 'due' && scheduledReviewCards.length) {
    const scheduledIds = new Set(scheduledReviewCards.map(card => card.id));
    cards = uniqueCards.filter(card => scheduledIds.has(card.id));
    cards.push(...uniqueCards.filter(card => !scheduledIds.has(card.id)).slice(0, 10));
  } else {
    cards = uniqueCards;
  }

  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  if (!file && mode !== 'all' && !(mode === 'due' && scheduledReviewCards.length)) cards = cards.slice(0, 10);
  retryCards = new Set();

  reviewQueue = cards;
  reviewIdx = 0;
  renderCard();
}

function startBatchReview(cards, day, isScheduledReview = false) {
  activeBatch = isScheduledReview ? `Day ${day} 복습` : `Day ${day} 새 카드`;
  activeCourseDay = null;
  activeBatchIndex = null;
  reviewQueue = [...cards];
  reviewIdx = 0;
  setView('flashcard-view', activeBatch, true);
  document.getElementById('back-btn').onclick = renderHome;
  renderCard();
}

function renderCard() {
  stopAudio();
  const container = document.getElementById('flashcard-container');

  if (reviewIdx >= reviewQueue.length) {
    const completedBatch = activeBatch;
    activeBatch = null;
    container.innerHTML = `
      <div class="done-msg">
        <div class="icon">&#127881;</div>
        <h2>복습 완료!</h2>
        <p>${completedBatch ? `${completedBatch} 묶음을 마쳤어요.` : '예정 복습 묶음을 마쳤어요.'} 홈에서 오늘 학습한 카드와 다음 복습일을 볼 수 있어요.</p>
        <button class="note-study-btn" id="back-home-btn">홈에서 일정 보기</button>
      </div>`;
    document.getElementById('back-home-btn').onclick = renderHome;
    return;
  }

  const card = reviewQueue[reviewIdx];
  let hintUsed = false;
  const total = reviewQueue.length;
  const pct = (reviewIdx / total * 100).toFixed(0);
  flipped = false;

  container.innerHTML = `
    <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
    <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:12px;align-self:flex-start">${reviewIdx + 1} / ${total}</p>
    <p class="memory-context">${escapeHTML(card.topic || '표현 연습')} · 먼저 소리 내어 답하세요</p>
    <div class="card-wrap" id="card-wrap" role="button" tabindex="0" aria-label="정답 확인">
      <div class="card-inner" id="card-inner">
        <div class="card-face front">
          <div class="card-label">한국어</div>
          <div class="card-text">${escapeHTML(card.front)}</div>
          <div class="tap-hint">탭해서 뒤집기</div>
        </div>
        <div class="card-face back">
          <div class="card-label">영어</div>
          <div class="card-text">${escapeHTML(card.back)}</div>
          ${card.example ? `<div class="card-example">${escapeHTML(card.example)}</div>` : ''}
        </div>
      </div>
    </div>
    <div class="memory-tools">
      <button id="card-hint">첫 단어 힌트</button>
      <button id="card-listen" hidden>▶ 정답 듣기</button>
      <button id="card-audio">▶ 질문 → 5초 생각 → 답변</button>
    </div>
    <p id="memory-hint" class="memory-context" aria-live="polite"></p>
    <label class="memory-context">나만의 연결 문장 (내 경험·장면·앞글자)
      <input id="memory-note" maxlength="200" placeholder="예: 출근길 버스에서 쓰는 표현">
    </label>
    <div class="rating-btns hidden" id="rating-btns">
      <button class="btn-miss" data-r="0">몰랐음</button>
      <button class="btn-fuzzy" data-r="1">애매함</button>
      <button class="btn-got" data-r="2">알았음</button>
    </div>`;

  document.getElementById('card-wrap').onclick = () => {
    flipped = !flipped;
    document.getElementById('card-inner').classList.toggle('flipped', flipped);
    if (flipped) document.getElementById('rating-btns').classList.remove('hidden');
    document.getElementById('card-listen').hidden = !flipped;
  };
  document.getElementById('card-wrap').onkeydown = event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); document.getElementById('card-wrap').click(); }
  };
  document.getElementById('card-hint').onclick = () => {
    hintUsed = true;
    document.getElementById('memory-hint').textContent = `${card.back.split(/\s+/)[0]} … · 힌트로 떠올렸으면 애매함을 선택하세요`;
  };
  document.getElementById('card-listen').onclick = event => speakEnglish(card.back, event.currentTarget);
  document.getElementById('card-audio').onclick = event => {
    hintUsed = true;
    const button = event.currentTarget;
    if (!('speechSynthesis' in window)) { button.textContent = '이 브라우저는 듣기를 지원하지 않아요'; return; }
    if (activeSpeechButton === button) { stopAudio(); button.textContent = '▶ 질문 → 5초 생각 → 답변'; return; }
    stopAudio();
    activeSpeechButton = button;
    button.textContent = '■ 듣기 중지';
    const question = new SpeechSynthesisUtterance(card.front);
    question.lang = 'ko-KR';
    question.onend = () => {
      if (activeSpeechButton !== button) return;
      audioDelay = setTimeout(() => {
        if (activeSpeechButton !== button) return;
        activeSpeechButton = null;
        speakEnglish(card.back, button);
      }, 5000);
    };
    question.onerror = () => { if (activeSpeechButton === button) { stopAudio(); button.textContent = '재생 실패 · 다시 눌러주세요'; } };
    window.speechSynthesis.speak(question);
  };
  const note = document.getElementById('memory-note');
  note.value = getCardState(loadSRS(), card.id).mnemonic || '';
  note.oninput = () => saveMnemonic(card.id, note.value);

  document.getElementById('rating-btns').onclick = (e) => {
    const btn = e.target.closest('[data-r]');
    if (!btn) return;
    const rating = hintUsed && btn.dataset.r === '2' ? 1 : Number(btn.dataset.r);
    const saved = loadSRS();
    rateCard(saved, card.id, rating);
    recordStudy(card.id, rating, saved[card.id]?.mastered ? null : saved[card.id]?.due, card.front);
    if (rating === 0 && !retryCards.has(card.id)) {
      retryCards.add(card.id);
      reviewQueue.push(card);
    }
    reviewIdx++;
    renderCard();
  };
}

document.addEventListener('DOMContentLoaded', renderHome);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}
