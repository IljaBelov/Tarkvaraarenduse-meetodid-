import { api } from '../api.js';
import { $, fmtDate, h, reportError, requireRole, todayIso, toast } from '../common.js';
const SUBJECT_KEY = 'gradebook.subject';
const state = { className: '', subject: '', students: [], dates: [], grades: new Map() };
const cellKey = (studentId, date) => `${studentId}|${date}`;
/** Клетка, с которой сейчас работает учитель. */
let editing = null;
let teacherName = '';
const classId = Number(new URLSearchParams(location.search).get('class_id'));
// ---------- элементы страницы ----------
const subjectInput = $('#subject');
const dateInput = $('#newDate');
const table = $('#table');
const hint = $('#hint');
const pickerOverlay = $('#pickerOverlay');
const gradeColumn = $('#gradeColumn');
const commentOverlay = $('#commentOverlay');
const popAssign = $('#popAssign');
const popStudent = $('#popStudent');
const popStudentComment = $('#popStudentComment');
const popAvatar = $('#popAvatar');
const popTeacherComment = $('#popTeacherComment');
const popEnter = $('#popEnter');
const popDelete = $('#popDelete');
// ---------- загрузка ----------
async function reload() {
    const subject = subjectInput.value.trim();
    state.subject = subject;
    if (!subject) {
        // предмет ещё не выбран — показываем только список учеников
        const r = await api.classStudents(classId);
        state.className = r.class.name;
        state.students = r.students;
        state.dates = [];
        state.grades = new Map();
    }
    else {
        const gb = await api.gradebook(classId, subject);
        state.className = gb.class.name;
        state.students = gb.students;
        state.dates = gb.dates;
        state.grades = new Map(gb.grades.map((g) => [cellKey(g.student_id, g.lesson_date), g]));
        localStorage.setItem(SUBJECT_KEY, subject);
    }
    render();
}
// ---------- таблица ----------
function render() {
    $('#groupName').textContent = state.className;
    if (!state.subject)
        hint.textContent = 'Введите предмет, чтобы увидеть и выставлять оценки.';
    else if (state.dates.length === 0)
        hint.textContent = 'Оценок по этому предмету пока нет. Выберите дату урока и нажмите «+ колонка».';
    else
        hint.textContent = '';
    const thead = h('thead');
    const headRow = h('tr');
    const corner = h('th', 'corner');
    corner.append(h('span', 'corner-a', 'student'), h('span', 'corner-b', 'date'));
    headRow.append(corner);
    for (const d of state.dates)
        headRow.append(h('th', '', fmtDate(d)));
    thead.append(headRow);
    const tbody = h('tbody');
    for (const s of state.students) {
        const tr = h('tr');
        tr.append(h('td', 'student', s.full_name));
        for (const d of state.dates) {
            const g = state.grades.get(cellKey(s.id, d));
            const td = h('td', 'cell' + (g ? ' has-grade' : ''), g ? String(g.grade) : '');
            if (g) {
                const parts = [`Выставлено: ${g.graded_at}`];
                if (g.teacher_comment)
                    parts.push(`Учитель: ${g.teacher_comment}`);
                if (g.student_comment)
                    parts.push(`Ученик: ${g.student_comment}`);
                if (g.student_rating)
                    parts.push(`Оценка ученика: ${'★'.repeat(g.student_rating)}`);
                td.title = parts.join('\n');
            }
            td.addEventListener('click', () => openPicker(s, d));
            tr.append(td);
        }
        tbody.append(tr);
    }
    table.replaceChildren(thead, tbody);
}
// ---------- попап выбора оценки (5 4 3 2 1 0) ----------
function buildPicker() {
    for (const n of [5, 4, 3, 2, 1, 0]) {
        const b = h('button', 'grade-circle', String(n));
        b.type = 'button';
        b.dataset.value = String(n);
        b.addEventListener('click', () => pickGrade(n));
        gradeColumn.append(b);
    }
}
function openPicker(student, date) {
    if (!state.subject) {
        toast('Сначала укажите предмет', true);
        subjectInput.focus();
        return;
    }
    const existing = state.grades.get(cellKey(student.id, date));
    editing = { student, date, grade: existing?.grade ?? 0, existing };
    gradeColumn.querySelectorAll('.grade-circle').forEach((c) => c.classList.toggle('current', existing !== undefined && Number(c.dataset.value) === existing.grade));
    pickerOverlay.classList.add('open');
}
function pickGrade(n) {
    if (!editing)
        return;
    editing.grade = n;
    pickerOverlay.classList.remove('open');
    openCommentPopup();
}
// ---------- попап «выставление оценки ученику» ----------
function openCommentPopup() {
    if (!editing)
        return;
    const { student, date, grade, existing } = editing;
    popAssign.textContent = `${state.subject} · ${fmtDate(date)} · оценка ${grade}`;
    popStudent.textContent = student.full_name;
    popAvatar.textContent = teacherName.charAt(0).toUpperCase() || 'T';
    popTeacherComment.value = existing?.teacher_comment ?? '';
    // комментарий и звёзды, которые оставил ученик (только чтение)
    const sc = existing?.student_comment;
    const stars = existing?.student_rating ? `  ${'★'.repeat(existing.student_rating)}` : '';
    popStudentComment.textContent = sc || stars ? `${sc ?? ''}${stars}`.trim() : 'student comment';
    popStudentComment.classList.toggle('is-placeholder', !sc && !stars);
    popDelete.hidden = existing === undefined;
    commentOverlay.classList.add('open');
    popTeacherComment.focus();
}
function closePopups() {
    pickerOverlay.classList.remove('open');
    commentOverlay.classList.remove('open');
    editing = null;
}
async function saveEditing() {
    if (!editing)
        return;
    const { student, date, grade } = editing;
    popEnter.disabled = true;
    try {
        const saved = await api.saveGrade({
            student_id: student.id,
            subject: state.subject,
            lesson_date: date,
            grade,
            teacher_comment: popTeacherComment.value.trim() || null,
        });
        state.grades.set(cellKey(student.id, date), saved);
        render();
        closePopups();
        toast(`${student.full_name}: ${grade}`);
    }
    catch (e) {
        reportError(e);
    }
    finally {
        popEnter.disabled = false;
    }
}
async function deleteEditing() {
    if (!editing?.existing)
        return;
    if (!confirm('Удалить эту оценку?'))
        return;
    const { student, date, existing } = editing;
    try {
        await api.deleteGrade(existing.id);
        state.grades.delete(cellKey(student.id, date));
        render();
        closePopups();
        toast('Оценка удалена');
    }
    catch (e) {
        reportError(e);
    }
}
// ---------- добавление колонки с датой ----------
function addDateColumn() {
    if (!state.subject) {
        toast('Сначала укажите предмет', true);
        subjectInput.focus();
        return;
    }
    const date = dateInput.value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        toast('Выберите дату урока', true);
        return;
    }
    if (!state.dates.includes(date)) {
        state.dates = [...state.dates, date].sort();
        render();
    }
}
// ---------- старт ----------
async function main() {
    const user = await requireRole('teacher');
    teacherName = user.name;
    if (!Number.isInteger(classId) || classId <= 0) {
        location.href = 'groups.html';
        return;
    }
    buildPicker();
    dateInput.value = todayIso();
    subjectInput.value = localStorage.getItem(SUBJECT_KEY) ?? '';
    // подсказки по предметам
    api
        .subjects()
        .then((list) => {
        const dl = $('#subjects');
        for (const s of list) {
            const o = h('option');
            o.value = s;
            dl.append(o);
        }
    })
        .catch(reportError);
    subjectInput.addEventListener('change', () => void reload().catch(reportError));
    $('#addDate').addEventListener('click', addDateColumn);
    // попапы: закрытие по крестику, клику на фон и Esc
    $('#closeComment').addEventListener('click', closePopups);
    for (const overlay of [pickerOverlay, commentOverlay]) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay)
                closePopups();
        });
    }
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape')
            closePopups();
    });
    popEnter.addEventListener('click', () => void saveEditing());
    popTeacherComment.addEventListener('keydown', (e) => {
        if (e.key === 'Enter')
            void saveEditing();
    });
    popDelete.addEventListener('click', () => void deleteEditing());
    try {
        await reload();
    }
    catch (e) {
        reportError(e);
    }
}
void main();
