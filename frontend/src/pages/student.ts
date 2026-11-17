import { api } from '../api.js';
import { $, fmtDate, h, reportError, requireRole, toast } from '../common.js';
import type { FeedGrade } from '../types.js';

function renderEntry(g: FeedGrade, studentName: string): HTMLElement {
  const entry = h('div', 'entry');

  // верх: assigment/date + teacher name + teacher comment (с оценкой)
  const top = h('div', 'entry-top');
  top.append(
    h('div', 'tag tag-block', `${g.subject} · ${fmtDate(g.lesson_date)}`),
    h('div', 'tag tag-block second', g.teacher_name),
  );
  const teacherField = h('div', 'field field-top');
  teacherField.append(
    h('span', 'grade-badge', String(g.grade)),
    h('span', '', g.teacher_comment ?? 'Без комментария'),
  );
  top.append(teacherField);

  // низ: аватар + student comment + звёзды
  const bottom = h('div', 'entry-bottom');
  bottom.append(h('div', 'avatar', studentName.charAt(0).toUpperCase()));

  const field = h('div', 'field field-bottom');
  const input = h('input', 'student-input');
  input.type = 'text';
  input.maxLength = 2000;
  input.placeholder = 'student comment';
  input.value = g.student_comment ?? '';

  let saved = input.value;
  input.addEventListener('change', async () => {
    const value = input.value.trim();
    if (value === saved) return;
    try {
      const upd = await api.sendFeedback(g.id, { student_comment: value || null });
      saved = upd.student_comment ?? '';
      input.value = saved;
      toast('Комментарий сохранён');
    } catch (e) {
      input.value = saved;
      reportError(e);
    }
  });

  const stars = h('span', 'stars');
  let rating = g.student_rating;
  const starEls = [1, 2, 3, 4, 5].map((n) => {
    const s = h('button', 'star', '★');
    s.type = 'button';
    s.setAttribute('aria-label', `${n} из 5`);
    return s;
  });
  const paint = () => starEls.forEach((s, i) => s.classList.toggle('on', rating !== null && i < rating));
  paint();

  starEls.forEach((s, i) =>
    s.addEventListener('click', async () => {
      const next = rating === i + 1 ? null : i + 1; // повторный клик снимает оценку
      const prev = rating;
      rating = next;
      paint();
      try {
        await api.sendFeedback(g.id, { student_rating: next });
      } catch (e) {
        rating = prev;
        paint();
        reportError(e);
      }
    }),
  );
  stars.append(...starEls);

  field.append(input, stars);
  bottom.append(field);
  entry.append(top, bottom);
  return entry;
}

async function main(): Promise<void> {
  const user = await requireRole('student');
  const feed = $('#feed');
  $('#whoami').textContent = `${user.name} · ${user.class_name ?? ''}`;

  try {
    const grades = await api.myGrades();
    feed.replaceChildren();
    if (grades.length === 0) {
      feed.append(h('p', 'empty', 'Оценок пока нет'));
      return;
    }
    for (const g of grades) feed.append(renderEntry(g, user.name));
  } catch (e) {
    reportError(e);
  }
}

void main();
