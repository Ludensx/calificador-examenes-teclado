const STORAGE_KEY = 'examGraderData_v2';
const TOTAL_QUESTIONS = 30;

let gradesData = {};
let currentGrade = null;
let currentStudent = null;
let currentStudentIndex = -1;
let answers = new Array(TOTAL_QUESTIONS).fill(null);
let currentQuestionIndex = 0;
let gradedData = {};
let studentFilterIndex = -1;

async function loadData() {
  try {
    const [listasRes, respuestasRes] = await Promise.all([
      fetch('listas.json'),
      fetch('respuestas.json')
    ]);
    const listas = await listasRes.json();
    const respuestas = await respuestasRes.json();

    Object.keys(listas).forEach(grade => {
      if (respuestas[grade]) {
        const answersArray = [];
        for (let i = 1; i <= TOTAL_QUESTIONS; i++) {
          answersArray.push(respuestas[grade][String(i)] || 'A');
        }
        gradesData[grade] = {
          students: listas[grade],
          answers: answersArray
        };
      }
    });
  } catch (e) {
    console.error('Error loading data:', e);
    showToast('Error cargando datos JSON', 'error');
  }
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      gradedData = data.gradedData || {};
      currentGrade = data.currentGrade || null;
      currentStudent = data.currentStudent || null;
      answers = data.answers || new Array(TOTAL_QUESTIONS).fill(null);
      currentQuestionIndex = data.currentQuestionIndex || 0;
    }
  } catch (e) { console.error('Error loading state:', e); }
}

function saveState() {
  try {
    const data = { gradedData, currentGrade, currentStudent, answers, currentQuestionIndex };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) { console.error('Error saving state:', e); }
}

function initGradeSelect() {
  const select = document.getElementById('gradeSelect');
  select.innerHTML = '<option value="">-- Seleccionar grado --</option>';
  Object.keys(gradesData).forEach(grade => {
    const opt = document.createElement('option');
    opt.value = grade;
    opt.textContent = grade;
    select.appendChild(opt);
  });
  if (currentGrade && gradesData[currentGrade]) {
    select.value = currentGrade;
    updateStudentList();
  }
}

function updateStudentList() {
  const grade = document.getElementById('gradeSelect').value;
  const list = document.getElementById('studentList');
  const search = document.getElementById('studentSearch');
  if (!grade || !gradesData[grade]) {
    list.innerHTML = '';
    list.classList.remove('open');
    search.placeholder = 'Seleccione un grado primero...';
    search.disabled = true;
    return;
  }
  currentGrade = grade;
  search.disabled = false;
  search.placeholder = 'Escriba para filtrar, Enter para seleccionar...';
  const students = gradesData[grade].students;
  const gradedStudents = gradedData[grade] || {};
  let html = '';
  students.forEach((student, idx) => {
    const isGraded = !!gradedStudents[student];
    html += `<div class="student-item ${isGraded ? 'graded' : ''}" data-index="${idx}" role="option" aria-selected="false">${student}</div>`;
  });
  list.innerHTML = html;
  filterStudents('');
}

function filterStudents(query) {
  const list = document.getElementById('studentList');
  const items = list.querySelectorAll('.student-item');
  let visibleCount = 0;
  let firstVisibleIndex = -1;
  items.forEach((item, idx) => {
    const name = item.textContent.toLowerCase();
    const matches = name.includes(query.toLowerCase());
    item.style.display = matches ? 'flex' : 'none';
    item.classList.remove('highlighted');
    if (matches) {
      if (firstVisibleIndex === -1) firstVisibleIndex = idx;
      visibleCount++;
    }
  });
  studentFilterIndex = firstVisibleIndex;
  highlightFilteredStudent();
  list.classList.toggle('open', visibleCount > 0 && query.length > 0);
}

function highlightFilteredStudent() {
  const list = document.getElementById('studentList');
  const items = list.querySelectorAll('.student-item:not([style*="display: none"])');
  items.forEach((item, idx) => {
    item.classList.toggle('highlighted', idx === studentFilterIndex);
    if (idx === studentFilterIndex) item.scrollIntoView({ block: 'nearest' });
  });
}

function selectStudent(index) {
  const grade = currentGrade;
  const students = gradesData[grade].students;
  const student = students[index];
  currentStudent = student;
  currentStudentIndex = index;
  document.getElementById('studentSearch').value = student;
  document.getElementById('studentList').classList.remove('open');
  loadStudentAnswers();
  renderMatrix();
  updateStats();
  document.getElementById('statsBar').style.display = 'flex';
  document.getElementById('saveBtn').disabled = false;
  focusQuestion(0);
}

function loadStudentAnswers() {
  const key = `${currentGrade}|${currentStudent}`;
  const saved = gradedData[key];
  if (saved && saved.answers) {
    answers = [...saved.answers];
    currentQuestionIndex = answers.findIndex(a => a === null);
    if (currentQuestionIndex === -1) currentQuestionIndex = TOTAL_QUESTIONS - 1;
  } else {
    answers = new Array(TOTAL_QUESTIONS).fill(null);
    currentQuestionIndex = 0;
  }
}

function saveCurrentStudent() {
  if (!currentGrade || !currentStudent) return;
  const key = `${currentGrade}|${currentStudent}`;
  const correctAnswers = gradesData[currentGrade].answers;
  let correct = 0;
  answers.forEach((ans, i) => { if (ans === correctAnswers[i]) correct++; });
  const grade = Math.round((correct / TOTAL_QUESTIONS) * 100) / 10;
  if (!gradedData[currentGrade]) gradedData[currentGrade] = {};
  gradedData[currentGrade][currentStudent] = { answers: [...answers], correct, grade, timestamp: Date.now() };
  saveState();
  showToast(`Guardado: ${currentStudent} — Nota: ${grade.toFixed(1)}`, 'success');
  return { correct, grade };
}

function moveToNextStudent() {
  const grade = currentGrade;
  const students = gradesData[grade].students;
  const gradedStudents = gradedData[grade] || {};
  let nextIndex = -1;
  for (let i = currentStudentIndex + 1; i < students.length; i++) {
    if (!gradedStudents[students[i]]) { nextIndex = i; break; }
  }
  if (nextIndex === -1) {
    for (let i = 0; i <= currentStudentIndex; i++) {
      if (!gradedStudents[students[i]]) { nextIndex = i; break; }
    }
  }
  if (nextIndex !== -1) {
    selectStudent(nextIndex);
  } else {
    showToast('¡Todos los estudiantes de este grado están calificados!', 'success');
    answers = new Array(TOTAL_QUESTIONS).fill(null);
    currentQuestionIndex = 0;
    currentStudent = null;
    currentStudentIndex = -1;
    document.getElementById('studentSearch').value = '';
    renderMatrix();
    updateStats();
    document.getElementById('saveBtn').disabled = true;
  }
}

function renderMatrix() {
  const grid = document.getElementById('questionGrid');
  grid.innerHTML = '';
  for (let i = 0; i < TOTAL_QUESTIONS; i++) {
    const cell = document.createElement('div');
    cell.className = 'question-cell';
    cell.dataset.index = i;
    cell.tabIndex = 0;
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('aria-label', `Pregunta ${i + 1}`);
    const answered = answers[i] !== null;
    if (answered) cell.classList.add('answered');
    cell.innerHTML = `
      <div class="q-number">${i + 1}</div>
      <div class="q-options">
        ${['A','B','C','D'].map(opt => `
          <button class="option-btn ${answered && answers[i] === opt ? 'selected' : ''}"
            data-q="${i}" data-opt="${opt}" tabindex="-1">${opt}</button>
        `).join('')}
      </div>
    `;
    grid.appendChild(cell);
  }
  updateActiveCell();
}

function updateActiveCell() {
  const cells = document.querySelectorAll('.question-cell');
  cells.forEach((cell, i) => {
    cell.classList.toggle('active', i === currentQuestionIndex);
    if (i === currentQuestionIndex) {
      cell.focus({ preventScroll: true });
      cell.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  });
  updateProgress();
}

function updateProgress() {
  const answered = answers.filter(a => a !== null).length;
  document.getElementById('progressText').textContent = `${answered}/${TOTAL_QUESTIONS} respondidas`;
}

function updateStats() {
  if (!currentGrade || !currentStudent) {
    document.getElementById('statsBar').style.display = 'none';
    return;
  }
  const correctAnswers = gradesData[currentGrade].answers;
  let correct = 0, wrong = 0;
  answers.forEach((ans, i) => {
    if (ans !== null) {
      if (ans === correctAnswers[i]) correct++;
      else wrong++;
    }
  });
  const grade = answers.every(a => a !== null) ? Math.round((correct / TOTAL_QUESTIONS) * 100) / 10 : (correct + wrong > 0 ? Math.round((correct / (correct + wrong)) * 1000) / 100 : 0);
  document.getElementById('correctCount').textContent = correct;
  document.getElementById('wrongCount').textContent = wrong;
  document.getElementById('finalGrade').textContent = grade.toFixed(1);
}

function focusQuestion(index) {
  currentQuestionIndex = Math.max(0, Math.min(TOTAL_QUESTIONS - 1, index));
  updateActiveCell();
}

function answerQuestion(option) {
  if (currentQuestionIndex >= TOTAL_QUESTIONS) return;
  answers[currentQuestionIndex] = option;
  renderMatrix();
  updateStats();
  saveState();
  if (currentQuestionIndex < TOTAL_QUESTIONS - 1) {
    focusQuestion(currentQuestionIndex + 1);
  } else {
    document.getElementById('saveBtn').focus();
  }
}

function goBack() {
  if (currentQuestionIndex > 0) {
    focusQuestion(currentQuestionIndex - 1);
  } else if (currentStudent) {
    document.getElementById('studentSearch').focus();
  }
}

function handleKeydown(e) {
  const activeEl = document.activeElement;
  const tag = activeEl.tagName.toLowerCase();
  const isInput = tag === 'input' || tag === 'select' || activeEl.contentEditable === 'true';
  const isOptionBtn = activeEl.classList.contains('option-btn');
  const isCell = activeEl.classList.contains('question-cell');
  const inGradingMode = currentStudent && currentGrade;

  if (e.key === 'Escape') {
    if (document.getElementById('studentList').classList.contains('open')) {
      document.getElementById('studentList').classList.remove('open');
    } else if (isCell || inGradingMode) {
      document.getElementById('studentSearch').focus();
    }
    return;
  }

  if (e.target.id === 'studentSearch') {
    const list = document.getElementById('studentList');
    if (e.key === 'Enter') {
      e.preventDefault();
      const visibleItems = list.querySelectorAll('.student-item:not([style*="display: none"])');
      if (visibleItems[studentFilterIndex]) {
        selectStudent(parseInt(visibleItems[studentFilterIndex].dataset.index));
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const visibleItems = list.querySelectorAll('.student-item:not([style*="display: none"])');
      if (visibleItems.length > 0) {
        studentFilterIndex = Math.min(studentFilterIndex + 1, visibleItems.length - 1);
        highlightFilteredStudent();
      }
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const visibleItems = list.querySelectorAll('.student-item:not([style*="display: none"])');
      if (visibleItems.length > 0) {
        studentFilterIndex = Math.max(studentFilterIndex - 1, 0);
        highlightFilteredStudent();
      }
      return;
    }
  }

  if ((e.key >= 'a' && e.key <= 'd') || (e.key >= 'A' && e.key <= 'D')) {
    if (isInput) return;
    e.preventDefault();
    const opt = e.key.toUpperCase();
    if (currentQuestionIndex < TOTAL_QUESTIONS) {
      answerQuestion(opt);
    }
    return;
  }

  if (e.key === 'Backspace') {
    if (inGradingMode && !isInput) {
      e.preventDefault();
      if (answers[currentQuestionIndex] !== null) {
        clearCurrentAnswer();
      } else {
        goBack();
      }
      return;
    }
  }

  if (e.key === 'ArrowUp' && (isCell || isOptionBtn)) {
    e.preventDefault();
    goBack();
    return;
  }

  if (e.key === 'ArrowRight' && (isCell || isOptionBtn || inGradingMode)) {
    e.preventDefault();
    focusQuestion(currentQuestionIndex + 1);
    return;
  }

  if (e.key === 'ArrowLeft' && (isCell || isOptionBtn || inGradingMode)) {
    e.preventDefault();
    focusQuestion(currentQuestionIndex - 1);
    return;
  }

  if (e.key === 'Enter') {
    if (activeEl.id === 'gradeSelect') return;
    if (activeEl.id === 'studentSearch') return;
    if (isOptionBtn) {
      const q = parseInt(activeEl.dataset.q);
      const opt = activeEl.dataset.opt;
      answerQuestion(opt);
      return;
    }
    if (isCell || inGradingMode) {
      if (answers[currentQuestionIndex] === null && currentQuestionIndex < TOTAL_QUESTIONS - 1) return;
    }
    if (currentQuestionIndex === TOTAL_QUESTIONS - 1 && answers.every(a => a !== null)) {
      saveAndNext();
    } else if (currentStudent && answers.every(a => a !== null)) {
      saveAndNext();
    }
    return;
  }

  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    if (currentStudent && answers.some(a => a !== null)) {
      saveAndNext();
    }
    return;
  }

  if (e.key >= '1' && e.key <= '9' && !isInput) {
    const num = parseInt(e.key);
    if (num <= TOTAL_QUESTIONS) focusQuestion(num - 1);
  }
}

function clearCurrentAnswer() {
  answers[currentQuestionIndex] = null;
  renderMatrix();
  updateStats();
  saveState();
}

function saveAndNext() {
  const result = saveCurrentStudent();
  if (result) {
    answers = new Array(TOTAL_QUESTIONS).fill(null);
    currentQuestionIndex = 0;
    renderMatrix();
    updateStats();
    moveToNextStudent();
  }
}

function exportToExcel() {
  if (Object.keys(gradedData).length === 0) {
    showToast('No hay datos para exportar', 'error');
    return;
  }
  const wb = XLSX.utils.book_new();
  const allRows = [];
  Object.entries(gradedData).forEach(([grade, students]) => {
    Object.entries(students).forEach(([student, data]) => {
      const answersStr = data.answers.map((a, i) => `${i+1}:${a || '-'}`).join(' | ');
      allRows.push({
        Grado: grade,
        Estudiante: student,
        Aciertos: data.correct,
        'Total Preguntas': TOTAL_QUESTIONS,
        'Nota Final': data.grade,
        'Detalle Respuestas': answersStr,
        'Fecha': new Date(data.timestamp).toLocaleString()
      });
    });
  });
  const ws = XLSX.utils.json_to_sheet(allRows);
  ws['!cols'] = [{wch:8},{wch:30},{wch:10},{wch:16},{wch:12},{wch:80},{wch:20}];
  XLSX.utils.book_append_sheet(wb, ws, 'Calificaciones');
  XLSX.writeFile(wb, `Calificaciones_${new Date().toISOString().split('T')[0]}.xlsx`);
  showToast('Excel exportado correctamente', 'success');
}

function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

document.getElementById('gradeSelect').addEventListener('change', () => {
  currentStudent = null;
  currentStudentIndex = -1;
  answers = new Array(TOTAL_QUESTIONS).fill(null);
  currentQuestionIndex = 0;
  document.getElementById('studentSearch').value = '';
  document.getElementById('statsBar').style.display = 'none';
  document.getElementById('saveBtn').disabled = true;
  updateStudentList();
  renderMatrix();
  updateStats();
  saveState();
  setTimeout(() => document.getElementById('studentSearch').focus(), 0);
});

document.getElementById('studentSearch').addEventListener('input', (e) => {
  filterStudents(e.target.value);
});

document.getElementById('studentSearch').addEventListener('focus', () => {
  if (currentGrade) filterStudents(document.getElementById('studentSearch').value);
});

document.getElementById('studentSearch').addEventListener('blur', (e) => {
  setTimeout(() => document.getElementById('studentList').classList.remove('open'), 150);
});

document.getElementById('studentList').addEventListener('click', (e) => {
  const item = e.target.closest('.student-item');
  if (item) selectStudent(parseInt(item.dataset.index));
});

document.getElementById('questionGrid').addEventListener('click', (e) => {
  const btn = e.target.closest('.option-btn');
  if (btn) {
    const q = parseInt(btn.dataset.q);
    const opt = btn.dataset.opt;
    focusQuestion(q);
    answerQuestion(opt);
  }
});

document.getElementById('questionGrid').addEventListener('focusin', (e) => {
  const cell = e.target.closest('.question-cell');
  if (cell) currentQuestionIndex = parseInt(cell.dataset.index);
});

document.getElementById('saveBtn').addEventListener('click', saveAndNext);
document.getElementById('exportBtn').addEventListener('click', exportToExcel);
document.addEventListener('keydown', handleKeydown);

async function init() {
  await loadData();
  loadState();
  initGradeSelect();
  if (!currentGrade) {
    document.getElementById('gradeSelect').focus();
  } else if (!currentStudent) {
    document.getElementById('studentSearch').focus();
  } else {
    renderMatrix();
    updateStats();
    focusQuestion(currentQuestionIndex);
  }
}

init();