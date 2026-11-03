const QUESTION_STORAGE_KEY = 'opic_olivia_question_progress_v1';
let questionData;
let questionCategory = 'all';
let questionState = {};
try {
  const saved = JSON.parse(localStorage.getItem(QUESTION_STORAGE_KEY) || '{}');
  if (saved && typeof saved === 'object' && !Array.isArray(saved)) questionState = saved;
} catch { /* A broken saved value must not prevent reading the questions. */ }

const byId = id => document.getElementById(id);
const safe = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

function matchingQuestions() {
  const topic = byId('question-topic').value;
  const search = byId('question-search').value.trim().toLocaleLowerCase();
  return questionData.questions.filter(q =>
    (questionCategory === 'all' || q.category === questionCategory) &&
    (topic === 'all' || q.topic === topic) &&
    (!byId('question-incomplete').checked || !questionState[q.id]?.done) &&
    `${q.topic} ${q.text} ${q.number}`.toLocaleLowerCase().includes(search));
}

function updateQuestionProgress() {
  byId('question-done').textContent = questionData.questions.filter(q => questionState[q.id]?.done).length;
}

function questionCard(q, practice = false) {
  const saved = questionState[q.id] || {};
  return `<article class="question-card" data-question-id="${q.id}">
    <p class="question-meta">${safe(q.category)} · ${safe(q.topic)}${q.number ? ' · Q' + safe(q.number) : ''}</p>
    <p class="question-text">${safe(q.text)}</p>
    <details ${practice ? 'open' : ''}><summary>내 답변 · 키워드 메모</summary>
      <label class="memory-context">내 경험과 영어 답변<textarea data-note rows="4" placeholder="핵심 → 감정 → 이유, 나만의 경험을 적어보세요.">${safe(saved.note || '')}</textarea></label>
      <p class="memory-context">먼저 답을 말한 뒤 메모로 확인해 보세요.</p>
    </details>
    <label class="question-check"><input type="checkbox" data-done ${saved.done ? 'checked' : ''}> 이 문제 학습 완료</label>
    <a class="question-source" href="${safe(questionData.source)}#gid=${q.gid}&range=${q.cell}" target="_blank" rel="noopener">원본 ${q.cell} ↗</a>
  </article>`;
}

function renderQuestions() {
  const questions = matchingQuestions();
  byId('question-count').textContent = `${questions.length}개 표시 · 전체 ${questionData.questions.length}개`;
  byId('question-random').disabled = !questions.length;
  byId('question-list').innerHTML = questions.length ? questions.map(q => questionCard(q)).join('') : '<p class="memory-context">조건에 맞는 문제가 없어요. 검색어나 필터를 바꿔보세요.</p>';
  updateQuestionProgress();
}

function updateTopics() {
  const topics = [...new Set(questionData.questions.filter(q => questionCategory === 'all' || q.category === questionCategory).map(q => q.topic))];
  byId('question-topic').innerHTML = '<option value="all">모든 주제</option>' + topics.map(topic => `<option value="${safe(topic)}">${safe(topic)}</option>`).join('');
}

function saveQuestion(event) {
  const card = event.target.closest('[data-question-id]');
  if (!card || !event.target.matches('[data-note], [data-done]')) return;
  const id = card.dataset.questionId;
  const saved = { ...(questionState[id] || {}) };
  if (event.target.matches('[data-note]')) saved.note = event.target.value;
  else saved.done = event.target.checked;
  questionState[id] = saved;
  try { localStorage.setItem(QUESTION_STORAGE_KEY, JSON.stringify(questionState)); }
  catch {
    byId('question-count').textContent = '저장 공간에 접근할 수 없어 기록을 저장하지 못했어요. 메모를 복사해 보관해 주세요.';
    return;
  }
  document.querySelectorAll(`[data-question-id="${id}"]`).forEach(other => {
    if (other === card) return;
    other.querySelector('[data-note]').value = saved.note || '';
    other.querySelector('[data-done]').checked = !!saved.done;
  });
  updateQuestionProgress();
  if (event.target.matches('[data-done]')) renderQuestions();
}

async function loadQuestions() {
  try {
    const response = await fetch('data/olivia-questions.json');
    if (!response.ok) throw new Error('자료를 불러오지 못했습니다.');
    questionData = await response.json();
    byId('question-progress').textContent = `${questionData.questions.length}개 문제 · 3개 분류`;
    updateTopics();
    renderQuestions();
    byId('question-categories').onclick = event => {
      const button = event.target.closest('[data-category]');
      if (!button) return;
      questionCategory = button.dataset.category;
      byId('question-categories').querySelectorAll('button').forEach(item => {
        item.classList.toggle('active', item === button);
        item.setAttribute('aria-pressed', String(item === button));
      });
      byId('question-practice').hidden = true;
      updateTopics();
      renderQuestions();
    };
    ['question-topic', 'question-search', 'question-incomplete'].forEach(id => {
      byId(id).addEventListener(id === 'question-search' ? 'input' : 'change', () => {
        byId('question-practice').hidden = true;
        renderQuestions();
      });
    });
    byId('question-random').onclick = () => {
      const questions = matchingQuestions();
      if (!questions.length) return;
      const q = questions[Math.floor(Math.random() * questions.length)];
      byId('question-practice').innerHTML = '<h3>지금 이 질문에 답해보세요</h3>' + questionCard(q, true);
      byId('question-practice').hidden = false;
      byId('question-practice').scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    document.addEventListener('input', saveQuestion);
    byId('question-original').addEventListener('toggle', () => {
      if (!byId('question-original').open || byId('original-tables').childElementCount) return;
      byId('original-tables').innerHTML = questionData.sheets.map(sheet => `<h3>${safe(sheet.title)}</h3><div class="original-scroll" tabindex="0" aria-label="${safe(sheet.title)} 원본 표"><table><tbody>${sheet.rows.map((row, i) => `<tr><th scope="row">${i + 1}</th>${row.map(value => `<td>${safe(value)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`).join('');
    });
  } catch {
    byId('question-progress').textContent = '문제를 불러오지 못했어요';
    byId('question-list').innerHTML = '<p class="memory-context">연결을 확인하고 페이지를 새로고침해 주세요.</p>';
  }
}

loadQuestions();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
